import type { SubAgent, OrchestrationContext } from './types';
import { HistoryMessage, loadOrcreateSession, saveSessionHistory } from '../session_manger/session_manager';
import { calculateEdit, createDiff } from '../tools/natives/edit';
import { getInitPrompt } from './init/init_system_prompt';

export abstract class BaseLLMSubAgent implements SubAgent {
  public abstract id: string;
  public abstract capabilities: string[];
  protected ctx!: OrchestrationContext;
  protected history: HistoryMessage[] = [];
  protected sessionFile: string = '';
  protected maxContextTurns = 160;
  protected isInterrupted = false;

  async execute(input: any, ctx: OrchestrationContext): Promise<any> {
    this.ctx = ctx;
    this.isInterrupted = false;
    this.ctx.eventBus.on('user_interrupt', () => { this.isInterrupted = true; });
    await this.initializeHistory();
    this.history.push({ role: 'user', content: typeof input === 'string' ? input : JSON.stringify(input) });
    await this._continueConversation();
    return { history: this.history };
  }

  protected async initializeHistory() {
    // Carrega ou cria uma sessão dedicada a este subagente
    const sessionId = `${this.id}`;
    const [sessionFile, history] = await loadOrcreateSession(sessionId);
    this.sessionFile = sessionFile;
    this.history = history || [];

    const systemPromptContent = getInitPrompt();

    if (this.history.length === 0) {
      // Carrega o prompt do sistema exclusivamente do arquivo apontado por systemPromptPath
      this.history.push({
        role: 'developer',
        content: systemPromptContent,
      });
      await saveSessionHistory(this.sessionFile, this.history);
    }
  }

  private async _generateEditPreview(toolArgs: any): Promise<string | undefined> {
    try {
      const editData = await calculateEdit(toolArgs.file_path, toolArgs.old_string, toolArgs.new_string, toolArgs.expected_replacements || 1);
      if ((editData as any).error) {
        // @ts-ignore
        return `Failed to generate diff:

${(editData as any).error.display}`;
      }
      const filename = toolArgs.file_path?.split(/[\/]/).pop() || 'file';
      return createDiff(filename, (editData as any).currentContent || '', (editData as any).newContent);
    } catch (e: any) {
      return `An unexpected error occurred while generating the edit preview: ${e.message}`;
    }
  }

  private async _continueConversation(): Promise<void> {
    try {
      if (this.isInterrupted) {
        this.emitEvent('info', { message: 'SubAgent task cancelled byuserr.' });
        return;
      }

      const contextWindow = this.history.slice(-this.maxContextTurns);
      const response = await this.ctx.llm.chatCompletion({
        model: this.ctx.policy?.llmDeployment || 'default',
        messages: contextWindow as any,
        tools: this.ctx.mcpClient.getAvailableTools() as any,
        tool_choice: 'required',
        parallel_tool_calls: false,
      });

      if (this.isInterrupted) {
        this.emitEvent('info', { message: 'SubAgent task cancelled byuserr.' });
        return;
      }

      const message = response.choices[0].message as any;
      this.history.push(message);

      if (message.tool_calls) {
        // --- MODIFICAÇÃO PRINCIPAL ---
        // A confirmação foi removida. Executa a ferramenta diretamente.
        await this._handleToolExecution({ type: 'user_decision_execute', tool_calls: message.tool_calls });
        
        const lastToolName = message.tool_calls[0].function.name;
        // Continua o loop de conversação, a menos que a tarefa tenha terminado ou sido interrompida.
        if (!lastToolName.includes('agent_end_task') && !this.isInterrupted) {
          await this._continueConversation();
        }
        // -----------------------------

      } else if (message.content) {
        this.emitEvent('assistant_message', { content: message.content });
        // Emular feedback do núcleo: apenas emitir protocolo (não alteramos histórico aqui para evitar recursão infinita)
        this.emitEvent('protocol_violation', { message: 'Direct text emission detected from subagent.', content: message.content });
      } else {
        this.emitEvent('info', { message: 'SubAgent is thinking... continuing reasoning cycle.' });
        // Pode ser necessário um loop aqui se o agente puder retornar sem conteúdo ou ferramenta
        // await this._continueConversation(); 
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'An unknown API error occurred.';
      this.emitEvent('error', { message: errorMessage });
    } finally {
      if (this.sessionFile) await saveSessionHistory(this.sessionFile, this.history);
    }
  }

  // MÉTODO REMOVIDO
  // public async handleConfirmation(decisionData: { type: string; tool_calls: any[] }) {
  //   await this._handleToolExecution(decisionData);
  //   if (!this.isInterrupted) {
  //     await this._continueConversation();
  //   }
  // }

  private async _handleToolExecution(decisionData: { type: string; tool_calls: any[] }) {
    const toolCall = decisionData.tool_calls[0];
    let toolResultContent: string;

    // A lógica 'user_decision_execute' é mantida, pois o fluxo agora sempre "executa"
    if (decisionData.type === 'user_decision_execute') {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);

      let previewContent: string | undefined;
      if (toolName === 'edit_tool') {
        previewContent = await this._generateEditPreview(toolArgs);
      }

      this.emitEvent('tool_call', {
        tool_name: toolName,
        arguments: toolArgs,
        preview: previewContent,
      });

      try {
        if (this.isInterrupted) {
          this.emitEvent('info', { message: 'SubAgent task cancelled before tool execution.' });
          toolResultContent = JSON.stringify({ error: 'Task cancelled byuserr before execution.' });
        } else {
            const result = await this.ctx.mcpClient.invoke(toolName, toolArgs);
            let finalResult = result as any;
            if (Array.isArray(result) && result.length > 0 && (result[0] as any).type === 'text' && typeof (result[0] as any).text === 'string') {
              finalResult = (result[0] as any).text;
            }
            toolResultContent = typeof finalResult === 'string' ? finalResult : JSON.stringify(finalResult);
        }
      } catch (error: any) {
        toolResultContent = JSON.stringify({ error: `Tool execution failed: ${error.message}`, details: error.data || 'No additional details.' });
      }

      this.emitEvent('tool_result', { tool_name: toolName, result: toolResultContent });

      if (toolName.includes('agent_end_task')) {
        this.emitEvent('done', { status: 'completed' });
      }
    } else {
      // Este bloco 'else' (recusa do usuário) não deve mais ser alcançado.
      toolResultContent = 'Tool execution was declined.';
    }

    this.history.push({ role: 'tool', tool_call_id: toolCall.id, content: toolResultContent } as any);
    // O salvamento do histórico agora acontece no bloco finally de _continueConversation
  }

  // Utilitários: emitir eventos, chamar tools, etc
  protected emitEvent(type: string, payload: any) {
    this.ctx.eventBus.emit('backend_message', { type, ...payload });
  }
}