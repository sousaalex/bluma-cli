// Ficheiro: src/components/ToolResultDisplay.tsx

import React, { memo } from 'react';
import { Box, Text } from 'ink';

interface ToolResultDisplayProps {
  toolName: string;
  result: string;
}

const ToolResultDisplayComponent = ({ toolName, result }: ToolResultDisplayProps) => {
  // NOVA LÓGICA:
  // Se o nome da ferramenta NÃO for "message_notify_user",
  // retorna null imediatamente e não renderiza nada.
  if (!toolName.includes("message_notify_user")) {
    return null;
  }

  // Se o código chegou até aqui, significa que toolName É "message_notify_user".
  // Agora, tentamos processar e exibir a mensagem específica dele.
  try {
    const parsed = JSON.parse(result);

    // Verifica se a estrutura esperada (content.body) existe no JSON
    if (parsed.content && parsed.content.body) {
      const bodyText = parsed.content.body.trim();
      return (
        <Box marginBottom={1} paddingX={1}>
          <Text>
            {/*  <Text color="white">● </Text> */}
            {bodyText}
          </Text>
        </Box>
      );
    }
  } catch (e) {
    // Se houver um erro ao analisar o JSON (não é um JSON válido),
    // também não mostramos nada.
    return null;
  }

  // Se o JSON for válido mas não tiver a estrutura esperada (content.body),
  // ou se qualquer outra condição não for atendida, retorna null como fallback.
  return null;
};

export const ToolResultDisplay = memo(ToolResultDisplayComponent);