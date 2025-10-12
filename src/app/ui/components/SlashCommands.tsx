
// Ficheiro: src/components/SlashCommands.tsx
import React from 'react';
import { Box, Text } from 'ink';
import type { Agent } from '../../agent/agent.js';
import { getSlashCommands } from '../utils/slashRegistry.js';

export interface SlashCommandsProps {
  input: string;
  setHistory: React.Dispatch<React.SetStateAction<{ id: number; component: React.ReactElement; }[]>>;
  agentRef: React.MutableRefObject<Agent | null>;
}

export const SlashCommands: React.FC<SlashCommandsProps> = ({ input, setHistory, agentRef }) => {
  const [cmd, ...args] = input.slice(1).trim().split(/\s+/);

  // Container padrão - design minimalista
  const outBox = (children: React.ReactNode) => (
    <Box 
      borderStyle="single" 
      borderColor="gray" 
      paddingX={2} 
      paddingY={0}
      marginBottom={1} 
      flexDirection="column"
    >
      {children}
    </Box>
  );

  const render = () => {
    if (!cmd) {
      return null;
    }

    // =======================================================================
    // /help - Lista de comandos
    // =======================================================================
    if (cmd === 'help') {
      const cmds = getSlashCommands();
      return outBox(
        <>
          <Box marginBottom={1}>
            <Text bold color="magenta">Available Commands</Text>
          </Box>
          <Box flexDirection="column">
            {cmds.map((c, i) => (
              <Box key={i}>
                <Text color="cyan">{c.name.padEnd(12)}</Text>
                <Text dimColor>{c.description}</Text>
              </Box>
            ))}
          </Box>
        </>
      );
    }

    // =======================================================================
    // /clear - Limpar histórico
    // =======================================================================
    if (cmd === 'clear') {
      setHistory(prev => prev.filter(item => item.id === 0 || item.id === 1));
      return outBox(
        <Box>
          <Text color="green">✓</Text>
          <Text dimColor> History cleared</Text>
        </Box>
      );
    }

    // =======================================================================
    // /init - Inicializar documentação
    // =======================================================================
    if (cmd === 'init') {
      (async () => {
        try {
          await agentRef.current?.processTurn({ content: '/init' });
        } catch (e: any) {
          setHistory(prev => prev.concat({
            id: Date.now(),
            component: outBox(
              <Box>
                <Text color="red">✖ Failed to execute /init: {e?.message || String(e)}</Text>
              </Box>
            )
          }));
        }
      })();
      return null;
    }

    // =======================================================================
    // /mcp - Ferramentas MCP
    // =======================================================================
    if (cmd === 'mcp') {
      const all = (agentRef.current as any)?.getUiToolsDetailed?.() || 
                  (agentRef.current as any)?.getAvailableTools?.() || [];
      const isMcp = (t: any) => 
        (t.source?.toLowerCase?.() === 'mcp') || 
        (!!t.server && t.server !== 'native');
      const tools = all.filter(isMcp);
      const term = (args?.[0] || '').toLowerCase();
      const filtered = term
        ? tools.filter((t: any) => 
            (t.function?.name || t.name || 'tool').toLowerCase().includes(term))
        : tools;

      const pad = (s: string, n: number) => 
        (s.length >= n ? s.slice(0, n - 1) + '…' : s.padEnd(n, ' '));
      const colName = 34;
      const colType = 10;
      const colSource = 18;

      return outBox(
        <>
          <Box marginBottom={1}>
            <Text bold color="magenta">MCP Tools</Text>
            <Text dimColor> • </Text>
            <Text dimColor>{tools.length} total</Text>
            {term && (
              <>
                <Text dimColor> • filter: </Text>
                <Text color="cyan">"{term}"</Text>
                <Text dimColor> • showing: {filtered.length}</Text>
              </>
            )}
          </Box>

          {filtered.length === 0 ? (
            <Text color="yellow">No MCP tools found</Text>
          ) : (
            <Box flexDirection="column">
              <Box>
                <Text color="gray">
                  {pad('Name', colName)} │ {pad('Type', colType)} │ {pad('Source', colSource)}
                </Text>
              </Box>
              <Text color="gray">{'─'.repeat(colName + colType + colSource + 6)}</Text>
              {filtered.map((t: any, i: number) => {
                const name = (t.function?.name || t.name || 'tool') as string;
                const type = t.function?.name ? 'fn' : (t.type || 'tool');
                const source = t.source || t.provider || 'mcp';
                return (
                  <Text key={i} color="white">
                    {pad(name, colName)} │ {pad(String(type), colType)} │ {pad(String(source), colSource)}
                  </Text>
                );
              })}
            </Box>
          )}
        </>
      );
    }

    if (cmd === 'tools') {
      const all = (agentRef.current as any)?.getUiToolsDetailed?.() || (agentRef.current as any)?.getAvailableTools?.() || [];
      // Dynamic classification: native = anything that is NOT tagged as MCP
      const isMcp = (t: any) => (t.source?.toLowerCase?.() === 'mcp') || (!!t.server && t.server !== 'native');
      const tools = all.filter((t: any) => !isMcp(t));
      const term = (args?.[0] || '').toLowerCase();
      const filtered = term
        ? tools.filter((t: any) => (t.function?.name || t.name || 'tool').toLowerCase().includes(term))
        : tools;

      const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n - 1) + '…' : s.padEnd(n, ' '));
      const colName = 34;
      const colType = 10;
      const colSource = 18;

      return outBox(
        <>
          <Text color="magenta" bold>Native Tools</Text>
          <Text color="gray">Total Native: {tools.length}{term ? `  |  Filter: "${term}"  |  Showing: ${filtered.length}` : ''}</Text>
          {filtered.length === 0 ? (
            <Text color="yellow">No native tools to display.</Text>
          ) : (
            <Box flexDirection="column">
              <Text color="gray">{pad('Name', colName)} | {pad('Type', colType)} | {pad('Source', colSource)}</Text>
              <Text color="gray">{''.padEnd(colName, '-')}---{''.padEnd(colType, '-')}---{''.padEnd(colSource, '-')}</Text>
              {filtered.map((t: any, i: number) => {
                const name = (t.function?.name || t.name || 'tool') as string;
                const type = t.function?.name ? 'fn' : (t.type || 'tool');
                const source = t.source || 'native';
                return (
                  <Text key={i} color="white">
                    {pad(name, colName)} | {pad(String(type), colType)} | {pad(String(source), colSource)}
                  </Text>
                );
              })}
            </Box>
          )}
        </>
      );
    }

    // Only show error if there is a command but it's not recognized
    return outBox(<Text color="red">Command not recognized: /{cmd}</Text>);
  };

  return (
    <>
      {render()}
    </>
  );
};

export default SlashCommands;
