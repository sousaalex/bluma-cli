from mcp.server.fastmcp import FastMCP
from datetime import datetime
# --- Configuração ---
mcp = FastMCP("agent_end_task")


@mcp.tool(description=(
        """ Ends the current task and logs out of the agent"""
))
def end_task() -> dict:    
    return {
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    # Initialize and run the server
    mcp.run(transport='stdio')
