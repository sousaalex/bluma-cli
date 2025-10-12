// Ficheiro: src/components/toolCallRenderers.tsx
import React from "react";
import { Box, Text } from "ink";
import { SimpleDiff } from "./SimpleDiff.js";
import path from "path";

interface RenderProps {
  toolName: string;
  args: any;
  preview?: string;
}

const formatArgumentsForDisplay = (args: any): string => {
  if (typeof args === "string") {
    try {
      return JSON.stringify(JSON.parse(args), null, 2);
    } catch (e) {
      return args;
    }
  }
  return JSON.stringify(args, null, 2);
};

// =============================================================================
// SHELL COMMAND - Resultado de execução
// =============================================================================
export const renderShellCommand = ({ args }: RenderProps): React.ReactElement => {
  const command = args.command || "[command not found]";
  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="green">✓</Text>
        <Text dimColor> shell</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text color="gray">{command}</Text>
      </Box>
    </Box>
  );
};

// =============================================================================
// LS TOOL - Resultado de listagem
// =============================================================================
export const renderLsTool = ({ args }: RenderProps): React.ReactElement => {
  let directoryPath = "[path not found]";
  try {
    const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
    directoryPath = parsedArgs.directory_path || "[path not specified]";
  } catch (e) {
    directoryPath = "Error parsing arguments";
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="green">✓</Text>
        <Text dimColor> ls</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text color="gray">{directoryPath}</Text>
      </Box>
    </Box>
  );
};

// =============================================================================
// COUNT FILE LINES - Resultado de contagem
// =============================================================================
export const renderCountFilesLines = ({ args }: RenderProps): React.ReactElement => {
  let filepath = "[path not found]";
  try {
    const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
    filepath = parsedArgs.filepath || "[path not specified]";
  } catch (e) {
    filepath = "Error parsing arguments";
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="green">✓</Text>
        <Text dimColor> count lines</Text>
      </Box>
      <Box paddingLeft={2}>
        <Text color="gray">{filepath}</Text>
      </Box>
    </Box>
  );
};

// =============================================================================
// READ FILE LINES - Resultado de leitura
// =============================================================================
export const renderReadFileLines = ({ args }: RenderProps): React.ReactElement => {
  let filepath = "[path not found]";
  let startLine = 0;
  let endLine = 0;

  try {
    const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
    filepath = parsedArgs.filepath || "[path not specified]";
    startLine = parsedArgs.start_line || 0;
    endLine = parsedArgs.end_line || 0;
  } catch (e) {
    filepath = "Error parsing arguments";
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="green">✓</Text>
        <Text dimColor> read</Text>
      </Box>
      <Box paddingLeft={2} flexDirection="column">
        <Text color="gray">{filepath}</Text>
        <Box paddingLeft={2}>
          <Text dimColor>lines {startLine} to {endLine}</Text>
        </Box>
      </Box>
    </Box>
  );
};

// =============================================================================
// REASONING NOTEBOOK - Pensamento do agente
// =============================================================================
export const renderBlumaNotebook = ({ args }: RenderProps): React.ReactElement => {
  interface ThinkingData {
    thought: string;
  }

  try {
    let dataToParse: any = args;
    if (args && typeof args === "object") {
      if (args.content) dataToParse = args.content;
      else if (args.data) dataToParse = args.data;
    }
    
    const thinkingData: ThinkingData =
      typeof dataToParse === "string" ? JSON.parse(dataToParse) : dataToParse;

    if (!thinkingData || typeof thinkingData.thought !== "string") {
      throw new Error("Invalid thought data");
    }

    return (
      <Box flexDirection="column" paddingX={1} marginBottom={1}>
        <Box>
          <Text bold color="cyan">💭 Reasoning</Text>
        </Box>
        <Box paddingLeft={2}>
          <Text color="gray">{thinkingData.thought}</Text>
        </Box>
      </Box>
    );
  } catch (e) {
    return (
      <Box paddingX={1}>
        <Text color="red">Error parsing reasoning</Text>
      </Box>
    );
  }
};

// =============================================================================
// EDIT TOOL - Resultado de edição com diff completo
// =============================================================================
export const renderEditToolCall = ({ args, preview }: RenderProps): React.ReactElement => {
  let filepath = "[path not specified]";
  try {
    const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
    filepath = parsedArgs.file_path || "[path not specified]";
  } catch (e) {
    filepath = "Error parsing arguments";
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="green">✓</Text>
        <Text dimColor> edit </Text>
        <Text color="cyan">{filepath}</Text>
      </Box>

      {preview && (
        <Box marginTop={1}>
          <SimpleDiff text={preview} maxHeight={Infinity} />
        </Box>
      )}
    </Box>
  );
};

// =============================================================================
// TODO TOOL - Gerenciamento de tarefas
// =============================================================================
export const renderTodoTool = ({ args }: RenderProps): React.ReactElement => {
  try {
    const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
    const action = parsedArgs.action;
    let detailText = "";

    switch (action) {
      case 'add':
        const items = parsedArgs.items_to_add || [];
        detailText = `Added ${items.length} task${items.length !== 1 ? 's' : ''}`;
        break;
      case 'complete':
        detailText = `Completed task #${parsedArgs.index}`;
        break;
      case 'remove':
        detailText = `Removed task #${parsedArgs.index}`;
        break;
      case 'list':
        detailText = `Listed all tasks`;
        break;
      default:
        detailText = `Action: ${action}`;
        break;
    }

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box>
          <Text color="green">✓</Text>
          <Text dimColor> todo</Text>
        </Box>
        <Box paddingLeft={2}>
          <Text color="gray">{detailText}</Text>
        </Box>
      </Box>
    );
  } catch (error) {
    return (
      <Box paddingX={1}>
        <Text color="red">Error parsing todo</Text>
      </Box>
    );
  }
};

// =============================================================================
// GENERIC - Renderizador fallback
// =============================================================================
export const renderGenericToolCall = ({ toolName, args }: RenderProps): React.ReactElement => {
  const formattedArgs = formatArgumentsForDisplay(args);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="green">✓</Text>
        <Text dimColor> {toolName}</Text>
      </Box>

      {formattedArgs && formattedArgs !== "{}" && (
        <Box paddingLeft={2} flexDirection="column">
          {formattedArgs.split("\n").slice(0, 3).map((line, index) => (
            <Text key={index} color="gray">{line}</Text>
          ))}
        </Box>
      )}
    </Box>
  );
};

// =============================================================================
// REGISTRO DE RENDERIZADORES
// =============================================================================
export const ToolRenderDisplay: {
  [key: string]: (props: any) => React.ReactElement;
} = {
  shell_command: renderShellCommand,
  ls_tool: renderLsTool,
  reasoning_nootebook: renderBlumaNotebook,
  count_file_lines: renderCountFilesLines,
  read_file_lines: renderReadFileLines,
  edit_tool: renderEditToolCall,
  todo: renderTodoTool,
};