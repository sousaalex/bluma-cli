//agent.ts
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';

// Importa todos os nossos módulos de suporte
import { loadOrcreateSession, saveSessionHistory, HistoryMessage } from './session_manger/session_manager';
import { getUnifiedSystemPrompt } from './core/prompt/prompt_builder';
import { ToolInvoker } from './tool_invoker';
import { MCPClient } from './tools/mcp/mcp_client';
import { AdvancedFeedbackSystem } from './feedback/feedback_system';

import { createApiContextWindow } from './core/context-api/context_manager';
import { calculateEdit, createDiff } from './tools/natives/edit';


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
  private isInitialized: boolean = false;
  private readonly maxContextTurns: number = 300; 
   private isInterrupted: boolean = false; // <-- NOVO: Flag de interrupção



  constructor(sessionId: string, eventBus: EventEmitter) {
    this.sessionId = sessionId;
    this.eventBus = eventBus;

    // NOVO: Ouve o evento de interrupção da UI
    this.eventBus.on('user_interrupt', () => {
        this.isInterrupted = true;
    });
    // NOVO: Ouve o side-channel do dev (feedbacks)
    this.eventBus.on('dev_overlay', async (data: { kind?: string; payload: string; ts?: number }) => {
      const clean = String(data.payload ?? '').trim();

      // // Log de sistema: recebemos o evento de overlay do dev
      // this.eventBus.emit('backend_message', {
      //   type: 'log',
      //   message: 'Received dev_overlay',
      //   payload: clean,
      //   ts: data.ts || Date.now(),
      // });

      // Fluxo: mensagens do dev_overlay entram como role: user com metadata name
      this.history.push({ role: 'user', name: 'dev_overlay', content: clean } as any);

      // Emite evento para UI/logs indicando que recebemos overlay do dev
      this.eventBus.emit('backend_message', {
        type: 'dev_overlay',
        payload: clean,
        ts: data.ts || Date.now(),
      });

      // Persiste imediatamente no histórico da sessão se já tivermos sessão ativa
      try {
        if (this.sessionFile) {
          await saveSessionHistory(this.sessionFile, this.history);
          // Log de sistema: histórico salvo com sucesso
          // this.eventBus.emit('backend_message', {
          //   type: 'log',
          //   message: 'Saved dev_overlay to session history',
          //   ts: Date.now(),
          // });
        }
      } catch (e: any) {
        this.eventBus.emit('backend_message', { type: 'error', message: `Falha ao salvar histórico após dev_overlay: ${e.message}` });
      }
    });


    const nativeToolInvoker = new ToolInvoker();
    this.mcpClient = new MCPClient(nativeToolInvoker, eventBus);
    this.feedbackSystem = new AdvancedFeedbackSystem();

    // const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    // const apiKey = process.env.AZURE_OPENAI_API_KEY;
    // const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    // this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || ''; 

    // if (!endpoint || !apiKey || !apiVersion || !this.deploymentName) {
    //   const errorMessage = `Uma ou mais variáveis de ambiente Azure OpenAI não foram encontradas. Verifique em: ${globalEnvPath} ou nas variáveis de sistema.`;
    //   throw new Error(errorMessage);
    // } 

      const apiKey = "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"; 
      const modelName = "openrouter/horizon-alpha";

      if (!apiKey || !modelName) {
          throw new Error("Chave de API ou nome do modelo do OpenRouter não encontrados.");
      } 

      this.deploymentName = modelName; 

    //  this.client = new OpenAI({
    //   // Configuração do cliente OpenAI hospedado no Azure
    //   apiKey: apiKey,
    //   baseURL: `${endpoint}/openai/deployments/${this.deploymentName}`,
    //   defaultQuery: { 'api-version': apiVersion },
    //   defaultHeaders: { 'api-key': apiKey },
    // }); 

     this.client = new OpenAI({
    // Configuração do cliente OpenAI hospedado no  OpenRouter
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1", // <-- URL base do OpenRouter
    defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000", // Substitua pelo seu site ou app
        "X-Title": "Bluma CLI Agent", // Substitua pelo nome do seu projeto
      },
  }); 

  }

  /**
   * Inicializa o agente, carregando ou criando uma sessão e preparando o histórico.
   * Também inicializa o MCPClient e o ToolInvoker.
   */

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
      this.history.push({ role: 'system', content: systemPrompt });
      await saveSessionHistory(this.sessionFile, this.history);
    }
    // console.log(`[Agent] Sessão carregada. Histórico contém ${this.history.length} mensagens.`);
    this.isInitialized = true;
  }

  public getAvailableTools() {
    return this.mcpClient.getAvailableTools();
  }

  // UI helper: detailed tools with origin metadata
  public getUiToolsDetailed() {
    // @ts-ignore
    return this.mcpClient.getAvailableToolsDetailed();
  }

  public async processTurn(userInput: { content: string }): Promise<void> {
    this.isInterrupted = false; 
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

    // Robustez: garante sessão inicializada antes de prosseguir
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
            previewContent = await this._generateEditPreview(toolArgs); // << USO DA FUNÇÃO AUXILIAR
        }
    
        this.eventBus.emit('backend_message', {
            type: 'tool_call',
            tool_name: toolName,
            arguments: toolArgs,
            preview: previewContent,
        });
  
      // <<< INÍCIO DA CORREÇÃO: Adiciona o bloco try...catch >>>
      try {

        // NOVO: Verifica se foi interrompido antes de invocar a ferramenta
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
        // Se a invocação da ferramenta lançar uma exceção (como o McpError), nós a capturamos.
        // console.error(`[Agent] Erro ao invocar a ferramenta '${toolName}':`, error);
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
  
    if (shouldContinueConversation && !this.isInterrupted) {
      await this._continueConversation();
    }
  }

  /**
   * Método central que chama a API do LLM e processa a resposta,
   * com lógica de feedback e auto-aprovação de ferramentas.
   */
  // Adicione este método dentro da classe Agent
