// Ficheiro: InputPrompt.tsx (Solução IDEAL)
import { Box, Text, useStdout } from 'ink'; // Adicione useStdout
import { useSimpleInputBuffer } from '../useSimpleInputBuffer';
import { useEffect, useState } from 'react'; // Adicione useEffect e useState

interface InputPromptProps {
  onSubmit: (value: string) => void;
}

export const InputPrompt = ({ onSubmit }: InputPromptProps) => {
  const { text, cursorPosition } = useSimpleInputBuffer({ onSubmit });
  const { stdout } = useStdout(); // Hook para obter dimensões
  
  // Estado para guardar a largura disponível para o texto
  const [viewWidth, setViewWidth] = useState(stdout.columns - 6); // -6 para as bordas, prompt, etc.

  useEffect(() => {
    const onResize = () => {
      // Subtrai o espaço para "> ", bordas e padding
      setViewWidth(stdout.columns - 6); 
    };
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);

  // --- LÓGICA DE ROLAGEM HORIZONTAL ---
  const [viewStart, setViewStart] = useState(0);

  useEffect(() => {
    // Garante que o cursor está sempre visível
    const cursorIsBeforeView = cursorPosition < viewStart;
    const cursorIsAfterView = cursorPosition >= viewStart + viewWidth;

    if (cursorIsBeforeView) {
      // Se o cursor foi para a esquerda, para fora da vista, alinha a vista com o cursor
      setViewStart(cursorPosition);
    } else if (cursorIsAfterView) {
      // Se o cursor foi para a direita, para fora da vista, move a vista para a frente
      setViewStart(cursorPosition - viewWidth + 1);
    }
  }, [cursorPosition, viewWidth, viewStart]);
  
  // Corta a fatia visível do texto
  const visibleText = text.slice(viewStart, viewStart + viewWidth);
  const visibleCursorPosition = cursorPosition - viewStart;

  // Separa o texto visível em três partes
  const textBeforeCursor = visibleText.slice(0, visibleCursorPosition);
  const charAtCursor = visibleText.slice(visibleCursorPosition, visibleCursorPosition + 1);
  const textAfterCursor = visibleText.slice(visibleCursorPosition + 1);

  return (
    <Box borderStyle="round" borderColor="white">
      <Box flexDirection="row" alignItems="center" paddingX={1}>
        <Text bold>{'>'} </Text>
        
        {/* Renderiza a fatia visível do texto */}
        <Text>
          {textBeforeCursor}
          <Text inverse>{charAtCursor || ' '}</Text>
          {textAfterCursor}
        </Text>
      </Box>
    </Box>
  );
};