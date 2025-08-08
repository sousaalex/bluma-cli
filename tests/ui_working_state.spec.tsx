import React from 'react';
import { render } from 'ink-testing-library';
import { EventEmitter } from 'events';
import { App } from '../src/app/ui/App.js';

// UI test to ensure /init triggers working spinner and done clears it

describe('UI working state for /init', () => {
  test('sets isProcessing on /init and clears on done event', async () => {
    const bus = new EventEmitter();
    const { lastFrame, stdin } = render(<App eventBus={bus as any} sessionId={'ui-test'} />);

    // Simula MCP conectado
    bus.emit('backend_message', { type: 'status', status: 'mcp_connected', tools: 0 });

    // Envia comando /init
    stdin.write('/init');
    stdin.write('\n');

    // Deve exibir o WorkingTimer (procura por "Working" no frame)
    const frame1 = lastFrame() || '';
    expect(frame1.toLowerCase()).toContain('working');

    // Emite done e verifica que spinner some após ciclo
    bus.emit('backend_message', { type: 'done', status: 'completed' });

    // Avança o event loop
    await new Promise((r) => setTimeout(r, 10));

    const frame2 = lastFrame() || '';
    // Não deve conter "Working" após done
    expect(frame2.toLowerCase()).not.toContain('working');
  });
});
