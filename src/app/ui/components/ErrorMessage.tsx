import React from "react";
import { Box, Text } from "ink";

export interface ErrorMessageProps {
  message: string;
  details?: string;
  hint?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, details, hint }) => {
  return (
    <Box
      borderStyle="round"
      borderColor="red"
      paddingX={1}
      paddingY={0}
      flexDirection="column"
      marginBottom={1}
    >
      <Text color="red" bold>
        Error
      </Text>
      <Text color="red">{message}</Text>
      {details ? (
        <Text color="red" dimColor>
          {details}
        </Text>
      ) : null}
      {hint ? (
        <Text color="gray">
          Hint: {hint}
        </Text>
      ) : null}
    </Box>
  );
};

export default ErrorMessage;
