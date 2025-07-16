import asyncio
import os
import sys
import json
import time # Added for timestamp in interruption handler

# Adiciona a raiz do projeto ao sys.path para resolver os imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from datetime import datetime
from pathlib import Path
from textwrap import dedent
from typing import List, Dict, Any, Tuple
from openai import AsyncAzureOpenAI
from dotenv import load_dotenv
from rich.console import Console

# Importações para MCP
from contextlib import AsyncExitStack
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.sse import sse_client

# Configuration of prompt_core
from cli.prompt_core.prompt.prompt import get_system_prompt
from cli.prompt_core.description.description import get_description
# from cli.prompt_core.output.output import get_output

# Import the enhanced Agent
from cli.backend.core.agent import Agent

# Apenas para logging de erros no stderr, não para a UI
error_console = Console(stderr=True, style="bold red")

# Função para enviar mensagens JSON para o frontend
def send_message(message: Dict[str, Any]):
    """Envia uma mensagem JSON para stdout."""
    print(json.dumps(message), flush=True)

# Classe para gerenciar conexões MCP (sem `console`)
class MCPClient:
    def __init__(self):
        self.sessions: Dict[str, ClientSession] = {}
        self.global_tools_for_llm: List[Dict[str, Any]] = []
        self.tool_to_server_map: Dict[str, Dict[str, str]] = {}
        self.exit_stack = AsyncExitStack()
        
        # Add SSE specific contexts
        self._sse_streams_context = None
        self._sse_session_context = None

    async def connect_to_all_servers(self):
        try:
            with open('cli/config/mcp_server_config.json', 'r') as f:
                config = json.load(f)
        except Exception as e:
            send_message({"type": "error", "message": f"Erro ao carregar mcp_server_config.json: {e}"})
            return False

        mcp_servers_config = config.get("mcpServers", {})
        if not mcp_servers_config:
            send_message({"type": "error", "message": "Nenhum servidor MCP configurado."})
            return False

        # Separate servers by type
        sse_servers = {name: conf for name, conf in mcp_servers_config.items() if conf.get("type") == "sse"}
        stdio_servers = {name: conf for name, conf in mcp_servers_config.items() if conf.get("type") != "sse"}

        connected_any = False
        self.global_tools_for_llm = []
        self.tool_to_server_map = {}

        # Connect to SSE servers
        for server_name, server_conf in sse_servers.items():
            send_message({"type": "connection_status", "message": f"Conectando ao servidor SSE: {server_name}..."})
            try:
                url = server_conf.get("url")
                if not url:
                    continue
                
                self._sse_streams_context = sse_client(url=url)
                streams = await self._sse_streams_context.__aenter__()

                self._sse_session_context = ClientSession(*streams)
                session = await self._sse_session_context.__aenter__()
                
                await session.initialize()
                self.sessions[server_name] = session
                response = await session.list_tools()
                server_tools = response.tools
                
                for tool in server_tools:
                    prefixed_tool_name = f"{server_name}_{tool.name}"
                    self.global_tools_for_llm.append({
                        "type": "function",
                        "function": {
                            "name": prefixed_tool_name,
                            "description": tool.description,
                            "parameters": tool.inputSchema
                        }
                    })
                    self.tool_to_server_map[prefixed_tool_name] = {
                        "server": server_name,
                        "original_name": tool.name
                    }
                connected_any = True
            except Exception as e:
                send_message({"type": "error", "message": f"Falha ao conectar ao servidor SSE '{server_name}': {e}"})

        # Connect to stdio servers
        for server_name, server_conf in stdio_servers.items():
            send_message({"type": "connection_status", "message": f"Conectando ao servidor Stdio: {server_name}..."})
            try:
                server_params = StdioServerParameters(
                    command=server_conf["command"],
                    args=server_conf["args"],
                    env=server_conf.get("env", {})
                )
                stdio_transport = await self.exit_stack.enter_async_context(stdio_client(server_params))
                stdio, write = stdio_transport
                session = await self.exit_stack.enter_async_context(ClientSession(stdio, write))
                await session.initialize()
                self.sessions[server_name] = session
                response = await session.list_tools()
                server_tools = response.tools
                
                for tool in server_tools:
                    prefixed_tool_name = f"{server_name}_{tool.name}"
                    self.global_tools_for_llm.append({
                        "type": "function",
                        "function": {
                            "name": prefixed_tool_name,
                            "description": tool.description,
                            "parameters": tool.inputSchema
                        }
                    })
                    self.tool_to_server_map[prefixed_tool_name] = {
                        "server": server_name,
                        "original_name": tool.name
                    }
                connected_any = True
            except Exception as e:
                send_message({"type": "error", "message": f"Falha ao conectar ao servidor Stdio '{server_name}': {e}"})
        
        if connected_any:
            return True
        return False

    # async def call_mcp_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> Any:
    #     if "message_ask_user" in tool_name:
    #         # Esta ferramenta é inerentemente interativa.
    #         # No modo pipe, não podemos pedir input ao utilizador desta forma.
    #         return {"error": "A ferramenta 'ask_user' não é suportada no modo não-interativo."}
    #     if tool_name not in self.tool_to_server_map:
    #         return {"error": f"Ferramenta '{tool_name}' não encontrada"}
    #     tool_info = self.tool_to_server_map[tool_name]
    #     server_to_call = tool_info["server"]

    async def call_mcp_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> Any:
        if "message_ask_user" in tool_name:
            # Esta ferramenta é inerentemente interativa.
            # No modo pipe, não podemos pedir input ao utilizador desta forma.
            return {"error": "A ferramenta 'ask_user' não é suportada no modo não-interativo."}
        if tool_name not in self.tool_to_server_map:
            return {"error": f"Ferramenta '{tool_name}' não encontrada"}
        tool_info = self.tool_to_server_map[tool_name]
        server_to_call = tool_info["server"]
        original_tool_name = tool_info["original_name"]
        
        if server_to_call not in self.sessions:
            return {"error": f"Servidor '{server_to_call}' não está conectado"}
        
        session_to_use = self.sessions[server_to_call]
        result = None
        try:
            # Processamento normal para outras ferramentas
            if original_tool_name != 'idle':
                result = await session_to_use.call_tool(original_tool_name, tool_args)
                
            tool_content = None
            if result and result.content and isinstance(result.content, list) and hasattr(result.content[0], 'text'):
                tool_content = result.content[0].text
            elif result and isinstance(result.content, str):
                tool_content = result.content
            elif result:
                tool_content = json.dumps(result.content)
                
            # Garantir que respostas de notify_dev com needed_send_more_notfications=true sejam preservadas
            if result and "notify_dev" in tool_name and isinstance(result.content, dict) and result.content.get("needed_send_more_notfications") == True:
                # Preservar o formato de dicionário para garantir que o flag seja detectado corretamente
                return result.content
                
            return tool_content
        except Exception as e:
            error_msg = f"Erro ao chamar a ferramenta: {str(e)}"
            return {"error": error_msg}
