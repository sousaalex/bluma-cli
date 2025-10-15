// src/app/agent/tools/edit_tool.ts - VERSÃO CORRIGIDA

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

// --- Constantes ---
const MAX_DIFF_SIZE = 50000; // Limite de caracteres para diff
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// --- Funções Auxiliares e Lógica Interna ---

function normalizePath(filePath: string): string {
  try {
    // Remove espaços em branco extras
    filePath = filePath.trim();
    
    if (os.platform() === 'win32') {
      // Corrige paths do tipo /C:/path ou /c:/path
      const winDriveRegex = /^\/([a-zA-Z])[:/]/;
      const match = filePath.match(winDriveRegex);
      if (match) {
        const driveLetter = match[1].toUpperCase();
        const restOfPath = filePath.substring(match[0].length);
        filePath = `${driveLetter}:\\${restOfPath}`;
      }
      
      // Normaliza barras
      filePath = filePath.replace(/\//g, '\\');
    }
    
    return path.normalize(path.resolve(filePath));
  } catch (e: any) {
    throw new Error(`Failed to normalize path "${filePath}": ${e.message}`);
  }
}

function unescapeLlmString(inputString: string): string {
  try {
    return inputString
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\');
  } catch (e: any) {
    // Se falhar, retorna string original
    return inputString;
  }
}

// Versão compatível de replaceAll para Node.js antigo
function replaceAllOccurrences(text: string, search: string, replacement: string): string {
  if (search === '') return text;
  
  // Se replaceAll existir nativamente, usa
  if (typeof text.replaceAll === 'function') {
    return text.replaceAll(search, replacement);
  }
  
  // Fallback: usa split/join (mais seguro que regex)
  return text.split(search).join(replacement);
}

function countOccurrences(text: string, search: string): number {
  if (search === '' || text === '') return 0;
  return text.split(search).length - 1;
}

function ensureCorrectEdit(
  currentContent: string,
  originalOldString: string,
  originalNewString: string,
  expectedReplacements: number
): [string, string, number] {
  
  let finalOldString = originalOldString;
  let finalNewString = originalNewString;
  
  // Tenta encontrar match exato primeiro
  let occurrences = countOccurrences(currentContent, finalOldString);
  if (occurrences > 0) {
    return [finalOldString, finalNewString, occurrences];
  }

  // Tenta variações comuns
  const candidates = [
    { old: unescapeLlmString(originalOldString), new: unescapeLlmString(originalNewString) },
    { old: originalOldString.trim(), new: originalNewString.trim() },
    { old: unescapeLlmString(originalOldString).trim(), new: unescapeLlmString(originalNewString).trim() },
  ];

  for (const candidate of candidates) {
    if (candidate.old === originalOldString) continue;

    const candidateOccurrences = countOccurrences(currentContent, candidate.old);
    
    if (candidateOccurrences > 0) {
      return [candidate.old, candidate.new, candidateOccurrences];
    }
  }

  // Nenhuma variação funcionou
  return [originalOldString, originalNewString, 0];
}

export async function calculateEdit(
  filePath: string,
  oldString: string,
  newString: string,
  expectedReplacements: number
): Promise<CalculatedEdit> {
  
  let normalizedFilePath: string;
  try {
    normalizedFilePath = normalizePath(filePath);
  } catch (e: any) {
    return {
      currentContent: null,
      newContent: "",
      occurrences: 0,
      error: { display: `Invalid file path: ${e.message}`, raw: e.message },
      isNewFile: false
    };
  }
  
  let currentContent: string | null = null;
  let isNewFile = false;
  let error: { display: string; raw: string } | null = null;

  // Normaliza line endings
  let normalizedNewString = newString.replace(/\r\n/g, '\n');
  let normalizedOldString = oldString.replace(/\r\n/g, '\n');
  let occurrences = 0;

  // Lê o ficheiro (se existir)
  try {
    const stats = await fs.stat(normalizedFilePath);
    
    // Verifica tamanho do ficheiro
    if (stats.size > MAX_FILE_SIZE) {
      error = { 
        display: `File too large (${(stats.size / 1024 / 1024).toFixed(2)}MB). Maximum allowed: ${MAX_FILE_SIZE / 1024 / 1024}MB`, 
        raw: `File size exceeds limit: ${normalizedFilePath}` 
      };
      return { currentContent, newContent: "", occurrences: 0, error, isNewFile };
    }
    
    currentContent = await fs.readFile(normalizedFilePath, 'utf-8');
    currentContent = currentContent.replace(/\r\n/g, '\n');
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      error = { 
        display: `Error reading file: ${e.message}`, 
        raw: `Error reading file ${normalizedFilePath}: ${e.message}` 
      };
      return { currentContent, newContent: "", occurrences: 0, error, isNewFile };
    }
    // Ficheiro não existe (ENOENT) - continua
  }

  // Lógica de criação vs edição
  if (currentContent === null) {
    // Ficheiro não existe
    if (oldString === "") {
      isNewFile = true;
      occurrences = 1;
      normalizedNewString = unescapeLlmString(normalizedNewString);
    } else {
      error = { 
        display: "File not found. Cannot apply edit. Use an empty old_string to create a new file.", 
        raw: `File not found: ${normalizedFilePath}` 
      };
    }
  } else {
    // Ficheiro existe
    if (oldString === "") {
      error = { 
        display: "Failed to edit. Attempted to create a file that already exists.", 
        raw: `File already exists, cannot create: ${normalizedFilePath}` 
      };
    } else {
      // Tenta encontrar e substituir
      [normalizedOldString, normalizedNewString, occurrences] = ensureCorrectEdit(
        currentContent, 
        normalizedOldString, 
        normalizedNewString, 
        expectedReplacements
      );

      if (occurrences === 0) {
        // Debug: mostra parte do ficheiro para ajudar
        const contentPreview = currentContent.substring(0, 500);
        const oldStringPreview = normalizedOldString.substring(0, 200);
        
        error = { 
          display: `Failed to edit: could not find the string to replace.\n\nSearching for:\n${oldStringPreview}${normalizedOldString.length > 200 ? '...' : ''}\n\nFile starts with:\n${contentPreview}${currentContent.length > 500 ? '...' : ''}`,
          raw: `0 occurrences found for old_string in ${normalizedFilePath}. Check whitespace, indentation, and exact match.` 
        };
      } else if (occurrences !== expectedReplacements) {
        error = { 
          display: `Failed to edit: expected ${expectedReplacements} occurrence(s) but found ${occurrences}. Please adjust expected_replacements.`, 
          raw: `Expected ${expectedReplacements} but found ${occurrences} for old_string in ${normalizedFilePath}` 
        };
      }
    }
  }

  // Gera novo conteúdo se não houver erro
  let newContentResult = "";
  if (!error) {
    if (isNewFile) {
      newContentResult = normalizedNewString;
    } else if (currentContent !== null) {
      newContentResult = replaceAllOccurrences(currentContent, normalizedOldString, normalizedNewString);
    }
  }

  return { currentContent, newContent: newContentResult, occurrences, error, isNewFile };
}

