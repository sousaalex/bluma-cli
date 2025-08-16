import path from 'path';
import { EventEmitter } from 'events';
import { HistoryMessage, loadOrcreateSession, saveSessionHistory } from '../../session_manger/session_manager';
import { getUnifiedSystemPrompt } from '../../core/prompt/prompt_builder';
import { MCPClient } from '../../tools/mcp/mcp_client';
import { AdvancedFeedbackSystem } from '../../feedback/feedback_system';
import { createApiContextWindow } from '../../core/context-api/context_manager';
import { calculateEdit, createDiff } from '../../tools/natives/edit';
import { LLMClient } from '../../core/llm';

export class BluMaAgent {
  private llm: LLMClient;
  private deploymentName: string;
  private sessionId: string;
  private sessionFile: string = '';
  private history: HistoryMessage[] = [];
  private eventBus: EventEmitter;
  private mcpClient: MCPClient;
  private feedbackSystem: AdvancedFeedbackSystem;
  private readonly maxContextTurns: number = 300;
  private isInterrupted: boolean = false;

  constructor(
    sessionId: string,
    eventBus: EventEmitter,
    llm: LLMClient,
    deploymentName: string,
    mcpClient: MCPClient,
    feedbackSystem: AdvancedFeedbackSystem
  ) {
    this.sessionId = sessionId;
    this.eventBus = eventBus;
    this.llm = llm;
    this.deploymentName = deploymentName;
    this.mcpClient = mcpClient;
    this.feedbackSystem = feedbackSystem;

    this.eventBus.on('user_interrupt', () => {
      this.isInterrupted = true;
      // Informe a UI para desbloquear input imediatamente
      this.eventBus.emit('backend_message', { type: 'done', status: 'interrupted' });
    });

    // Listener de user_overlay movido do Agent para o núcleo onde há histórico
    this.eventBus.on('user_overlay', async (data: { kind?: string; payload: string; ts?: number }) => {
      const clean = String(data.payload ?? '').trim();
      this.history.push({ role: 'user', name: 'user_overlay', content: clean } as any);
      this.eventBus.emit('backend_message', { type: 'user_overlay', payload: clean, ts: data.ts || Date.now() });
      try {
        if (this.sessionFile) {
          await saveSessionHistory(this.sessionFile, this.history);
        }
      } catch (e: any) {
        this.eventBus.emit('backend_message', { type: 'error', message: `Falha ao salvar histórico após user_overlay: ${e.message}` });
      }
    });
  }

  public async initialize(): Promise<void> {
    await this.mcpClient.nativeToolInvoker.initialize();
    await this.mcpClient.initialize();

    const [sessionFile, history] = await loadOrcreateSession(this.sessionId);
    this.sessionFile = sessionFile;
    this.history = history;

    if (this.history.length === 0) {
      const systemPrompt = getUnifiedSystemPrompt();
      this.history.push({ role: 'system', content: systemPrompt });
      await saveSessionHistory(this.sessionFile, this.history);
    }
  }

  public getAvailableTools() {
    return this.mcpClient.getAvailableTools();
  }

  public getUiToolsDetailed() {
    // @ts-ignore
    return this.mcpClient.getAvailableToolsDetailed();
  }

  public async processTurn(userInput: { content: string }): Promise<void> {
    this.isInterrupted = false;
    const inputText = String(userInput.content || '').trim();
    this.history.push({ role: 'user', content: inputText });
    await this._continueConversation();
  }

  public async handleToolResponse(decisionData: { type: string; tool_calls: any[] }): Promise<void> {
    const toolCall = decisionData.tool_calls[0];
    let toolResultContent: string;
    let shouldContinueConversation = true;

    if (!this.sessionFile) {
      const [sessionFile, history] = await loadOrcreateSession(this.sessionId);
      this.sessionFile = sessionFile;
      if (this.history.length === 0 && history.length > 0) {
        this.history = history;
      }
    }

    if (decisionData.type === 'user_decision_execute') {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);

      let previewContent: string | undefined;
      if (toolName === 'edit_tool') {
        previewContent = await this._generateEditPreview(toolArgs);
      }

      this.eventBus.emit('backend_message', {
        type: 'tool_call',
        tool_name: toolName,
        arguments: toolArgs,
        preview: previewContent,
      });

      try {
        if (this.isInterrupted) {
          this.eventBus.emit('backend_message', { type: 'info', message: 'Agent task cancelled before tool execution.' });
          return;
        }

        const result = await this.mcpClient.invoke(toolName, toolArgs);

        let finalResult = result;
        if (Array.isArray(result) && result.length > 0 && result[0].type === 'text' && typeof result[0].text === 'string') {
          finalResult = result[0].text;
        }
        toolResultContent = typeof finalResult === 'string' ? finalResult : JSON.stringify(finalResult);
      } catch (error: any) {
        toolResultContent = JSON.stringify({
          error: `Tool execution failed: ${error.message}`,
          details: error.data || 'No additional details.',
        });
      }

      this.eventBus.emit('backend_message', { type: 'tool_result', tool_name: toolName, result: toolResultContent });

      if (toolName.includes('agent_end_turn')) {
        shouldContinueConversation = false;
        this.eventBus.emit('backend_message', { type: 'done', status: 'completed' });
      }
    } else {
      toolResultContent = 'The user declined to execute this tool...';
    }

