// Ficheiro: InputPrompt.tsx - CORRIGIDO SEM ALTERAR APP.TSX
import { Box, Text, useStdout, useInput } from "ink";
import { useCustomInput } from "../utils/useSimpleInputBuffer.js";
import { useEffect, useMemo, useState, useRef, memo } from "react";
import { EventEmitter } from "events";
import { filterSlashCommands } from "../utils/slashRegistry.js";
import { useAtCompletion } from "../hooks/useAtCompletion";

export const uiEventBus: EventEmitter = (global as any).__bluma_ui_eventbus__ || new EventEmitter();
(global as any).__bluma_ui_eventbus__ = uiEventBus;

interface InputPromptProps {
  onSubmit: (value: string) => void;
  isReadOnly: boolean;
  onInterrupt: () => void;
  disableWhileProcessing?: boolean;
}

// Componente memoizado para renderizar uma linha
const TextLine = memo(({ 
  line, 
  lineIndex,
  cursorLine,
  cursorCol,
  showCursor
}: { 
  line: string;
  lineIndex: number;
  cursorLine: number;
  cursorCol: number;
  showCursor: boolean;
}) => {
  const isCursorLine = lineIndex === cursorLine;
  
  if (!isCursorLine || !showCursor) {
    return <Text>{line}</Text>;
  }

  const before = line.slice(0, cursorCol);
  const char = line[cursorCol] || " ";
  const after = line.slice(cursorCol + 1);

  return (
    <Text>
      {before}
      <Text inverse color="magenta">{char}</Text>
      {after}
    </Text>
  );
}, (prev, next) => {
  if (prev.line !== next.line) return false;
  if (prev.showCursor !== next.showCursor) return false;
  
  const prevIsCursorLine = prev.lineIndex === prev.cursorLine;
  const nextIsCursorLine = next.lineIndex === next.cursorLine;
  
  if (prevIsCursorLine !== nextIsCursorLine) return false;
  if (nextIsCursorLine && prev.cursorCol !== next.cursorCol) return false;
  
  return true;
});
TextLine.displayName = "TextLine";

