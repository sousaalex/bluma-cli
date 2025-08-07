import React from 'react';
import { render } from 'ink-testing-library';
import { EventEmitter } from 'events';
import { InputPrompt } from '../src/app/ui/components/InputPrompt.js';

// Mock useAtCompletion to simulate open suggestions and insertion behavior
jest.mock('../src/app/ui/hooks/useAtCompletion', () => ({
  useAtCompletion: ({ cwd, text, cursorPosition, setText }: any) => {
    // Simple simulation: if text contains '@fi' return one suggestion 'file.txt'
    const open = /@fi/.test(text);
    const suggestions = open ? [{ label: 'file.txt', fullPath: '/tmp/file.txt', isDir: false }] : [];
    return {
      open,
      suggestions,
      selected: 0,
      setSelected: jest.fn(),
      insertAtSelection: () => {
        // Insert the suggestion at the cursor; emulate the real hook's behavior by calling setText
        const match = text.slice(0, cursorPosition).match(/@([\w\/.\-_]*)$/);
        if (!match) return;
        const insertStart = match.index! + 1;
        const before = text.slice(0, insertStart);
        const after = text.slice(cursorPosition);
        const newText = before + 'file.txt' + after + ' ';
        setText(newText, true);
      },
      close: jest.fn(),
      update: jest.fn(),
    };
  },
}));

describe('autocomplete Enter integration', () => {
  test('Enter inserts suggestion and does not submit', async () => {
    const onSubmit = jest.fn();
    const onInterrupt = jest.fn();
    const { lastFrame, stdin } = render(<InputPrompt onSubmit={onSubmit} isReadOnly={false} onInterrupt={onInterrupt} />);

    // Type: @fi and then press Enter to trigger insertion
    stdin.write('@');
    stdin.write('f');
    stdin.write('i');

    // Press Enter
    stdin.write('');

    // Allow event loop to process
    await new Promise((r) => setTimeout(r, 10));

    // onSubmit should NOT have been called
    expect(onSubmit).not.toHaveBeenCalled();

    // The buffer should now contain 'file.txt ' visually
    const frame = lastFrame() || '';
    expect(frame).toContain('file.txt');
  });
});
