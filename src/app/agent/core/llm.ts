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
    } as ChatCompletionCreateParams);
    return resp as any;
  }
}
