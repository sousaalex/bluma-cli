export type SlashCommand = {
  name: string;
  description: string;
};

export const getSlashCommands = (): SlashCommand[] => [
  { name: '/help', description: 'list commands' },
  { name: '/mcp', description: 'list tools connected via MCP' },
  { name: '/tools', description: 'list native tools' },
  { name: '/clear', description: 'clear history' },
];

export const filterSlashCommands = (query: string): SlashCommand[] => {
  const list = getSlashCommands();
  const q = query.toLowerCase();
  return list.filter(c => c.name.toLowerCase().startsWith(q));
};
