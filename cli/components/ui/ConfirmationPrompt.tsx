import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

// --- Tipos ---
type Decision = 'accept' | 'decline' | 'accept_always';

// --- Funções Utilitárias ---
const formatArguments = (args: any): string => {
  if (typeof args === 'string') {
    try {
      return JSON.stringify(JSON.parse(args), null, 2);
    } catch (e) {
      return args;
    }
  }
  return JSON.stringify(args, null, 2);
};

// --- Componente Principal Exportado ---

interface ConfirmationPromptProps {
  // A prop continua a mesma do App.tsx: uma lista de tool calls.
  // Sabemos que ela terá no máximo 1 item.
  toolCalls: any[];
  onDecision: (decision: Decision) => void;
}

export const ConfirmationPrompt = ({ toolCalls, onDecision }: ConfirmationPromptProps) => {
  const options = ['Accept', 'Decline', 'Accept Always'];
  const [selectedOption, setSelectedOption] = useState(0);

  // Pega a única tool call da lista. Se a lista estiver vazia por algum motivo,
  // o componente não renderizará nada de útil, o que é um fallback seguro.
  const toolCall = toolCalls && toolCalls.length > 0 ? toolCalls[0] : null;

  useInput((input, key) => {
    // Não faz nada se não houver uma tool call para decidir
    if (!toolCall) return;

    if (key.upArrow) {
      setSelectedOption(prev => (prev > 0 ? prev - 1 : options.length - 1));
    }
    if (key.downArrow) {
      setSelectedOption(prev => (prev < options.length - 1 ? prev + 1 : 0));
    }
    if (key.return) {
      const decisionMap = {
        'Accept': 'accept',
        'Decline': 'decline',
        'Accept Always': 'accept_always',
      } as const;

      const selectedKey = options[selectedOption] as keyof typeof decisionMap;
      const decision = decisionMap[selectedKey];
      onDecision(decision);
    }
  });

  // Se por algum motivo não houver tool call, não renderiza o prompt.
  // Isso evita que a aplicação quebre.
  if (!toolCall) {
    return (
        <Box>
            <Text color="yellow">Waiting for a valid command to confirm...</Text>
        </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="white" padding={1}>
      <Text bold color="magentaBright">BluMa Need Permission</Text>

      {/* Exibe a única tool call */}
      <Box
        flexDirection="column"
        marginTop={1}
        paddingX={1}
        paddingY={0}
        borderStyle="classic"
        borderColor="gray"
      >
        <Text color="white" bold>{`#1: ${toolCall.function.name}`}</Text>
        <Text color="gray">{formatArguments(toolCall.function.arguments)}</Text>
      </Box>

      {/* As opções de decisão */}
      <Box marginTop={1} flexDirection="column">
        <Text bold>Allow command?</Text>
        {options.map((option, index) => (
          <Box key={option} paddingLeft={2}>
            <Text color={selectedOption === index ? 'magenta' : 'white'}>
              {selectedOption === index ? '→ ' : '  '}
              {option}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};