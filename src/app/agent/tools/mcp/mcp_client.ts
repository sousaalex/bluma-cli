import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ToolInvoker, ToolDefinition } from '../../tool_invoker.js';

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
  
    constructor(nativeToolInvoker: ToolInvoker) {
      this.nativeToolInvoker = nativeToolInvoker;
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
  
      const localConfigPath = path.resolve(process.cwd(), 'src/app/agent/config/bluma-mcp.json');
      const globalConfigPath = path.join(os.homedir(), '.bluma-cli', 'bluma-mcp.json');
  
      const localConfig = await this.loadMcpConfig(localConfigPath);
      const globalConfig = await this.loadMcpConfig(globalConfigPath);
  
      const mergedConfig: McpConfig = {
        mcpServers: {
          ...(globalConfig.mcpServers || {}),
          ...(localConfig.mcpServers || {}),
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
          if (serverConf.type === 'stdio') {
            await this.connectToStdioServer(serverName, serverConf);
          } else if (serverConf.type === 'sse') {
            console.warn(`[MCPClient] Conexão com servidores SSE (como '${serverName}') ainda não implementada.`);
          }
        } catch (error) {
          console.error(`[MCPClient] Falha ao conectar ao servidor '${serverName}':`, error);
        }
      }
    //   console.log(`[MCPClient] Inicialização concluída. Total de ferramentas disponíveis: ${this.globalToolsForLlm.length}`);
    }
  
    private async loadMcpConfig(configPath: string): Promise<Partial<McpConfig>> {
      try {
        const fileContent = await fs.readFile(configPath, 'utf-8');
        const processedContent = this.replaceEnvPlaceholders(fileContent);
        // console.log(`[MCPClient] Configuração de servidores MCP carregada de: ${configPath}`);
        return JSON.parse(processedContent);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.warn(`[MCPClient] Aviso: Erro ao ler o arquivo de configuração ${configPath}.`, error);
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
        return { error: `Ferramenta '${toolName}' não encontrada ou registrada.` };
      }
  
      if (route.server === 'native') {
        return this.nativeToolInvoker.invoke(route.originalName, args);
      } else {
        const session = this.sessions.get(route.server);
        if (!session) {
          return { error: `Sessão para o servidor '${route.server}' não encontrada.` };
        }
        const result = await session.callTool({ name: route.originalName, arguments: args });
        return result.content;
      }
    }
  
    public getAvailableTools(): ToolDefinition[] {
      return this.globalToolsForLlm;
    }
  
    public async close(): Promise<void> {
    //   console.log('[MCPClient] Encerrando todas as conexões MCP...');
      for (const [name, session] of this.sessions.entries()) {
        try {
          await session.close();
        //   console.log(`[MCPClient] Conexão com '${name}' encerrada.`);
        } catch (error) {
          console.error(`[MCPClient] Erro ao encerrar conexão com '${name}':`, error);
        }
      }
    }
  
    private replaceEnvPlaceholders(content: string): string {
      return content.replace(/\$\{([A-Za-z0-9_]+)\}/g, (match, varName) => {
        return process.env[varName] || match;
      });
    }
  }