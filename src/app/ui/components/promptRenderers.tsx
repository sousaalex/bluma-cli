// Ficheiro: src/components/promptRenderers.tsx
import React from "react";
import { Box, Text, useStdout } from "ink"; 
import path from "path";
import { SimpleDiff } from './SimpleDiff.js'; 

// --- Função Utilitária (usada apenas no caso genérico) ---
const formatArguments = (args: any): string => {
  if (!args) return "";
  if (typeof args === "string") {
    try {
      return JSON.stringify(JSON.parse(args), null, 2);
    } catch (e) {
      return args;
    }
  }
  if (Object.keys(args).length === 0) return "";
  return JSON.stringify(args, null, 2);
};

const getBasePath = (filePath: string): string => {
  // O módulo 'path' lida com barras '/' e '\' automaticamente
  return path.basename(filePath);
};

// --- Props que todas as funções de renderização receberão ---
interface RenderProps {
  toolCall: any;
  preview?: string | null;
}

// --- Renderizador Específico para `shell_command` (Existente) ---
export const renderShellCommand = ({
  toolCall,
}: RenderProps): React.ReactElement => {
  let command = "";
  try {
    const args =
      typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    command = args.command || "[command not found]";
  } catch (e) {
    command = "Error parsing command arguments";
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* Linha 1: Título da Ferramenta */}
      <Box>
        <Text bold>
          <Text color="cyan">? </Text>
          Shell Command
        </Text>
      </Box>

      {/* Linha 2: Descrição */}
      <Box marginTop={1}>
        <Text dimColor>Command to execute:</Text>
      </Box>

      {/* 
        Linha 3: O comando real, indentado.
        Usamos `marginLeft` para criar o recuo desejado.
      */}
      <Box marginLeft={4}>
        <Text>
          <Text color="gray">↳ </Text>
          <Text color="cyan">{command}</Text>
        </Text>
      </Box>
    </Box>
  );
};

// ==========================================================
// --- NOVO Renderizador Específico para `ls_tool` ---
// ==========================================================
export const renderLsTool = ({ toolCall }: RenderProps): React.ReactElement => {
  let directoryPath = "[path not specified]";
  try {
    const args =
      typeof toolCall.function.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    directoryPath = args.directory_path || "[path not specified]";
  } catch (e) {
    directoryPath = "Error parsing arguments";
  }

  // A MUDANÇA ESTÁ AQUI: Usamos a nossa nova função auxiliar
  const finalDirectoryName = getBasePath(directoryPath);

  return (
<Box flexDirection="column" marginBottom={1}>
      {/* Linha de título para a ferramenta */}
      <Box>
        <Text bold>
          <Text color="blue">? </Text>
          {/* {toolCall.function.name} */}
          ls Tool
        </Text>
      </Box>

      {/* 
        Linha descritiva e nome do diretório combinados para um visual mais limpo.
        A seta `↳` cria uma conexão visual direta com o nome do diretório.
      */}
      <Box marginTop={1} flexDirection="column">
  
  {/* Filho 1 */}
  <Box>
    <Text>List contents of:</Text>
  </Box>

  {/* Filho 2 (que pode ter o seu próprio recuo) */}
  <Box marginLeft={2}>
    <Text>
      <Text color="gray">↳ </Text>
      <Text color="cyan">{finalDirectoryName}</Text>
    </Text>
  </Box>

</Box>
    </Box>
  );
};

export const renderCountFilesLinesTool = ({ toolCall }: RenderProps): React.ReactElement => {
    let directoryPath = "[path not specified]";
    try {
      const args =
        typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      directoryPath = args.filepath || "[path not specified]";
    } catch (e) {
      directoryPath = "Error parsing arguments";
    }
  
    // A MUDANÇA ESTÁ AQUI: Usamos a nossa nova função auxiliar
    const finalDirectoryName = getBasePath(directoryPath);
  
    return (
  <Box flexDirection="column" marginBottom={1}>
        {/* Linha de título para a ferramenta */}
        <Box>
          <Text bold>
            <Text color="blue">? </Text>
            {/* {toolCall.function.name} */}
            Count File Lines
          </Text>
        </Box>
  
        {/* 
          Linha descritiva e nome do diretório combinados para um visual mais limpo.
          A seta `↳` cria uma conexão visual direta com o nome do diretório.
        */}
        <Box marginTop={1} flexDirection="column">
    
    {/* Filho 1 */}
    <Box>
      <Text>List contents of:</Text>
    </Box>
  
    {/* Filho 2 (que pode ter o seu próprio recuo) */}
    <Box marginLeft={2}>
      <Text>
        <Text color="gray">↳ </Text>
        <Text color="cyan">{finalDirectoryName}</Text>
      </Text>
    </Box>
  
  </Box>
      </Box>
    );
  };

