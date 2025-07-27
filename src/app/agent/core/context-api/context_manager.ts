import type { HistoryMessage } from '../../session_manger/session_manager.js';
// Importação do tipo específico para um 'tool_call' da biblioteca da OpenAI
import type { ChatCompletionMessageToolCall } from 'openai/resources/chat/completions';

/**
 * Retorna uma janela de contexto otimizada para a API, baseada em "turnos".
 *
 * REGRAS:
 * 1.  Sempre inclui todas as mensagens 'system' do início do histórico.
 * 2.  Inclui os últimos N 'turnos completos' do histórico.
 * 3.  Um turno começa com uma mensagem 'user' e consideramos que termina
 *     quando uma chamada à ferramenta 'agent_end_task' é feita.
 * 4.  Sempre inclui o turno ATUAL (o mais recente), mesmo que esteja em andamento.
 *
 * @param fullHistory O histórico completo da sessão.
 * @param maxTurns O número máximo de turnos passados a serem incluídos. Se null/undefined, retorna tudo.
 * @returns Uma lista de mensagens otimizada para ser enviada à API.
 */
export function createApiContextWindow(
  fullHistory: HistoryMessage[],
  maxTurns: number | null | undefined
): HistoryMessage[] {
  if (!fullHistory.length) {
    return [];
  }

  // Se maxTurns não for definido, retorna uma cópia do histórico completo.
  if (maxTurns === null || maxTurns === undefined) {
    return [...fullHistory];
  }

  // 1. Isolar as mensagens de sistema do início do histórico.
  const systemMessages: HistoryMessage[] = [];
  let historyStartIndex = 0;
  while (historyStartIndex < fullHistory.length && fullHistory[historyStartIndex].role === 'system') {
    systemMessages.push(fullHistory[historyStartIndex]);
    historyStartIndex++;
  }

  const conversationHistory = fullHistory.slice(historyStartIndex);

  // 2. Percorrer o histórico de conversas de trás para frente para encontrar os turnos.
  const turns: HistoryMessage[][] = [];
  let currentTurn: HistoryMessage[] = [];
  let turnsFound = 0;

  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    currentTurn.unshift(msg); // Adiciona a mensagem no início do turno atual

    // Um turno termina quando uma chamada de ferramenta para 'agent_end_task' é feita.
    // Esta chamada está dentro de uma mensagem 'assistant'.
    if (
      msg.role === 'assistant' &&
      // CORREÇÃO: Adicionamos o tipo explícito para 'tc' para resolver o erro do TypeScript.
      msg.tool_calls?.some((tc: ChatCompletionMessageToolCall) => tc.function.name === 'agent_end_task')
    ) {
      turns.unshift([...currentTurn]); // Adiciona uma cópia do turno completo no início da lista de turnos
      currentTurn = []; // Limpa para o próximo turno
      turnsFound++;

      if (turnsFound >= maxTurns) {
        break; // Para a busca se já encontramos os turnos necessários
      }
    }
  }

  // 3. Adicionar o turno atual (em andamento) de volta.
  // Se `currentTurn` ainda contém mensagens, é o turno mais recente e essencial.
  if (currentTurn.length > 0) {
    turns.unshift(currentTurn);
  }

  // 4. Montar a janela de contexto final.
  // `flat()` transforma o array de arrays de turnos em um único array de mensagens.
  const finalContext = systemMessages.concat(turns.flat());
  
  return finalContext;
}