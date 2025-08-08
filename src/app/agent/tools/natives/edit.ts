// src/app/agent/tools/edit_tool.ts

import path from 'path';
import { promises as fs } from 'fs';
import { diffLines, type Change } from 'diff'; // Usaremos uma biblioteca de diff popular

// --- Tipos e Interfaces ---
// Definir tipos claros é a maior vantagem do TypeScript. Vamos usá-los extensivamente.

/**
 * Argumentos esperados pela função principal da ferramenta `editTool`.
 */
export interface EditToolArgs {
  file_path: string;
  old_string: string;
  new_string: string;
  expected_replacements?: number;
}

/**
 * Representa o resultado calculado de uma operação de edição, antes de ser aplicada.
 * EXPORTADO para que o Agente possa usar o tipo de retorno de calculateEdit.
 */
export interface CalculatedEdit {
  currentContent: string | null;
  newContent: string;
  occurrences: number;
  error: { display: string; raw: string } | null;
  isNewFile: boolean;
}

/**
 * O objeto de resposta final que a ferramenta retorna, formatado para o LLM.
 * EXPORTADO por boa prática.
 */
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

/**
 * Desescapa uma string que pode ter sido excessivamente escapada por um LLM.
 * Lida especificamente com casos como `\\n` literal em vez de novas linhas reais.
 * @param inputString A string a ser desescapada.
 * @returns A string corrigida.
 */
