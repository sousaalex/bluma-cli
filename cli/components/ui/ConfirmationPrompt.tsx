// src/components/ui/ConfirmationPrompt.tsx

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ConfirmationPromptProps {
  toolCalls: any[];
  onDecision: (decision: 'accept' | 'decline' | 'accept_always') => void;
}

export const ConfirmationPrompt = ({ toolCalls, onDecision }: ConfirmationPromptProps) => {
  const [selectedOption, setSelectedOption] = useState(0);
  const options = ['Accept', 'Decline', 'Accept Always'];

  useInput((input, key) => {
    // Lógica para pressionar Enter (permanece a mesma)
    if (key.return) {
      if (selectedOption === 0) onDecision('accept');
      if (selectedOption === 1) onDecision('decline');
      if (selectedOption === 2) onDecision('accept_always');
    }

    // --- LÓGICA DE NAVEGAÇÃO ATUALIZADA ---
    if (key.downArrow) {
      // Vai para a próxima opção, mas volta ao início se chegar ao fim
      setSelectedOption((current) => (current + 1) % options.length);
    }

    if (key.upArrow) {
      // Vai para a opção anterior, mas vai para o fim se estiver no início
      setSelectedOption((current) => (current - 1 + options.length) % options.length);
    }
    // --- FIM DA LÓGICA DE NAVEGAÇÃO ---

    // Atalhos de teclado (ainda úteis, podem ser mantidos)
    if (input.toLowerCase() === 'y') onDecision('accept');
    if (input.toLowerCase() === 'n') onDecision('decline');
    if (input.toLowerCase() === 'a') onDecision('accept_always');
  });

  const formatArguments = (args: string) => {
    try {
      return JSON.stringify(JSON.parse(args), null, 2);
    } catch {
      return args;
    }
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1} marginBottom={1}>
    <Text bold color="magentaBright">🛠️  BluMa CLI - Tool Execution Request</Text>
    <Text>Wants to run the following tool(s):</Text>
  
    {toolCalls.map((tc, index) => (
      <Box 
        key={index} 
        flexDirection="column" 
        marginTop={1} 
        paddingX={1} 
        paddingY={0} 
        borderStyle="classic" 
        borderColor="gray"
      >
        <Text color="cyanBright" bold>{`#${index + 1}: ${tc.function.name}`}</Text>
        <Text color="gray">{formatArguments(tc.function.arguments)}</Text>
      </Box>
    ))}
  
    <Box marginTop={1} flexDirection="column">
      <Text bold>Do you want to proceed?</Text>
  
      {options.map((option, index) => (
        <Box key={option} paddingLeft={2}>
          <Text color={selectedOption === index ? 'greenBright' : 'white'}>
            {selectedOption === index ? '→ ' : '  '}
            {option}
          </Text>
        </Box>
      ))}
    </Box>
  </Box>
  
  );
};