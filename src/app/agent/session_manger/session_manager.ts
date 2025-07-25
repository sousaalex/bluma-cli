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
* Salva o histórico da conversa no arquivo de sessão correspondente.
* Esta versão é mais robusta e lida com arquivos de sessão corrompidos e
* trata os erros de forma segura em TypeScript.
* @param sessionFile O caminho completo para o arquivo da sessão.
* @param history O array de histórico da conversa a ser salvo.
*/
export async function saveSessionHistory(sessionFile: string, history: HistoryMessage[]): Promise<void> {
 let sessionData: SessionData;

 try {
   const fileContent = await fs.readFile(sessionFile, 'utf-8');
   
   if (fileContent.trim() === '') {
       throw new Error("Session file is empty.");
   }

   sessionData = JSON.parse(fileContent);

 } catch (error) {
   // ---- AQUI ESTÁ A CORREÇÃO ----
   // Primeiro, verificamos se 'error' é uma instância de Error.
   if (error instanceof Error) {
       // Dentro deste bloco, o TypeScript sabe que 'error' tem a propriedade 'message'.
       console.warn(`Could not read or parse session file ${sessionFile}. Re-initializing. Error: ${error.message}`);
   } else {
       // Se não for um objeto Error, logamos o valor desconhecido de forma segura.
       console.warn(`An unknown error occurred while reading ${sessionFile}. Re-initializing.`, error);
   }
   
   const sessionId = path.basename(sessionFile, '.json');
   sessionData = {
     session_id: sessionId,
     created_at: new Date().toISOString(),
     conversation_history: [],
   };
 }

 try {
   sessionData.conversation_history = history;
   sessionData.last_updated = new Date().toISOString();

   await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2), 'utf-8');

 } catch (writeError) {
   // Aplicando a mesma lógica segura para o erro de escrita
   if (writeError instanceof Error) {
       console.error(`Fatal error saving session to ${sessionFile}: ${writeError.message}`);
   } else {
       console.error(`An unknown fatal error occurred while saving session to ${sessionFile}:`, writeError);
   }
 }
}