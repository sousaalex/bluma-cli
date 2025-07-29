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
  session_id: string;
  created_at: string;
  last_updated?: string;
  conversation_history: HistoryMessage[];
}


// --- Funções do Gerenciador de Sessão ---

/**
 * Garante que o diretório de sessões exista.
 * @returns O caminho para o diretório de sessões.
 */
async function ensureSessionDir(): Promise<string> {
  const homeDir = os.homedir();
  const appDir = path.join(homeDir, '.bluma-cli');
  const sessionDir = path.join(appDir, 'sessions');
  
  // O { recursive: true } é equivalente ao `parents=True, exist_ok=True` do Python
  await fs.mkdir(sessionDir, { recursive: true });
  
  return sessionDir;
}

/**
 * Carrega ou cria uma sessão de usuário, salvando os dados em uma pasta
 * oculta (.bluma-cli) no diretório home do usuário.
 * @param sessionId O ID da sessão a ser carregada ou criada.
 * @returns Uma tupla contendo o caminho do arquivo da sessão e o histórico da conversa.
 */
export async function loadOrcreateSession(sessionId: string): Promise<[string, HistoryMessage[]]> {
  const sessionDir = await ensureSessionDir();
  const sessionFile = path.join(sessionDir, `${sessionId}.json`);

  try {
    // Tenta ler o arquivo existente
    await fs.access(sessionFile); // Verifica se o arquivo existe e é acessível
    const fileContent = await fs.readFile(sessionFile, 'utf-8');
    const sessionData: SessionData = JSON.parse(fileContent);
    return [sessionFile, sessionData.conversation_history || []];
  } catch (error) {
    // Se o arquivo não existe ou há um erro de leitura/parsing, cria um novo.
    const newSessionData: SessionData = {
      session_id: sessionId,
      created_at: new Date().toISOString(),
      conversation_history: [],
    };

    // Escreve o novo arquivo de sessão
    await fs.writeFile(sessionFile, JSON.stringify(newSessionData, null, 2), 'utf-8');
    
    return [sessionFile, []];
  }
}

/**
 * Salva o histórico da conversa no arquivo de sessão correspondente de forma atómica,
 * prevenindo a corrupção de dados.
 * @param sessionFile O caminho completo para o arquivo da sessão.
 * @param history O array de histórico da conversa a ser salvo.
 */
export async function saveSessionHistory(sessionFile: string, history: HistoryMessage[]): Promise<void> {
  let sessionData: SessionData;

  try {
    // Tenta ler o conteúdo atual para preservar metadados como 'created_at'
    const fileContent = await fs.readFile(sessionFile, 'utf-8');
    sessionData = JSON.parse(fileContent);
  } catch (error) {
    // Se a leitura falhar (ficheiro não existe, está corrompido ou vazio),
    // inicializamos uma nova estrutura de sessão.
    // A sua lógica de logging aqui estava boa, vamos mantê-la.
    if (error instanceof Error) {
      console.warn(`Could not read or parse session file ${sessionFile}. Re-initializing. Error: ${error.message}`);
    } else {
      console.warn(`An unknown error occurred while reading ${sessionFile}. Re-initializing.`, error);
    }
    
    const sessionId = path.basename(sessionFile, '.json');
    sessionData = {
      session_id: sessionId,
      created_at: new Date().toISOString(),
      conversation_history: [], // Começa com histórico vazio
    };
  }

  // Atualiza os dados da sessão com o novo histórico e timestamp
  sessionData.conversation_history = history;
  sessionData.last_updated = new Date().toISOString();

  // --- IMPLEMENTAÇÃO DO PADRÃO "SAFE SAVE" ---
  const tempSessionFile = `${sessionFile}.${Date.now()}.tmp`; // Nome de ficheiro temporário único

  try {
    // 1. Escreve o novo conteúdo no ficheiro temporário
    await fs.writeFile(tempSessionFile, JSON.stringify(sessionData, null, 2), 'utf-8');

    // 2. Se a escrita for bem-sucedida, renomeia atomicamente o temporário para o original
    await fs.rename(tempSessionFile, sessionFile);

  } catch (writeError) {
    // Se algo correr mal durante a escrita ou renomeação, loga o erro fatal.
    if (writeError instanceof Error) {
      console.error(`Fatal error saving session to ${sessionFile}: ${writeError.message}`);
    } else {
      console.error(`An unknown fatal error occurred while saving session to ${sessionFile}:`, writeError);
    }

    // Tenta limpar o ficheiro temporário se ele existir
    try {
      await fs.unlink(tempSessionFile);
    } catch (cleanupError) {
      // Ignora erros na limpeza, o erro principal é mais importante.
    }
  }
}