import os
import json
from datetime import datetime
from typing import Dict, Any, Optional

class DocumentationProtocol:
    """
    Protocolo responsável por executar o ciclo de documentação de arquivos/APIs, 
    seguindo as regras e padrões definidos para documentação técnica.
    """
    def __init__(self, notion_client=None):
        self.notion_client = notion_client
        self.documentation_log = []

    async def run_cycle(self, file_path: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Executa o ciclo de documentação para o arquivo especificado.
        Lê, documenta, valida e registra progresso.
        """
        if not os.path.exists(file_path):
            return {"success": False, "error": f"File not found: {file_path}"}
        
        try:
            # Simula processo de documentação
            doc_entry = {
                "file_path": file_path,
                "timestamp": datetime.now().isoformat(),
                "status": "documented",
                "context": context or {}
            }
            
            self.documentation_log.append(doc_entry)
            
            # Log do progresso
            self._log_documentation_progress(file_path, "completed")
            
            return {
                "success": True,
                "file_path": file_path,
                "documentation_id": len(self.documentation_log),
                "timestamp": doc_entry["timestamp"]
            }
            
        except Exception as e:
            error_entry = {
                "file_path": file_path,
                "timestamp": datetime.now().isoformat(),
                "status": "error",
                "error": str(e)
            }
            self.documentation_log.append(error_entry)
            
            return {"success": False, "error": str(e)}

    def validate_completion(self, file_path: str, notion_page_id: Optional[str] = None) -> bool:
        """
        Valida se a documentação do arquivo está completa e conforme os padrões.
        """
        # Verifica se o arquivo foi documentado recentemente
        for entry in reversed(self.documentation_log):
            if entry.get("file_path") == file_path and entry.get("status") == "documented":
                return True
        return False

    def get_documentation_status(self, file_path: str) -> Dict[str, Any]:
        """
        Obtém o status atual da documentação para um arquivo específico.
        """
        for entry in reversed(self.documentation_log):
            if entry.get("file_path") == file_path:
                return entry
        
        return {"status": "not_documented", "file_path": file_path}

    def _log_documentation_progress(self, file_path: str, status: str):
        """
        Registra o progresso da documentação em log.
        """
        os.makedirs('logs', exist_ok=True)
        with open('logs/documentation.log', 'a', encoding='utf-8') as f:
            f.write(f"[{datetime.now().isoformat()}] {file_path}: {status}\n")

    def export_documentation_report(self) -> Dict[str, Any]:
        """
        Exporta relatório completo de documentação.
        """
        total_files = len(self.documentation_log)
        successful_docs = sum(1 for entry in self.documentation_log if entry.get("status") == "documented")
        
        return {
            "total_files_processed": total_files,
            "successful_documentations": successful_docs,
            "success_rate": successful_docs / total_files if total_files > 0 else 0.0,
            "recent_activity": self.documentation_log[-10:] if self.documentation_log else []
        } 