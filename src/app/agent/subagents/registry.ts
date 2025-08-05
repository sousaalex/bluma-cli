// src/app/agent/subagents/registry.ts
import type { SubAgent } from './types';

const subAgentRegistry: Record<string, SubAgent> = {};

export function registerSubAgent(subAgent: SubAgent) {
  for (const cap of subAgent.capabilities) {
    subAgentRegistry[cap] = subAgent;
  }
}

export function getSubAgentByCommand(cmd: string): SubAgent | undefined {
  return subAgentRegistry[cmd];
}

export function getAllSubAgents(): SubAgent[] {
  return Object.values(subAgentRegistry);
}