const PathSuggestions = memo(({ 
  suggestions, 
  selected 
}: { 
  suggestions: any[]; 
  selected: number;
}) => {
  const VISIBLE = 7;
  const total = suggestions.length;
  const sel = Math.max(0, Math.min(selected, total - 1));
  let start = Math.max(0, sel - Math.floor(VISIBLE / 2));
  if (start + VISIBLE > total) start = Math.max(0, total - VISIBLE);
  const windowItems = suggestions.slice(start, start + VISIBLE);

  return (
    <Box flexDirection="column" marginTop={1} height={Math.min(VISIBLE, total)}>
      {windowItems.map((s, idx) => {
        const realIdx = start + idx;
        const isSelected = realIdx === selected;
        return (
          <Box key={s.fullPath} paddingLeft={1} paddingY={0}>
            <Text color={isSelected ? "magenta" : "gray"}>
              {isSelected ? "❯ " : "  "}
            </Text>
            <Text color={isSelected ? "magenta" : "white"} bold={isSelected} dimColor={!isSelected}>
              {s.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
});
PathSuggestions.displayName = "PathSuggestions";

const SlashSuggestions = memo(({ 
  suggestions, 
  selectedIndex 
}: { 
  suggestions: any[]; 
  selectedIndex: number;
}) => (
  <Box flexDirection="column" marginTop={1}>
    {suggestions.map((s, idx) => {
      const isSelected = idx === selectedIndex;
      return (
        <Box key={s.name} paddingLeft={1} paddingY={0}>
          <Text color={isSelected ? "magenta" : "gray"}>
            {isSelected ? "❯ " : "  "}
          </Text>
          <Text color={isSelected ? "magenta" : "white"} bold={isSelected} dimColor={!isSelected}>
            {s.name} <Text color="gray">- {s.description}</Text>
          </Text>
        </Box>
      );
    })}
  </Box>
));
SlashSuggestions.displayName = "SlashSuggestions";

const Footer = memo(({ isReadOnly }: { isReadOnly: boolean }) => (
  <Box paddingX={1} justifyContent="center">
    <Text color="gray" dimColor>
      {isReadOnly 
        ? "ctrl+c to exit | Enter to send message | Shift+Enter for new line | esc interrupt"
        : "ctrl+c to exit | Enter to submit | Shift+Enter for new line | /help commands | esc interrupt"
      }
    </Text>
  </Box>
));
Footer.displayName = "Footer";

const TextLinesRenderer = memo(({ 
  lines,
  cursorLine,
  cursorCol,
  showCursor,
  showPlaceholder,
  placeholder
}: {
  lines: string[];
  cursorLine: number;
  cursorCol: number;
  showCursor: boolean;
  showPlaceholder: boolean;
  placeholder: string;
}) => {
  return (
    <>
      {lines.map((line, idx) => {
        const isFirstLine = idx === 0;
        
        return (
          <Box key={idx} flexDirection="row" paddingX={1}>
            {isFirstLine && <Text color="white">{">"} </Text>}
            {!isFirstLine && <Text color="gray">{"│"} </Text>}
            
            {showPlaceholder && isFirstLine && line.length === 0 ? (
              <Text dimColor>{placeholder}</Text>
            ) : (
              <TextLine
                line={line}
                lineIndex={idx}
                cursorLine={cursorLine}
                cursorCol={cursorCol}
                showCursor={showCursor}
              />
            )}
          </Box>
        );
      })}
    </>
  );
});
TextLinesRenderer.displayName = "TextLinesRenderer";

export const InputPrompt = memo(({ 
  onSubmit, 
  isReadOnly, 
  onInterrupt, 
  disableWhileProcessing = false 
}: InputPromptProps) => {
  const { stdout } = useStdout();
  const [viewWidth] = useState(() => stdout.columns - 6);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);

  // IMPORTANTE: permissiveOnSubmit respeita o comportamento original do App.tsx
  const permissiveOnSubmit = (value: string) => {
    const trimmed = (value || "").trim();
    
    if (isReadOnly) {
      // Em read-only: envia como user_overlay (comportamento original)
      if (trimmed.length > 0) {
        uiEventBus.emit("user_overlay", { kind: "message", payload: trimmed, ts: Date.now() });
      }
      return; // NÃO chama onSubmit!
    }
    
    // Fora de read-only: chama onSubmit normalmente
    onSubmit(value);
  };

  const { text, cursorPosition, setText } = useCustomInput({
    onSubmit: (value: string) => {
      if (disableWhileProcessing && isReadOnly) return;
      if (pathAutocomplete.open) return;
      permissiveOnSubmit(value);
    },
    viewWidth,
    isReadOnly: isReadOnly,
    onInterrupt,
  });

  const linesData = useMemo(() => {
    const lines = text.split('\n');
    
    let remainingChars = cursorPosition;
    let cursorLine = 0;
    let cursorCol = 0;

    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length;
      if (remainingChars <= lineLength) {
        cursorLine = i;
        cursorCol = remainingChars;
        break;
      }
      remainingChars -= lineLength + 1;
      
      if (i === lines.length - 1) {
        cursorLine = i;
        cursorCol = lineLength;
      }
    }

    return { lines, cursorLine, cursorCol, totalLines: lines.length };
  }, [text, cursorPosition]);

  const displayData = linesData;

  const placeholder = isReadOnly ? " Press Esc to cancel | Enter message while agent runs" : "";
  const showPlaceholder = text.length === 0 && isReadOnly;

  const slashQuery = useMemo(() => (text.startsWith("/") ? text : ""), [text]);
  const slashSuggestions = useMemo(() => {
    if (!slashQuery) return [];
    return filterSlashCommands(slashQuery);
  }, [slashQuery]);

  useEffect(() => {
    if (isReadOnly) {
      setSlashOpen(false);
      return;
    }
    if (text.startsWith("/")) {
      setSlashOpen(true);
      setSlashIndex(0);
    } else {
      setSlashOpen(false);
    }
  }, [text, isReadOnly]);

  useInput((input, key) => {
    if (!slashOpen) return;
    if (key.downArrow) {
      setSlashIndex((i) => Math.min(i + 1, Math.max(0, slashSuggestions.length - 1)));
    } else if (key.upArrow) {
      setSlashIndex((i) => Math.max(i - 1, 0));
    } else if (key.return) {
      const choice = slashSuggestions[slashIndex];
      if (choice) {
        setSlashOpen(false);
        try {
          setText(`${choice.name} `);
        } catch (e) {
          permissiveOnSubmit(`${choice.name} `);
        }
      }
    } else if (key.escape) {
      setSlashOpen(false);
    }
  }, { isActive: slashOpen });

  useEffect(() => {
    if ((globalThis as any).__BLUMA_FORCE_CURSOR_END__) {
      setText(text, text.length);
      delete (globalThis as any).__BLUMA_FORCE_CURSOR_END__;
    }
  }, [text, setText]);

  const cwd = process.cwd();
  const pathAutocomplete = useAtCompletion({ cwd, text, cursorPosition, setText });
  
  useInput((input, key) => {
    if (pathAutocomplete.open) {
      if (key.downArrow) {
        pathAutocomplete.setSelected((i) => Math.min(i + 1, Math.max(0, pathAutocomplete.suggestions.length - 1)));
        return;
      } else if (key.upArrow) {
        pathAutocomplete.setSelected((i) => Math.max(i - 1, 0));
        return;
      } else if (key.return || key.tab) {
        const selected = pathAutocomplete.suggestions[pathAutocomplete.selected];
        if (selected) {
          const before = text.slice(0, cursorPosition);
          const m = before.match(/@([\w\/.\-_]*)$/);
          if (m) {
            (globalThis as any).__BLUMA_SUPPRESS_SUBMIT__ = true;
            pathAutocomplete.insertAtSelection();
            return;
          }
        }
        return;
      } else if (key.escape) {
        pathAutocomplete.close();
        return;
      }
      return;
    }
  }, { isActive: true });

  return (
    <Box flexDirection="column">
      {disableWhileProcessing ? (
        <Box>
          <Box flexDirection="row" paddingX={1} flexWrap="nowrap">
            <Text color="white">{">"} </Text>
            <Text dimColor>ctrl+c to exit</Text>
          </Box>
        </Box>
      ) : (
        <>
          <Box flexDirection="column">
            <TextLinesRenderer
              lines={displayData.lines}
              cursorLine={displayData.cursorLine}
              cursorCol={displayData.cursorCol}
              showCursor={!isReadOnly}
              showPlaceholder={showPlaceholder}
              placeholder={placeholder}
            />
          </Box>

          {pathAutocomplete.open && pathAutocomplete.suggestions.length > 0 && (
            <PathSuggestions 
              suggestions={pathAutocomplete.suggestions} 
              selected={pathAutocomplete.selected}
            />
          )}

          {slashOpen && slashSuggestions.length > 0 && (
            <SlashSuggestions 
              suggestions={slashSuggestions} 
              selectedIndex={slashIndex}
            />
          )}
        </>
      )}

      <Footer isReadOnly={isReadOnly} />
    </Box>
  );
});

InputPrompt.displayName = "InputPrompt";