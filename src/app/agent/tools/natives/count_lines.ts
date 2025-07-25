import { createReadStream } from 'fs';
import { promises as fs } from 'fs';
import readline from 'readline';

export interface CountLinesArgs {
  filepath: string;
}

export interface CountLinesResult {
  success: boolean;
  filepath?: string;
  line_count?: number;
  error?: string;
}

/**
 * Lógica de implementação para contar linhas em um arquivo de forma eficiente.
 */
export async function countLines(args: CountLinesArgs): Promise<CountLinesResult> {
  const { filepath } = args;
  try {
    if (!(await fs.stat(filepath)).isFile()) {
      throw new Error(`File '${filepath}' not found or is not a file.`);
    }

    const fileStream = createReadStream(filepath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });
    
    let lineCount = 0;
    for await (const line of rl) {
      lineCount++;
    }

    return { success: true, filepath, line_count: lineCount };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}