from mcp.server.fastmcp import FastMCP
from datetime import datetime
import uuid

mcp = FastMCP("messages")

@mcp.tool(
        description=(
            """ 
                Send a message to dev without requiring a response. Use for acknowledging receipt of messages, providing progress updates, reporting task completion, or explaining changes in approach.
            """
        )
)
def notify_dev(
    text_markdown: str,

) -> dict:
    return {
        "type": "message_notify_dev",
        "id": f"notify_{uuid.uuid4()}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "content": {
            "format": "markdown",
            "body": text_markdown
        },
        "success": True,
        "delivered": True,
    }

if __name__ == "__main__":
    # Initialize and run the server
    mcp.run(transport='stdio')
