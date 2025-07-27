// Ficheiro: src/components/ToolResultDisplay.tsx

import React, { memo } from 'react';
import { Box, Text } from 'ink';

interface ToolResultDisplayProps {
  toolName: string;
  result: string;
}

const ToolResultDisplayComponent = ({ toolName, result }: ToolResultDisplayProps) => {
  const MAX_LINES = 3;

  // Ignora a renderização para estas ferramentas "silenciosas"
  if (
    toolName.includes("agent_end_task") ||
    toolName.includes("bluma_nootebook") ||
    toolName.includes("shell_command") ||
    toolName.includes("ls_tool") ||
    toolName.includes("count_file_lines") ||
    toolName.includes("read_file_lines") ||
    toolName.includes("edit_tool")
  ) {
    return null;
  }

  // Lógica de renderização especial para notificações do agente
  if (toolName.includes("message_notify_dev")) {
    try {
      const parsed = JSON.parse(result);
      if (parsed.content && parsed.content.body) {
        return (
          <Box flexDirection="column" marginBottom={1}>
            <Box>
              <Text color="magenta" bold>bluma</Text>
            </Box>
            <Box>
              <Text>{parsed.content.body}</Text>
            </Box>
          </Box>
        );
      }
    } catch (e) {
      // Se o JSON falhar, o fallback abaixo tratará disso
    }
  }

  // Fallback para todos os outros resultados de ferramentas
  let formattedResult = result;
  try {
    // Tenta formatar como JSON para uma leitura mais fácil
    const parsedJson = JSON.parse(result);
    formattedResult = JSON.stringify(parsedJson, null, 2);
  } catch (e) {
    // Se não for JSON, usa o resultado como está
    formattedResult = result;
  }

  // Lógica para truncar resultados muito longos
  const lines = formattedResult.split("\n");
  const isTruncated = lines.length > MAX_LINES;
  const visibleLines = isTruncated ? lines.slice(0, MAX_LINES) : lines;
  const remainingCount = lines.length - MAX_LINES;

  return (
    <Box flexDirection="column" marginBottom={1}>
      {visibleLines.map((line, idx) => (
        <Text key={idx} color="gray">{line}</Text>
      ))}
      {isTruncated && (
        <Text color="gray">...({remainingCount} more lines)</Text>
      )}
    </Box>
  );
};

export const ToolResultDisplay = memo(ToolResultDisplayComponent);