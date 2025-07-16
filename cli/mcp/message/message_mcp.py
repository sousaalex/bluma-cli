from mcp.server.fastmcp import FastMCP
from datetime import datetime
from typing import Dict, List
import uuid

mcp = FastMCP("messages")

@mcp.tool(
        description=(
            """ 
                Send notifications to the developer without requiring a response. Use to acknowledge receipt of tasks, provide progress updates, communicate task completion, or explain changes in approach.
                text_markdown (str): Notification content use GitHub-style Markdown
                needed_send_more_notfications (bool): Whether there will be more notifications to the human dev during their work loop. Default: true
                If the DEV's task is sweating or greeting, you must notify and call **idle_idle** immediately.
            """
        )
)
def notify_dev(
    text_markdown: str,
    needed_send_more_notfications: bool = True,

) -> dict:
    return {
        "type": "notify_dev",
        "id": f"notify_{uuid.uuid4()}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "content": {
            "format": "markdown",
            "body": text_markdown
        },
        "success": True,
        "delivered": True,
        "needed_send_more_notfications": needed_send_more_notfications,
    }

@mcp.tool()
def ask_dev(question: str) -> Dict[str, str]:
    """
    Ask a question to the developer and wait for a response. Use only to request clarification, confirmation, or provide additional information.

    **Argument**
    question (str): A question that will be sent to the developer.

    **Returns**
    Dict[str, str]: Return the human dev response.
    """
    return {
        "type":"question",
        "id": f"ask_{uuid.uuid4()}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
         "content": {
            "format": "markdown",
            "body": question
        },
        "sended": True,
        }


# @mcp.tool()
# def final_message_dev(
#     text_markdown: str,
#     needed_send_more_messages: bool = False,
#     execute_idle_funtion: bool = True
# ) -> dict:
#     """
#     ##Sends a completion message to the human developer. Use this tool when:
#     - The task is 100% complete
#     - All documentation is ready
#     - All deliverables have been made
#     - There are no more pending actions
#     - All code has been implemented
#     - All remain_steps have been verified
#     ## Everything related to the task is complete

#     This message indicates that the work is complete and reviewed and that you will close the loop after sending this message.
#     Args:
#         text_markdown (str): Message content in Markdown format
#         needed_send_more_messages (bool): Whether there will be more messages in the loop. Default: false
#         execute_idle_funtion (bool): Defines whether the idle function will be called after this message is successfully sent. Default: true
#     Returns:
#         dict: Tool Response
#     """
#     return {
#         "type": "final_message_dev",
#         "id": f"complete_{uuid.uuid4()}",
#         "timestamp": datetime.utcnow().isoformat() + "Z",
#         "content": {
#             "format": "markdown",
#             "body": text_markdown
#         },
#         "sucess": True,
#         "delivered": True,
#         "needed_send_more_messages": needed_send_more_messages,
#         "execute_idle_funtion": execute_idle_funtion,
#     }

if __name__ == "__main__":
    # Initialize and run the server
    mcp.run(transport='stdio')
