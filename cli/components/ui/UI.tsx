// cli/UI.tsx (ou onde seu componente estiver) - VERSÃO FINAL

import React from 'react';
import { Box, Text } from 'ink';
import { blumaAscii } from './AsciiArt'; // Supondo que este caminho está correto

//Section Header for chat
export const Header = () => (
    <Box>
	    <Text color="magenta">{blumaAscii}</Text>
    </Box>
);

//Section Info for chat
export const SessionInfo = ({ 
    sessionId,
	workdir, 
    toolsCount, 
    mcpStatus 
}: { 
    sessionId: string;
	workdir: string;
    toolsCount: number | null; 
    mcpStatus: 'connecting' | 'connected';
}) => (
    <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column" marginBottom={1}>
		
        <Text>
            <Text bold color="white">localhost</Text> <Text color="gray" >session:</Text>{' '}
            <Text color="magenta">{sessionId}</Text>
        </Text>
        <Text>
            <Text color="magenta">↳</Text>{' '}
            <Text color="gray">
            workdir: {workdir}
            </Text>
        </Text>
        <Text>
            <Text color="magenta">↳</Text> <Text color="gray">agent: BluMa</Text>
        </Text>
        
        {/* --- INÍCIO DA ALTERAÇÃO --- */}
        {/* Descomente estas seções para mostrar o status dinâmico */}
        <Text>
            <Text color="magenta">↳</Text> <Text color="gray">MCP: </Text>
            <Text color={mcpStatus === 'connected' ? 'green' : 'yellow'}>
                {mcpStatus}
            </Text>
        </Text>
        <Text>
            <Text color="magenta">↳</Text> <Text color="gray">Tools: </Text>
            <Text color="cyan">
                {/* Mostra a contagem de ferramentas ou 'loading...' se for nulo */}
                {toolsCount !== null ? toolsCount : 'loading...'}
            </Text>
        </Text>
        {/* --- FIM DA ALTERAÇÃO --- */}
    </Box>
);