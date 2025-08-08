// src/app/agent/tools/natives/edit.ts

import path from 'path';
import { promises as fs } from 'fs';
import { diffLines, type Change } from 'diff';

// --- Tipos e Interfaces ---

export interface EditToolArgs {
  file_path: string;
  old_string: string;
  new_string: string;
  expected_replacements?: number;
}

export interface CalculatedEdit {
  currentContent: string | null;
  newContent: string;
  occurrences: number;
  error: { display: string; raw: string } | null;
  isNewFile: boolean;
}

export interface ToolResult {
  success: boolean;
  file_path: string;
  error?: string;
  details?: string;
  description?: string;
  message?: string;
  is_new_file?: boolean;
  occurrences?: number;
  relative_path?: string;
}

// --- Funções Auxiliares e Lógica Interna ---

function unescapeLlmString(inputString: string): string {
  return inputString
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\'/g, "'")
    .replace(/\\\\/g, '\\');
}

/**
 * Encontra todas as ocorrências de uma sequência de linhas de pesquisa dentro de um conjunto de linhas de conteúdo.
 * A correspondência é flexível: ignora espaços em branco no início/fim de cada linha.
 * @param contentLines As linhas do conteúdo do arquivo.
 * @param searchLines As linhas da string a ser encontrada.
 * @returns Um array de objetos, cada um com as linhas de início e fim de uma correspondência.
 */
function findLineBasedMatches(
  contentLines: string[],
  searchLines: string[]
): { start: number; end: number }[] {
  if (searchLines.length === 0) return [];

  const trimmedSearchLines = searchLines.map(line => line.trim()).filter(line => line.length > 0);
  if (trimmedSearchLines.length === 0) return [];

  const matches: { start: number; end: number }[] = [];
  for (let i = 0; i <= contentLines.length - trimmedSearchLines.length; i++) {
    let matchFound = true;
    for (let j = 0; j < trimmedSearchLines.length; j++) {
      if (contentLines[i + j].trim() !== trimmedSearchLines[j]) {
        matchFound = false;
        break;
      }
    }
    if (matchFound) {
      matches.push({ start: i, end: i + trimmedSearchLines.length - 1 });
      i += trimmedSearchLines.length - 1; // Pula para o final da correspondência encontrada
    }
  }
  return matches;
}

/**
 * Calcula o resultado potencial de uma operação de edição sem modificar o arquivo.
 * EXPORTADO para que o Agente possa usar esta função para gerar um preview.
 */
export async function calculateEdit(
  filePath: string,
  oldString: string,
  newString: string,
  expectedReplacements: number
): Promise<CalculatedEdit> {
  let currentContent: string | null = null;
  let isNewFile = false;
  let error: { display: string; raw: string } | null = null;

  const finalNewString = unescapeLlmString(newString).replace(/\r\n/g, '\n');
  const finalOldString = unescapeLlmString(oldString).replace(/\r\n/g, '\n');

  try {
    currentContent = await fs.readFile(filePath, 'utf-8');
    currentContent = currentContent.replace(/\r\n/g, '\n');
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      error = { display: `Error reading file: ${e.message}`, raw: `Error reading file ${filePath}: ${e.message}` };
      return { currentContent, newContent: "", occurrences: 0, error, isNewFile };
    }
  }

  if (currentContent === null) {
    if (oldString === "") {
      isNewFile = true;
      return { currentContent, newContent: finalNewString, occurrences: 1, error: null, isNewFile: true };
    } else {
      error = { display: "File not found. Cannot apply edit. Use an empty old_string to create a new file.", raw: `File not found: ${filePath}` };
      return { currentContent, newContent: "", occurrences: 0, error, isNewFile };
    }
  }

  if (oldString === "") {
    error = { display: "Failed to edit. Attempted to create a file that already exists.", raw: `File already exists, cannot create: ${filePath}` };
    return { currentContent, newContent: "", occurrences: 0, error, isNewFile };
  }

  const contentLines = currentContent.split('\n');
  const oldStringLines = finalOldString.split('\n');
  const matches = findLineBasedMatches(contentLines, oldStringLines);
  const occurrences = matches.length;

  if (occurrences === 0) {
    error = { display: "Failed to edit, could not find the string to replace.", raw: `0 occurrences found for old_string in ${filePath}. Check whitespace, indentation, and context.` };
  } else if (occurrences !== expectedReplacements) {
    error = { display: `Failed to edit, expected ${expectedReplacements} occurrence(s) but found ${occurrences}.`, raw: `Expected ${expectedReplacements} but found ${occurrences} for old_string in ${filePath}` };
  }

  if (error) {
    return { currentContent, newContent: "", occurrences, error, isNewFile };
  }

  // Aplica as alterações de baixo para cima para não invalidar os índices de linha
  const newStringLines = finalNewString.split('\n');
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    // Determina o número de linhas a serem substituídas com base na correspondência original, não na aparada
    const originalMatchEnd = match.start + oldStringLines.length -1;
    contentLines.splice(match.start, originalMatchEnd - match.start + 1, ...newStringLines);
  }
  const newContent = contentLines.join('\n');

  return { currentContent, newContent, occurrences, error: null, isNewFile };
}

