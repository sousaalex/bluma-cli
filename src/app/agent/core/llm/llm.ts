import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionCreateParams,
} from 'openai/resources/chat/completions';

// Re-exported aliases to keep project-level types consistent while aligning with OpenAI SDK types
export type ChatMessage = ChatCompletionMessageParam;
export type ToolSpec = ChatCompletionTool;

export interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[]; // Now compatible with OpenAI SDK
  tools?: ToolSpec[];
  tool_choice?: ChatCompletionCreateParams['tool_choice'];
  temperature?: number; // Added temperature for flexibility
  reasoning?: { effort: 'high' | 'medium' | 'low' }; // Added reasoning object support
  parallel_tool_calls?: boolean;
  max_tokens?: number; // Optional, to limit response length
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{ message: any }>;
}

export interface LLMClient {
  chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse>;
}

/**
 * OpenAI Adapter - mantém compatibilidade com API OpenAI
 */
export class OpenAIAdapter implements LLMClient {
  private client: OpenAI;
  
  constructor(client: OpenAI) {
    this.client = client;
  }
  
  async chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse> {
    const resp = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages,
      tools: params.tools,
      tool_choice: params.tool_choice,
      parallel_tool_calls: params.parallel_tool_calls,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
    } as ChatCompletionCreateParams);
    
    return resp as any;
  }
}

/**
 * Factory para criar o cliente LLM apropriado
 */
export class LLMClientFactory {
  /**
   * Cria um cliente baseado no modelo especificado
   */
  static create(model: string, openaiClient?: OpenAI): LLMClient {
    // Detecta se é um modelo Ollama (formato: "model:tag" ou modelos conhecidos)
    const isOllama = this.isOllamaModel(model);

    if (isOllama) {
      // Importação dinâmica do OllamaAdapter para evitar dependências circulares
      const { OllamaAdapter } = require('./ollama_adapter');
      return new OllamaAdapter();
    }

    // Default: OpenAI
    if (!openaiClient) {
      throw new Error('OpenAI client is required for OpenAI models');
    }
    return new OpenAIAdapter(openaiClient);
  }

  /**
   * Detecta se o modelo é do Ollama
   */
  private static isOllamaModel(model: string): boolean {
    // Modelos Ollama geralmente têm o formato "model:tag" ou são modelos conhecidos
    const ollamaPatterns = [
      /^qwen/i,
      /^llama/i,
      /^mistral/i,
      /^codellama/i,
      /^deepseek/i,
      /^phi/i,
      /:.+$/, // Qualquer modelo com tag (:7b, :13b, etc)
    ];

    return ollamaPatterns.some((pattern) => pattern.test(model));
  }
}