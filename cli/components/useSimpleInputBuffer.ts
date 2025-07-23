// Ficheiro: useSimpleInputBuffer.ts (VERSÃO CORRIGIDA)
import { useState, useCallback } from 'react';
import { useInput, type Key } from 'ink';

interface UseSimpleInputBufferProps {
  onSubmit: (value: string) => void;
}

export const useSimpleInputBuffer = ({ onSubmit }: UseSimpleInputBufferProps) => {
  const [text, setText] = useState('');
  const [cursorOffset, setCursorOffset] = useState(0);

  const cursorPosition = text.length - cursorOffset;

  useInput(
    (input, key: Key) => {
      // 1. Lidar com o Enter (Submit)
      if (key.return) {
        if (text.trim().length > 0) {
          onSubmit(text);
          setText('');
          setCursorOffset(0);
        }
        return;
      }

      // 2. Lidar com Backspace
      if (key.backspace || key.delete) {
        if (cursorPosition > 0) {
          const newText = text.slice(0, cursorPosition - 1) + text.slice(cursorPosition);
          setText(newText);
        }
        return;
      }

      // 3. Lidar com setas de navegação
      if (key.leftArrow) {
        if (cursorOffset < text.length) {
          setCursorOffset(cursorOffset + 1);
        }
        return;
      }

      if (key.rightArrow) {
        if (cursorOffset > 0) {
          setCursorOffset(cursorOffset - 1);
        }
        return;
      }

      // 4. Ignorar outras teclas de controlo
      if (key.ctrl || key.meta || key.shift || key.tab) {
        return;
      }

      // 5. Lidar com a inserção de texto (digitar e COLAR) - AQUI ESTÁ A CORREÇÃO
      
      // Removemos quaisquer quebras de linha do texto inserido para manter tudo numa só linha.
      const cleanInput = input.replace(/(\r\n|\n|\r)/gm, "");

      if (cleanInput.length > 0) {
        const newText = 
          text.slice(0, cursorPosition) + 
          cleanInput + 
          text.slice(cursorPosition);
        
        setText(newText);
        
        // IMPORTANTE: Após colar, o cursor não se move, o que significa que o
        // offset a partir do final do texto aumenta pelo comprimento do texto colado.
        // Se quiséssemos que o cursor fosse para o final do texto colado, faríamos:
        // setCursorOffset(cursorOffset); // (ou seja, não mudar o offset a partir do final)
        // Mas o comportamento padrão de um terminal é manter o cursor no mesmo sítio
        // relativo ao final da string, então não precisamos de fazer nada aqui.
        // A lógica atual já funciona bem.
      }
    },
    { isActive: true }
  );

  return {
    text,
    cursorPosition,
  };
};