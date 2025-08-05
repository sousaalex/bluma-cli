import { EventEmitter } from 'events';
import { InitSubAgent } from '../src/app/agent/subagents/init/init_subagent';

class MockMCPClient { getAvailableTools() { return []; } async invoke() { return ''; } }
class MockLLM { async chatCompletion() { return { id: 'x', choices: [{ message: { role: 'assistant', content: 'ok' } }] } as any; } }
class MockToolInvoker {}

describe('InitSubAgent seed message', () => {
  test('pushes a fixed seed user message before LLM cycle', async () => {
    const eventBus = new EventEmitter();
    const sub = InitSubAgent as any;

    // Prepare context
    const ctx = {
      projectRoot: process.cwd(),
      eventBus,
      mcpClient: new MockMCPClient() as any,
      toolInvoker: new MockToolInvoker() as any,
      llm: new MockLLM() as any,
      policy: { llmDeployment: 'test-model' },
      logger: undefined,
    };

    // Spy on chatCompletion to ensure history has the seed when called
    const llmSpy: any = jest.spyOn(ctx.llm, 'chatCompletion');

    await sub.execute('hello', ctx);

    expect(llmSpy).toHaveBeenCalled();
    const history = sub.history as any[];
    const userMsgs = history.filter((m) => m.role === 'user');
    expect(userMsgs.length).toBeGreaterThan(0);
    const lastUser = userMsgs[userMsgs.length - 1];
    // Verifica que a seed contém instruções para mapear, inferir stack e gerar BluMa.md
    expect(String(lastUser.content)).toMatch(/Mapeia o/i);
    expect(String(lastUser.content)).toMatch(/infere a stack/i);
    expect(String(lastUser.content)).toMatch(/BluMa\.md/i);
  });
});