def get_unified_system_prompt() -> str:
    # Esta função agora é chamada apenas dentro de `main`
    description = get_description()
    system = get_system_prompt()
    # output = get_output()
    return dedent(f"{description}\n\n{system}").strip()

# --- LÓGICA PRINCIPAL DO AGENTE ---

def create_api_context_window(full_history: List[Dict[str, Any]], max_messages: int) -> List[Dict[str, Any]]:
    """
    Retorna o histórico completo, ou, se precisar truncar, garante que nunca corta pares assistant/tool.
    """
    if len(full_history) <= max_messages:
        return full_history
    # Truncamento seguro: só remove blocos completos de interação
    # Busca do final para o início o primeiro bloco válido
    idx = len(full_history) - 1
    while idx > 0:
        # Se encontrar um user, pode cortar aqui
        if full_history[idx]["role"] == "user":
            break
        idx -= 1
    # Retorna apenas o bloco final completo
    return full_history[idx:]

def validate_history_integrity(history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Garante que toda mensagem 'tool' seja precedida por uma mensagem 'assistant' com 'tool_calls' e o mesmo 'tool_call_id'.
    Remove pares desbalanceados do início do histórico até garantir integridade.
    """
    valid_history = []
    pending_tool_calls = {}
    for msg in history:
        if msg["role"] == "assistant" and msg.get("tool_calls"):
            # Registra todos os tool_call_ids deste assistant
            for tc in msg["tool_calls"]:
                pending_tool_calls[tc["id"]] = True
            valid_history.append(msg)
        elif msg["role"] == "tool":
            tcid = msg.get("tool_call_id")
            if tcid and pending_tool_calls.get(tcid):
                valid_history.append(msg)
                # Remove o tool_call_id já respondido
                del pending_tool_calls[tcid]
            else:
                # Tool sem assistant correspondente: ignora
                continue
        else:
            valid_history.append(msg)
    return valid_history

# --- GERENCIAMENTO DE SESSÕES ---
def load_or_create_session(session_id: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Carrega o histórico de uma sessão existente ou cria uma nova com base no session_id.
    Retorna o caminho do arquivo e o histórico da conversa.
    """
    session_dir = Path("sessions")
    session_dir.mkdir(exist_ok=True)
    session_file = session_dir / f"{session_id}.json"

    if session_file.exists():
        try:
            with open(session_file, "r", encoding="utf-8") as f:
                session_data = json.load(f)
            # Retorna o histórico salvo
            return str(session_file), session_data.get("conversation_history", [])
        except (json.JSONDecodeError, IOError):
            # Se o arquivo estiver corrompido ou ilegível, cria um novo
            pass

    # Cria um novo arquivo de sessão se não existir ou estiver corrompido
    session_data = {
        "session_id": session_id,
        "created_at": datetime.now().isoformat(),
        "conversation_history": []
    }
    with open(session_file, "w", encoding="utf-8") as f:
        json.dump(session_data, f, ensure_ascii=False, indent=2)
    
    return str(session_file), []

def save_session_history(session_file: str, history: List[Dict[str, Any]]) -> None:
    """
    Salva o histórico atual da conversa no arquivo de sessão.
    """
    try:
        with open(session_file, "r+", encoding="utf-8") as f:
            # Carrega os dados existentes para não sobrescrever o created_at
            session_data = json.load(f)
            session_data["conversation_history"] = history
            session_data["last_updated"] = datetime.now().isoformat()
            
            # Volta ao início do arquivo para sobrescrever
            f.seek(0)
            json.dump(session_data, f, ensure_ascii=False, indent=2)
            f.truncate()
    except (IOError, json.JSONDecodeError) as e:
        # Se houver um erro, apenas reporta no stderr, não para o frontend
        print(f"Error saving session: {e}", file=sys.stderr)

# --- FUNÇÃO PRINCIPAL E LOOP DE EXECUÇÃO ---
async def main():
    # 1. Validação de Argumentos
    if len(sys.argv) < 2 or not sys.argv[1]:
        send_message({"type": "error", "message": "ID da sessão não fornecido."})
        return

    session_id = sys.argv[1]

    # 2. Carregamento de Configuração e Variáveis de Ambiente
    # Encontra a raiz do projeto (assumindo que bluma_core.py está em cli/backend)
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

    # Adiciona a raiz do projeto ao sys.path para importações
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    
    # Carrega o .env da raiz do projeto
    dotenv_path = os.path.join(project_root, '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path)
    else:
        send_message({"type": "error", "message": f"Ficheiro .env não encontrado em: {dotenv_path}"})
        return

    # --- INÍCIO DA DEPURAÇÃO: Usar valores hardcoded ---
    # Temporariamente usamos os mesmos valores do bluma.py para testar a conexão.
    # Se isto funcionar, o problema está 100% no seu ficheiro .env.
    endpoint = "https://hubdemor3dai7450370013.openai.azure.com/"
    api_version = "2025-04-01-preview"  # 🚀 UPGRADED: Latest preview API with new features
    deployment_name = "gpt-4.1"
    
    # A API Key ainda será lida do .env
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    if not api_key:
        send_message({"type": "error", "message": "A variável de ambiente AZURE_OPENAI_API_KEY não foi encontrada no seu ficheiro .env."})
        return
    # --- FIM DA DEPURAÇÃO ---

    # 4. Inicialização dos Clientes
    mcp_client = MCPClient()
    try:
        # Inicializa o cliente Azure OpenAI
        try:
            client = AsyncAzureOpenAI(
                azure_endpoint=endpoint,
                api_key=api_key,
                api_version=api_version
            )
        except Exception as e:
            send_message({"type": "error", "message": f"Erro ao inicializar o cliente Azure OpenAI: {e}"})
            return

        # Conecta aos servidores MCP
        connected = await mcp_client.connect_to_all_servers()
        if connected:
            send_message({
                "type": "status",
                "status": "mcp_connected",
                "tools": len(mcp_client.global_tools_for_llm)
            })
        else:
            send_message({"type": "error", "message": "Falha ao conectar aos servidores MCP. Verifique a configuração."})
            # Não retornamos aqui, pode ser que o user queira interagir sem ferramentas.
        
        # Initialize the enhanced Agent with session tracking
        agent = Agent(
            mcp_client, 
            client, 
            deployment_name,
            None, 
            session_id)

        # 5. Carregar ou Criar Sessão e Histórico
        session_file, history = load_or_create_session(session_id)
        
        # Garante que o prompt do sistema está presente no início de um novo histórico
        if not history:
            system_prompt = get_unified_system_prompt()
            history.append({"role": "system", "content": system_prompt})
        
        # 6. Loop Principal de Execução
        for line in sys.stdin:
            try:
                user_input = json.loads(line)
                
                if user_input.get("type") == "user_message":
                    # Antes de cada turno, recarrega o histórico do arquivo para garantir que nada ficou na RAM
                    # with open(session_file, "r", encoding="utf-8") as f:
                    #     session_data = json.load(f)
                    #     history = session_data.get("conversation_history", [])
                    
                    history.append({"role": "user", "content": user_input["content"]})
                    
                    async for event in agent.process_turn(history):
                        send_message(event)
                        if event.get("type") == "done":
                            history = event["history"]
                            save_session_history(session_file, history) # Salva o histórico
                            # Limpa a RAM após salvar
                            # history.clear()
                            if event.get("status") == "completed":
                                break 
                
            except json.JSONDecodeError:
                send_message({"type": "error", "message": "Input inválido do frontend (não é JSON)."})
            except Exception as e:
                send_message({"type": "error", "message": f"Erro inesperado no loop principal: {str(e)}"})

    finally:
        # Cleanup MCP connections
        try:
            await mcp_client.exit_stack.aclose()
        except Exception:
            pass  # Ignore cleanup errors

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, EOFError):
        pass # Sai silenciosamente