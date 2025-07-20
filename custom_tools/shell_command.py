import platform
import subprocess
import os
import json

def shell_command(command: str, timeout: int = 20, cwd: str = None, verbose: bool = False) -> str:
    """
    Executa um comando de terminal de forma robusta e compatível com Windows/Linux.
    Parâmetros:
        - command (str): Comando a executar (ex: 'npm install', 'git pull')
        - timeout (int): Tempo máximo de execução em segundos (default: 20)
        - cwd (str): Diretório onde executar o comando (default: atual)
        - verbose (bool): Se True, retorna relatório detalhado; se False, só o output principal
    Retorna:
        - JSON string com resultado da execução (output, error, status, método usado)
    """
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
