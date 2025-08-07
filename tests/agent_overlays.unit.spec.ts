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

// Nota: Esses testes focam no comportamento interno de overlays (roteamento, aplicação e precedência)
// sem realizar chamadas reais ao OpenAI. Vamos isolar métodos privados via any-cast para fins de teste.

// Dublê de Agent sem inicialização remota
function createAgentForTest() {
  const bus = new EventEmitter();
  const agent: any = new Agent('test-session', bus);
  return { agent, bus };
}

describe('Agent Live Dev Overlays - Unit', () => {
  test('user_overlay insere mensagem no histórico e persiste', async () => {
    const { agent, bus } = createAgentForTest();

    const events: any[] = [];
    bus.on('backend_message', (e) => events.push(e));

    bus.emit('user_overlay', { payload: 'Usar abordagem segura', ts: 1 });

    const h = (agent as any).getHistorySnapshot();
    const last = h[h.length - 1];
    // Alinhado ao comportamento atual: role 'user'
    expect(last.role).toBe('user');
    expect(last.content).toBe('Usar abordagem segura');

    // Deve emitir evento para UI/logs
    const overlayEvent = events.find(e => e.type === 'user_overlay');
    expect(overlayEvent).toBeTruthy();
    expect(overlayEvent.payload).toBe('Usar abordagem segura');
  });

  test('user_overlay com várias mensagens mantém ordem e salva sem erros', async () => {
    const { agent, bus } = createAgentForTest();

    bus.emit('user_overlay', { payload: 'target=api', ts: 2 });
    bus.emit('user_overlay', { payload: 'Apenas .ts', ts: 3 });

    const h = (agent as any).getHistorySnapshot();
    expect(h[h.length - 2].content).toBe('target=api');
    expect(h[h.length - 1].content).toBe('Apenas .ts');
  });

  test('user_overlay aceita kind mas ignora sem semântica especial (comportamento atual)', () => {
    const { agent, bus } = createAgentForTest();
    bus.emit('user_overlay', { kind: 'override', payload: 'expected_replacements=2', ts: 4 });
    const hist = (agent as any).getHistorySnapshot();
    const last = hist[hist.length - 1];
    expect(last.content).toBe('expected_replacements=2');
  });
});
