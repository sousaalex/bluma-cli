// Ficheiro: src/components/toolCallRenderers.tsx
import React from "react";
import { Box, Text } from "ink";
import { SimpleDiff } from "./SimpleDiff.js";
import path from "path";

// --- Props que todas as funções de renderização receberão ---
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

// --- Renderizador para `shell_command` (NOVO ESTILO DE SUCESSO) ---
export const renderShellCommand = ({
  args,
}: RenderProps): React.ReactElement => {
  const command = args.command || "[command not found]";
  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>
          <Text color="green">● </Text>
          Shell Command
        </Text>
      </Box>

      <Box marginLeft={2} paddingX={1}>
        <Text>
          <Text color="gray">↳ </Text>
          <Text color="magenta">{command}</Text>
        </Text>
      </Box>
    </Box>
  );
};

// --- Renderizador para `ls_tool` (NOVO ESTILO DE SUCESSO) ---
export const renderLsTool = ({ args }: RenderProps): React.ReactElement => {
  let directoryPath = "[path not found]";

  // A LÓGICA CORRETA: Extrai o caminho diretamente dos argumentos.
  try {
    // Esta lógica agora lida com o caso de os 'args' já serem um objeto.
    const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
    directoryPath = parsedArgs.directory_path || "[path not specified]";
  } catch (e) {
    directoryPath = "Error parsing arguments";
  }

  // A função para extrair o nome final continua útil.
  // const finalDirectoryName = path.basename(directoryPath);
  const finalDirectoryName = directoryPath;

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>
          <Text color="green">● </Text>
          ls
        </Text>
      </Box>

      <Box marginLeft={2} paddingX={1}>
        <Text>
          <Text color="gray">↳ </Text>
          <Text color="magenta">{finalDirectoryName}</Text>
        </Text>
      </Box>
    </Box>
  );
};
// --- Renderizador para `count_file_lines` (NOVO ESTILO DE SUCESSO) ---
export const renderCountFilesLines = ({
  args,
}: RenderProps): React.ReactElement => {
  let directoryPath = "[path not found]";

  // A LÓGICA CORRETA: Extrai o caminho diretamente dos argumentos.
  try {
    // Esta lógica agora lida com o caso de os 'args' já serem um objeto.
    const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
    directoryPath = parsedArgs.filepath || "[path not specified]";
  } catch (e) {
    directoryPath = "Error parsing arguments";
  }

  // A função para extrair o nome final continua útil.
  // const finalDirectoryName = path.basename(directoryPath);
  const finalDirectoryName = directoryPath;

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>
          <Text color="green">● </Text>
          Count File Lines
        </Text>
      </Box>

      <Box marginLeft={2} paddingX={1}>
        <Text>
          <Text color="gray">↳ </Text>
          <Text color="magenta">{finalDirectoryName}</Text>
        </Text>
      </Box>
    </Box>
  );
};

