// Ficheiro: InputPrompt.tsx (Versão com cursor sempre visível + modo permissivo de overlays)
import { Box, Text, useStdout, useInput } from "ink";
import { useCustomInput } from "../utils/useSimpleInputBuffer.js";
// Nota: se o hook não expor setText, usamos submissão direta ao escolher o comando
import { useEffect, useMemo, useState } from "react";
import { EventEmitter } from "events";
import { filterSlashCommands, getSlashCommands } from "../utils/slashRegistry.js";

// Pequeno event bus singleton local para emitir overlays
// Em um app maior, esse EventEmitter deve vir de um provider/context global.
export const uiEventBus: EventEmitter = (global as any).__bluma_ui_eventbus__ || new EventEmitter();
(global as any).__bluma_ui_eventbus__ = uiEventBus;

interface InputPromptProps {
  onSubmit: (value: string) => void;
  isReadOnly: boolean;
  onInterrupt: () => void;
}

export const InputPrompt = ({ onSubmit, isReadOnly, onInterrupt }: InputPromptProps) => {
  const { stdout } = useStdout();
  
  const [viewWidth, setViewWidth] = useState(() => stdout.columns - 6);

  useEffect(() => {
    const onResize = () => setViewWidth(stdout.columns - 6);
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  // Wrapper para onSubmit em modo processing (read-only):
  // - Qualquer input não vazio do dev é emitido como mensagem simples ao backend
  // - Sem suporte a prefixos [hint|constraint|override|assume|cancel]
  const permissiveOnSubmit = (value: string) => {
    const trimmed = (value || "").trim();

    if (isReadOnly) {
      if (trimmed.length > 0) {
        const payload = trimmed;
        uiEventBus.emit('dev_overlay', { kind: 'message', payload, ts: Date.now() });
        return; // não envia para o fluxo normal para não poluir o chat
      }
      return; // ignore vazios enquanto read-only
    }

    // Fora do modo read-only: segue o fluxo normal
    onSubmit(value);
  };

  const { text, cursorPosition, viewStart } = useCustomInput({
    onSubmit: permissiveOnSubmit,
    viewWidth,
    isReadOnly,
    onInterrupt,
  });

  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);

  const visibleText = text.slice(viewStart, viewStart + viewWidth);
  const visibleCursorPosition = cursorPosition - viewStart;

  const textBeforeCursor = visibleText.slice(0, visibleCursorPosition);
  const charAtCursor = visibleText.slice(
    visibleCursorPosition,
    visibleCursorPosition + 1
  );
  const textAfterCursor = visibleText.slice(visibleCursorPosition + 1);

  // Cursor sempre visível: se não houver caractere sob o cursor, usamos um espaço visual
  const cursorGlyph = charAtCursor && charAtCursor.length > 0 ? charAtCursor : " ";

  // ALTERADO: A cor da borda agora reflete o estado de "read-only"
  const borderColor = isReadOnly ? "gray" : "gray";

  // Define o texto do placeholder. Só será mostrado quando o agente estiver a trabalhar.
  const placeholder = isReadOnly ? " press esc to cancel | type a message while agent processes" : "";

  // Determina se o placeholder deve ser mostrado
  const showPlaceholder = text.length === 0 && isReadOnly;

  const slashQuery = useMemo(() => (text.startsWith('/') ? text : ''), [text]);
  const slashSuggestions = useMemo(() => {
    if (!slashQuery) return [] as ReturnType<typeof filterSlashCommands>;
    return filterSlashCommands(slashQuery);
  }, [slashQuery]);

  useEffect(() => {
    if (isReadOnly) {
      setSlashOpen(false);
      return;
    }
    if (text.startsWith('/')) {
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
        const cmd = choice.name;
        setSlashOpen(false);
        // envia diretamente o comando escolhido, evitando necessidade de setText
        permissiveOnSubmit(cmd);
      }
    } else if (key.escape) {
      setSlashOpen(false);
    }
  }, { isActive: slashOpen });

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor={borderColor} borderDimColor={!isReadOnly} width={viewWidth -7} paddingY={0}>
        <Box flexDirection="row" paddingX={1} flexWrap="nowrap">
          <Text color="white" dimColor>{">"} </Text>
          
          {/* --- LÓGICA DE RENDERIZAÇÃO UNIFICADA --- */}
          {/* Esta estrutura agora funciona para todos os casos. */}
          
          {/* 1. Renderiza o texto antes do cursor (vazio se o input estiver vazio) */}
          <Text>{textBeforeCursor}</Text>
          
          {/* 2. Renderiza o cursor. Se não houver caractere, usa um espaço. Fica sempre visível. */}
          <Text inverse>{cursorGlyph}</Text>
          
          {/* 3. Renderiza o texto depois do cursor (ou o placeholder) */}
          {showPlaceholder ? (
            <Text dimColor>{placeholder}</Text>
          ) : (
            <Text>{textAfterCursor}</Text>
          )}
        </Box>
      </Box>

      {slashOpen && slashSuggestions.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          {slashSuggestions.map((s, idx) => {
            const isSelected = idx === slashIndex;
            return (
              <Box key={s.name} paddingLeft={1} paddingY={0}>
                <Text color={isSelected ? 'blue' : 'gray'}>
                  {isSelected ? '❯ ' : '  '}
                </Text>
                <Text color={isSelected ? 'blue' : 'white'} bold={isSelected} dimColor={!isSelected}>
                  {s.name} <Text color="gray">- {s.description}</Text>
                </Text>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Exibe o rodapé com a informação do desenvolvedor */}
      <Box paddingX={1} justifyContent="center">
          <Text color="gray" dimColor>
            ctrl+c to exit | /help to explore commands | esc to interrupt | {isReadOnly ? "Read-only mode (message passthrough)" : "Editable mode"}
          </Text>
        </Box>
    </Box>
  );
};