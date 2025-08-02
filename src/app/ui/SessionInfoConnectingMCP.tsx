// SessionInfoConnectingMCP.tsx
import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface Props {
  sessionId: string;
  workdir: string;
  statusMessage?: string | null;
}

// Mantém a mesma assinatura exportada e alinha visualmente ao SessionInfo
export const SessionInfoConnectingMCP: React.FC<Props> = ({ sessionId, workdir, statusMessage }) => {
  return (
    <Box 
      borderStyle="round"
      borderColor="gray"
      flexDirection="column"
      marginBottom={1}
    >
      {/* Linha principal: hostname e ID da sessão para consistência visual */}
      <Text>
        <Text bold color="white">localhost</Text>{' '}
        <Text color="gray"> session:</Text>{' '}
        <Text color="magenta">{sessionId}</Text>
      </Text>

      {/* Linha do diretório de trabalho */}
      <Text>
        <Text color="magenta">↳</Text>{' '}
        <Text color="gray">workdir: {workdir}</Text>
      </Text>

      {/* Linha de status MCP durante a conexão, com spinner */}
      {/* <Text>
        <Text color="magenta">↳</Text>{' '}
        <Text color="gray">mcp: </Text>
        <Text color="yellow"><Spinner type="dots" /> connecting</Text>
      </Text> */}

      {/* Mensagem dinâmica de status */}
      <Text>
        <Text color="magenta">↳</Text>{' '}
        <Text color="gray">mcp: </Text>
        <Text color="yellow"><Spinner type="dots" /> </Text>
        <Text color="white">{statusMessage || 'Please wait while we establish connections.'}</Text>
      </Text>
    </Box>
  );
};

export default SessionInfoConnectingMCP;