export const renderReadFileLines = ({
  args,
}: RenderProps): React.ReactElement => {
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

  // const finalFileName = path.basename(filepath);
  const finalFileName = filepath;

  return (
    // A caixa externa com a borda, seguindo o template
    <Box flexDirection="column">
      {/* Título com o 'check' verde */}
      <Box>
        <Text bold>
          <Text color="green">● </Text>
          Read File
        </Text>
      </Box>
      {/* Detalhes indentados */}
      <Box marginLeft={2} flexDirection="column">
        {/* Detalhe do nome do ficheiro */}
        <Box marginLeft={2} paddingX={1}>
          <Text>
            <Text color="gray">↳ </Text>
            <Text color="magenta">{finalFileName}</Text>
          </Text>
        </Box>
        {/* Detalhe das linhas */}
        <Box marginLeft={2} paddingX={4}>
          <Text>
            <Text color="gray">↳ </Text>
            <Text dimColor>lines </Text>
            <Text color="magenta">{startLine}</Text>
            <Text dimColor> to </Text>
            <Text color="magenta">{endLine}</Text>
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
// --- Renderizador para `reasoning_nootebook` (Thinking Process) ---
// Extraído do App.tsx original
export const renderBlumaNotebook = ({
  args,
}: RenderProps): React.ReactElement => {
  // --- Definição da Interface para o nosso dado (para segurança do TypeScript) ---
  interface ThinkingData {
    thought: string;
    task_checklist?: string[];
  }

  try {
    // Lógica robusta para fazer o parse dos dados
    let dataToParse: any = args;
    if (args && typeof args === "object") {
      if (args.content) dataToParse = args.content;
      else if (args.data) dataToParse = args.data;
    }
    const thinkingData: ThinkingData =
      typeof dataToParse === "string" ? JSON.parse(dataToParse) : dataToParse;

    if (!thinkingData || typeof thinkingData.thought !== "string") {
      throw new Error("Invalid or missing 'thought' property.");
    }

    return (
      // Usamos a mesma estrutura de caixa com borda
      <Box
        /* borderStyle="round" borderColor="green" */ flexDirection="column"
        paddingX={1}
      >
        {/* Título da seção */}
        {/* <Box>
            <Text bold>
              <Text color="green">🧠 </Text> 
              Thinking Process
            </Text>
          </Box> */}

        {/* Seção do "Pensamento" */}
        <Box flexDirection="column">
          <Text color="white" bold>Reasoning:</Text>
          {/* O pensamento em si, com uma leve indentação e cor neutra */}
          <Box marginLeft={2}>
            <Text color="gray">{thinkingData.thought}</Text>
          </Box>
        </Box>

        {/* Seção das "Tarefas Restantes" */}
        {thinkingData.task_checklist &&
          thinkingData.task_checklist.length > 0 && (
            <Box marginTop={1} flexDirection="column">
              <Text color="white" bold>Todos:</Text>
              {/* Mapeamos cada tarefa, usando a seta `↳` para consistência */}
              {thinkingData.task_checklist.map((task, index) => (
                <Box key={index} marginLeft={2}>
                  <Text>
                    {/* <Text color="gray">↳ </Text> */}
                    {/* Damos uma cor diferente para tarefas concluídas (●) vs. pendentes ([ ]) */}
                    <Text
                      color={task.startsWith("🗹") ? "gray" : "white"}
                      strikethrough={task.startsWith("🗹")}
                    >
                      {task}
                    </Text>
                  </Text>
                </Box>
              ))}
            </Box>
          )}
      </Box>
    );
  } catch (e) {
    // O fallback continua útil para casos de erro de parse
    return (
      <Box borderStyle="round" borderColor="magenta" paddingX={1}>
        <Text color="magenta" bold>
          Thinking (Error)
        </Text>
        <Text color="gray">{JSON.stringify(args, null, 2)}</Text>
      </Box>
    );
  }
};



export const renderEditToolCall = ({
  args,
  preview,
}: RenderProps): React.ReactElement => {
  let filepath = "[path not specified]";
  try {
    const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
    filepath = parsedArgs.file_path || "[path not specified]";
  } catch (e) {
    filepath = "Error parsing arguments";
  }
  const finalFileName = filepath;

  return (
    <Box flexDirection="column" paddingX={1} borderStyle="round" borderColor="gray" borderDimColor>
      {/* Cabeçalho com o 'check' verde */}
      <Box>
        <Text bold>
          <Text color="green">● </Text>
          Edit File
        </Text>
      </Box>
      <Box marginLeft={2} paddingX={1}>
        <Text>
          <Text color="gray">↳ </Text>
          <Text color="magenta">{finalFileName}</Text>
        </Text>
      </Box>

      {/* Renderiza o diff COMPLETO, se existir */}
      {preview && (
        <Box marginTop={1}>
          {/* Aqui não passamos maxHeight, então ele mostra tudo */}
          <SimpleDiff text={preview} maxHeight={Infinity} />
        </Box>
      )}
    </Box>
  );
};

// --- Renderizador Genérico (Fallback) ---
export const renderGenericToolCall = ({
  toolName,
  args,
}: RenderProps): React.ReactElement => {
  // Formata os argumentos para uma leitura fácil
  const formattedArgs = formatArgumentsForDisplay(args);

  return (
    // A "moldura" padrão de sucesso com a borda cinza
    <Box flexDirection="column">
      {/* Cabeçalho com o 'check' verde */}
      <Box>
        <Text bold>
          <Text color="green">● </Text>
          {toolName}
        </Text>
      </Box>

      {/* Rótulo e conteúdo dos argumentos */}
      {formattedArgs && formattedArgs !== "{}" && (
        <Box paddingX={3}>
          <Text color="gray">↳ </Text>
          {/* 
              Os argumentos são renderizados dentro de uma Box com indentação.
              NÃO há limite de altura aqui.
            */}
          <Box flexDirection="column">
            {/* 
                Dividimos o JSON em linhas para poder adicionar o prefixo '↳' em cada uma,
                mantendo a consistência visual.
              */}
            {formattedArgs.split("\n").map((line, index) => (
              <Text key={index} color="gray">
                {line}
              </Text>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

// --- O Registro/Mapa de Renderizadores ---
export const ToolRenderDisplay: {
  [key: string]: (props: any) => React.ReactElement;
} = {
  shell_command: renderShellCommand,
  ls_tool: renderLsTool,
  reasoning_nootebook: renderBlumaNotebook,
  count_file_lines: renderCountFilesLines,
  read_file_lines: renderReadFileLines,
  edit_tool: renderEditToolCall,
};