    this.history.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResultContent });
    await saveSessionHistory(this.sessionFile, this.history);

    if (shouldContinueConversation && !this.isInterrupted) {
      await this._continueConversation();
    }
  }

  private async _generateEditPreview(toolArgs: any): Promise<string | undefined> {
    try {
      const editData = await calculateEdit(toolArgs.file_path, toolArgs.old_string, toolArgs.new_string, toolArgs.expected_replacements || 1);
      if (editData.error) {
        return `Failed to generate diff:

${editData.error.display}`;
      }
      const filename = path.basename(toolArgs.file_path);
      return createDiff(filename, editData.currentContent || '', editData.newContent);
    } catch (e: any) {
      return `An unexpected error occurred while generating the edit preview: ${e.message}`;
    }
  }

  private async _continueConversation(): Promise<void> {
    try {
      if (this.isInterrupted) {
        this.eventBus.emit('backend_message', { type: 'info', message: 'Task Canceled.' });
        return;
      }

      const contextWindow = createApiContextWindow(this.history, this.maxContextTurns);
      
      const response = await this.llm.chatCompletion({
        model: this.deploymentName,
        messages: contextWindow as any,
        temperature: 0.2,
        tools: this.mcpClient.getAvailableTools() as any,
        tool_choice: 'required',
        reasoning: { effort: "high" },
        parallel_tool_calls: false,
        // max_tokens: 512, // Limite de tokens para evitar respostas muito longas
      });

      if (this.isInterrupted) {
        this.eventBus.emit('backend_message', { type: 'info', message: 'Agent task cancelled by user.' });
        return;
      }

      const message = response.choices[0].message as any;
      this.history.push(message);

      if (message.tool_calls) {
        const autoApprovedTools = ['agent_end_turn', 'message_notify_user', 'reasoning_nootebook', 'ls_tool', 'count_file_lines', 'read_file_lines'];
        const toolToCall = message.tool_calls[0];
        const isSafeTool = autoApprovedTools.some((safeTool) => toolToCall.function.name.includes(safeTool));

        if (isSafeTool) {
          await this.handleToolResponse({ type: 'user_decision_execute', tool_calls: message.tool_calls });
        } else {
          const toolName = toolToCall.function.name;
          if (toolName === 'edit_tool') {
            const args = JSON.parse(toolToCall.function.arguments);
            const previewContent = await this._generateEditPreview(args);
            this.eventBus.emit('backend_message', { type: 'confirmation_request', tool_calls: message.tool_calls, preview: previewContent });
          } else {
            this.eventBus.emit('backend_message', { type: 'confirmation_request', tool_calls: message.tool_calls });
          }
        }
      } else if (message.content) {
        this.eventBus.emit('backend_message', { type: 'assistant_message', content: message.content });
        const feedback = this.feedbackSystem.generateFeedback({
          event: 'protocol_violation_direct_text',
          details: { violationContent: message.content },
        });
        this.eventBus.emit('backend_message', { type: 'protocol_violation', message: feedback.message, content: message.content });
        this.history.push({ role: 'system', content: feedback.correction });
        await this._continueConversation();
      } else {
        this.eventBus.emit('backend_message', { type: 'info', message: 'Agent is thinking... continuing reasoning cycle.' });
        await this._continueConversation();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown API error occurred.';
      this.eventBus.emit('backend_message', { type: 'error', message: errorMessage });
    } finally {
      await saveSessionHistory(this.sessionFile, this.history);
    }
  }
}
