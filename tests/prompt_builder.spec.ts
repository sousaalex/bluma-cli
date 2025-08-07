import { getUnifiedSystemPrompt } from '../src/app/agent/core/prompt/prompt_builder';

describe('prompt_builder', () => {
  it('returns non-empty prompt with BluMa header and rules section markers', () => {
    const prompt = getUnifiedSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(50);
    // Header matcher atualizado conforme texto atual do prompt
    expect(prompt).toMatch(/IDENTITY AND OBJECTIVE/i);
    // Deve conter seções de regras/protocolos
    expect(prompt).toMatch(/CORE DIRECTIVES|COMMUNICATION PROTOCOL|SCOPE & LIMITATIONS/i);
  });
});