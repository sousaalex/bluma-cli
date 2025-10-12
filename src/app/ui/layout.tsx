import { Box, Text } from "ink";

export const Header = ({
  sessionId,
  workdir,
}: {
  sessionId: string;
  workdir: string;
}) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Branding clean - sem BigText desnecessário */}
      <Box marginBottom={1}>
        <Text bold color="magenta">BluMa</Text>
        <Text dimColor> • AI Coding Assistant</Text>
      </Box>

      {/* Info do workspace - design clean */}
      <Box flexDirection="column" paddingX={1} marginBottom={1}>
        <Box>
          <Text dimColor>workspace </Text>
          <Text color="cyan">{workdir}</Text>
        </Box>
        <Box marginTop={0}>
          <Text dimColor>session </Text>
          <Text color="gray">{sessionId.slice(0, 8)}...</Text>
        </Box>
      </Box>

      {/* Comandos disponíveis - formatação horizontal clean */}
      <Box paddingX={1}>
        <Text dimColor>
          /init  /tools  /mcp  /clear  /help
        </Text>
      </Box>
    </Box>
  );
};

export const SessionInfo = ({
  sessionId,
  workdir,
  toolsCount,
  mcpStatus,
}: {
  sessionId: string;
  workdir: string;
  toolsCount: number | null;
  mcpStatus: "connecting" | "connected";
}) => (
  <Box flexDirection="column" paddingX={1} marginBottom={1}>
    <Box>
      <Text dimColor>mcp </Text>
      <Text color={mcpStatus === "connected" ? "green" : "yellow"}>
        {mcpStatus === "connected" ? "●" : "○"}
      </Text>
      {toolsCount !== null && (
        <>
          <Text dimColor> • </Text>
          <Text color="gray">{toolsCount} tools</Text>
        </>
      )}
    </Box>
  </Box>
);