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
// TODO TOOL - Renderizador de preview (para promptRenderers.tsx)
// Este renderiza ANTES da execução (preview do tool_call)
// =============================================================================
export const renderTodoTool = ({ toolCall }: RenderProps): React.ReactElement => {
  try {
    const args = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;
    
    const tasks = args.tasks || [];
    
    if (tasks.length === 0) {
      return (
        <Box flexDirection="column" paddingX={1} marginBottom={1}>
          <Box>
            <Text color="blue">▸</Text>
            <Text dimColor> todo</Text>
          </Box>
          <Box paddingLeft={2}>
            <Text color="gray">Empty task list</Text>
          </Box>
        </Box>
      );
    }

    // Conta tarefas completadas e pendentes
    const completed = tasks.filter((t: any) => t.isComplete === true).length;
    const pending = tasks.length - completed;

    return (
      <Box flexDirection="column" paddingX={1} marginBottom={1}>
        <Box>
          <Text color="blue">▸</Text>
          <Text dimColor> todo</Text>
        </Box>
        <Box paddingLeft={2} flexDirection="column">
          <Text color="magenta">
            📋 {pending} pending, {completed} completed
          </Text>
          
          {tasks.length > 0 && tasks.length <= 10 && (
            <Box paddingLeft={2} flexDirection="column" marginTop={1}>
              {tasks.map((task: any, idx: number) => {
                const isComplete = task.isComplete === true;
                const checkbox = isComplete ? '[X]' : '[ ]';
                const description = task.description || 'No description';
                const displayText = description.length > 60 
                  ? description.substring(0, 57) + '...' 
                  : description;
                
                // Cores: verde para completo, amarelo para pendente
                const color = isComplete ? 'green' : 'yellow';
                
                return (
                  <Text 
                    key={idx} 
                    color={color}
                    strikethrough={isComplete}
                    dimColor={isComplete}
                  >
                    {checkbox} {displayText}
                  </Text>
                );
              })}
            </Box>
          )}
          
          {tasks.length > 10 && (
            <Box paddingLeft={2} marginTop={1}>
              <Text dimColor>({tasks.length} tasks total - showing summary)</Text>
            </Box>
          )}
        </Box>
      </Box>
    );
  } catch (e) {
    return (
      <Box flexDirection="column" paddingX={1} marginBottom={1}>
        <Box>
          <Text color="blue">▸</Text>
          <Text dimColor> todo</Text>
        </Box>
        <Box paddingLeft={2}>
          <Text color="red">Error parsing tasks</Text>
        </Box>
      </Box>
    );
  }
};

// =============================================================================
// ADICIONE AO REGISTRO DE RENDERIZADORES (no final do arquivo)
// =============================================================================
export const promptRenderers: {
  [key: string]: (props: RenderProps) => React.ReactElement;
} = {
  shell_command: renderShellCommand,
  ls_tool: renderLsTool,
  count_file_lines: renderCountFilesLinesTool,
  read_file_lines: renderReadFileLines,
  edit_tool: renderEditTool,
  todo: renderTodoTool, // <--- ADICIONE ESTA LINHA
};