import { Box, Text } from "ink";

// Estilizado: Header ASCII animado universal
import BigText from "ink-big-text";
const BRAND_COLORS = {
  main: "magenta",
  accent: "blue",
  shadow: "magenta",
  greydark: "#444",
};

const commands = [
  "/mcp - list tools connected via MCP",
  "/help - list commands",
  "/init - create a new BluMa.md file with codebase documentation",
  "/clear - clear history",
  "/tools - list native tools",
];

export const Header = ({
  sessionId,
  workdir,
}: {
  sessionId: string;
  workdir: string;
}) => {
  return (
    <Box flexDirection="column">
      {/* <Box flexDirection="column" height={8} marginBottom={1}>
        <BigText
          text="BluMa CLI"
          font="block"
          colors={[BRAND_COLORS.main, BRAND_COLORS.accent, BRAND_COLORS.shadow]}
        />
      </Box> */}

      <Box flexDirection="column" padding={1}  paddingY={1}>
        <Box marginBottom={1} flexDirection="row" alignItems="center">
        <Text dimColor>{'>_ '}</Text>
        <Text>BluMa is working in </Text>
        <Text color="magenta">{workdir}</Text>
      </Box>

        {commands.map((cmd, index) => (
          <Text key={index} dimColor>
            {cmd}
          </Text>
        ))}
      </Box>
    </Box>
  );
};


export const SessionInfo = ({
  sessionId, // ID único da sessão atual, para segregação ou rastreio
  workdir, // Diretório de trabalho atual do BluMa, útil para saber contexto da execução
  toolsCount, // Número de ferramentas ativas carregadas pelo MCP
  mcpStatus, // Estado da conexão central MCP (connecting/connected)
}: {
  sessionId: string; // Define o prop obrigatório da sessão
  workdir: string; // Define o prop obrigatório do diretório
  toolsCount: number | null; // Pode ser null se ainda carregando
  mcpStatus: "connecting" | "connected"; // String restrita para status
}) => (
  <Box
    borderStyle="round" // Borda arredondada para destaque visual
    borderColor="gray" // Borda cinza, mantém discreto mas separado
    flexDirection="column" // Empilha itens em coluna para melhor leitura
    marginBottom={1} // Espaço abaixo, separa visualmente dos próximos componentes
  >
    <Box marginLeft={1} flexDirection="column">
      <Text>
        <Text bold color="white">
          localhost
        </Text>
        <Text color="gray"> session:</Text>{" "}
        <Text color="magenta">{sessionId}</Text>
      </Text>
      <Text>
        <Text color="magenta">↳</Text>{" "}
        <Text color="gray">workdir: {workdir}</Text>
      </Text>
      <Text>
        <Text color="magenta">↳</Text> <Text color="gray">mcp: </Text>
        <Text color={mcpStatus === "connected" ? "green" : "yellow"}>
          {mcpStatus}
        </Text>
      </Text>
    </Box>
  </Box>
);
