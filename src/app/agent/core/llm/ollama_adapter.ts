import type {
  ChatCompletionParams,
  ChatCompletionResponse,
  LLMClient,
} from './llm';
import { ToolCallNormalizer } from './tool_call_normalizer';

export interface OllamaConfig {
  baseUrl?: string;
  timeout?: number;
}

/**
 * Adapter para Ollama que normaliza tool calls para o formato OpenAI
 */
export class OllamaAdapter implements LLMClient {
  private baseUrl: string;
/*   private timeout: number; */

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    /* this.timeout = config.timeout || 120000; // 2 minutos */
  }

  async chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse> {
    const ollamaPayload = this.convertToOllamaFormat(params);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ollamaPayload),
        /* signal: AbortSignal.timeout(this.timeout), */
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const rawData = await response.json();
      return this.normalizeResponse(rawData);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Ollama request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Converte parâmetros para o formato Ollama
   */
  private convertToOllamaFormat(params: ChatCompletionParams): any {
    const payload: any = {
      model: params.model,
      messages: params.messages,
      stream: false,
      options: {},
    };

    if (params.temperature !== undefined) {
      payload.options.temperature = params.temperature;
    }

    if (params.max_tokens !== undefined) {
      payload.options.num_predict = params.max_tokens;
    }

    // Ollama tools format
    if (params.tools && params.tools.length > 0) {
      payload.tools = params.tools.map((tool) => ({
        type: 'function',
        function: {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters,
        },
      }));
    }

    return payload;
  }

  /**
   * Normaliza a resposta do Ollama para o formato OpenAI
   */
  private normalizeResponse(rawResponse: any): ChatCompletionResponse {
    const message = rawResponse.message || {};

    // CRÍTICO: Normaliza tool calls usando nossa camada de abstração
    const normalizedMessage = ToolCallNormalizer.normalizeAssistantMessage(message);

    // Valida tool calls normalizados
    if (normalizedMessage.tool_calls) {
      normalizedMessage.tool_calls = normalizedMessage.tool_calls.filter((call) =>
        ToolCallNormalizer.isValidToolCall(call)
      );

      // Se não restaram tool calls válidos, remove o campo
      if (normalizedMessage.tool_calls.length === 0) {
        delete normalizedMessage.tool_calls;
      }
    }

    return {
      id: rawResponse.id || `ollama-${Date.now()}`,
      choices: [
        {
          message: normalizedMessage,
        },
      ],
    };
  }
}