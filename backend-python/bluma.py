# --- INÍCIO DO FICHEIRO COMPLETO: cli/backend/bluma.py ---

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

from pathlib import Path


# =========================================================================================
# LÓGICA DE CAMINHO GLOBAL (sem alterações, está correta)
#
if getattr(sys, 'frozen', False):
    # Estamos a correr num executável PyInstaller
    # SCRIPT_DIR aponta para a pasta temporária _MEIPASS
    SCRIPT_DIR = Path(sys._MEIPASS)
else:
    # Estamos a correr como um script Python normal
    # SCRIPT_DIR aponta para .../cli/backend
    SCRIPT_DIR = Path(__file__).parent.resolve()
# =========================================================================================

# Adiciona a raiz do projeto ao sys.path para resolver os imports locais
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)



# Configuration of prompt_core
from app.backend.prompt_core.prompt.prompt import get_system_prompt
from app.backend.prompt_core.description.description import get_description
# from cli.prompt_core.output.output import get_output

# from cli.backend.core.context_utils import create_api_context_window
# Import the enhanced Agent
from app.backend.core.agent import Agent

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
        
        import re
        # =========================================================================================
        # CORREÇÃO FINAL E DEFINITIVA PARA A LÓGICA DE CAMINHOS
        # =========================================================================================
        if getattr(sys, 'frozen', False):
            # MODO PRODUÇÃO (.exe):
            # SCRIPT_DIR é a raiz da pasta temporária (_MEIPASS).
            # O .spec copiou 'cli/backend/config' para 'config' na raiz.
            # Portanto, o caminho é direto a partir de SCRIPT_DIR.
            config_dir = SCRIPT_DIR / 'config'  # <-- CORREÇÃO AQUI
        else:
            # MODO DESENVOLVIMENTO (.py):
            # SCRIPT_DIR é .../bluma-engineer/cli/backend.
            # Precisamos subir um nível para .../cli e depois entrar em /config.
            config_dir = SCRIPT_DIR.parent / 'config'

        mcp_config_path = config_dir / 'mcp_server_config.json'
        tools_path = config_dir / 'tools.json'
        # =========================================================================================
        try:
            with open(mcp_config_path, 'r', encoding="utf-8") as f:
                config = json.load(f)
                # Substitui placeholders do tipo ${VAR_NAME} por variáveis do ambiente
                def replace_env_placeholders(obj):
                    if isinstance(obj, dict):
                        return {k: replace_env_placeholders(v) for k, v in obj.items()}
                    elif isinstance(obj, list):
                        return [replace_env_placeholders(i) for i in obj]
                    elif isinstance(obj, str):
                        match = re.match(r'\$\{([A-Za-z0-9_]+)\}', obj)
                        if match:
                            env_val = os.environ.get(match.group(1))
                            if env_val is not None:
                                return env_val
                        return obj
                    else:
                        return obj
                config = replace_env_placeholders(config)
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
        
        # Add native tools from tools.json
        try:
            with open(tools_path, 'r', encoding="utf-8") as f:
                native_tools_config = json.load(f)
                
            for tool in native_tools_config.get("nativeTools", []):
                self.global_tools_for_llm.append(tool)
                tool_name = tool["function"]["name"]
                self.tool_to_server_map[tool_name] = {
                    "server": "native",
                    "original_name": tool_name
                }
        except Exception as e:
            send_message({"type": "error", "message": f"Erro ao carregar ferramentas nativas do tools.json: {e}"})

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
        is_windows = sys.platform == "win32" # Definimos uma vez, fora do loop

        for server_name, server_conf in stdio_servers.items():
            send_message({"type": "connection_status", "message": f"Conectando ao servidor Stdio: {server_name}..."})
            try:
                # Pega na configuração original do JSON
                command = server_conf["command"]
                args = server_conf.get("args", []) # Usar .get() para segurança
                
                # --- Bloco de Tradução Multi-Plataforma ---
                # Se não for Windows E o comando for "cmd", adaptamos.
                if not is_windows and command.lower() == "cmd":
                    # Assume que o formato é ["/c", "npx", ...]
                    if len(args) >= 2 and args[0].lower() == "/c":
                        command = args[1]  # O comando real é 'npx'
                        args = args[2:]    # Os argumentos reais vêm depois
                    else:
                        # Se o formato não for o esperado, avisa e pula
                        send_message({"type": "warning", "message": f"Formato de comando inesperado para '{server_name}' em sistema não-Windows. A saltar."})
                        continue
                
                # A partir daqui, as variáveis 'command' e 'args' estão corretas para qualquer SO
                server_params = StdioServerParameters(
                    command=command,
                    args=args,
                    env=server_conf.get("env", {})
                )
                
                # O resto da sua lógica de conexão original
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
                # Adicionamos o nome do comando ao erro para facilitar a depuração
                send_message({"type": "error", "message": f"Falha ao conectar ao servidor Stdio '{server_name}' (comando: '{command}'): {e}"})
        
        if connected_any:
            return True
        return False

    async def call_mcp_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> Any:
        if tool_name not in self.tool_to_server_map:
            return {"error": f"Ferramenta '{tool_name}' não encontrada"}
        tool_info = self.tool_to_server_map[tool_name]
        server_to_call = tool_info["server"]
        original_tool_name = tool_info["original_name"]
        
        # Handle native tools
        if server_to_call == "native":
            try:
                if original_tool_name == "shell_command":
                    from custom_tools.shell_command import shell_command
                    result = shell_command(**tool_args)
                    return result
                elif original_tool_name == "agent_end_task":
                    from custom_tools.end_task import agent_end_task
                    result = agent_end_task()
                    return result
                # elif original_tool_name == "message_notify_dev":
                #     from custom_tools.message import message_notify_dev
                #     result = message_notify_dev(**tool_args)
                #     return result
                elif original_tool_name == "edit_tool":
                    from custom_tools.edit import edit_tool
                    result = edit_tool(**tool_args)
                    return result
                else:
                    return {"error": f"Ferramenta nativa '{original_tool_name}' não implementada"}
            except Exception as e:
                return {"error": f"Erro ao executar {original_tool_name}: {str(e)}"}
        
        if server_to_call not in self.sessions:
            return {"error": f"Servidor '{server_to_call}' não está conectado"}
        
        session_to_use = self.sessions[server_to_call]
        result = None
        try:
            if original_tool_name != 'idle':
                result = await session_to_use.call_tool(original_tool_name, tool_args)
                
            tool_content = None
            if result and result.content and isinstance(result.content, list) and hasattr(result.content[0], 'text'):
                tool_content = result.content[0].text
            elif result and isinstance(result.content, str):
                tool_content = result.content
            elif result:
                tool_content = json.dumps(result.content)
                
            if result and "notify_dev" in tool_name and isinstance(result.content, dict) and result.content.get("needed_send_more_notfications") == True:
                return result.content
                
            return tool_content
        except Exception as e:
            error_msg = f"Erro ao chamar a ferramenta: {str(e)}"
            return {"error": error_msg}

