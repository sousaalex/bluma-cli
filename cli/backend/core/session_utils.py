import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Tuple
import sys

def load_or_create_session(session_id: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Carrega ou cria uma sessão de usuário, salvando os dados em uma pasta
    oculta (.bluma-cli) no diretório home do usuário.
    """
    home_dir = Path.home()
    app_dir = home_dir / ".bluma-cli"
    session_dir = app_dir / "sessions"
    session_dir.mkdir(parents=True, exist_ok=True)
    session_file = session_dir / f"{session_id}.json"

    if session_file.exists():
        try:
            with open(session_file, "r", encoding="utf-8") as f:
                session_data = json.load(f)
            return str(session_file), session_data.get("conversation_history", [])
        except (json.JSONDecodeError, IOError):
            pass

    # Cria um novo arquivo de sessão se não existir
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
