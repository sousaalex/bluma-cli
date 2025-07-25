// src/app/agent/Agent.ts

import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import path from 'path';

// Carrega as variáveis de ambiente do arquivo .env na raiz do projeto
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export class Agent {
  private client: OpenAI;
  private deploymentName: string;

  constructor() {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT || '';

    if (!endpoint || !apiKey || !apiVersion || !this.deploymentName) {
      throw new Error("Uma ou mais variáveis de ambiente Azure OpenAI não foram encontradas. Verifique o seu arquivo .env");
    }

    // Configuração para Azure OpenAI
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: `${endpoint}/openai/deployments/${this.deploymentName}`,
      defaultQuery: { 'api-version': apiVersion },
      defaultHeaders: { 'api-key': apiKey },
    });

    console.log("[Agent.ts] Cliente Azure OpenAI inicializado com sucesso.");
  }

  /**
   * Um método simples para testar a conexão com a API do LLM.
   * Ele faz uma chamada de chat completion muito simples e barata.
   */
  public async testConnection(): Promise<boolean> {
    try {
      console.log("[Agent.ts] Testando conexão com o LLM...");
      const response = await this.client.chat.completions.create({
        model: this.deploymentName, // No Azure, o modelo é o nome do deployment
        messages: [{ role: 'user', content: 'Olá, mundo!' }],
        max_tokens: 5,
      });

      if (response.choices[0].message.content) {
        console.log("[Agent.ts] Conexão bem-sucedida! Resposta do LLM:", response.choices[0].message.content.trim());
        return true;
      } else {
        console.error("[Agent.ts] Conexão falhou: Nenhuma resposta recebida.");
        return false;
      }
    } catch (error) {
      console.error("[Agent.ts] Erro ao testar a conexão com o LLM:", error);
      return false;
    }
  }

  // Futuramente, adicionaremos o método principal aqui
  // public async processTurn(history: any[]): Promise<any> { ... }
}