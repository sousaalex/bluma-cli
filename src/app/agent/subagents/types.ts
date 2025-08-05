// src/app/agent/subagents/types.ts

import { EventEmitter } from 'events';
import { MCPClient } from '../tools/mcp/mcp_client';
import { ToolInvoker } from '../tool_invoker';

import type { LLMClient } from '../core/llm';
export interface OrchestrationContext {
  projectRoot: string;
  eventBus: EventEmitter;
  mcpClient: MCPClient;
  toolInvoker: ToolInvoker;
  llm: LLMClient;
  policy?: any;
  logger?: any;
}

export interface SubAgent<TInput = any, TOutput = any> {
  id: string;
  capabilities: string[];
  execute(input: TInput, ctx: OrchestrationContext): Promise<TOutput>;
}
