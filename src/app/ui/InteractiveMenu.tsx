// Ficheiro: src/components/InteractiveMenu.tsx

import React, { useState, memo } from 'react';
import { Box, Text, useInput } from 'ink';

// --- Tipos (sem alterações) ---
export type Decision = 'accept' | 'decline' | 'accept_always';

interface InteractiveMenuProps {
  onDecision: (decision: Decision) => void;
}

// --- Componente Lógico (Agora com textos melhorados) ---
const InteractiveMenuComponent = ({ onDecision }: InteractiveMenuProps) => {
  // A MUDANÇA ESTÁ AQUI: Melhoramos os 'labels' para serem mais claros e cativantes.
  // Os 'values' ('accept', 'decline', etc.) permanecem os mesmos.
  const options = [
    { label: 'Yes, allow this command to run once', value: 'accept' as const },
    { label: 'No, cancel this command', value: 'decline' as const },
    { label: 'Always allow this type of command', value: 'accept_always' as const },
  ];
  
  const [selectedOption, setSelectedOption] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedOption(prev => (prev > 0 ? prev - 1 : options.length - 1));
    }
    if (key.downArrow) {
      setSelectedOption(prev => (prev < options.length - 1 ? prev + 1 : 0));
    }
    if (key.escape) {
      onDecision('decline');
    }
    if (key.return) {
      onDecision(options[selectedOption].value);
    }
  });

  return (
<Box marginTop={1} flexDirection="column">
  {/* A pergunta agora tem um espaço extra em baixo */}
  <Box paddingBottom={1}>
    <Text bold>Do you want to authorize the proposed command?</Text>
  </Box>
  
  {/* A lista de opções agora tem um espaço extra em cima */}
  <Box flexDirection="column" marginTop={1}>
    {options.map((option, index) => {
      const isSelected = selectedOption === index;
      return (
        // Adicionando um pequeno espaçamento vertical entre cada opção também
        <Box key={option.value} paddingLeft={1} paddingY={0}> 
          <Text color={isSelected ? 'cyan' : 'gray'}>
            {isSelected ? '❯ ' : '  '}
          </Text>
          <Text
            color={isSelected ? 'cyan' : 'white'}
            bold={isSelected}
            dimColor={!isSelected}
          >
            {option.label}
          </Text>
        </Box>
      );
    })}
  </Box>

  {/* A linha de ajuda também ganha um espaço maior em cima */}
  {/* <Box marginTop={2} marginLeft={1}>
    <Text dimColor>(Use ↑/↓ to navigate, Enter to confirm, Esc to cancel)</Text>
  </Box> */}
</Box>
  );
};

// --- Exportação Otimizada ---
export const InteractiveMenu = memo(InteractiveMenuComponent);