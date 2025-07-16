import os
from datetime import datetime

def log_notebook_entry(thought: str, context: dict = None):
    os.makedirs('logs', exist_ok=True)
    with open('logs/notebook.log', 'a', encoding='utf-8') as f:
        f.write(f"[{datetime.now().isoformat()}] {thought}\n")
        if context:
            f.write(f"  Context: {context}\n")

def get_last_entries(n=10):
    path = 'logs/notebook.log'
    if not os.path.exists(path):
        return []
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    # Retorna as últimas N entradas completas
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