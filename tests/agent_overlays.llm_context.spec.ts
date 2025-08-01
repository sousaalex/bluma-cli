import { EventEmitter } from 'events';
import { Agent } from '../src/app/agent/agent';

// Mock OpenAI client to capture messages passed to chat.completions.create
jest.mock('openai', () => {
  const createMock = jest.fn().mockResolvedValue({ choices: [{ message: {} }] });
  const chat = { completions: { create: createMock } } as any;
  const OpenAI = function(this: any) { this.chat = chat; return this; } as any;
  OpenAI.__mock = { createMock };
  return OpenAI;
});

// Keep existing mocks for internal components
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

function createAgentForTest() {
  const bus = new EventEmitter();
  const agent: any = new Agent('ctx-session', bus);
  return { agent, bus };
}

describe('Agent dev_overlay → LLM context integration', () => {
  test('dev_overlay é recebido, salvo e incluído nas mensagens do LLM', async () => {
    const { agent, bus } = createAgentForTest();

    const events: any[] = [];
    bus.on('backend_message', (e) => events.push(e));

    // Não chamamos initialize() para evitar I/O; o agent lida com histórico vazio
    // Emite overlay e então força um turno normal
    bus.emit('dev_overlay', { payload: 'Analise o dir actual pode ser?', ts: 123 });

    // Dispara um turno para gerar chamada ao LLM
    await agent.processTurn({ content: 'go' });

    // Verifica eventos enviados ao backend
    const receivedLog = events.find(e => e.type === 'log' && e.message === 'Received dev_overlay' && e.payload === 'Analise o dir actual pode ser?' && e.ts === 123);
    expect(receivedLog).toBeTruthy();
    const overlayEvt = events.find(e => e.type === 'dev_overlay' && e.payload === 'Analise o dir actual pode ser?');
    expect(overlayEvt).toBeTruthy();
    const savedLog = events.find(e => e.type === 'log' && e.message === 'Saved dev_overlay to session history');
    expect(savedLog).toBeTruthy();

    const OpenAIAny: any = require('openai');
    const createMock = OpenAIAny.__mock.createMock as jest.Mock;
    expect(createMock).toHaveBeenCalled();

    const callArgs = createMock.mock.calls[0][0];
    expect(callArgs).toBeTruthy();
    const msgs = callArgs.messages;

    // Deve conter a mensagem de overlay como role:user
    const found = msgs.find((m: any) => m.role === 'user' && m.content === 'Analise o dir actual pode ser?');
    expect(found).toBeTruthy();
  });
});
