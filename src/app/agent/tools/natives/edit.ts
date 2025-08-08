// src/app/agent/tools/edit_tool.ts

import path from 'path';
import os from 'os';
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

function normalizePath(filePath: string): string {
  if (os.platform() === 'win32') {
    const winDriveRegex = /^\/([a-zA-Z])[:/]/;
    const match = filePath.match(winDriveRegex);
    if (match) {
      const driveLetter = match[1];
      const restOfPath = filePath.substring(match[0].length);
      filePath = `${driveLetter}:\\${restOfPath}`;
    }
  }
  return path.normalize(path.resolve(filePath));
}

function unescapeLlmString(inputString: string): string {
  return inputString
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

/**
 * Tenta encontrar uma correspondência para a `old_string` no conteúdo do arquivo,
 * aplicando uma série de correções comuns para problemas de formatação de LLM.
 * @returns Uma tupla com a `old_string` corrigida, `new_string` e o número de ocorrências.
 */
function ensureCorrectEdit(
  currentContent: string,
  originalOldString: string,
  originalNewString: string,
  expectedReplacements: number
): [string, string, number] {
  
  let finalOldString = originalOldString;
  let finalNewString = originalNewString;
  
  let occurrences = currentContent.split(finalOldString).length - 1;
  if (occurrences > 0) {
    return [finalOldString, finalNewString, occurrences];
  }

  const candidates = [
    unescapeLlmString(originalOldString),
    originalOldString.trim(),
    unescapeLlmString(originalOldString).trim()
  ];

  for (const candidate of candidates) {
    if (candidate === originalOldString) continue;

    const candidateOccurrences = currentContent.split(candidate).length - 1;
    
    if (candidateOccurrences > 0) {
      finalOldString = candidate;
      occurrences = candidateOccurrences;
      
      if (candidate === originalOldString.trim() || candidate === unescapeLlmString(originalOldString).trim()) {
        finalNewString = originalNewString.trim();
      }
      if (candidate === unescapeLlmString(originalOldString) || candidate === unescapeLlmString(originalOldString).trim()) {
        finalNewString = unescapeLlmString(finalNewString);
      }
      
      return [finalOldString, finalNewString, occurrences];
    }
  }

  return [originalOldString, originalNewString, 0];
}

export async function calculateEdit(
  filePath: string,
  oldString: string,
  newString: string,
  expectedReplacements: number
): Promise<CalculatedEdit> {
  const normalizedFilePath = normalizePath(filePath);
  
  let currentContent: string | null = null;
  let isNewFile = false;
  let error: { display: string; raw: string } | null = null;

  // Normaliza as quebras de linha para LF (\n) como primeiro passo.
  let normalizedNewString = newString.replace(/\r\n/g, '\n');
  let normalizedOldString = oldString.replace(/\r\n/g, '\n');
  let occurrences = 0;

  try {
    currentContent = await fs.readFile(normalizedFilePath, 'utf-8');
    // Normaliza também o conteúdo do arquivo para consistência na comparação.
    currentContent = currentContent.replace(/\r\n/g, '\n');
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      error = { display: `Error reading file: ${e.message}`, raw: `Error reading file ${normalizedFilePath}: ${e.message}` };
      return { currentContent, newContent: "", occurrences: 0, error, isNewFile };
    }
  }

  if (currentContent === null) {
    if (oldString === "") {
      isNewFile = true;
      occurrences = 1;
      normalizedNewString = unescapeLlmString(normalizedNewString); // Unescape para novos arquivos
    } else {
      error = { display: "File not found. Cannot apply edit. Use an empty old_string to create a new file.", raw: `File not found: ${normalizedFilePath}` };
    }
  } else {
    if (oldString === "") {
      error = { display: "Failed to edit. Attempted to create a file that already exists.", raw: `File already exists, cannot create: ${normalizedFilePath}` };
    } else {
      // Usa a nova função `ensureCorrectEdit` para encontrar a melhor correspondência.
      [normalizedOldString, normalizedNewString, occurrences] = ensureCorrectEdit(currentContent, normalizedOldString, normalizedNewString, expectedReplacements);

      if (occurrences === 0) {
        error = { display: "Failed to edit, could not find the string to replace.", raw: `0 occurrences found for old_string in ${normalizedFilePath}. Check whitespace, indentation, and context.` };
      } else if (occurrences !== expectedReplacements) {
        error = { display: `Failed to edit, expected ${expectedReplacements} occurrence(s) but found ${occurrences}.`, raw: `Expected ${expectedReplacements} but found ${occurrences} for old_string in ${normalizedFilePath}` };
      }
    }
  }

  let newContentResult = "";
  if (!error) {
    if (isNewFile) {
      newContentResult = normalizedNewString;
    } else if (currentContent !== null) {
      // Usa a `old_string` corrigida que foi encontrada no arquivo.
      newContentResult = currentContent.replaceAll(normalizedOldString, normalizedNewString);
    }
  }

  return { currentContent, newContent: newContentResult, occurrences, error, isNewFile };
}

export function createDiff(filename: string, oldContent: string, newContent: string): string {
  const diff = diffLines(oldContent, newContent, {});
  let diffString = `--- a/${filename}\n+++ b/${filename}\n`;
  diff.forEach((part: Change) => {
    const prefix = part.added ? '+' : part.removed ? '-' : ' ';
    part.value.split('\n').slice(0, -1).forEach(line => {
      diffString += `${prefix}${line}\n`;
    });
  });
  return diffString;
}


// --- Função Principal da Ferramenta (Exportada) ---

export async function editTool(args: EditToolArgs): Promise<ToolResult> {
  const { file_path, old_string, new_string, expected_replacements = 1 } = args;

  const normalizedFilePath = normalizePath(file_path);

  if (normalizedFilePath.includes('..')) {
    return { success: false, error: `Invalid parameters: file_path cannot contain '..'.`, file_path: normalizedFilePath };
  }

  try {
    const editData = await calculateEdit(normalizedFilePath, old_string, new_string, expected_replacements);

    if (editData.error) {
      return {
        success: false,
        error: `Execution failed: ${editData.error.display}`,
        details: editData.error.raw,
        file_path: normalizedFilePath,
      };
    }

    await fs.mkdir(path.dirname(normalizedFilePath), { recursive: true });
    await fs.writeFile(normalizedFilePath, editData.newContent, 'utf-8');

    const relativePath = path.relative(process.cwd(), normalizedFilePath);
    const filename = path.basename(normalizedFilePath);

    if (editData.isNewFile) {
      return {
        success: true,
        file_path: normalizedFilePath,
        description: `Created new file: ${relativePath}`,
        message: `Created new file: ${normalizedFilePath} with the provided content.`,
        is_new_file: true,
        occurrences: editData.occurrences,
        relative_path: relativePath,
      };
    } else {
      const finalDiff = createDiff(filename, editData.currentContent || "", editData.newContent);
      return {
        success: true,
        file_path: normalizedFilePath,
        description: `Modified ${relativePath} (${editData.occurrences} replacement(s)).`,
        message: `Successfully modified file: ${normalizedFilePath}. Diff of changes:\n${finalDiff}`,
        is_new_file: false,
        occurrences: editData.occurrences,
        relative_path: relativePath,
      };
    }
  } catch (e: any) {
    return {
      success: false,
      error: `An unexpected error occurred during the edit operation: ${e.message}`,
      file_path: normalizedFilePath,
    };
  }
}