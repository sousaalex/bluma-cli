import os
import json
from datetime import datetime
from typing import Dict, Any, Optional, List

class NotificationProtocol:
    """
    Protocolo responsável por enviar notificações estruturadas ao desenvolvedor, 
    seguindo o padrão do sistema.
    """
    def __init__(self, notification_client=None):
        self.notification_client = notification_client
        self.notification_history = []
        self.notification_queue = []

    async def send_notification(self, message: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Envia uma notificação estruturada ao desenvolvedor.
        """
        try:
            notification = {
                "id": len(self.notification_history) + 1,
                "timestamp": datetime.now().isoformat(),
                "message": message,
                "context": context or {},
                "status": "sent",
                "priority": context.get("priority", "normal") if context else "normal",
                "type": context.get("type", "info") if context else "info"
            }
            
            self.notification_history.append(notification)
            
            # Log da notificação
            self._log_notification(notification)
            
            # Se há um cliente de notificação, tenta enviar
            if self.notification_client:
                try:
                    await self._send_via_client(notification)
                except Exception as e:
                    notification["client_error"] = str(e)
            
            return {
                "success": True,
                "notification_id": notification["id"],
                "timestamp": notification["timestamp"],
                "message": "Notification sent successfully"
            }
            
        except Exception as e:
            error_notification = {
                "timestamp": datetime.now().isoformat(),
                "message": message,
                "status": "error",
                "error": str(e)
            }
            self.notification_history.append(error_notification)
            
            return {"success": False, "error": str(e)}

    async def send_batch_notifications(self, notifications: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Envia múltiplas notificações em lote.
        """
        results = []
        
        for notification_data in notifications:
            message = notification_data.get("message", "")
            context = notification_data.get("context", {})
            
            result = await self.send_notification(message, context)
            results.append(result)
        
        successful_sends = sum(1 for r in results if r.get("success"))
        
        return {
            "success": True,
            "total_notifications": len(notifications),
            "successful_sends": successful_sends,
            "failed_sends": len(notifications) - successful_sends,
            "results": results
        }

    def queue_notification(self, message: str, context: Optional[Dict[str, Any]] = None):
        """
        Adiciona uma notificação à fila para envio posterior.
        """
        queued_notification = {
            "message": message,
            "context": context or {},
            "queued_at": datetime.now().isoformat()
        }
        
        self.notification_queue.append(queued_notification)
        return len(self.notification_queue)

    async def process_notification_queue(self) -> Dict[str, Any]:
        """
        Processa todas as notificações na fila.
        """
        if not self.notification_queue:
            return {"success": True, "message": "No notifications in queue"}
        
        queue_copy = self.notification_queue.copy()
        self.notification_queue.clear()
        
        results = []
        for notification in queue_copy:
            result = await self.send_notification(
                notification["message"], 
                notification["context"]
            )
            results.append(result)
        
        successful_sends = sum(1 for r in results if r.get("success"))
        
        return {
            "success": True,
            "processed_notifications": len(queue_copy),
            "successful_sends": successful_sends,
            "failed_sends": len(queue_copy) - successful_sends
        }

    def get_notification_statistics(self) -> Dict[str, Any]:
        """
        Obtém estatísticas sobre as notificações enviadas.
        """
        total_notifications = len(self.notification_history)
        successful_notifications = sum(1 for n in self.notification_history if n.get("status") == "sent")
        
        # Estatísticas por tipo
        type_stats = {}
        priority_stats = {}
        
        for notification in self.notification_history:
            ntype = notification.get("type", "unknown")
            priority = notification.get("priority", "unknown")
            
            type_stats[ntype] = type_stats.get(ntype, 0) + 1
            priority_stats[priority] = priority_stats.get(priority, 0) + 1
        
        return {
            "total_notifications": total_notifications,
            "successful_notifications": successful_notifications,
            "failed_notifications": total_notifications - successful_notifications,
            "success_rate": successful_notifications / total_notifications if total_notifications > 0 else 0.0,
            "queued_notifications": len(self.notification_queue),
            "type_distribution": type_stats,
            "priority_distribution": priority_stats,
            "recent_notifications": self.notification_history[-10:] if self.notification_history else []
        }

    async def _send_via_client(self, notification: Dict[str, Any]):
        """
        Envia notificação via cliente externo (se disponível).
        """
        if hasattr(self.notification_client, 'send'):
            await self.notification_client.send(notification)
        elif hasattr(self.notification_client, 'post'):
            await self.notification_client.post(notification)
        else:
            # Cliente não tem método conhecido
            pass

    def _log_notification(self, notification: Dict[str, Any]):
        """
        Registra notificação em log.
        """
        os.makedirs('logs', exist_ok=True)
        with open('logs/notifications.log', 'a', encoding='utf-8') as f:
            log_entry = {
                "timestamp": notification["timestamp"],
                "id": notification["id"],
                "type": notification.get("type", "info"),
                "priority": notification.get("priority", "normal"),
                "message": notification["message"]
            }
            f.write(f"{json.dumps(log_entry, ensure_ascii=False)}\n")

    def clear_notification_history(self):
        """
        Limpa o histórico de notificações (manter apenas logs em arquivo).
        """
        cleared_count = len(self.notification_history)
        self.notification_history.clear()
        return cleared_count 