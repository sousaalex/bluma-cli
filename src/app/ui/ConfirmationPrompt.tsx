// Ficheiro: src/components/ConfirmationPrompt.tsx

import React from 'react';
import { Box, Text } from 'ink';
import { InteractiveMenu, Decision } from './InteractiveMenu.js';
// Importamos o registro e os renderizadores do nosso novo arquivo
import { promptRenderers, renderGeneric } from './components/promptRenderers.js';

interface ConfirmationPromptProps {
  toolCalls: any[];
  preview?: string | null; 
  onDecision: (decision: Decision) => void;
}

export const ConfirmationPrompt = ({ toolCalls, preview, onDecision }: ConfirmationPromptProps) => {
  const toolCall = toolCalls && toolCalls.length > 0 ? toolCalls[0] : null;

  if (!toolCall) {
    return <Box><Text color="yellow">Waiting for a valid command to confirm...</Text></Box>;
  }

  // 1. Encontra o nome da ferramenta.
  const toolName = toolCall.function.name;

  // 2. Procura no registro por uma função de renderização específica.
  // Se não encontrar, usa a função genérica como padrão.
  const renderFunction = promptRenderers[toolName] || renderGeneric;

  return (
    // A "MOLDURA" COMUM A TODOS OS PROMPTS
    <Box
      borderStyle="round"
      borderColor="gray" // Você pode deixar a cor dinâmica se quiser
      flexDirection="column"
      paddingX={1}
    >
      {/* 
        3. CHAMA A FUNÇÃO DE RENDERIZAÇÃO CORRETA PARA GERAR O "MIOLO"
        A função escolhida (renderShellCommand ou renderGeneric) retorna o JSX
        que será inserido aqui.
      */}
       {renderFunction({ toolCall, preview })}
      
      {/* O MENU INTERATIVO, COMUM A TODOS */}
      <InteractiveMenu onDecision={onDecision} />
    </Box>
  );
};