private async _generateEditPreview(toolArgs: any): Promise<string | undefined> {
    try {
        const editData = await calculateEdit(toolArgs.file_path, toolArgs.old_string, toolArgs.new_string, toolArgs.expected_replacements || 1);
        if (editData.error) {
            // Retorna a mensagem de erro como o "preview"
            return `Failed to generate diff:\n\n${editData.error.display}`;
        }
        const filename = path.basename(toolArgs.file_path);
        return createDiff(filename, editData.currentContent || '', editData.newContent);
    } catch (e: any) {
        return `An unexpected error occurred while generating the edit preview: ${e.message}`;
    }
}

  private async _continueConversation(): Promise<void> {
    try {
      
      // NOVO: Verifica se foi interrompido antes de chamar a API
      if (this.isInterrupted) {
          this.eventBus.emit('backend_message', { type: 'info', message: 'Agent task cancelled by user.' });
          return; // Para a execução aqui
      }

     const contextWindow = createApiContextWindow(this.history, this.maxContextTurns);

      const response = await this.client.chat.completions.create({
        model: this.deploymentName,
        messages: contextWindow,
        tools: this.mcpClient.getAvailableTools(),
        tool_choice: 'required',
        parallel_tool_calls: false,
      });

      // NOVO: Verifica novamente após a chamada de API, que pode ser longa
      if (this.isInterrupted) {
        this.eventBus.emit('backend_message', { type: 'info', message: 'Agent task cancelled by user.' });
        return;
      }

      const message = response.choices[0].message;
      this.history.push(message);

      if (message.tool_calls) {
        const autoApprovedTools = [
          "agent_end_task",
          "message_notify_dev",
          "bluma_nootebook"
        ];

        const toolToCall = message.tool_calls[0];
        const isSafeTool = autoApprovedTools.some(safeTool => toolToCall.function.name.includes(safeTool));

        if (isSafeTool) {
            // Ferramentas seguras são executadas automaticamente (sem mudança aqui)
            await this.handleToolResponse({ type: 'user_decision_execute', tool_calls: message.tool_calls });
          } else {
            // Ferramenta requer permissão. Vamos verificar se podemos gerar um preview.
            const toolName = toolToCall.function.name;
  
            if (toolName === 'edit_tool') {
                const args = JSON.parse(toolToCall.function.arguments);
                const previewContent = await this._generateEditPreview(args); // << USO DA FUNÇÃO AUXILIAR
            
                this.eventBus.emit('backend_message', {
                    type: 'confirmation_request',
                    tool_calls: message.tool_calls,
                    preview: previewContent,
                });
            } else {
              // Para outras ferramentas não seguras, mantém o comportamento antigo.
              this.eventBus.emit('backend_message', { 
                type: 'confirmation_request', 
                tool_calls: message.tool_calls 
              });
            }
          }
  
      
      } else if (message.content) {
        this.eventBus.emit('backend_message', {
          type: 'assistant_message',
          content: message.content,
        });

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