const React = require('react');
const { render } = require('ink-testing-library');

// Import the component (JS entry points used in source)
const { InputPrompt } = require('../src/app/ui/components/InputPrompt.js');

// Mock useAtCompletion to simulate open suggestions and insertion behavior
jest.mock('../src/app/ui/hooks/useAtCompletion', () => ({
  useAtCompletion: ({ cwd, text, cursorPosition, setText }) => {
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
        const insertStart = match.index + 1;
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

    stdin.write(String.fromCharCode(13));

    await new Promise((r) => setTimeout(r, 20));

    expect(onSubmit).not.toHaveBeenCalled();

    const frame = lastFrame() || '';
    expect(frame).toContain('file.txt');
  });
});
