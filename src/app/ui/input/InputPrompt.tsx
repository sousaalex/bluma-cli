// Ficheiro: InputPrompt.tsx (Versão com cursor sempre visível + modo permissivo de overlays)
import { Box, Text, useStdout} from "ink";
import { useCustomInput } from "./utils/useSimpleInputBuffer.js";
import { useEffect, useState } from "react";
import { EventEmitter } from "events";

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

  const visibleText = text.slice(viewStart, viewStart + viewWidth);
  const visibleCursorPosition = cursorPosition - viewStart;

  const textBeforeCursor = visibleText.slice(0, visibleCursorPosition);
  const charAtCursor = visibleText.slice(
    visibleCursorPosition,
    visibleCursorPosition + 1
  );
  const textAfterCursor = visibleText.slice(visibleCursorPosition + 1);

  // ALTERADO: A cor da borda agora reflete o estado de "read-only"
  const borderColor = isReadOnly ? "gray" : "gray";

  // Define o texto do placeholder. Só será mostrado quando o agente estiver a trabalhar.
  const placeholder = isReadOnly ? "press esc to cancel | type a message while agent processes" : "";

  // Determina se o placeholder deve ser mostrado
  const showPlaceholder = text.length === 0 && isReadOnly;

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor={borderColor} borderDimColor={!isReadOnly}>
        <Box flexDirection="row" paddingX={1} flexWrap="nowrap">
          <Text color="white" dimColor>{">"} </Text>
          
          {/* --- LÓGICA DE RENDERIZAÇÃO UNIFICADA --- */}
          {/* Esta estrutura agora funciona para todos os casos. */}
          
          {/* 1. Renderiza o texto antes do cursor (vazio se o input estiver vazio) */}
          <Text>{textBeforeCursor}</Text>
          
          {/* 2. Renderiza o cursor. Se não houver caractere, usa um espaço. Fica sempre visível. */}
          <Text inverse={!isReadOnly}>{charAtCursor || " "}</Text>
          
          {/* 3. Renderiza o texto depois do cursor (ou o placeholder) */}
          {showPlaceholder ? (
            <Text dimColor>{placeholder}</Text>
          ) : (
            <Text>{textAfterCursor}</Text>
          )}
        </Box>
      </Box>

      {/* Exibe o rodapé com a informação do desenvolvedor */}
      <Box paddingX={1} justifyContent="center">
          <Text color="gray" dimColor>
            ctrl+c to exit | esc to interrupt | {isReadOnly ? "Read-only mode (message passthrough)" : "Editable mode"}
          </Text>
        </Box>
    </Box>
  );
};