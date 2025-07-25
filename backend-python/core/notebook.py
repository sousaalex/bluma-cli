# cli/backend/core/notebook.py

# --- Adicione os imports no topo do arquivo ---
import os
from datetime import datetime
from pathlib import Path  # <-- IMPORTANTE: Adicione esta linha

# --- Define o diretório base fora das funções para ser reutilizado ---
APP_DIR = Path.home() / ".bluma-cli"
LOGS_DIR = APP_DIR / "logs"

def log_notebook_entry(thought: str, context: dict = None):
    # --- CORREÇÃO APLICADA ---
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    notebook_path = LOGS_DIR / "notebook.log"
    # --- FIM DA CORREÇÃO ---

    with open(notebook_path, 'a', encoding='utf-8') as f:
        f.write(f"[{datetime.now().isoformat()}] {thought}\n")
        if context:
            f.write(f"  Context: {context}\n")

def get_last_entries(n=10):
    # --- CORREÇÃO APLICADA ---
    path = LOGS_DIR / "notebook.log"
    # --- FIM DA CORREÇÃO ---

    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    # O resto da função continua igual
    entries = []
    entry = ''
    for line in lines:
        if line.startswith('['):
            if entry:
                entries.append(entry.strip())
                entry = ''
        entry += line
    if entry:
        entries.append(entry.strip())
    return entries[-n:]