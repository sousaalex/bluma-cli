// src/app/agent/session_manager.ts

import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// --- Definição de Tipos ---

// Define a estrutura de uma única mensagem no histórico
// (Você pode expandir isso conforme necessário)
export type HistoryMessage = ChatCompletionMessageParam;

// Define a estrutura completa do arquivo de sessão JSON
interface SessionData {
  current_turn?: {
    id: string;

  };
  session_id: string;
  created_at: string;
  last_updated?: string;
  conversation_history: HistoryMessage[];


}

// Mutex simples por arquivo (em memória) para evitar concorrência de gravações
const fileLocks = new Map<string, Promise<void>>();
async function withFileLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const prev = fileLocks.get(file) || Promise.resolve();
  let release: (value?: void) => void;
  const p = new Promise<void>(res => (release = res as any));
  fileLocks.set(file, prev.then(() => p));
  try {
    const result = await fn();
    return result;
  } finally {
    release!();
    if (fileLocks.get(file) === p) fileLocks.delete(file);
  }
}

// --- Funções utilitárias ---
function expandHome(p: string): string {
  if (!p) return p;
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

function getPreferredAppDir(): string {
  // Política global: sempre usar ~/.bluma-cli independentemente do SO
  // Ignora LOCALAPPDATA/APPDATA e overrides para garantir consistência
  const fixed = path.join(os.homedir(), '.bluma-cli');
  return path.resolve(expandHome(fixed));
}

async function safeRenameWithRetry(src: string, dest: string, maxRetries = 6): Promise<void> {
  let attempt = 0;
  let lastErr: unknown;
  const isWin = process.platform === 'win32';
  while (attempt <= maxRetries) {
    try {
      await fs.rename(src, dest);
      return;
    } catch (e: any) {
      lastErr = e;
      const code = (e && e.code) || '';
      const transient = code === 'EPERM' || code === 'EBUSY' || code === 'ENOTEMPTY' || code === 'EACCES';
      if (!(isWin && transient) || attempt === maxRetries) break;
      const backoff = Math.min(1000, 50 * Math.pow(2, attempt));
      await new Promise(r => setTimeout(r, backoff));
      attempt++;
    }
  }
  // Fallback: tenta copy+unlink
  try {
    const data = await fs.readFile(src);
    await fs.writeFile(dest, data);
    await fs.unlink(src).catch(() => {});
    return;
  } catch (fallbackErr) {
    throw lastErr || fallbackErr;
  }
}

// --- Funções do Gerenciador de Sessão ---

/**
 * Garante que o diretório de sessões exista.
 * @returns O caminho para o diretório de sessões.
 */
async function ensureSessionDir(): Promise<string> {
  const appDir = getPreferredAppDir();
  const sessionDir = path.join(appDir, 'sessions');
  await fs.mkdir(sessionDir, { recursive: true });
  return sessionDir;
}

/**
 * Carrega ou cria uma sessão de usuário, salvando os dados em uma pasta
 * no diretório preferencial (LOCALAPPDATA/Bluma em Windows; fallback ~/.bluma-cli).
 * @param sessionId O ID da sessão a ser carregada ou criada.
 * @returns Uma tupla contendo o caminho do arquivo da sessão e o histórico da conversa.
 */
export async function loadOrcreateSession(
  sessionId: string
  // A função agora retorna uma tupla com 3 elementos
): Promise<[string, HistoryMessage[], string[]]> { 
  const sessionDir = await ensureSessionDir();
  const sessionFile = path.join(sessionDir, `${sessionId}.json`);

  try {
    await fs.access(sessionFile);
    const fileContent = await fs.readFile(sessionFile, 'utf-8');
    const sessionData: SessionData = JSON.parse(fileContent);
    // Retorna o histórico E a lista de tarefas (ou um array vazio se não existir)
    return [sessionFile, [], []];  
  } catch (error) {
    const newSessionData: SessionData = {
      session_id: sessionId,
      created_at: new Date().toISOString(),
      conversation_history: [],

    };
    await fs.writeFile(sessionFile, JSON.stringify(newSessionData, null, 2), 'utf-8');
    // Retorna os valores para uma nova sessão
    return [sessionFile, [], []];
  }
} 
/**
 * Salva o histórico da conversa no arquivo de sessão correspondente de forma robusta
 * (safe-save + retry/backoff no Windows + fallback copy+unlink), prevenindo corrupção.
 * @param sessionFile O caminho completo para o arquivo da sessão.
 * @param history O array de histórico da conversa a ser salvo.
 */
export async function saveSessionHistory(
  sessionFile: string,
  history: HistoryMessage[],
): Promise<void> {
  await withFileLock(sessionFile, async () => {
    let sessionData: SessionData;

    // Robustez extra: garante diretório existente antes de qualquer IO
    try {
      const dir = path.dirname(sessionFile);
      await fs.mkdir(dir, { recursive: true });
    } catch {}

    try {
      const fileContent = await fs.readFile(sessionFile, 'utf-8');
      sessionData = JSON.parse(fileContent);
    } catch (error: any) {
      const code = error && error.code;
      if (code !== 'ENOENT') {
        if (error instanceof Error) {
          console.warn(`Could not read or parse session file ${sessionFile}. Re-initializing. Error: ${error.message}`);
        } else {
          console.warn(`An unknown error occurred while reading ${sessionFile}. Re-initializing.`, error);
        }
      }
      const sessionId = path.basename(sessionFile, '.json');
      sessionData = {
        session_id: sessionId,
        created_at: new Date().toISOString(),
        conversation_history: [],

      };
      // Cria o ficheiro base quando não existir
      try {
        await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2), 'utf-8');
      } catch {}
    }

    sessionData.conversation_history = history;
    sessionData.last_updated = new Date().toISOString();

    const tempSessionFile = `${sessionFile}.${Date.now()}.tmp`;

    try {
      await fs.writeFile(tempSessionFile, JSON.stringify(sessionData, null, 2), 'utf-8');
      await safeRenameWithRetry(tempSessionFile, sessionFile);
    } catch (writeError) {
      if (writeError instanceof Error) {
        console.error(`Fatal error saving session to ${sessionFile}: ${writeError.message}`);
      } else {
        console.error(`An unknown fatal error occurred while saving session to ${sessionFile}:`, writeError);
      }
      try {
        await fs.unlink(tempSessionFile);
      } catch {}
    }
  });
}