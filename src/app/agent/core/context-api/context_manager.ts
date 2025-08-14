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
 *     quando uma chamada à ferramenta 'agent_end_turn' é feita.
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

  // Helper: identifica overlay do dev pelo metadata name
  const isDevOverlay = (m: any) => m?.role === 'user' && m?.name === 'user_overlay';

  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    currentTurn.unshift(msg); // Adiciona a mensagem no início do turno atual

    // Regra: um turno termina quando uma chamada de ferramenta para 'agent_end_turn' é feita
    const endsWithAgentEnd = (
      msg.role === 'assistant' &&
      (msg as any).tool_calls?.some((tc: ChatCompletionMessageToolCall) => tc.function.name === 'agent_end_turn')
    );

    if (endsWithAgentEnd) {
      // Inclui quaisquer overlays imediatamente anteriores como parte do mesmo turno.
      // (já estão em currentTurn por causa do unshift acima)
      turns.unshift([...currentTurn]);
      currentTurn = [];
      turnsFound++;

      if (turnsFound >= maxTurns) {
        break; // Para a busca se já encontramos os turnos necessários
      }
      continue;
    }

    // Adicional: caso raro – se encontrarmos uma mensagem 'user' que NÃO é overlay
    // e imediatamente antes já havia um assistant (sem end_task), podemos considerar
    // que iniciou um novo turno. Porém, para não cortar overlays, apenas inicia
    // novo turno se o item anterior (mais recente) no currentTurn não for overlay.
    const prev = conversationHistory[i - 1];
    if (msg.role === 'user' && !isDevOverlay(msg)) {
      // Se o próximo mais recente (prev) for um assistant sem end_task, tratamos como fronteira macia.
      if (prev && prev.role === 'assistant' && !(prev as any).tool_calls?.some((tc: ChatCompletionMessageToolCall) => tc.function.name === 'agent_end_turn')) {
        // Fechamos este turno apenas se já temos conteúdo significativo (não só overlays)
        const hasNonOverlay = currentTurn.some(m => m.role !== 'user' || !isDevOverlay(m));
        if (hasNonOverlay) {
          turns.unshift([...currentTurn]);
          currentTurn = [];
          // Não incrementa turnsFound baseado nesta fronteira macia; só contamos fim real por end_task
        }
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