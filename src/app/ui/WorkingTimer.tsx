import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";

export const WorkingTimer = () => {
  const [seconds, setSeconds] = useState(0);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const animator = setInterval(() => {
      setFrame((prev) => (prev + 1) % 10);
    }, 80);
    return () => clearInterval(animator);
  }, []);

  // Spinner elegante com Unicode
  const spinners = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const spinner = spinners[frame];

  return (
    <Box paddingX={1} marginBottom={0}>
      <Text color="magenta">{spinner}</Text>
      <Text dimColor> thinking</Text>
      <Text color="gray"> {seconds}s</Text>
    </Box>
  );
};