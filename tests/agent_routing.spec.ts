import { EventEmitter } from 'events';
import { Agent } from '../src/app/agent/agent';

jest.mock('../src/app/agent/tool_invoker', () => ({ ToolInvoker: class {} }));
jest.mock('../src/app/agent/tools/mcp/mcp_client', () => ({ MCPClient: class { getAvailableTools(){return []} async initialize(){} nativeToolInvoker={initialize: async()=>{}} } }));

jest.mock('../src/app/agent/bluma/core/bluma', () => {
  return {
    BluMaAgent: class {
      processTurn = jest.fn(async () => {});
      handleToolResponse = jest.fn(async () => {});
      getAvailableTools = jest.fn(() => []);
      getUiToolsDetailed = jest.fn(() => []);
      initialize = jest.fn(async () => {});
    },
  };
});

jest.mock('../src/app/agent/subagents/subagents_bluma', () => {
  return {
    SubAgentsBluMa: class {
      registerAndDispatch = jest.fn(async () => ({ ok: true }));
    },
  };
});

describe('Agent routing', () => {
  test('routes /init to subagents and others to core.processTurn', async () => {
    const bus = new EventEmitter();
    const agent = new Agent('routing-test', bus);
    await agent.initialize();

    // Spy internals via public method dispatchToSubAgent
    const dispatchSpy = jest.spyOn(agent as any, 'dispatchToSubAgent');
    const coreSpy = jest.spyOn((agent as any).core, 'processTurn');

    await agent.processTurn({ content: '/init' });
    expect(dispatchSpy).toHaveBeenCalled();

    await agent.processTurn({ content: 'hello world' });
    expect(coreSpy).toHaveBeenCalledWith({ content: 'hello world' });
  });
});
