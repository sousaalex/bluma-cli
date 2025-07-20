# --- INÍCIO DO FICHEIRO COMPLETO: cli/backend/bluma_core.py ---

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
        import re
        try:
            with open('cli/config/mcp_server_config.json', 'r') as f:
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
            with open('cli/config/tools.json', 'r') as f:
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

    async def call_mcp_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> Any:
        if "message_ask_user" in tool_name:
            return {"error": "A ferramenta 'ask_user' não é suportada no modo não-interativo."}
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

def create_api_context_window(full_history: List[Dict[str, Any]], max_messages: int) -> List[Dict[str, Any]]:
    if len(full_history) <= max_messages:
        return full_history
    idx = len(full_history) - 1
    while idx > 0:
        if full_history[idx]["role"] == "user":
            break
        idx -= 1
    return full_history[idx:]

def validate_history_integrity(history: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    valid_history = []
    pending_tool_calls = {}
    for msg in history:
        if msg["role"] == "assistant" and msg.get("tool_calls"):
            for tc in msg["tool_calls"]:
                pending_tool_calls[tc["id"]] = True
            valid_history.append(msg)
        elif msg["role"] == "tool":
            tcid = msg.get("tool_call_id")
            if tcid and pending_tool_calls.get(tcid):
                valid_history.append(msg)
                del pending_tool_calls[tcid]
            else:
                continue
        else:
            valid_history.append(msg)
    return valid_history

def load_or_create_session(session_id: str) -> Tuple[str, List[Dict[str, Any]]]:
    session_dir = Path("sessions")
    session_dir.mkdir(exist_ok=True)
    session_file = session_dir / f"{session_id}.json"

    if session_file.exists():
        try:
            with open(session_file, "r", encoding="utf-8") as f:
                session_data = json.load(f)
            return str(session_file), session_data.get("conversation_history", [])
        except (json.JSONDecodeError, IOError):
            pass

    session_data = {
        "session_id": session_id,
        "created_at": datetime.now().isoformat(),
        "conversation_history": []
    }
    with open(session_file, "w", encoding="utf-8") as f:
        json.dump(session_data, f, ensure_ascii=False, indent=2)
    
    return str(session_file), []

def save_session_history(session_file: str, history: List[Dict[str, Any]]) -> None:
    try:
        with open(session_file, "r+", encoding="utf-8") as f:
            session_data = json.load(f)
            session_data["conversation_history"] = history
            session_data["last_updated"] = datetime.now().isoformat()
            
            f.seek(0)
            json.dump(session_data, f, ensure_ascii=False, indent=2)
            f.truncate()
    except (IOError, json.JSONDecodeError) as e:
        print(f"Error saving session: {e}", file=sys.stderr)

async def main():
    if len(sys.argv) < 2 or not sys.argv[1]:
        send_message({"type": "error", "message": "ID da sessão não fornecido."})
        return

    session_id = sys.argv[1]

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    
    dotenv_path = os.path.join(project_root, '.env')
    # Carrega .env se existir, mas não aborta se não existir
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path=dotenv_path)
    # Se não existir, segue normalmente (confia nas variáveis do ambiente)

    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION")
    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")

    # Checagem de obrigatoriedade
    if not endpoint:
        send_message({"type": "error", "message": "A variável de ambiente AZURE_OPENAI_ENDPOINT não foi encontrada."})
        return
    if not api_version:
        send_message({"type": "error", "message": "A variável de ambiente AZURE_OPENAI_API_VERSION não foi encontrada."})
        return
    if not deployment_name:
        send_message({"type": "error", "message": "A variável de ambiente AZURE_OPENAI_DEPLOYMENT não foi encontrada."})
        return
    if not api_key:
        send_message({"type": "error", "message": "A variável de ambiente AZURE_OPENAI_API_KEY não foi encontrada."})
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

        session_file, history = load_or_create_session(session_id)
        
        if not history:
            system_prompt = get_unified_system_prompt()
            history.append({"role": "system", "content": system_prompt})
        
        for line in sys.stdin:
            try:
                user_input = json.loads(line)
                
                if user_input.get("type") == "user_message":   
                    history.append({"role": "user", "content": user_input["content"]})
                    
                    # --- CORREÇÃO APLICADA AQUI ---
                    # O loop agora irá até o gerador 'agent.process_turn' se esgotar naturalmente.
                    # Ele vai processar TODOS os eventos que o agente enviar, incluindo o 'done'.
                    async for event in agent.process_turn(history):
                        send_message(event)
                        if event.get("type") == "done":
                            # Apenas salvamos o histórico quando o evento 'done' é recebido.
                            # NÃO usamos 'break' para garantir que o loop termine corretamente.
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

# --- FIM DO FICHEIRO COMPLETO: cli/backend/bluma_core.py ---