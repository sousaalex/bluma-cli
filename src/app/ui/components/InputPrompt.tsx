// Ficheiro: InputPrompt.tsx (Versão com cursor sempre visível + modo permissivo de overlays)
import { Box, Text, useStdout, useInput } from "ink";
import { useCustomInput } from "../utils/useSimpleInputBuffer.js";
// Nota: se o hook não expor setText, usamos submissão direta ao escolher o comando
import { useEffect, useMemo, useState } from "react";
import { EventEmitter } from "events";
import { filterSlashCommands } from "../utils/slashRegistry.js";
import { useAtCompletion } from "../hooks/useAtCompletion";
// Pequeno event bus singleton local para emitir overlays
// Em um app maior, esse EventEmitter deve vir de um provider/context global.
export const uiEventBus: EventEmitter = (global as any).__bluma_ui_eventbus__ || new EventEmitter();
(global as any).__bluma_ui_eventbus__ = uiEventBus;

interface InputPromptProps {
  onSubmit: (value: string) => void;
  isReadOnly: boolean;
  onInterrupt: () => void;
  disableWhileProcessing?: boolean; // when true, input fica TOTALMENTE bloqueado
}

export const InputPrompt = ({ onSubmit, isReadOnly, onInterrupt, disableWhileProcessing = false }: InputPromptProps) => {
  // 1) HOOKS SEMPRE NO TOPO, SEM RETORNOS ANTES
  const { stdout } = useStdout();
  const [viewWidth, setViewWidth] = useState(() => stdout.columns - 6);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);

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
        uiEventBus.emit("user_overlay", { kind: "message", payload, ts: Date.now() });
        return; // não envia para o fluxo normal para não poluir o chat
      }
      return; // ignore vazios enquanto read-only
    }

    // Fora do modo read-only: segue o fluxo normal
    onSubmit(value);
  };

  const effectiveReadOnly = isReadOnly;

  const { text, cursorPosition, viewStart, setText } = useCustomInput({
    onSubmit: (value: string) => {
      if (disableWhileProcessing && isReadOnly) return; // ignore submissions while processing
      permissiveOnSubmit(value);
    },
    viewWidth,
    isReadOnly: effectiveReadOnly,
    onInterrupt,
  });

  // PREPARO DE VARIÁVEIS DERIVADAS (independente do retorno condicional)
  const visibleText = text.slice(viewStart, viewStart + viewWidth);
  const visibleCursorPosition = cursorPosition - viewStart;
  const textBeforeCursor = visibleText.slice(0, visibleCursorPosition);
  const charAtCursor = visibleText.slice(visibleCursorPosition, visibleCursorPosition + 1);
  const textAfterCursor = visibleText.slice(visibleCursorPosition + 1);

  // Cursor sempre visível: se não houver caractere sob o cursor, usamos um espaço visual
  const cursorGlyph = charAtCursor && charAtCursor.length > 0 ? charAtCursor : " ";

  // ALTERADO: A cor da borda agora reflete o estado de "read-only"
  const borderColor = isReadOnly ? "gray" : "gray";

  // Define o texto do placeholder. Só será mostrado quando o agente estiver a trabalhar.
  const placeholder = isReadOnly ? " Press Esc to cancel | Enter message while agent runs" : "";

  // Determina se o placeholder deve ser mostrado
  const showPlaceholder = text.length === 0 && isReadOnly;

  const slashQuery = useMemo(() => (text.startsWith("/") ? text : ""), [text]);
  const slashSuggestions = useMemo(() => {
    if (!slashQuery) return [] as ReturnType<typeof filterSlashCommands>;
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
        const cmd = choice.name;
        setSlashOpen(false);
        // Insere o comando completo no input buffer em vez de submeter imediatamente
        try {
          setText(`${cmd} `, true);
        } catch (e) {
          // Se o hook não expor setText por algum motivo, fallback para submissão direta (compatibilidade)
          permissiveOnSubmit(`${cmd} `);
        }
      }
    } else if (key.escape) {
      setSlashOpen(false);
    }
  }, { isActive: slashOpen });

  // 2) RENDERIZAÇÃO: EVITAR EARLY RETURN QUE ALTERE ORDEM DE HOOKS

  // --- Path Autocomplete Integration ---
  const cwd = process.cwd();
  const pathAutocomplete = useAtCompletion({ cwd, text, cursorPosition, setText });
  useInput((input, key) => {
    if (!pathAutocomplete.open) return;
    if (key.downArrow) {
      pathAutocomplete.setSelected((i) => Math.min(i + 1, Math.max(0, pathAutocomplete.suggestions.length - 1)));
    } else if (key.upArrow) {
      pathAutocomplete.setSelected((i) => Math.max(i - 1, 0));
    } else if (key.return || key.tab) {
      pathAutocomplete.insertAtSelection();
    } else if (key.escape) {
      pathAutocomplete.close();
    }
  }, { isActive: pathAutocomplete.open });

  return (
    <Box flexDirection="column">
      {disableWhileProcessing ? (
        // Modo bloqueado visualmente, mantendo hooks estáveis
        <>
          <Box borderStyle="round" borderColor="gray" borderDimColor>
            <Box flexDirection="row" paddingX={1} flexWrap="nowrap">
              <Text color="white">{">"} </Text>
              <Text dimColor>ctrl+c to exit</Text>
            </Box>
          </Box>
        </>
      ) : (
        <>
          <Box borderStyle="round" borderColor={borderColor} borderDimColor={!isReadOnly}>
            <Box flexDirection="row" paddingX={1} flexWrap="nowrap">
              <Text color="white">{">"} </Text>
              {/* 1. Texto antes do cursor */}
              <Text>{textBeforeCursor}</Text>
              {/* 2. Cursor sempre visível */}
              <Text inverse>{cursorGlyph}</Text>
              {/* 3. Texto depois do cursor ou placeholder */}
              {showPlaceholder ? (
                <Text dimColor>{placeholder}</Text>
              ) : (
                <Text>{textAfterCursor}</Text>
              )}
            </Box>
          </Box>

          {/* SUGESTÃO PATH AUTOCOMPLETE */}
          {pathAutocomplete.open && pathAutocomplete.suggestions.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              {pathAutocomplete.suggestions.map((s, idx) => {
                const isSelected = idx === pathAutocomplete.selected;
                return (
                  <Box key={s.fullPath} paddingLeft={1} paddingY={0}>
                    <Text color={isSelected ? "cyan" : "gray"}>
                      {isSelected ? "❯ " : "  "}
                    </Text>
                    <Text color={isSelected ? "cyan" : "white"} bold={isSelected} dimColor={!isSelected}>
                      {s.label}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          )}

          {slashOpen && slashSuggestions.length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              {slashSuggestions.map((s, idx) => {
                const isSelected = idx === slashIndex;
                return (
                  <Box key={s.name} paddingLeft={1} paddingY={0}>
                    <Text color={isSelected ? "blue" : "gray"}>
                      {isSelected ? "❯ " : "  "}
                    </Text>
                    <Text color={isSelected ? "blue" : "white"} bold={isSelected} dimColor={!isSelected}>
                      {s.name} <Text color="gray">- {s.description}</Text>
                    </Text>
                  </Box>
                );
              })}
            </Box>
          )}
        </>
      )}

      {/* Rodapé informativo */}
      <Box paddingX={1} justifyContent="center">
        <Text color="gray" dimColor>
          ctrl+c to exit | /help to explore commands | esc to interrupt | {isReadOnly ? "Read-only mode (message passthrough)" : "Editable mode"}
        </Text>
      </Box>
    </Box>
  );
};