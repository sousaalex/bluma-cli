import { getUnifiedSystemPrompt } from '../src/app/agent/core/prompt/prompt_builder';

describe('prompt_builder', () => {
  it('returns non-empty prompt with BluMa header and rules section markers', () => {
    const prompt = getUnifiedSystemPrompt();
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(50);
    expect(prompt).toMatch(/YOU ARE BluMa CLI/i);
    expect(prompt).toMatch(/BEHAVIORAL RULES|CRITICAL COMMUNICATION PROTOCOL|ZERO TOLERANCE/i);
  });
});