import { getUnifiedSystemPrompt } from '../src/app/agent/core/prompt/prompt_builder';

describe('prompt_builder', () => {
  it('returns non-empty prompt with BluMa header and rules section markers', () => {
    const prompt = getUnifiedSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(50);
    // Header matcher atualizado para corresponder às tags atuais do prompt
    expect(prompt).toMatch(/<identity>/i);
    // Deve conter seções de regras/protocolos (verifica presença de blocos como turn_management_protocol ou persistence)
    expect(prompt).toMatch(/<turn_management_protocol>|<persistence>/i);
  });
});