/**
 * Cria um diff unificado entre o conteúdo antigo e o novo.
 * EXPORTADO para que o Agente possa usar esta função para formatar o preview para o usuário.
 */
export function createDiff(filename: string, oldContent: string, newContent: string): string {
  const diff = diffLines(oldContent, newContent, {});
  let diffString = `--- a/${filename}\n+++ b/${filename}\n`;
  diff.forEach((part: Change) => {
    const prefix = part.added ? '+' : part.removed ? '-' : ' ';
    const lines = part.value.endsWith('\n') ? part.value.slice(0, -1) : part.value;
    lines.split('\n').forEach(line => {
      diffString += `${prefix}${line}\n`;
    });
  });
  return diffString;
}

// --- Função Principal da Ferramenta (Exportada) ---

/**
 * [EXECUÇÃO] Substitui texto dentro de um arquivo de forma precisa e segura.
 */
export async function editTool(args: EditToolArgs): Promise<ToolResult> {
  const { file_path, old_string, new_string, expected_replacements = 1 } = args;

  if (!path.isAbsolute(file_path)) {
    return { success: false, error: `Invalid parameters: file_path must be absolute.`, file_path };
  }
  if (file_path.includes('..')) {
    return { success: false, error: `Invalid parameters: file_path cannot contain '..'.`, file_path };
  }

  try {
    const editData = await calculateEdit(file_path, old_string, new_string, expected_replacements);

    if (editData.error) {
      return {
        success: false,
        error: `Execution failed: ${editData.error.display}`,
        details: editData.error.raw,
        file_path,
      };
    }

    await fs.mkdir(path.dirname(file_path), { recursive: true });
    await fs.writeFile(file_path, editData.newContent, 'utf-8');

    const relativePath = path.relative(process.cwd(), file_path);
    const filename = path.basename(file_path);

    if (editData.isNewFile) {
      return {
        success: true,
        file_path,
        description: `Created new file: ${relativePath}`,
        message: `Created new file: ${file_path} with the provided content.`, 
        is_new_file: true,
        occurrences: editData.occurrences,
        relative_path: relativePath,
      };
    } else {
      const finalDiff = createDiff(filename, editData.currentContent || "", editData.newContent);
      return {
        success: true,
        file_path,
        description: `Modified ${relativePath} (${editData.occurrences} replacement(s)).`,
        message: `Successfully modified file: ${file_path}. Diff of changes:\n${finalDiff}`,
        is_new_file: false,
        occurrences: editData.occurrences,
        relative_path: relativePath,
      };
    }
  } catch (e: any) {
    return {
      success: false,
      error: `An unexpected error occurred during the edit operation: ${e.message}`,
      file_path,
    };
  }
}
