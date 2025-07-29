// Ficheiro: src/components/WorkingSpinner.tsx

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

// Este componente lida com a sua própria animação,
// impedindo que o App principal se redesenhe a cada 100ms.
export const WorkingSpinner = () => {
  const [position, setPosition] = useState(0);
  const maxPosition = 3;

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => (prev >= maxPosition ? 0 : prev + 1));
    }, 100);
    return () => clearInterval(interval);
  }, []); // A dependência vazia [] garante que o intervalo é criado apenas uma vez.

  const spacesBeforeDot = ' '.repeat(position);
  const spacesAfterDot = ' '.repeat(maxPosition - position);

  return (
    <Box>
      <Text color="magenta">
        ({spacesBeforeDot}●{spacesAfterDot}) Working...
      </Text>
    </Box>
  );
};