import { promises as fs } from 'fs';

export interface ReadLinesArgs {
  filepath: string;
  start_line: number;
  end_line: number;
}

export interface ReadLinesResult {
  success: boolean;
  filepath?: string;
  content?: string;
  lines_read?: number;
  start_line?: number;
  end_line?: number;
  total_file_lines?: number;
  error?: string;
}

/**
 * Lógica de implementação para ler um intervalo de linhas de um arquivo.
 */
export async function readLines(args: ReadLinesArgs): Promise<ReadLinesResult> {
  const { filepath, start_line, end_line } = args;
  try {
    if (!(await fs.stat(filepath)).isFile()) {
      throw new Error(`File '${filepath}' not found or is not a file.`);
    }

    if (start_line < 1 || end_line < start_line) {
      throw new Error("Invalid line range. start_line must be >= 1 and end_line must be >= start_line.");
    }

    const fileContent = await fs.readFile(filepath, 'utf-8');
    const lines = fileContent.split('\n');
    const total_lines = lines.length;

    // Converte para índice 0-based
    const startIndex = start_line - 1;
    let endIndex = end_line; // slice é exclusivo, então end_line está correto

    if (startIndex >= total_lines) {
      throw new Error(`start_line (${start_line}) exceeds file length (${total_lines} lines).`);
    }

    // Garante que o índice final não ultrapasse o fim do arquivo
    endIndex = Math.min(endIndex, total_lines);

    const contentLines = lines.slice(startIndex, endIndex);
    const content = contentLines.join('\n');

    return {
      success: true,
      filepath,
      content,
      lines_read: contentLines.length,
      start_line,
      end_line: endIndex, // Retorna o final real usado
      total_file_lines: total_lines,
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}