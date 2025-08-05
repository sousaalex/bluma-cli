import { EventEmitter } from 'events';
import { SubAgentsBluMa } from '../src/app/agent/subagents/subagents_bluma';

// Mocks mínimos para evitar import.meta em ambientes CJS do Jest
class MockMCPClient {
  getAvailableTools() { return []; }
  async invoke(name: string, args: any) { return { ok: true, name, args }; }
}
class MockLLM {
  async chatCompletion() {
    // Simula uma resposta do subagente init sem tool_calls
    return { id: 'mock', choices: [{ message: { role: 'assistant', content: 'Init completed' } }] } as any;
  }
}
class MockToolInvoker {}

describe('SubAgents orchestration - Integration (isolated)', () => {
  test('dispatch /init routes to InitSubAgent and emits expected events', async () => {
    const bus = new EventEmitter();
    const events: any[] = [];
    bus.on('backend_message', (e) => events.push(e));

    const sub = new SubAgentsBluMa({
      eventBus: bus,
      mcpClient: new MockMCPClient() as any,
      toolInvoker: new MockToolInvoker() as any,
      llm: new MockLLM() as any,
      deploymentName: 'test-model',
      projectRoot: process.cwd(),
    });

    const result = await sub.registerAndDispatch({ command: '/init', content: 'start project mapping' });

    // Deve emitir ao menos um evento de progresso
    const hasProgress = events.some((e) => ['info', 'assistant_message', 'confirmation_request'].includes(e.type));
    expect(hasProgress).toBe(true);

    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});
