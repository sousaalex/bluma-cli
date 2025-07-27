// Em: src/components/components/SimpleDiff.tsx

import React from 'react';
import { Box, Text } from 'ink';

interface SimpleDiffProps {
  text: string;
  maxHeight: number;
}

/**
 * Renderiza uma string de diff com cores, truncamento e prefixo de linha.
 */
export const SimpleDiff = ({ text, maxHeight }: SimpleDiffProps) => {
  const allLines = (text || '').split('\n');
  
  if (allLines.length > 0 && allLines[allLines.length - 1] === '') {
    allLines.pop();
  }

  const isTruncated = maxHeight > 0 && allLines.length > maxHeight;
  const linesToRender = isTruncated ? allLines.slice(-maxHeight) : allLines;
  const hiddenCount = allLines.length - linesToRender.length;

  return (
    <Box flexDirection="column">
      {/* MENSAGEM DE TRUNCAMENTO MELHORADA */}
      {isTruncated && (
        <Box marginLeft={2}>
            <Text dimColor>... {hiddenCount} lines hidden ...</Text>
        </Box>
      )}

      {/* Renderiza as linhas selecionadas com o prefixo ↳ */}
      {linesToRender.map((line, index) => {
        // Ignora os cabeçalhos '---' e '+++' do diff para uma UI mais limpa
        if (line.startsWith('---') || line.startsWith('+++')) {
          return null;
        }

        let color: string = "white";
        if (line.startsWith('+')) {
          color = "green";
        } else if (line.startsWith('-')) {
          color = "red";
        } else if (line.startsWith('@@')) {
          color = "cyan";
        }

        return (
          <Text key={index} color={color}>
            {/* ADICIONA O PREFIXO '↳' PARA CONSISTÊNCIA */}
            <Text dimColor>  ↳ </Text>
            {line === '' ? ' ' : line}
          </Text>
        );
      })}
    </Box>
  );
};

export default SimpleDiff;