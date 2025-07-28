// Ficheiro: InputPrompt.tsx (UI RADICALMENTE SIMPLIFICADA)
import { Box, Text, useStdout} from "ink"; // Adicione o Cursor
import { useCustomInput } from "./utils/useSimpleInputBuffer.js"; // Importe o novo hook
import { useEffect, useState } from "react";

interface InputPromptProps {
  onSubmit: (value: string) => void;
}

export const InputPrompt = ({ onSubmit }: InputPromptProps) => {
  const { stdout } = useStdout();
  
  const [viewWidth, setViewWidth] = useState(() => stdout.columns - 6);

  useEffect(() => {
    const onResize = () => setViewWidth(stdout.columns - 6);
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);

  const { text, cursorPosition, viewStart } = useCustomInput({
    onSubmit,
    viewWidth,
  });

  const visibleText = text.slice(viewStart, viewStart + viewWidth);
  const visibleCursorPosition = cursorPosition - viewStart;

  const textBeforeCursor = visibleText.slice(0, visibleCursorPosition);
  const charAtCursor = visibleText.slice(
    visibleCursorPosition,
    visibleCursorPosition + 1
  );
  const textAfterCursor = visibleText.slice(visibleCursorPosition + 1);

  return (
    <Box flexDirection="column">
      <Box borderStyle="round" borderColor="gray" borderDimColor>
        {/* A caixa de input com a estrutura correta */}
        <Box flexDirection="row" paddingX={1} flexWrap="nowrap">
          <Text color="white" dimColor>{">"} </Text>
          
          {/*
            A MUDANÇA FUNDAMENTAL ESTÁ AQUI:
            - Os 3 componentes de texto são agora "irmãos" diretos no Box, não aninhados.
            - Isto resolve o bug de quebra de linha de uma vez por todas.
          */}
          <Text>{textBeforeCursor}</Text>
          <Text inverse>{charAtCursor || " "}</Text>
          <Text>{textAfterCursor}</Text>

        </Box>
      </Box>

      <Box justifyContent="center" width="100%">
        <Text color="gray" dimColor>
          BluMa Senior Full Stack Developer
        </Text>
      </Box>
    </Box>
  );
};