function unescapeLlmString(inputString: string): string {
  // Esta implementação é mais simples e robusta que regex para este caso.
  // Ela substitui as sequências de escape mais comuns.
  return inputString
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

/**
 * Tenta corrigir os parâmetros de edição se a `old_string` original não for encontrada.
 * Primeiro tenta desescapar, depois tenta remover espaços em branco.
 * @param currentContent O conteúdo atual do arquivo.
 * @param oldString A string original a ser substituída.
 * @param newString A nova string.
 * @param expectedReplacements O número esperado de substituições.
 * @returns Uma tupla com a `old_string` corrigida, `new_string` e o número de ocorrências.
 */
function ensureCorrectEdit(
  currentContent: string,
  oldString: string,
  newString: string,
  expectedReplacements: number
): [string, string, number] {
  let finalOldString = oldString;
  let finalNewString = newString;
  
  // `split` e `join` é uma forma eficaz de contar ocorrências não sobrepostas.
  let occurrences = currentContent.split(finalOldString).length - 1;

  // Se a contagem não bate e é zero, tenta corrigir a `old_string`.
  if (occurrences !== expectedReplacements && occurrences === 0) {
    // Tentativa 1: Desescapar a string (problema comum de LLM)
    const unescapedOldString = unescapeLlmString(oldString);
    const unescapedOccurrences = currentContent.split(unescapedOldString).length - 1;

    if (unescapedOccurrences > 0) {
      finalOldString = unescapedOldString;
      finalNewString = unescapeLlmString(newString); // Também desescapa a nova string por consistência
      occurrences = unescapedOccurrences;
    } else {
      // Tentativa 2: Remover espaços em branco do início e fim
      const trimmedOldString = oldString.trim();
      const trimmedOccurrences = currentContent.split(trimmedOldString).length - 1;
      if (trimmedOccurrences > 0) {
        finalOldString = trimmedOldString;
        finalNewString = newString.trim();
        occurrences = trimmedOccurrences;
      }
    }
  }

  return [finalOldString, finalNewString, occurrences];
}

/**
 * Calcula o resultado potencial de uma operação de edição sem modificar o arquivo.
 * EXPORTADO para que o Agente possa usar esta função para gerar um preview.
 * @returns Um objeto `CalculatedEdit` com o resultado.
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

  // Pré-processa e NORMALIZA as strings de entrada para usar quebras de linha LF (\n).
  let finalNewString = unescapeLlmString(newString).replace(/\r\n/g, '\n');
  let finalOldString = oldString.replace(/\r\n/g, '\n');
  let occurrences = 0;

  try {
    currentContent = await fs.readFile(filePath, 'utf-8');
    // Normaliza também as quebras de linha do conteúdo do arquivo para LF (\n).
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
      occurrences = 1;
    } else {
      error = { display: "File not found. Cannot apply edit. Use an empty old_string to create a new file.", raw: `File not found: ${filePath}` };
    }
  } else {
    if (oldString === "") {
      error = { display: "Failed to edit. Attempted to create a file that already exists.", raw: `File already exists, cannot create: ${filePath}` };
    } else {
      // Passa as strings já normalizadas para ensureCorrectEdit
      [finalOldString, finalNewString, occurrences] = ensureCorrectEdit(currentContent, finalOldString, finalNewString, expectedReplacements);

      if (occurrences === 0) {
        error = { display: "Failed to edit, could not find the string to replace.", raw: `0 occurrences found for old_string in ${filePath}. Check whitespace, indentation, and context.` };
      } else if (occurrences !== expectedReplacements) {
        error = { display: `Failed to edit, expected ${expectedReplacements} occurrence(s) but found ${occurrences}.`, raw: `Expected ${expectedReplacements} but found ${occurrences} for old_string in ${filePath}` };
      }
    }
  }

  let newContentResult = "";
  if (!error) {
    if (isNewFile) {
      newContentResult = finalNewString;
    } else if (currentContent !== null) {
      newContentResult = currentContent.replaceAll(finalOldString, finalNewString);
    }
  }

  return { currentContent, newContent: newContentResult, occurrences, error, isNewFile };
}

/**
 * Cria um diff unificado entre o conteúdo antigo e o novo.
 * EXPORTADO para que o Agente possa usar esta função para formatar o preview para o usuário.
 * @returns Uma string formatada como um diff.
 */
export function createDiff(filename: string, oldContent: string, newContent: string): string {
  const diff = diffLines(oldContent, newContent, {
    // `unified: 3` é o padrão para diffs, mostrando 3 linhas de contexto.
    // `newlineIsToken: true` lida melhor com mudanças de quebra de linha.
  });

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

/**
 * [EXECUÇÃO] Substitui texto dentro de um arquivo de forma precisa e segura.
 * Esta função é o ponto de entrada para o ToolInvoker e deve ser chamada APÓS a confirmação do usuário.
 *
 * @param args Os argumentos da ferramenta, validados pelo ToolInvoker.
 * @returns Um objeto `ToolResult` com o resultado da operação.
 */
export async function editTool(args: EditToolArgs): Promise<ToolResult> {
  const { file_path, old_string, new_string, expected_replacements = 1 } = args;

  // Validação de Parâmetros
  if (!path.isAbsolute(file_path)) {
    return { success: false, error: `Invalid parameters: file_path must be absolute.`, file_path };
  }
  if (file_path.includes('..')) {
    return { success: false, error: `Invalid parameters: file_path cannot contain '..'.`, file_path };
  }

  try {
    // 1. Calcula a edição. Isso funciona como uma validação final para garantir
    // que o estado do arquivo não mudou desde a geração do preview.
    const editData = await calculateEdit(file_path, old_string, new_string, expected_replacements);

    // 2. Se o cálculo resultou em um erro, retorna-o imediatamente.
    if (editData.error) {
      return {
        success: false,
        error: `Execution failed: ${editData.error.display}`,
        details: editData.error.raw,
        file_path,
      };
    }

    // 3. Se o cálculo foi bem-sucedido, executa a escrita no disco.
    // Garante que o diretório pai exista antes de tentar escrever o arquivo.
    await fs.mkdir(path.dirname(file_path), { recursive: true });
    await fs.writeFile(file_path, editData.newContent, 'utf-8');

    // 4. Prepara uma resposta informativa para o LLM.
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
    // Captura erros inesperados durante a escrita do arquivo ou outras operações.
    return {
      success: false,
      error: `An unexpected error occurred during the edit operation: ${e.message}`,
      file_path,
    };
  }
}