def get_unified_system_prompt() -> str:
    description = get_description()
    system = get_system_prompt()
    return dedent(f"{description}\n\n{system}").strip()


# Função de contexto movida para cli/backend/core/context_utils.py

# def validate_history_integrity(history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
#     valid_history = []
#     pending_tool_calls = {}
#     for msg in history:
#         if msg["role"] == "assistant" and msg.get("tool_calls"):
#             for tc in msg["tool_calls"]:
#                 pending_tool_calls[tc["id"]] = True
#             valid_history.append(msg)
#         elif msg["role"] == "tool":
#             tcid = msg.get("tool_call_id")
#             if tcid and pending_tool_calls.get(tcid):
#                 valid_history.append(msg)
#                 del pending_tool_calls[tcid]
#             else:
#                 continue
#         else:
#             valid_history.append(msg)
#     return valid_history

# Funções de sessão movidas para cli/backend/core/session_utils.py

async def main():
    if len(sys.argv) < 2 or not sys.argv[1]:
        send_message({"type": "error", "message": "ID da sessão não fornecido."})
        return

    session_id = sys.argv[1]

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    
    dotenv_path = os.path.join(project_root, '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path)

    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION")
    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")

    if not all([endpoint, api_version, deployment_name, api_key]):
        send_message({"type": "error", "message": "Uma ou mais variáveis de ambiente Azure OpenAI não foram encontradas."})
        return

    mcp_client = MCPClient()
    try:
        try:
            client = AsyncAzureOpenAI(
                azure_endpoint=endpoint,
                api_key=api_key,
                api_version=api_version
            )
        except Exception as e:
            send_message({"type": "error", "message": f"Erro ao inicializar o cliente Azure OpenAI: {e}"})
            return

        connected = await mcp_client.connect_to_all_servers()
        if connected:
            send_message({
                "type": "status",
                "status": "mcp_connected",
                "tools": len(mcp_client.global_tools_for_llm)
            })
        else:
            send_message({"type": "error", "message": "Falha ao conectar aos servidores MCP. Verifique a configuração."})
        
        agent = Agent(
            mcp_client, 
            client, 
            deployment_name,
            None, 
            session_id)

        from app.backend.core.session_utils import load_or_create_session, save_session_history
        session_file, history = load_or_create_session(session_id)
        
        if not history:
            system_prompt = get_unified_system_prompt()
            history.append({"role": "system", "content": system_prompt})
        
        for line in sys.stdin:
            try:
                user_input = json.loads(line)
                
                if user_input.get("type") == "user_decision_execute":
                    tool_calls_to_execute = user_input["tool_calls"]
                    tool_responses = []

                    for tool_call in tool_calls_to_execute:
                        tool_name = tool_call["function"]["name"]
                        tool_args = json.loads(tool_call["function"]["arguments"])
                        
                        # ==========================================================
                        # INÍCIO DA CORREÇÃO: Notificar o frontend sobre a chamada
                        # ==========================================================
                        
                        # Envia o evento 'tool_call' para que a UI possa renderizar o componente.
                        send_message({
                            "type": "tool_call",
                            "tool_name": tool_name,
                            "arguments": tool_args 
                        })

                        # ==========================================================
                        # FIM DA CORREÇÃO
                        # ==========================================================
                        
                        result = await agent.tool_invoker.invoke(tool_name, tool_args)
                        
                        tool_responses.append({
                            "role": "tool",
                            "tool_call_id": tool_call["id"],
                            "name": tool_name,
                            "content": str(result)
                        })
                        
                        # A notificação do resultado já estava correta e permanece.
                        send_message({
                            "type": "tool_result",
                            "tool_name": tool_name,
                            "result": str(result)
                        })

                    history.extend(tool_responses)
                    
                    async for event in agent.process_turn(history):
                        send_message(event)
                        if event.get("type") == "done":
                            history = event["history"]
                            save_session_history(session_file, history)

                elif user_input.get("type") == "user_decision_decline":
                    # ... (esta parte já está correta e permanece inalterada) ...
                    tool_calls_declined = user_input["tool_calls"]
                    tool_responses = []
                    for tool_call in tool_calls_declined:
                        tool_responses.append({
                            "role": "tool",
                            "tool_call_id": tool_call["id"],
                            "name": tool_call["function"]["name"],
                            "content": "The human developer refused to run this tool. The proposed action **was not authorized**. Send a notification and then try again but with a **different approach** to achieve the intended goal. If refused, send a notification and then call the `agent_end_task` tool."
                        })
                    history.extend(tool_responses)
                    async for event in agent.process_turn(history):
                        send_message(event)
                        if event.get("type") == "done":
                            history = event["history"]
                            save_session_history(session_file, history)

                elif user_input.get("type") == "user_message":   
                    history.append({"role": "user", "content": user_input["content"]})
                    async for event in agent.process_turn(history):
                        send_message(event)
                        if event.get("type") == "done":
                            history = event["history"]
                            save_session_history(session_file, history)
                    
            except json.JSONDecodeError:
                send_message({"type": "error", "message": "Input inválido do frontend (não é JSON)."})
            except Exception as e:
                send_message({"type": "error", "message": f"Erro inesperado no loop principal: {str(e)}"})

    finally:
        try:
            await mcp_client.exit_stack.aclose()
        except Exception:
            pass


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, EOFError):
        pass

# --- FIM DO FICHEIRO COMPLETO: cli/backend/bluma.py ---