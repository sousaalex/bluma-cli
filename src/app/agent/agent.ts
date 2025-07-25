import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';

// Importa todos os nossos módulos de suporte
import { loadOrcreateSession, saveSessionHistory, HistoryMessage } from './session_manger/session_manager.js';
import { getUnifiedSystemPrompt } from './core/prompt/prompt_builder.js';
import { ToolInvoker } from './tool_invoker.js';
import { MCPClient } from './tools/mcp/mcp_client.js';
import { AdvancedFeedbackSystem } from './feedback/feedback_system.js';

// --- Carregamento de Configuração Global ---
const globalEnvPath = path.join(os.homedir(), '.bluma-cli', '.env');
dotenv.config({ path: globalEnvPath });

/**
 * A classe Agent é o cérebro da aplicação. Ela gerencia o estado da conversa,
 * interage com a API do LLM e orquestra a execução de ferramentas através do MCPClient.
 */
export class Agent {
  private client: OpenAI;
  private deploymentName: string;
  private sessionId: string;
  private sessionFile: string = '';
  private history: HistoryMessage[] = [];
  private eventBus: EventEmitter;
  private mcpClient: MCPClient;
  private feedbackSystem: AdvancedFeedbackSystem;
    private isInitialized: boolean = false; // <-- ADICIONE ESTA LINHA


  constructor(sessionId: string, eventBus: EventEmitter) {
    this.sessionId = sessionId;
    this.eventBus = eventBus;

    const nativeToolInvoker = new ToolInvoker();
    this.mcpClient = new MCPClient(nativeToolInvoker, eventBus);
    this.feedbackSystem = new AdvancedFeedbackSystem();

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || '';

    if (!endpoint || !apiKey || !apiVersion || !this.deploymentName) {
      const errorMessage = `Uma ou mais variáveis de ambiente Azure OpenAI não foram encontradas. Verifique em: ${globalEnvPath} ou nas variáveis de sistema.`;
      throw new Error(errorMessage);
    }

    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: `${endpoint}/openai/deployments/${this.deploymentName}`,
      defaultQuery: { 'api-version': apiVersion },
      defaultHeaders: { 'api-key': apiKey },
    });
  }

  public async initialize(): Promise<void> {
    // console.log(`[Agent] Inicializando para a sessão: ${this.sessionId}`);
    
    await this.mcpClient.nativeToolInvoker.initialize();
    await this.mcpClient.initialize();

    const [sessionFile, history] = await loadOrcreateSession(this.sessionId);
    this.sessionFile = sessionFile;
    this.history = history;
    
    if (this.history.length === 0) {
    //   console.log("[Agent] Nova sessão. Criando system prompt dinâmico...");      
    //   const availableTools = this.mcpClient.getAvailableTools().map(t => t.function.name).join(', ');
      let systemPrompt = getUnifiedSystemPrompt();
      systemPrompt += `
        BEHAVIORAL REQUIREMENTS:
        - You MUST use the 'message_notify_dev' tool for ALL communication with the user.
        - Direct text responses are a protocol violation and will be penalized.
        - Signal the end of a task using the 'agent_end_task' tool.
        - Never make parallel tool calls.
      `;
      
      this.history.push({ role: 'system', content: systemPrompt });
      await saveSessionHistory(this.sessionFile, this.history);
    }
    // console.log(`[Agent] Sessão carregada. Histórico contém ${this.history.length} mensagens.`);
  }

  public getAvailableTools() {
    return this.mcpClient.getAvailableTools();
  }

  public async processTurn(userInput: { content: string }): Promise<void> {
    this.history.push({ role: 'user', content: userInput.content });
    await this._continueConversation();
  }

  /**
   * Lida com a decisão do usuário (aceitar/recusar) sobre uma chamada de ferramenta.
   * Garante que uma mensagem de 'role: tool' seja sempre adicionada ao histórico.
   */
  public async handleToolResponse(decisionData: { type: string, tool_calls: any[] }): Promise<void> {
    const toolCall = decisionData.tool_calls[0];
    let toolResultContent: string;
    let shouldContinueConversation = true;
  
    if (decisionData.type === 'user_decision_execute') {
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);
  
      this.eventBus.emit('backend_message', { type: 'tool_call', tool_name: toolName, arguments: toolArgs });
  
      // <<< INÍCIO DA CORREÇÃO: Adiciona o bloco try...catch >>>
      try {
        const result = await this.mcpClient.invoke(toolName, toolArgs);
        
        let finalResult = result;
        if (Array.isArray(result) && result.length > 0 && result[0].type === 'text' && typeof result[0].text === 'string') {
          finalResult = result[0].text;
        }
        toolResultContent = typeof finalResult === 'string' ? finalResult : JSON.stringify(finalResult);
  
      } catch (error: any) {
        // Se a invocação da ferramenta lançar uma exceção (como o McpError), nós a capturamos.
        console.error(`[Agent] Erro ao invocar a ferramenta '${toolName}':`, error);
        // Formata uma mensagem de erro clara para o LLM.
        toolResultContent = JSON.stringify({
          error: `Tool execution failed: ${error.message}`,
          details: error.data || 'No additional details.'
        });
      }
      // <<< FIM DA CORREÇÃO >>>
  
      this.eventBus.emit('backend_message', { type: 'tool_result', tool_name: toolName, result: toolResultContent });
  
      if (toolName.includes('agent_end_task')) {
        shouldContinueConversation = false;
        this.eventBus.emit('backend_message', { type: 'done', status: 'completed' });
      }
  
    } else {
      toolResultContent = "The user declined to execute this tool...";
    }
  
    this.history.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: toolResultContent,
    });
  
    await saveSessionHistory(this.sessionFile, this.history);
  
    if (shouldContinueConversation) {
      await this._continueConversation();
    }
  }

  /**
   * Método central que chama a API do LLM e processa a resposta,
   * com lógica de feedback e auto-aprovação de ferramentas.
   */
  private async _continueConversation(): Promise<void> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: this.history,
        tools: this.mcpClient.getAvailableTools(),
        tool_choice: 'auto',
        parallel_tool_calls: false,
      });

      const message = response.choices[0].message;
      this.history.push(message);

      if (message.tool_calls) {
        const autoApprovedTools = [
          "agent_end_task",
          "message_notify_dev",
          "notebook_sequentialthinking_tools"
        ];

        const toolToCall = message.tool_calls[0];
        const isSafeTool = autoApprovedTools.some(safeTool => toolToCall.function.name.includes(safeTool));

        if (isSafeTool) {
          // console.log(`[Agent] Ferramenta segura '${toolToCall.function.name}' detectada. Executando automaticamente...`);
          await this.handleToolResponse({ type: 'user_decision_execute', tool_calls: message.tool_calls });
        } else {
          // console.log(`[Agent] Ferramenta '${toolToCall.function.name}' requer permissão. Solicitando ao usuário...`);
          this.eventBus.emit('backend_message', { type: 'confirmation_request', tool_calls: message.tool_calls });
        }
      
      } else if (message.content) {
        const feedback = this.feedbackSystem.generateFeedback({
          event: 'protocol_violation_direct_text',
          details: { violationContent: message.content },
        });

        this.eventBus.emit('backend_message', {
          type: 'protocol_violation',
          message: feedback.message,
          content: message.content,
        });

        this.history.push({
          role: 'system',
          content: feedback.correction,
        });

        await this._continueConversation();

      } else {
        this.eventBus.emit('backend_message', { type: 'info', message: "Agent is thinking... continuing reasoning cycle." });
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