export function createDiff(filename: string, oldContent: string, newContent: string): string {
  try {
    // Limita tamanho do diff
    if (oldContent.length > MAX_DIFF_SIZE || newContent.length > MAX_DIFF_SIZE) {
      return `--- a/${filename}\n+++ b/${filename}\n[Diff too large to display. File size: ${oldContent.length} -> ${newContent.length} bytes]\n`;
    }
    
    const diff = diffLines(oldContent, newContent, {});
    let diffString = `--- a/${filename}\n+++ b/${filename}\n`;
    
    let lineCount = 0;
    for (const part of diff) {
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      const lines = part.value.split('\n').slice(0, -1); // Remove última linha vazia
      
      for (const line of lines) {
        diffString += `${prefix}${line}\n`;
        lineCount++;
        
        // Limita número de linhas no diff
        if (lineCount > 1000) {
          diffString += `[... diff truncated after 1000 lines ...]\n`;
          return diffString;
        }
      }
    }
    
    return diffString;
  } catch (e: any) {
    return `--- a/${filename}\n+++ b/${filename}\n[Error generating diff: ${e.message}]\n`;
  }
}

export async function editTool(args: EditToolArgs): Promise<ToolResult> {
  try {
    const { file_path, old_string, new_string, expected_replacements = 1 } = args;
    
    // Valida argumentos
    if (!file_path || typeof file_path !== 'string') {
      return { 
        success: false, 
        error: `Invalid parameters: file_path is required and must be a string.`, 
        file_path: String(file_path || 'undefined') 
      };
    }
    
    if (old_string === undefined || new_string === undefined) {
      return { 
        success: false, 
        error: `Invalid parameters: old_string and new_string are required.`, 
        file_path: file_path 
      };
    }
    
    let normalizedFilePath: string;
    try {
      normalizedFilePath = normalizePath(file_path);
    } catch (e: any) {
      return { 
        success: false, 
        error: `Invalid file path: ${e.message}`, 
        file_path: file_path 
      };
    }

    // Segurança: impede path traversal
    if (normalizedFilePath.includes('..')) {
      return { 
        success: false, 
        error: `Invalid parameters: file_path cannot contain '..'.`, 
        file_path: normalizedFilePath 
      };
    }

    // Calcula a edição
    const editData = await calculateEdit(
      normalizedFilePath, 
      old_string, 
      new_string, 
      expected_replacements
    );

    if (editData.error) {
      return { 
        success: false, 
        error: `Execution failed: ${editData.error.display}`, 
        details: editData.error.raw, 
        file_path: normalizedFilePath 
      };
    }

    // Cria diretório se não existir
    const dirPath = path.dirname(normalizedFilePath);
    await fs.mkdir(dirPath, { recursive: true });
    
    // Escreve o ficheiro
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
        relative_path: relativePath 
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
        relative_path: relativePath 
      };
    }
  } catch (e: any) {
    return { 
      success: false, 
      error: `An unexpected error occurred during the edit operation: ${e.message}`, 
      file_path: args.file_path || 'unknown',
      details: e.stack || e.toString()
    };
  }
}