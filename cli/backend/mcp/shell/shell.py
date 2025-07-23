from asyncio.log import logger
import platform
import sys
from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from mcp.server.sse import SseServerTransport
from starlette.requests import Request
from starlette.routing import Mount, Route
from mcp.server import Server
from mcp.server.fastmcp.prompts import base
import subprocess
import os
import json

import uvicorn

# Initialize FastMCP server for Weather tools (SSE)
mcp = FastMCP("ShellCommand")

@mcp.tool(
    description=(""" 
    You execute a terminal command on the human developer's machine using robust and Windows-compatible methods.

    This tool executes REAL commands on the developer's terminal — use responsibly.

    Parameters:
    - command (str): Command to execute. Ex: "npm install", "git pull" etc...
    - timeout (int): Maximum execution time (in seconds). Default: 20s.
    - cwd (str): Directory path where the command will be executed. If omitted, executes in the current directory.
    - verbose (bool): If True, returns a full report with various methods and environment variables. If False, returns only the main output.

    Returns:
    - A JSON string with the result of the execution (output, errors, status and method used).
    """)
)
def shell_command(command: str, timeout: int = 20, cwd: str = None, verbose: bool = False) -> str:

    report = {
        "platform": platform.platform(),
        "command": command,
        "cwd": cwd or os.getcwd(),
        "env": {var: os.environ.get(var, "NOT SET") for var in ['PATH', 'PATHEXT', 'ComSpec']} if verbose else {},
        "results": []
    }

    methods = [
        {"name": "shell=True", "cmd": command, "shell": True},
        {"name": "cmd /c", "cmd": ['cmd', '/c', command], "shell": False},
        {"name": "ComSpec", "cmd": [os.environ.get("ComSpec", "C:\\Windows\\System32\\cmd.exe"), '/c', command], "shell": False}
    ]

    def kill_proc_tree(proc):
        if platform.system() == "Windows":
            subprocess.run(['taskkill', '/F', '/T', '/PID', str(proc.pid)], capture_output=True)
        else:
            proc.kill()

    for method in methods:
        process = None
        try:
            process = subprocess.Popen(
                method["cmd"],
                shell=method["shell"],
                cwd=cwd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='replace',
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if platform.system() == "Windows" else 0
            )
            stdout, stderr = process.communicate(timeout=timeout)
            result = {
                "method": method["name"],
                "status": "Success",
                "code": process.returncode,
                "output": stdout.strip(),
                "error": stderr.strip()
            }

            if not verbose:
                return json.dumps(result, indent=2)

            report["results"].append(result)

        except subprocess.TimeoutExpired:
            if process:
                kill_proc_tree(process)
            report["results"].append({
                "method": method["name"],
                "status": "Timeout",
                "error": f"Command exceeded timeout of {timeout} seconds"
            })

        except Exception as e:
            if process:
                kill_proc_tree(process)
            report["results"].append({
                "method": method["name"],
                "status": "Error",
                "error": str(e)
            })

    return json.dumps(report, indent=2 if verbose else None)



def create_starlette_app(mcp_server: Server, *, debug: bool = False) -> Starlette:
    """Create a Starlette application that can server the provied mcp server with SSE."""
    sse = SseServerTransport("/messages/")

    async def handle_sse(request: Request) -> None:
        async with sse.connect_sse(
                request.scope,
                request.receive,
                request._send,  # noqa: SLF001
        ) as (read_stream, write_stream):
            await mcp_server.run(
                read_stream,
                write_stream,
                mcp_server.create_initialization_options(),
            )

    return Starlette(
        debug=debug,
        routes=[
            Route("/sse", endpoint=handle_sse),
            Mount("/messages/", app=sse.handle_post_message),
        ],
    )


if __name__ == "__main__":
    mcp_server = mcp._mcp_server  # noqa: WPS437

    import argparse
    
    parser = argparse.ArgumentParser(description='Run MCP SSE-based server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=8080, help='Port to listen on')
    args = parser.parse_args()

    # Bind SSE request handling to MCP server
    starlette_app = create_starlette_app(mcp_server, debug=True)

    uvicorn.run(starlette_app, host=args.host, port=args.port)