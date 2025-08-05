// src/app/agent/subagents/init/init_subagent.ts
import type { SubAgent, OrchestrationContext } from '../types';
import { BaseLLMSubAgent } from '../base_llm_subagent';

class InitAgentImpl extends BaseLLMSubAgent implements SubAgent {
  public id = 'init_subagent';
  public capabilities = ['/init'];
  protected systemPromptPath = './init_system_prompt.md';

  async execute(input: any, ctx: OrchestrationContext): Promise<any> {
    this.ctx = ctx;
    this.isInterrupted = false;
    this.ctx.eventBus.on('user_interrupt', () => { this.isInterrupted = true; });
    await this.initializeHistory();

    // Seed user message fixa para orientar a primeira volta do LLM
    const seed = 'analise o dir actual.';

    // Se houver input do front, concatenamos de forma segura; caso contrário, usamos só o seed
//     const combined = input ? `${seed}

// Input inicial: ${typeof input === 'string' ? input : JSON.stringify(input)}` : seed;
    const combined = seed;
    this.history.push({ role: 'user', content: combined } as any);

    await (this as any)._continueConversation();
    return { history: this.history };
  }
}

export const InitSubAgent: SubAgent = new InitAgentImpl();
