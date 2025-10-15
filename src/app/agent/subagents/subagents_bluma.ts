// src/app/agent/subagents/subagents_bluma.ts
import { EventEmitter } from 'events';
import path from 'path';

import { MCPClient } from '../tools/mcp/mcp_client';
import { ToolInvoker } from '../tool_invoker';
import type { LLMClient } from '../core/llm/llm';
import type { OrchestrationContext } from './types';
import { getSubAgentByCommand, registerSubAgent } from './registry';
import { InitSubAgent } from './init/init_subagent';

// Registo inicial dos subagentes conhecidos
registerSubAgent(InitSubAgent);

export type FrontPayload = { content?: string; command?: string; [k: string]: any };

export class SubAgentsBluMa {
  private eventBus: EventEmitter;
  private mcpClient: MCPClient;
  private toolInvoker: ToolInvoker;
  private llm: LLMClient;
  private deploymentName: string;
  private projectRoot: string;
  private policy?: any;
  private logger?: any;

  constructor(params: {
    eventBus: EventEmitter;
    mcpClient: MCPClient;
    toolInvoker: ToolInvoker;
    llm: LLMClient;
    deploymentName: string;
    projectRoot?: string;
    policy?: any;
    logger?: any;
  }) {
    this.eventBus = params.eventBus;
    this.mcpClient = params.mcpClient;
    this.toolInvoker = params.toolInvoker;
    this.llm = params.llm;
    this.deploymentName = params.deploymentName;
    this.projectRoot = params.projectRoot || process.cwd();
    this.policy = params.policy;
    this.logger = params.logger;
  }

  // Recebe dados do front (ex.: { content: inputText } vindo de /init)
  // e faz o roteamento para o subagente adequado com base no comando.
  async registerAndDispatch(frontPayload: FrontPayload): Promise<any> {
    const { command, content, ...rest } = frontPayload || {};

    const resolvedCommand = this.resolveCommand({ command, content });
    if (!resolvedCommand) {
      this.emit('error', { message: 'Nenhum comando/subagente correspondente encontrado.' });
      return { ok: false, error: 'unknown_command' };
    }

    const subAgent = getSubAgentByCommand(resolvedCommand);
    if (!subAgent) {
      this.emit('error', { message: `Subagente não registrado para ${resolvedCommand}` });
      return { ok: false, error: 'unregistered_subagent' };
    }

    const ctx: OrchestrationContext = {
      projectRoot: this.projectRoot,
      eventBus: this.eventBus,
      mcpClient: this.mcpClient,
      toolInvoker: this.toolInvoker,
      llm: this.llm,
      policy: { llmDeployment: this.deploymentName, ...(this.policy || {}) },
      logger: this.logger,
    };

    const inputForAgent = content ?? JSON.stringify({ content, ...rest });
    this.emit('info', { message: `[SubAgentsBluMa] Dispatch -> ${resolvedCommand}` });
    return subAgent.execute(inputForAgent, ctx);
  }

  // Estratégia simples: se o payload explicitamente vier de /init, use "/init".
  // Caso haja command explícito, usa-o. Caso contrário, heurística com base no conteúdo.
  private resolveCommand(payload: { command?: string; content?: string }): string | undefined {
    if (payload.command && typeof payload.command === 'string') return payload.command;
    const text = String(payload.content || '').trim();
    if (!text) return '/init';
    // Heurística mínima: se começar com "/" considera comando direto
    if (text.startsWith('/')) return text.split(/\s+/)[0];
    // Padrão: fluxo de inicialização
    return '/init';
  }

  private emit(type: string, data: any) {
    this.eventBus.emit('backend_message', { type, ...data });
  }
}
