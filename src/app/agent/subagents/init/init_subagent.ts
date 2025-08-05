// src/app/agent/subagents/init/init_subagent.ts
import type { SubAgent, OrchestrationContext } from "../types";
import { BaseLLMSubAgent } from "../base_llm_subagent";

class InitAgentImpl extends BaseLLMSubAgent implements SubAgent {
  public id = "init_subagent";
  public capabilities = ["/init"];

  async execute(input: any, ctx: OrchestrationContext): Promise<any> {
    this.ctx = ctx;
    this.isInterrupted = false;
    this.ctx.eventBus.on("user_interrupt", () => {
      this.isInterrupted = true;
    });
    await this.initializeHistory();

    // Fixed user seed message to guide the first LLM turn (derived from PRD), in EN only
    const seed = `
    Scan the current project repository comprehensively. 
    Map the directory structure (excluding heavy/ignored folders), infer the technology stack from manifests and configs, identify entry points and useful scripts, and analyze module relationships and architectural patterns. 
    Then draft a concise, actionable BluMa.md that includes: project overview, detected stack, a summarized directory tree with brief annotations, key configs and scripts, useful CLI commands, and relevant operational notes for BluMa. 
    Use only evidence gathered via tools; do not invent content. 
    If overwriting an existing BluMa.md is required, follow non-destructive policies and request confirmation as per protocol.
    `;

    // If there is initial input, we could append safely; current policy keeps only the seed
    //     const combined = input ? `${seed}

    // Initial input: ${typeof input === 'string' ? input : JSON.stringify(input)}` : seed;
    const combined = seed;
    this.history.push({ role: "user", content: combined } as any);

    await (this as any)._continueConversation();
    return { history: this.history };
  }
}

export const InitSubAgent: SubAgent = new InitAgentImpl();
