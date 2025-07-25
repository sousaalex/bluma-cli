import { promises as fs } from 'fs';
import path from 'path';

// Padrões de ignore padrão, para serem usados pela função
const DEFAULT_IGNORE: Set<string> = new Set([
  '.git', '.gitignore', '.venv', 'venv', 'node_modules', '__pycache__', 
  '*.pyc', '.vscode', '.idea', 'dist', 'build', '*.log', '.DS_Store',
]);

// Interfaces para tipagem forte dos argumentos e do resultado
export interface LsArgs {
  directory_path?: string;
  recursive?: boolean;
  ignore_patterns?: string[];
  start_index?: number;
  end_index?: number;
  show_hidden?: boolean;
  file_extensions?: string[];
  max_depth?: number;
}

export interface LsResult {
  success: boolean;
  path?: string;
  recursive?: boolean;
  total_files?: number;
  total_directories?: number;
  showing_files?: string;
  showing_directories?: string;
  files?: string[];
  directories?: string[];
  filters_applied?: Record<string, any>;
  error?: string;
}

/**
 * Lógica de implementação para listar arquivos e diretórios.
 */
export async function ls(args: LsArgs): Promise<LsResult> {
  const {
    directory_path = '.',
    recursive = false,
    ignore_patterns = [],
    start_index = 0,
    end_index,
    show_hidden = false,
    file_extensions,
    max_depth,
  } = args;

  try {
    const basePath = path.resolve(directory_path);
    if (!(await fs.stat(basePath)).isDirectory()) {
      throw new Error(`Directory '${directory_path}' not found.`);
    }

    const allIgnorePatterns = new Set([...DEFAULT_IGNORE, ...ignore_patterns]);
    const normalizedExtensions = file_extensions?.map(ext => ext.toLowerCase());

    const allFiles: string[] = [];
    const allDirs: string[] = [];

    const walk = async (currentDir: string, currentDepth: number) => {
      if (max_depth !== undefined && currentDepth > max_depth) return;

      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const entryName = entry.name;
        const fullPath = path.join(currentDir, entryName);
        const posixPath = fullPath.split(path.sep).join('/');

        const isHidden = entryName.startsWith('.');
        if (allIgnorePatterns.has(entryName) || (isHidden && !show_hidden)) {
          continue;
        }

        if (entry.isDirectory()) {
          allDirs.push(posixPath);
          if (recursive) {
            await walk(fullPath, currentDepth + 1);
          }
        } else if (entry.isFile()) {
          if (!normalizedExtensions || normalizedExtensions.includes(path.extname(entryName).toLowerCase())) {
            allFiles.push(posixPath);
          }
        }
      }
    };
    
    await walk(basePath, 0);

    allFiles.sort();
    allDirs.sort();

    return {
      success: true,
      path: basePath.split(path.sep).join('/'),
      recursive,
      total_files: allFiles.length,
      total_directories: allDirs.length,
      showing_files: `[${start_index}:${Math.min(end_index ?? allFiles.length, allFiles.length)}]`,
      showing_directories: `[${start_index}:${Math.min(end_index ?? allDirs.length, allDirs.length)}]`,
      files: allFiles.slice(start_index, end_index),
      directories: allDirs.slice(start_index, end_index),
      filters_applied: { ignore_patterns: [...allIgnorePatterns], show_hidden, file_extensions, max_depth },
    };

  } catch (e: any) {
    return { success: false, error: e.message };
  }
}