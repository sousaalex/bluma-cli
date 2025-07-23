from datetime import datetime
import uuid

def message_notify_dev(
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


