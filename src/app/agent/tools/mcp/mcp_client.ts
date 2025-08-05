import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url'; // <<< ADICIONE ESTA IMPORTAÇÃO
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ToolInvoker, ToolDefinition } from '../../tool_invoker.js';
import { EventEmitter } from 'events'; // <<< ADICIONA A IMPORTAÇÃO


// --- Tipos e Interfaces (inalterados) ---

interface McpServerConfig {
    type: 'stdio' | 'sse';
    command: string;
    args?: string[];
    env?: { [key: string]: string };
    url?: string;
  }
  interface McpConfig {
    mcpServers: { [serverName: string]: McpServerConfig; };
  }
  interface ToolRoute {
    server: string;
    originalName: string;
  }
  
  // --- Classe MCPClient ---
  export class MCPClient {
    private sessions: Map<string, Client> = new Map();
    private toolToServerMap: Map<string, ToolRoute> = new Map();
    private globalToolsForLlm: ToolDefinition[] = [];
    public nativeToolInvoker: ToolInvoker;
    private eventBus: EventEmitter; // <<< ADICIONA A PROPRIEDADE

    constructor(nativeToolInvoker: ToolInvoker, eventBus: EventEmitter) { 
      this.nativeToolInvoker = nativeToolInvoker;
      this.eventBus = eventBus;
    }
  
    // ... (método initialize inalterado) ...
    public async initialize(): Promise<void> {
    //   console.log('[MCPClient] Inicializando...');
  
      const nativeTools = this.nativeToolInvoker.getToolDefinitions();
      this.globalToolsForLlm.push(...nativeTools);
      for (const tool of nativeTools) {
        const toolName = tool.function.name;
        this.toolToServerMap.set(toolName, {
          server: 'native',
          originalName: toolName,
        });
      }
    //   console.log(`[MCPClient] ${nativeTools.length} ferramentas nativas registradas.`);
  
          // 1. Configuração LOCAL (relativa ao diretório de trabalho do usuário)
    //    Esta permanece como estava, usando process.cwd().
// 1. Define o caminho para a configuração PADRÃO (que vem com a instalação).
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const defaultConfigPath = path.resolve(__dirname, 'config', 'bluma-mcp.json');

        // 2. Define o caminho para a configuração GLOBAL do USUÁRIO.
        const userConfigPath = path.join(os.homedir(), '.bluma-cli', 'bluma-mcp.json');

        // 3. Carrega as configurações de ambos os locais.
        const defaultConfig = await this.loadMcpConfig(defaultConfigPath, 'Default');
        const userConfig = await this.loadMcpConfig(userConfigPath, 'User');

        // 4. Mescla as configurações. A configuração do usuário (userConfig)
        //    sobrescreve a padrão (defaultConfig).
        const mergedConfig: McpConfig = {
        mcpServers: {
            ...(defaultConfig.mcpServers || {}),
            ...(userConfig.mcpServers || {}),
        },
        };

    //   console.log('[MCPClient] Conteúdo da configuração MCP carregada:', JSON.stringify(localConfig, null, 2));

  
      if (Object.keys(mergedConfig.mcpServers).length === 0) {
        // console.log('[MCPClient] Nenhum servidor MCP encontrado. Apenas ferramentas nativas estarão disponíveis.');
        // console.log(`[MCPClient] Inicialização concluída. Total de ferramentas disponíveis: ${this.globalToolsForLlm.length}`);
        return;
      }
      
      const serverEntries = Object.entries(mergedConfig.mcpServers);
      for (const [serverName, serverConf] of serverEntries) {
        try {

            this.eventBus.emit('backend_message', {
                type: 'connection_status',
                message: `${serverName} server is being connected...`
              });

          if (serverConf.type === 'stdio') {
            await this.connectToStdioServer(serverName, serverConf);
          } else if (serverConf.type === 'sse') {
            console.warn(`[MCPClient] Conexão com servidores SSE (como '${serverName}') ainda não implementada.`);
          }
        } catch (error) {
          this.eventBus.emit('backend_message', {
          type: 'error',
          message: `Failed to connect to server '${serverName}'.`
        });
        }
      }
    //   console.log(`[MCPClient] Inicialização concluída. Total de ferramentas disponíveis: ${this.globalToolsForLlm.length}`);
    }
  
    private async loadMcpConfig(configPath: string, configType: string): Promise<Partial<McpConfig>> {
        try {
          const fileContent = await fs.readFile(configPath, 'utf-8');
          const processedContent = this.replaceEnvPlaceholders(fileContent);
        //   console.log(`[MCPClient] ${configType} MCP config loaded from: ${configPath}`);
          return JSON.parse(processedContent);
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            // É normal não encontrar o arquivo de configuração do usuário, não loga como aviso.
            if (configType === 'User') {
              // console.log(`[MCPClient] Info: No user config found at ${configPath}.`);
            }
          } else {
            console.warn(`[MCPClient] Warning: Error reading ${configType} config file ${configPath}.`, error);
          }
          return {};
        }
      }
  
    /**
     * Conecta-se a um servidor MCP baseado em Stdio, adaptando o comando para o SO atual.
     */
    private async connectToStdioServer(serverName: string, config: McpServerConfig): Promise<void> {
    //   console.log(`[MCPClient] Conectando ao servidor Stdio: ${serverName}...`);
  
      // <<< INÍCIO DA MUDANÇA: Lógica de Adaptação Multiplataforma >>>
  
      let commandToExecute = config.command;
      let argsToExecute = config.args || [];
      const isWindows = os.platform() === 'win32';
  
      // Se NÃO for Windows E o comando for 'cmd', adapta o comando.
      if (!isWindows && commandToExecute.toLowerCase() === 'cmd') {
        // Verifica se o formato é o esperado: ['/c', 'npx', ...]
        if (argsToExecute.length >= 2 && argsToExecute[0].toLowerCase() === '/c') {
          // O comando real se torna o segundo argumento (ex: 'npx').
          commandToExecute = argsToExecute[1];
          // Os argumentos reais são o restante do array.
          argsToExecute = argsToExecute.slice(2);
        } else {
          // Se o formato for inesperado, avisa e pula este servidor.
          console.warn(`[MCPClient] Formato de comando 'cmd /c' inesperado para '${serverName}' em sistema não-Windows. O servidor será ignorado.`);
          return; // Aborta a conexão para este servidor específico.
        }
      }
  
      // <<< FIM DA MUDANÇA >>>
  
      const transport = new StdioClientTransport({
        command: commandToExecute, // Usa o comando adaptado
        args: argsToExecute,       // Usa os argumentos adaptados
        env: config.env,
      });
  
      const mcp = new Client({ name: `bluma-cli-client-for-${serverName}`, version: "1.0.0" });
      await mcp.connect(transport);
      this.sessions.set(serverName, mcp);
  
      const toolsResult = await mcp.listTools();
    //   console.log(`[MCPClient] Servidor '${serverName}' conectou e ofereceu ${toolsResult.tools.length} ferramenta(s).`);
  
      for (const tool of toolsResult.tools) {
        const prefixedToolName = `${serverName}_${tool.name}`;
        this.globalToolsForLlm.push({
          type: 'function',
          function: {
            name: prefixedToolName,
            description: tool.description || '',
            parameters: tool.inputSchema,
          },
        });
        this.toolToServerMap.set(prefixedToolName, {
          server: serverName,
          originalName: tool.name,
        });
      }
    }
  
    public async invoke(toolName: string, args: any): Promise<any> {
      const route = this.toolToServerMap.get(toolName);
      if (!route) {
        return { error: `This tool '${toolName}'is not found or registered you must use the correct name of this tool.` };
      }
  
      if (route.server === 'native') {
        return this.nativeToolInvoker.invoke(route.originalName, args);
      } else {
        const session = this.sessions.get(route.server);
        if (!session) {
          return { error: `Session to the server '${route.server}' não encontrada.` };
        }
        const result = await session.callTool({ name: route.originalName, arguments: args });
        return result.content;
      }
    }
  
    public getAvailableTools(): ToolDefinition[] {
      return this.globalToolsForLlm;
    }

    // New: detailed list for UI with origin metadata
    public getAvailableToolsDetailed(): Array<ToolDefinition & { source: 'native' | 'mcp'; server: string; originalName: string }> {
      const detailed: Array<ToolDefinition & { source: 'native' | 'mcp'; server: string; originalName: string }> = [];
      for (const tool of this.globalToolsForLlm) {
        const name = tool.function?.name;
        if (!name) continue;
        const route = this.toolToServerMap.get(name);
        if (!route) continue;
        const source = route.server === 'native' ? 'native' : 'mcp';
        detailed.push({ ...tool, source, server: route.server, originalName: route.originalName });
      }
      return detailed;
    }
  
    public async close(): Promise<void> {
    //   console.log('[MCPClient] Encerrando todas as conexões MCP...');
      for (const [name, session] of this.sessions.entries()) {
        try {
          await session.close();
        //   console.log(`[MCPClient] Conexão com '${name}' encerrada.`);
        } catch (error) {
          console.error(`[MCPClient]Error closing connection to'${name}':`, error);
        }
      }
    }
  
    private replaceEnvPlaceholders(content: string): string {
      return content.replace(/\$\{([A-Za-z0-9_]+)\}/g, (match, varName) => {
        return process.env[varName] || match;
      });
    }
  }