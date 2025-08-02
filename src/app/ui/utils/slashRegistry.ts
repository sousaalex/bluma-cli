export type SlashCommand = {
  name: string;
  description: string;
};

export const getSlashCommands = (): SlashCommand[] => [
  { name: "/help", description: "list commands" },
  { name: "/mcp", description: "list tools connected via MCP" },
  { name: "/tools", description: "list native tools" },
  { name: "/init", description: "create a new BluMa.md file with codebase documentation" },
  { name: "/clear", description: "clear history" },
];

// Incremental filter with ranking: prioritize prefix matches, then substring in name, then substring in description.
// Ordering within each tier:
//  - Longer common prefix first
//  - Then earlier occurrence index (for substring tiers)
//  - Then shorter command name (stability/readability)
export const filterSlashCommands = (query: string): SlashCommand[] => {
  const list = getSlashCommands();
  const q = (query || '').toLowerCase();
  if (!q) return list;

  const scored = list
    .map((c) => {
      const name = c.name.toLowerCase();
      const desc = c.description.toLowerCase();

      const isPrefix = name.startsWith(q);
      const nameIdx = name.indexOf(q);
      const descIdx = desc.indexOf(q);

      let tier = 3;
      let scorePrimary = 0; // longer is better for prefix
      let scoreSecondary = Number.MAX_SAFE_INTEGER; // smaller is better for index
      let scoreTertiary = name.length; // shorter is better

      if (isPrefix) {
        tier = 0;
        scorePrimary = q.length * -1; // negative to sort descending effectively with ascending comparator
        scoreSecondary = 0;
      } else if (nameIdx >= 0) {
        tier = 1;
        scorePrimary = 0;
        scoreSecondary = nameIdx;
      } else if (descIdx >= 0) {
        tier = 2;
        scorePrimary = 0;
        scoreSecondary = descIdx;
      }

      return { cmd: c, tier, scorePrimary, scoreSecondary, scoreTertiary };
    })
    .filter((s) => s.tier !== 3)
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.scorePrimary !== b.scorePrimary) return a.scorePrimary - b.scorePrimary;
      if (a.scoreSecondary !== b.scoreSecondary) return a.scoreSecondary - b.scoreSecondary;
      if (a.scoreTertiary !== b.scoreTertiary) return a.scoreTertiary - b.scoreTertiary;
      return a.cmd.name.localeCompare(b.cmd.name);
    });

  return scored.map((s) => s.cmd);
};
