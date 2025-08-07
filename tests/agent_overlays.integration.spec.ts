import { EventEmitter } from 'events';
import { Agent } from '../src/app/agent/agent';

// Mocks para evitar carregamento de módulos ESM problemáticos (import.meta) durante testes
jest.mock('../src/app/agent/tool_invoker', () => ({
  ToolInvoker: jest.fn().mockImplementation(() => ({ initialize: jest.fn() })),
}));

jest.mock('../src/app/agent/tools/mcp/mcp_client', () => ({
  MCPClient: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    getAvailableTools: jest.fn().mockReturnValue([]),
    nativeToolInvoker: { initialize: jest.fn() },
    invoke: jest.fn().mockResolvedValue([{ type: 'text', text: 'ok' }]),
  })),
}));

// Integração leve: valida que o overlay [override] ajusta os argumentos passados para uma tool call
// e que [hint] entra no contexto antes do próximo ciclo. Para não atingir APIs externas, não chamamos _continueConversation
// real; exercitamos apenas os pontos de entrada relevantes e methods internos auxiliares.

function createAgentForTest() {
  const bus = new EventEmitter();
  const agent: any = new Agent('integration-session', bus);
  return { agent, bus };
}

describe('Agent Live Dev Overlays - Integration (light)', () => {
  test('user_overlay adiciona ao histórico e emite backend_message', async () => {
    const { agent, bus } = createAgentForTest();

    const events: any[] = [];
    bus.on('backend_message', (e) => events.push(e));

    bus.emit('user_overlay', { kind: 'hint', payload: 'Focar em arquivos .ts apenas', ts: 10 });

    const h = (agent as any).getHistorySnapshot();
    const last = h[h.length - 1];
    expect(last.role).toBe('user');
    expect(last.content).toBe('Focar em arquivos .ts apenas');

    const overlayEvent = events.find(e => e.type === 'user_overlay');
    expect(overlayEvent).toBeTruthy();
    expect(overlayEvent.payload).toBe('Focar em arquivos .ts apenas');
  });
});
