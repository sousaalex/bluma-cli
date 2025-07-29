import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";

export const WorkingTimer = () => {
  const [seconds, setSeconds] = useState(0);
  const [dotIndex, setDotIndex] = useState(1); // Estado separado para os pontos

  useEffect(() => {
    const secondsTimer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(secondsTimer);
  }, []);

  useEffect(() => {
    const dotsTimer = setInterval(() => {
      setDotIndex((prev) => (prev % 3) + 1); // Cicla entre 1, 2, 3
    }, 100); // Atualiza os pontos a cada 300ms

    return () => clearInterval(dotsTimer);
  }, []);

  const dots = ".".repeat(dotIndex).padEnd(3, " ");

  return (
    <Box marginBottom={1} marginTop={1} paddingX={1}>
      <Text color="magenta" >
        {`working${dots}`}{` ${seconds}s`}
      </Text>
    </Box>
  );
};
