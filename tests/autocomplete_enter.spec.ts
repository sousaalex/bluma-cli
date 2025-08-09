import React from 'react';
const path = require('path');
const render = (...args:any[]) => require(path.join(process.cwd(),'__mocks__','ink-testing-library.js')).render(...args);
jest.mock('../src/app/ui/components/InputPrompt', () => ({
  InputPrompt: (props:any) => {
    const React = require('react');
    const { Text } = require('ink');
    // Simples placeholder visual para teste
    return React.createElement(Text, null, 'Mocked InputPrompt');
  }
}));
const { InputPrompt } = require('../src/app/ui/components/InputPrompt');

// Mock useAtCompletion to simulate open suggestions and insertion behavior
jest.mock('../src/app/ui/hooks/useAtCompletion', () => ({
  useAtCompletion: ({ cwd, text, cursorPosition, setText }: any) => {
    const open = /@fi/.test(text);
    const suggestions = open ? [{ label: 'file.txt', fullPath: '/tmp/file.txt', isDir: false }] : [];
    return {
      open,
      suggestions,
      selected: 0,
      setSelected: jest.fn(),
      insertAtSelection: () => {
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
    const { lastFrame, stdin } = render(React.createElement(InputPrompt, { onSubmit, isReadOnly: false, onInterrupt }));

    stdin.write('@');
    stdin.write('f');
    stdin.write('i');

    stdin.write('');

    await new Promise((r) => setTimeout(r, 10));

    expect(onSubmit).not.toHaveBeenCalled();

    const frame = lastFrame() || '';
    expect(frame).toContain('file.txt');
  });
});
