// src/app/agent/feedback_system.ts

// --- Tipos e Interfaces ---

interface FeedbackEvent {
    event: 'protocol_violation_direct_text';
    details: {
      violationContent: string;
    };
  }
  
  interface FeedbackResult {
    score: number;
    message: string;
    correction: string;
  }
  
  /**
   * Um sistema para gerar feedback e pontuações para as ações do agente.
   * Atualmente focado em penalizar violações de protocolo.
   */
  export class AdvancedFeedbackSystem {
    private cumulativeScore: number = 0;
  
    /**
     * Gera feedback com base em um evento ocorrido.
     * @param event O evento a ser avaliado.
     * @returns Um objeto com a pontuação, mensagem e correção.
     */
    public generateFeedback(event: FeedbackEvent): FeedbackResult {
      if (event.event === 'protocol_violation_direct_text') {
        const penalty = -2.5;
        this.cumulativeScore += penalty;
  
        return {
          score: penalty,
          message: "You are attempting a direct message without a tool_call. All replies must contain tool_call.",
          correction: `
         ## PROTOCOL VIOLATION — SERIOUS
            You are sending a direct response without tool_call, which is strictly prohibited.
            PENALTY APPLIED: ${penalty.toFixed(1)} points deducted.
            You MUST always use tool_call without exception.
          `.trim(),
        };
      }
  
      // Futuramente, outros eventos podem ser tratados aqui.
      return { score: 0, message: "No feedback for this event.", correction: "" };
    }
  
    public getCumulativeScore(): number {
      return this.cumulativeScore;
    }
  }