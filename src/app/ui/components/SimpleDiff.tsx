// Ficheiro: src/components/SimpleDiff.tsx
import { Box, Text } from 'ink';

interface SimpleDiffProps {
  text: string;
  maxHeight: number;
}

/**
 * Renderiza diff com cores e truncamento elegante
 */
export const SimpleDiff = ({ text, maxHeight }: SimpleDiffProps) => {
  const allLines = (text || '').split('\n').filter(line => line !== '');

  const isTruncated = maxHeight > 0 && allLines.length > maxHeight;
  const linesToRender = isTruncated ? allLines.slice(-maxHeight) : allLines;
  const hiddenCount = allLines.length - linesToRender.length;

  return (
    <Box flexDirection="column" paddingX={2}>
      {/* Indicador de truncamento - design clean */}
      {isTruncated && (
        <Box marginBottom={0}>
          <Text dimColor>⋯ {hiddenCount} lines hidden</Text>
        </Box>
      )}

      {/* Renderiza as linhas do diff */}
      {linesToRender.map((line, index) => {
        // Ignora headers do diff para UI mais limpa
        if (line.startsWith('---') || line.startsWith('+++')) {
          return null;
        }

        let color: string = "white";
        let prefix = '';
        
        if (line.startsWith('+')) {
          color = "green";
          prefix = '+ ';
        } else if (line.startsWith('-')) {
          color = "red";
          prefix = '- ';
        } else if (line.startsWith('@@')) {
          color = "cyan";
          prefix = '';
        } else {
          // Linhas de contexto - mais discretas
          color = "gray";
          prefix = '  ';
        }

        return (
          <Box key={index}>
            <Text color={color}>
              {prefix}{line.replace(/^[+\-]/, '')}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
};

export default SimpleDiff;