// Ficheiro: src/components/InteractiveMenu.tsx
import React, { useState, memo } from 'react';
import { Box, Text, useInput } from 'ink';

export type Decision = 'accept' | 'decline' | 'accept_always';

interface InteractiveMenuProps {
  onDecision: (decision: Decision) => void;
}

const InteractiveMenuComponent = ({ onDecision }: InteractiveMenuProps) => {
  const options = [
    { 
      key: 'y',
      label: 'Accept', 
      value: 'accept' as const,
      color: 'green'
    },
    { 
      key: 'n',
      label: 'Decline', 
      value: 'decline' as const,
      color: 'red'
    },
    { 
      key: 'a',
      label: 'Always Accept', 
      value: 'accept_always' as const,
      color: 'yellow'
    },
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
    // Atalhos de teclado diretos
    const option = options.find(opt => opt.key === input.toLowerCase());
    if (option) {
      onDecision(option.value);
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Header clean */}
      <Box marginBottom={1}>
        <Text bold>Authorize this action?</Text>
      </Box>
      
      {/* Opções com design minimalista */}
      <Box flexDirection="column" paddingLeft={1}>
        {options.map((option, index) => {
          const isSelected = selectedOption === index;
          return (
            <Box key={option.value} marginBottom={0}>
              <Text color={isSelected ? 'magenta' : 'gray'}>
                {isSelected ? '▸ ' : '  '}
              </Text>
              <Text
                color={isSelected ? option.color : 'gray'}
                bold={isSelected}
              >
                [{option.key}] {option.label}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Hint discreto */}
      <Box marginTop={1} paddingLeft={1}>
        <Text dimColor>↑↓ to select • Enter to confirm • Esc to cancel</Text>
      </Box>
    </Box>
  );
};

export const InteractiveMenu = memo(InteractiveMenuComponent);