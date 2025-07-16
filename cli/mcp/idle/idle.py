from mcp.server.fastmcp import FastMCP
from datetime import datetime
# --- Configuração ---
mcp = FastMCP("idle")


@mcp.tool(description=(
        """ A special tool to indicate you have completed all tasks and are about to enter idle state """
))
def idle() -> dict:
    message = "Task completed successfully - entering idle state"
    
    return {
        "system": message,
        "status": "idle",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    # Initialize and run the server
    mcp.run(transport='stdio')
