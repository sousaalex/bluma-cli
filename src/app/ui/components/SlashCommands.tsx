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

  const outBox = (children: React.ReactNode) => (
    <Box borderStyle="round" borderColor="gray" paddingX={1} marginBottom={1} flexDirection="column">
      {children}
    </Box>
  );

  const render = () => {
    // If no command is provided (e.g., user just typed "/"), render nothing to avoid visual noise
    if (!cmd) {
      return null;
    }

    if (cmd === 'help') {
      const cmds = getSlashCommands();
      return outBox(
        <>
          <Text color="cyan" bold>Available commands</Text>
          {cmds.map((c, i) => (
            <Text key={i} color="gray">{c.name} - {c.description}</Text>
          ))}
        </>
      );
    }

    if (cmd === 'clear') {
      setHistory(prev => prev.filter(item => item.id === 0 || item.id === 1));
      return outBox(<Text color="green">History cleared.</Text>);
    }

    if (cmd === 'init') {
      // Fire the /init subagent via Agent Core and avoid rendering any extra UI box to prevent duplication
      (async () => {
        try {
          await agentRef.current?.processTurn({ content: '/init' });
        } catch (e: any) {
          setHistory(prev => prev.concat({
            id: Date.now(),
            component: outBox(<Text color="red">Failed to execute /init: {e?.message || String(e)}</Text>)
          }));
        }
      })();
      return null; // prevent duplicate echo and error box
    }

    if (cmd === 'mcp') {
      const all = (agentRef.current as any)?.getUiToolsDetailed?.() || (agentRef.current as any)?.getAvailableTools?.() || [];
      const isMcp = (t: any) => (t.source?.toLowerCase?.() === 'mcp') || (!!t.server && t.server !== 'native');
      const tools = all.filter(isMcp);
      const term = (args?.[0] || '').toLowerCase();
      const filtered = term
        ? tools.filter((t: any) => (t.function?.name || t.name || 'tool').toLowerCase().includes(term))
        : tools;

      // Helper to pad strings to fixed width
      const pad = (s: string, n: number) => (s.length >= n ? s.slice(0, n - 1) + '…' : s.padEnd(n, ' '));
      const colName = 34;
      const colType = 10;
      const colSource = 18;

      return outBox(
        <>
          <Text color="cyan" bold>MCP Tools</Text>
          <Text color="gray">Total MCP: {tools.length}{term ? `  |  Filter: "${term}"  |  Showing: ${filtered.length}` : ''}</Text>
          {filtered.length === 0 ? (
            <Text color="yellow">No MCP tools to display.</Text>
          ) : (
            <Box flexDirection="column">
              <Text color="gray">{pad('Name', colName)} | {pad('Type', colType)} | {pad('Source', colSource)}</Text>
              <Text color="gray">{''.padEnd(colName, '-')}---{''.padEnd(colType, '-')}---{''.padEnd(colSource, '-')}</Text>
              {filtered.map((t: any, i: number) => {
                const name = (t.function?.name || t.name || 'tool') as string;
                const type = t.function?.name ? 'fn' : (t.type || 'tool');
                const source = t.source || t.provider || 'mcp';
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
          <Text color="cyan" bold>Native Tools</Text>
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
