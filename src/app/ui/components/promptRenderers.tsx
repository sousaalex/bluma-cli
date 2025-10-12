// Ficheiro: src/components/promptRenderers.tsx
import React from "react";
import { Box, Text } from "ink"; 
import path from "path";
import { SimpleDiff } from './SimpleDiff.js'; 

interface RenderProps {
  toolCall: any;
  preview?: string | null;
}

// --- Helper: Extrai apenas o nome do arquivo ---
const getBasePath = (filePath: string): string => {
  return path.basename(filePath);
};

// =============================================================================
// SHELL COMMAND - Design minimalista
// =============================================================================
export const renderShellCommand = ({ toolCall }: RenderProps): React.ReactElement => {
  let command = "";
  try {
    const args = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
    command = args.command || "[command not found]";
  } catch (e) {
    command = "Error parsing command";
  }

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box>
        <Text color="blue">▸</Text>
        <Text dimColor> shell</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text color="cyan">{command}</Text>
      </Box>
    </Box>
  );
};

// =============================================================================
// LS TOOL - Listagem de diretório
// =============================================================================
export const renderLsTool = ({ toolCall }: RenderProps): React.ReactElement => {
  let directoryPath = "[path not specified]";
  try {
    const args = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
    directoryPath = args.directory_path || "[path not specified]";
  } catch (e) {
    directoryPath = "Error parsing arguments";
  }

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box>
        <Text color="blue">▸</Text>
        <Text dimColor> ls</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text color="cyan">{directoryPath}</Text>
      </Box>
    </Box>
  );
};

// =============================================================================
// COUNT FILE LINES - Contagem de linhas
// =============================================================================
export const renderCountFilesLinesTool = ({ toolCall }: RenderProps): React.ReactElement => {
  let filepath = "[path not specified]";
  try {
    const args = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
    filepath = args.filepath || "[path not specified]";
  } catch (e) {
    filepath = "Error parsing arguments";
  }

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box>
        <Text color="blue">▸</Text>
        <Text dimColor> count lines</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text color="cyan">{filepath}</Text>
      </Box>
    </Box>
  );
};

// =============================================================================
// READ FILE LINES - Leitura de arquivo
// =============================================================================
export const renderReadFileLines = ({ toolCall }: RenderProps): React.ReactElement => {
  let filepath = "[path not specified]";
  let startLine = 0;
  let endLine = 0;

  try {
    const args = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
    filepath = args.filepath || "[path not specified]";
    startLine = args.start_line || 0;
    endLine = args.end_line || 0;
  } catch (e) {
    filepath = "Error parsing arguments";
  }

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box>
        <Text color="blue">▸</Text>
        <Text dimColor> read</Text>
      </Box>
      <Box paddingLeft={2} flexDirection="column">
        <Text color="cyan">{filepath}</Text>
        <Box paddingLeft={2}>
          <Text dimColor>lines </Text>
          <Text color="magenta">{startLine}</Text>
          <Text dimColor> to </Text>
          <Text color="magenta">{endLine}</Text>
        </Box>
      </Box>
    </Box>
  );
};

// =============================================================================
// EDIT TOOL - Edição de arquivo com diff
// =============================================================================
export const renderEditTool = ({ toolCall, preview }: RenderProps): React.ReactElement => {
  const diffMaxHeight = 5;
  let filepath = "[path not specified]";
  
  try {
    const args = JSON.parse(toolCall.function.arguments);
    filepath = args.file_path || "[path not specified]";
  } catch (e) {
    filepath = "Error parsing arguments";
  }

  const finalFileName = getBasePath(filepath);

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box>
        <Text color="blue">▸</Text>
        <Text dimColor> edit </Text>
        <Text color="cyan">{finalFileName}</Text>
      </Box>
      
      {preview ? (
        <Box marginTop={1}>
          <SimpleDiff text={preview} maxHeight={diffMaxHeight} />
        </Box>
      ) : (
        <Box paddingLeft={2}>
          <Text color="yellow">Generating preview...</Text>
        </Box>
      )}
    </Box>
  );
};

// =============================================================================
// GENERIC - Renderizador fallback elegante
// =============================================================================
export const renderGeneric = ({ toolCall }: RenderProps): React.ReactElement => {
  const toolName = toolCall.function.name;
  const rawArguments = toolCall.function.arguments;
  const MAX_LINES = 5;

  let formattedArgsString: string;
  if (!rawArguments) {
    formattedArgsString = "";
  } else if (typeof rawArguments === 'string') {
    try {
      const parsedJson = JSON.parse(rawArguments);
      formattedArgsString = JSON.stringify(parsedJson, null, 2);
    } catch (e) {
      formattedArgsString = rawArguments;
    }
  } else {
    formattedArgsString = JSON.stringify(rawArguments, null, 2);
  }

  const lines = formattedArgsString.split("\n");
  const isTruncated = lines.length > MAX_LINES;
  const visibleLines = isTruncated ? lines.slice(0, MAX_LINES) : lines;
  const remainingCount = lines.length - MAX_LINES;

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Box>
        <Text color="blue">▸</Text>
        <Text dimColor> {toolName}</Text>
      </Box>

      {formattedArgsString && (
        <Box paddingLeft={2} flexDirection="column">
          {visibleLines.map((line, idx) => (
            <Text key={idx} color="gray">{line}</Text>
          ))}
          {isTruncated && (
            <Text dimColor>⋯ {remainingCount} more lines</Text>
          )}
        </Box>
      )}
    </Box>
  );
};

// =============================================================================
// REGISTRO DE RENDERIZADORES
// =============================================================================
export const promptRenderers: {
  [key: string]: (props: RenderProps) => React.ReactElement;
} = {
  shell_command: renderShellCommand,
  ls_tool: renderLsTool,
  count_file_lines: renderCountFilesLinesTool,
  read_file_lines: renderReadFileLines,
  edit_tool: renderEditTool, 
};