// agent.ts — Core orquestrador minimalista
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';

import { ToolInvoker } from './tool_invoker';
import { MCPClient } from './tools/mcp/mcp_client';
import { AdvancedFeedbackSystem } from './feedback/feedback_system';
import { BluMaAgent } from './bluma/core/bluma';
import { LLMClient, OpenAIAdapter } from './core/llm';
import { SubAgentsBluMa } from './subagents/subagents_bluma';

// --- Carregamento de Configuração Global ---
const globalEnvPath = path.join(os.homedir(), '.bluma-cli', '.env');
dotenv.config({ path: globalEnvPath });

/**
 * Agent: somente orquestração/roteamento.
 * Delegação de histórico, loop LLM e previews ao BluMaAgent (bluma/core).
 * Despacho de comandos "/" via SubAgentRegistry.
 */
export class Agent {
  private sessionId: string;
  private eventBus: EventEmitter;
  private mcpClient: MCPClient;
  private feedbackSystem: AdvancedFeedbackSystem; // Mantido caso UI dependa de eventos
  private llm: LLMClient;
  private deploymentName: string;
  private core: BluMaAgent; // Delegado
  private subAgents: SubAgentsBluMa; // Orquestrador de subagentes
  private toolInvoker: ToolInvoker;

  constructor(sessionId: string, eventBus: EventEmitter) {
    this.sessionId = sessionId;
    this.eventBus = eventBus;

    const nativeToolInvoker = new ToolInvoker();
    this.toolInvoker = nativeToolInvoker;
    this.mcpClient = new MCPClient(nativeToolInvoker, eventBus);
    this.feedbackSystem = new AdvancedFeedbackSystem();

    // Configuração de cliente LLM (OpenAI)
    
    // const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    // const apiKey = process.env.AZURE_OPENAI_API_KEY;
    // const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    // this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || ''; 

    // if (!endpoint || !apiKey || !apiVersion || !this.deploymentName) {
    //   const errorMessage = `Uma ou mais variáveis de ambiente Azure OpenAI não foram encontradas. Verifique em: ${globalEnvPath} ou nas variáveis de sistema.`;
    //   throw new Error(errorMessage);
    // } 

    //  const openai = new OpenAI({
    //   // Configuração do cliente OpenAI hospedado no Azure
    //   apiKey: apiKey,
    //   baseURL: `${endpoint}/openai/deployments/${this.deploymentName}`,
    //   defaultQuery: { 'api-version': apiVersion },
    //   defaultHeaders: { 'api-key': apiKey },
    // }); 
    // this.llm = new OpenAIAdapter(openai);

    // Configuração de cliente OpenAI (OpenRouter)

    const apiKey = "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";
    const modelName = 'openrouter/horizon-beta';
    if (!apiKey || !modelName) throw new Error('Chave de API ou nome do modelo do OpenRouter não encontrados.');
    this.deploymentName = modelName;

    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'Bluma CLI Agent' },
    });
    this.llm = new OpenAIAdapter(openai);

    // Instancia o núcleo BluMaAgent que cuidará do loop/estado
    this.core = new BluMaAgent(
      this.sessionId,
      this.eventBus,
      this.llm,
      this.deploymentName,
      this.mcpClient,
      this.feedbackSystem
    );

    // Instancia o orquestrador de SubAgentes
    this.subAgents = new SubAgentsBluMa({
      eventBus: this.eventBus,
      mcpClient: this.mcpClient,
      toolInvoker: this.toolInvoker,
      llm: this.llm,
      deploymentName: this.deploymentName,
      projectRoot: process.cwd(),
    });
  }

  public async initialize(): Promise<void> {
    await this.core.initialize();
  }

  public getAvailableTools() {
    return this.core.getAvailableTools();
  }

  public getUiToolsDetailed() {
    return this.core.getUiToolsDetailed();
  }

  public async processTurn(userInput: { content: string }): Promise<void> {
    const inputText = String(userInput.content || '').trim();

    // Roteamento: se for /init, delega ao SubAgents orchestrator
    if (inputText === '/init' || inputText.startsWith('/init ')) {
      await this.dispatchToSubAgent({ command: '/init', content: inputText });
      return;
    }

    // Delegar todo o fluxo padrão ao núcleo
    await this.core.processTurn({ content: inputText });
  }

  public async handleToolResponse(decisionData: { type: string; tool_calls: any[] }): Promise<void> {
    // Delegar diretamente para o núcleo
    await this.core.handleToolResponse(decisionData);
  }

  // Novo: processamento via SubAgents (ex.: payload vindo do front /init)
  public async dispatchToSubAgent(payload: { content?: string; command?: string; [k: string]: any }): Promise<any> {
    // console.log('Dispatching to subagent with payload:', payload);
    return this.subAgents.registerAndDispatch(payload);
  }

  // Compat: snapshot imutável do histórico para testes/UI (não expõe referência mutável)
  public getHistorySnapshot(): any[] {
    // @ts-ignore acesso interno
    const coreHistory = (this.core as any).history as any[] | undefined;
    return coreHistory ? coreHistory.map((m) => ({ ...m })) : [];
  }
}