export const renderReadFileLines = ({ toolCall }: RenderProps): React.ReactElement => {
    let filepath = "[path not specified]";
    let startLine = 0;
    let endLine = 0;
  
    try {
      const args =
        typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      filepath = args.filepath || "[path not specified]";
      startLine = args.start_line || 0;
      endLine = args.end_line || 0;
    } catch (e) {
      filepath = "Error parsing arguments";
    }
  
    const finalFileName = getBasePath(filepath);
  
    return (
      <Box flexDirection="column" marginBottom={1}>
        {/* Linha 1: Título da Ferramenta */}
        <Box>
          <Text bold>
            {/* Usamos uma cor diferente (ex: amarelo) para operações de leitura */}
            <Text color="yellow">? </Text>
            Read File Lines Tool
          </Text>
        </Box>
  
        {/* Linha 2: Descrição */}
        <Box marginTop={1}>
          <Text dimColor>Reading lines from file:</Text>
        </Box>
        
        {/* Linha 3: Detalhes do ficheiro e das linhas, indentados */}
        <Box marginLeft={2} flexDirection="column">
          {/* Detalhe do nome do ficheiro */}
          <Box>
            <Text>
              <Text color="gray">↳ </Text>
              <Text color="cyan">{finalFileName}</Text>
            </Text>
          </Box>
          {/* Detalhe das linhas */}
          <Box>
            <Text>
              <Text color="gray">↳ </Text>
              <Text dimColor>lines </Text>
              <Text color="cyan">{startLine}</Text>
              <Text dimColor> to </Text>
              <Text color="cyan">{endLine}</Text>
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };
  

  export const renderEditTool = ({ toolCall, preview }: RenderProps): React.ReactElement => {
    const diffMaxHeight = 5; // Regra de negócio: mostrar no máximo 5 linhas.
  
    let filepath = "[path not specified]";
    try {
      const args = JSON.parse(toolCall.function.arguments);
      filepath = args.file_path || "[path not specified]";
    } catch (e) {
      filepath = "Error parsing arguments";
    }
  
    const finalFileName = getBasePath(filepath);
  
    return (
      <Box flexDirection="column" marginBottom={1}>
        {/* CABEÇALHO DE UMA ÚNICA LINHA, INSPIRADO NA IMAGEM */}
        <Box>
          <Text bold>
            <Text color="red">? </Text>
            Edit <Text color="cyan">{finalFileName}</Text>
          </Text>
        </Box>
        
        {/* Bloco que renderiza o preview do diff */}
        {preview ? (
          // Não precisamos da borda externa, o SimpleDiff já é claro o suficiente.
          <Box marginTop={1}>
             <SimpleDiff text={preview} maxHeight={diffMaxHeight} />
          </Box>
        ) : (
          <Text color="yellow">Generating preview...</Text>
        )}
      </Box>
    );
  };


// --- Renderizador Genérico (Padrão) (Existente) ---


export const renderGeneric = ({ toolCall }: RenderProps): React.ReactElement => {
    const toolName = toolCall.function.name;
    const formattedArgs = formatArguments(toolCall.function.arguments);
    
    const ARGS_BOX_HEIGHT = 5;
  
    // 1. Verifica se o conteúdo será truncado
    const totalLines = formattedArgs.split('\n').length;
    const areArgsTruncated = totalLines > ARGS_BOX_HEIGHT;
  
    return (
      <Box flexDirection="column" marginBottom={1}>
        {/* Cabeçalho */}
        <Box>
          <Text bold>
            <Text color="magenta">? </Text>
            {toolName}
          </Text>
        </Box>
  
        {/* Bloco de Argumentos */}
        {formattedArgs && (
          <Box flexDirection="column" marginTop={1}>
            <Text dimColor>Arguments:</Text>
            {/* Caixa com altura fixa e overflow */}
            <Box 
              marginLeft={2} 
              height={ARGS_BOX_HEIGHT} 
              flexDirection="column" 
              overflow="hidden"
            >
              <Text color="gray">{formattedArgs}</Text>
            </Box>
  
            {/* 2. Mostra a mensagem de truncamento SE for necessário */}
            {areArgsTruncated && (
              <Box marginLeft={2}>
                <Text dimColor>... ({totalLines - ARGS_BOX_HEIGHT} more lines hidden) ...</Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  };

// --- O Registro/Mapa de Renderizadores (Atualizado) ---
export const promptRenderers: {
  [key: string]: (props: RenderProps) => React.ReactElement;
} = {
  shell_command: renderShellCommand,
  ls_tool: renderLsTool,
  count_file_lines: renderCountFilesLinesTool,
  read_file_lines: renderReadFileLines,
  edit_tool: renderEditTool, 
};
