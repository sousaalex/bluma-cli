import os
import json
from datetime import datetime
from typing import Dict, Any, Optional

class IdleProtocol:
    """
    Protocolo responsável por gerenciar a entrada do agente no estado idle, 
    sinalizando a conclusão de todas as tarefas.
    """
    def __init__(self):
        self.idle_sessions = []
        self.current_idle_state = False

    async def enter_idle(self, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Executa a entrada do agente no estado idle.
        """
        try:
            idle_entry = {
                "timestamp": datetime.now().isoformat(),
                "status": "entered_idle",
                "context": context or {},
                "session_id": context.get("session_id") if context else None
            }
            
            self.idle_sessions.append(idle_entry)
            self.current_idle_state = True
            
            # Log da entrada no estado idle
            self._log_idle_activity("entered", context)
            
            return {
                "success": True,
                "idle_state": True,
                "timestamp": idle_entry["timestamp"],
                "message": "Agent successfully entered idle state"
            }
            
        except Exception as e:
            error_entry = {
                "timestamp": datetime.now().isoformat(),
                "status": "error_entering_idle",
                "error": str(e)
            }
            self.idle_sessions.append(error_entry)
            
            return {"success": False, "error": str(e)}

    async def exit_idle(self, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Sai do estado idle para retomar atividades.
        """
        if not self.current_idle_state:
            return {"success": False, "error": "Agent is not in idle state"}
        
        try:
            exit_entry = {
                "timestamp": datetime.now().isoformat(),
                "status": "exited_idle",
                "context": context or {}
            }
            
            self.idle_sessions.append(exit_entry)
            self.current_idle_state = False
            
            self._log_idle_activity("exited", context)
            
            return {
                "success": True,
                "idle_state": False,
                "timestamp": exit_entry["timestamp"],
                "message": "Agent successfully exited idle state"
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

    def is_idle(self) -> bool:
        """
        Verifica se o agente está atualmente no estado idle.
        """
        return self.current_idle_state

    def get_idle_statistics(self) -> Dict[str, Any]:
        """
        Obtém estatísticas sobre os períodos de idle.
        """
        total_sessions = len([s for s in self.idle_sessions if s.get("status") == "entered_idle"])
        current_status = "idle" if self.current_idle_state else "active"
        
        recent_activity = self.idle_sessions[-5:] if self.idle_sessions else []
        
        return {
            "current_state": current_status,
            "total_idle_sessions": total_sessions,
            "last_idle_entry": self._get_last_idle_entry(),
            "recent_activity": recent_activity
        }

    def _get_last_idle_entry(self) -> Optional[Dict[str, Any]]:
        """
        Obtém a última entrada no estado idle.
        """
        for entry in reversed(self.idle_sessions):
            if entry.get("status") == "entered_idle":
                return entry
        return None

    def _log_idle_activity(self, action: str, context: Optional[Dict[str, Any]] = None):
        """
        Registra atividade de idle em log.
        """
        os.makedirs('logs', exist_ok=True)
        with open('logs/idle.log', 'a', encoding='utf-8') as f:
            session_info = f" (session: {context.get('session_id')})" if context and context.get('session_id') else ""
            f.write(f"[{datetime.now().isoformat()}] Agent {action} idle state{session_info}\n")

    def reset_idle_state(self):
        """
        Reseta o estado idle (para limpeza ou reinicialização).
        """
        self.current_idle_state = False
        reset_entry = {
            "timestamp": datetime.now().isoformat(),
            "status": "reset_idle_state"
        }
        self.idle_sessions.append(reset_entry) 