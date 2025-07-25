/**
 * Marca o fim de uma tarefa do agente.
 *
 * Esta função é usada para registrar a conclusão de uma tarefa, retornando um timestamp
 * no formato ISO 8601. Pode ser usada para logs, rastreamento de sessões, auditoria, etc.
 *
 * @returns Um objeto contendo:
 *  - `timestamp`: string com a data e hora atual (em UTC) no formato ISO
 *  - `message`: string padrão indicando que a tarefa foi encerrada
 */
export function agentEndTask(): { timestamp: string; message: string } {
    // Captura o timestamp atual no formato ISO (ex: 2025-07-24T15:42:30.123Z)
    const timestamp = new Date().toISOString();
  
    // Retorna o objeto de encerramento com uma mensagem descritiva
    return {
      timestamp,
      message: 'Agent task completed successfully.'
    };
  }
  