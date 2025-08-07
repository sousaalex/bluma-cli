//tool_Invoker.ts
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // <<< ADICIONE ESTA IMPORTAÇÃO

// Importa as implementações das ferramentas de seus respectivos arquivos
import { shellCommand } from './tools/natives/shell_command.js';
import { editTool } from './tools/natives/edit.js';
import { messageNotifyuser } from './tools/natives/message.js';
import { ls } from './tools/natives/ls.js';
import { readLines } from './tools/natives/readLines.js'
import { countLines } from './tools/natives/count_lines.js';
import type { ChatCompletionTool } from 'openai/resources/chat/completions';


// --- Tipos e Interfaces ---

/**
 * Define a estrutura de uma definição de ferramenta no formato que a API da OpenAI espera.
 * Esta interface é exportada para que outros módulos, como o MCPClient, possam usá-la.
 */
export type ToolDefinition = ChatCompletionTool;


/**
 * Define a estrutura do arquivo de configuração `native_tools.json`.
 */
interface NativeToolsConfig {
    nativeTools: ToolDefinition[];
  }

// --- Classe ToolInvoker ---

/**
 * A classe ToolInvoker é responsável por duas coisas:
 * 1. Carregar as definições (schemas) das ferramentas nativas a partir de um arquivo de configuração.
 * 2. Mapear os nomes dessas ferramentas às suas implementações em código (as funções TypeScript).
 * 3. Executar uma ferramenta nativa quando solicitado.
 */
export class ToolInvoker {
  // Mapa privado para associar nomes de ferramentas às suas funções de implementação.
  private toolImplementations: Map<string, (args: any) => Promise<any>>;
  // Propriedade privada para armazenar as definições de ferramentas carregadas do JSON.
  private toolDefinitions: ToolDefinition[] = [];

  constructor() {
    this.toolImplementations = new Map();
    // O registro das implementações é feito de forma síncrona no construtor.
    this.registerTools();
  }

  /**
   * Carrega as definições de ferramentas do arquivo de configuração `native_tools.json`.
   * Este método é assíncrono e deve ser chamado após a criação da instância.
   */
  public async initialize(): Promise<void> {
    try {
      // Constrói o caminho para o arquivo de configuração de forma segura.
      const __filename = fileURLToPath(import.meta.url);
      
      // 2. Obtém o diretório do arquivo atual.
      //    Quando executado a partir de `dist`, este será `.../bluma/dist/app/agent/`.
      const __dirname = path.dirname(__filename);

      // 3. Constrói o caminho para a pasta de configuração RELATIVO ao local do script.
      //    Nós subimos dois níveis (`../..`) para chegar em `dist/` e então entramos em `config/`.
      const configPath = path.resolve(__dirname, 'config', 'native_tools.json');

      const fileContent = await fs.readFile(configPath, 'utf-8');
      const config: NativeToolsConfig = JSON.parse(fileContent);
      
      // Armazena as definições carregadas na propriedade da classe.
      this.toolDefinitions = config.nativeTools;
    //   console.log(`[ToolInvoker] ${this.toolDefinitions.length} definições de ferramentas nativas carregadas com sucesso.`);
    } catch (error) {
      console.error("[ToolInvoker] Erro crítico ao carregar 'native_tools.json'. As ferramentas nativas não estarão disponíveis.", error);
      // Em caso de erro, a lista de definições permanecerá vazia.
      this.toolDefinitions = [];
    }
  }

  /**
   * Registra as implementações de todas as ferramentas nativas.
   * Este método mapeia o nome da ferramenta (string) para a função TypeScript que a executa.
   */
  private registerTools(): void {
    this.toolImplementations.set('shell_command', shellCommand);
    this.toolImplementations.set('edit_tool', editTool);
    this.toolImplementations.set('message_notify_user', messageNotifyuser);
    this.toolImplementations.set('ls_tool', ls);
    this.toolImplementations.set('count_file_lines', countLines);
    this.toolImplementations.set('read_file_lines', readLines)
    
    // A ferramenta 'agent_end_task' é especial. Ela não faz nada, mas precisa ser registrada
    // para que o invoker não retorne um erro de "ferramenta não encontrada".
    // A lógica de realmente encerrar a tarefa será tratada pelo Agente.
    this.toolImplementations.set('agent_end_task', async () => ({ success: true, message: "Task ended by agent." }));
  }

  /**
   * Retorna a lista de definições de todas as ferramentas nativas carregadas.
   * O MCPClient usará esta função para obter a lista de ferramentas locais.
   */
  public getToolDefinitions(): ToolDefinition[] {
    return this.toolDefinitions;
  }

  /**
   * Invoca uma ferramenta nativa pelo nome com os argumentos fornecidos.
   * @param toolName O nome da ferramenta a ser invocada.
   * @param args Os argumentos para a ferramenta, geralmente um objeto.
   * @returns O resultado da execução da ferramenta.
   */
  public async invoke(toolName: string, args: any): Promise<any> {
    // Procura a implementação da ferramenta no mapa.
    const implementation = this.toolImplementations.get(toolName);
    
    // Se nenhuma implementação for encontrada, retorna uma mensagem de erro estruturada.
    if (!implementation) {
      return { error: `Error: Native tool "${toolName}" not found.` };
    }

    // Executa a implementação dentro de um bloco try...catch para lidar com
    // quaisquer erros inesperados que possam ocorrer durante a execução da ferramenta.
    try {
      return await implementation(args);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { error: `Error executing tool "${toolName}": ${errorMessage}` };
    }
  }
}