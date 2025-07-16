import React from 'react';
import { Box, Text } from 'ink';
import { blumaAscii } from './ui/AsciiArt';


//Section Header for chat
export const Header = () => (
    <Box>
	    <Text color="magenta">{blumaAscii}</Text>
    </Box>

);

//Section Info for chat
export const SessionInfo = ({ 
    sessionId, 
    toolsCount, 
    mcpStatus 
}: { 
    sessionId: string; 
    toolsCount: number | null; 
    mcpStatus: 'connecting' | 'connected' 
}) => (
    <Box borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column" marginBottom={1}>
			<Text>
				<Text bold color="white">localhost</Text> <Text color="gray" >session:</Text>{' '}
				<Text color="magenta">{sessionId}</Text>
			</Text>
			<Text>
				<Text color="magenta">↳</Text>{' '}
				<Text color="gray">
					workdir: C:\Users\sousa\Desktop\Projects\bluma-engineer
				</Text>
			</Text>
			<Text>
				<Text color="magenta">↳</Text> <Text color="gray">agent: BluMa</Text>
			</Text>
			<Text>
				{/* <Text color="magenta">↳</Text> <Text color="gray">MCP: </Text>
                <Text color={mcpStatus === 'connected' ? 'green' : 'yellow'}>
                    {mcpStatus === 'connected' ? 'connected' : 'connecting...'}
                </Text> */}
			</Text>
            {/* <Text>
				<Text color="magenta">↳</Text> <Text color="gray">Tools: {toolsCount || 'loading tools...'}</Text>
			</Text> */}
		</Box>
);

