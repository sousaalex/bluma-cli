import { randomUUID } from 'crypto';

/**
 * Formato esperado (OpenAI compatible)
 */
export interface NormalizedToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface NormalizedMessage {
  role: string;
  content?: string | null;
  tool_calls?: NormalizedToolCall[];
}

/**
 * Detecta e normaliza tool calls de diferentes formatos para o formato OpenAI
 */
export class ToolCallNormalizer {
  /**
   * Normaliza a mensagem do assistant, convertendo diferentes formatos de tool calls
   */
  static normalizeAssistantMessage(message: any): NormalizedMessage {
    // Se já está no formato correto (OpenAI)
    if (message.tool_calls && this.isOpenAIFormat(message.tool_calls)) {
      return message;
    }

    // Tenta extrair tool calls de diferentes formatos
    const toolCalls = this.extractToolCalls(message);

    if (toolCalls.length > 0) {
      return {
        role: message.role || 'assistant',
        content: message.content || null,
        tool_calls: toolCalls,
      };
    }

    // Se não encontrou tool calls, retorna a mensagem original
    return message;
  }

  /**
   * Verifica se já está no formato OpenAI
   */
  private static isOpenAIFormat(toolCalls: any[]): boolean {
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) return false;
    
    const firstCall = toolCalls[0];
    return (
      typeof firstCall.id === 'string' &&
      firstCall.type === 'function' &&
      typeof firstCall.function?.name === 'string' &&
      typeof firstCall.function?.arguments === 'string'
    );
  }

  /**
   * Extrai tool calls de diversos formatos possíveis
   */
  private static extractToolCalls(message: any): NormalizedToolCall[] {
    const results: NormalizedToolCall[] = [];

    // Formato 1: Qwen/Anthropic style - array direto
    // {"tool_calls": [{"name": "tool_name", "arguments": {...}}]}
    if (message.tool_calls && Array.isArray(message.tool_calls)) {
      for (const call of message.tool_calls) {
        const normalized = this.normalizeToolCall(call);
        if (normalized) results.push(normalized);
      }
    }

    // Formato 2: Dentro do content como string JSON
    if (typeof message.content === 'string' && message.content.trim()) {
      const extracted = this.extractFromContent(message.content);
      results.push(...extracted);
    }

    // Formato 3: Campo "function_call" (deprecated OpenAI format)
    if (message.function_call) {
      const normalized = this.normalizeToolCall(message.function_call);
      if (normalized) results.push(normalized);
    }

    return results;
  }

  /**
   * Normaliza um único tool call para o formato OpenAI
   */
  private static normalizeToolCall(call: any): NormalizedToolCall | null {
    try {
      // Formato OpenAI completo
      if (call.id && call.function?.name) {
        return {
          id: call.id,
          type: 'function',
          function: {
            name: call.function.name,
            arguments: typeof call.function.arguments === 'string' 
              ? call.function.arguments 
              : JSON.stringify(call.function.arguments),
          },
        };
      }

      // Formato Qwen: {name: "...", arguments: {...}}
      if (call.name) {
        return {
          id: call.id || randomUUID(),
          type: 'function',
          function: {
            name: call.name,
            arguments: typeof call.arguments === 'string'
              ? call.arguments
              : JSON.stringify(call.arguments || {}),
          },
        };
      }

      // Formato alternativo: {function: {...}}
      if (call.function && typeof call.function === 'object') {
        return {
          id: call.id || randomUUID(),
          type: 'function',
          function: {
            name: call.function.name,
            arguments: typeof call.function.arguments === 'string'
              ? call.function.arguments
              : JSON.stringify(call.function.arguments || {}),
          },
        };
      }

      return null;
    } catch (error) {
      console.error('Error normalizing tool call:', error, call);
      return null;
    }
  }

  /**
   * Extrai tool calls do content (pode estar em markdown, JSON, etc)
   */
  private static extractFromContent(content: string): NormalizedToolCall[] {
    const results: NormalizedToolCall[] = [];

    // Remove markdown code blocks
    const cleanContent = content.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1');

    // Tenta encontrar objetos JSON que parecem tool calls
    const jsonMatches = this.extractJsonObjects(cleanContent);

    for (const jsonStr of jsonMatches) {
      try {
        const parsed = JSON.parse(jsonStr);
        
        // Se é um array de tool calls
        if (Array.isArray(parsed)) {
          for (const call of parsed) {
            const normalized = this.normalizeToolCall(call);
            if (normalized) results.push(normalized);
          }
        }
        // Se é um único tool call
        else if (parsed.name || parsed.function) {
          const normalized = this.normalizeToolCall(parsed);
          if (normalized) results.push(normalized);
        }
        // Se tem um campo tool_calls
        else if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
          for (const call of parsed.tool_calls) {
            const normalized = this.normalizeToolCall(call);
            if (normalized) results.push(normalized);
          }
        }
      } catch (e) {
        // Não é JSON válido, continua
      }
    }

    return results;
  }

  /**
   * Extrai objetos JSON de uma string (suporta múltiplos objetos)
   */
  private static extractJsonObjects(text: string): string[] {
    const results: string[] = [];
    let depth = 0;
    let start = -1;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (text[i] === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          results.push(text.substring(start, i + 1));
          start = -1;
        }
      }
    }

    return results;
  }

  /**
   * Valida se um tool call normalizado é válido
   */
  static isValidToolCall(call: NormalizedToolCall): boolean {
    return !!(
      call.id &&
      call.type === 'function' &&
      call.function?.name &&
      typeof call.function.arguments === 'string'
    );
  }
}