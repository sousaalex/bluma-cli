import ast
from pathlib import Path
import re
import json
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("code-analysis")

@dataclass
class CodeProblem:
    """Representa um problema encontrado no código."""
    severity: str
    message: str
    line: int
    column: int = 0
    end_line: Optional[int] = None
    end_column: Optional[int] = None
    code: Optional[str] = None
    source: str = "code-analyzer"

    def to_dict(self) -> Dict[str, Any]:
        """Converte o problema para dicionário."""
        return {
            "severity": self.severity,
            "message": self.message,
            "line": self.line,
            "column": self.column,
            "end_line": self.end_line or self.line,
            "end_column": self.end_column or self.column,
            "code": self.code,
            "source": self.source
        }

def _extract_import_name(import_line: str) -> Optional[str]:
    """Extrai o nome do import de uma linha."""
    if import_line.startswith('import '):
        match = re.match(r'import\s+(\w+)', import_line)
        if match:
            return match.group(1)
    elif import_line.startswith('from '):
        match = re.match(r'from\s+(\w+)', import_line)
        if match:
            return match.group(1)
    return None

def _is_import_used(import_name: str, content: str) -> bool:
    """Verifica se um import é usado no código."""
    lines = content.split('\n')
    for line in lines:
        if not line.strip().startswith('import') and not line.strip().startswith('from'):
            if import_name in line:
                return True
    return False

def _extract_variable_assignment(line: str) -> Optional[str]:
    """Extrai o nome da variável de uma atribuição simples."""
    match = re.match(r'^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=', line)
    if match:
        return match.group(1)
    return None

def _is_variable_used(var_name: str, content: str, assignment_line: int) -> bool:
    """Verifica se uma variável é usada após sua atribuição."""
    lines = content.split('\n')
    for i, line in enumerate(lines[assignment_line:], assignment_line + 1):
        if var_name in line and '=' not in line:
            return True
    return False

def _is_js_variable_declared(var_name: str, content: str, current_line: int) -> bool:
    """Verifica se uma variável JS foi declarada antes do uso."""
    lines = content.split('\n')
    for i, line in enumerate(lines[:current_line - 1], 1):
        if any(keyword in line for keyword in [f'let {var_name}', f'const {var_name}', f'var {var_name}']):
            return True
        if f'function {var_name}' in line:
            return True
    return False

def analyze_python_problems(content: str, filepath: str) -> List[CodeProblem]:
    """Analisa problemas em código Python."""
    problems = []
    
    try:
        ast.parse(content)
    except SyntaxError as e:
        problems.append(CodeProblem(
            severity="error",
            message=f"Erro de sintaxe: {e.msg}",
            line=e.lineno or 1,
            column=e.offset or 0,
            code="syntax-error"
        ))
        return problems
    
    lines = content.split('\n')
    
    for line_num, line in enumerate(lines, 1):
        stripped = line.strip()
        
        if '\t' in line and '    ' in line:
            problems.append(CodeProblem(
                severity="warning",
                message="Mistura de tabs e espaços para indentação",
                line=line_num,
                code="mixed-indentation"
            ))
        
        if len(line) > 120:
            problems.append(CodeProblem(
                severity="info",
                message=f"Linha muito longa ({len(line)} caracteres)",
                line=line_num,
                code="line-too-long"
            ))
        
        if stripped.startswith('import ') or stripped.startswith('from '):
            import_name = _extract_import_name(stripped)
            if import_name and not _is_import_used(import_name, content):
                problems.append(CodeProblem(
                    severity="warning",
                    message=f"Import '{import_name}' não utilizado",
                    line=line_num,
                    code="unused-import"
                ))
        
        if '=' in stripped and not stripped.startswith('#'):
            var_name = _extract_variable_assignment(stripped)
            if var_name and not _is_variable_used(var_name, content, line_num):
                problems.append(CodeProblem(
                    severity="info",
                    message=f"Variável '{var_name}' não utilizada",
                    line=line_num,
                    code="unused-variable"
                ))
        
        if 'eval(' in stripped:
            problems.append(CodeProblem(
                severity="warning",
                message="Uso de eval() pode ser perigoso",
                line=line_num,
                code="dangerous-eval"
            ))
        
        if re.match(r'^\s*print\s+[^(]', stripped):
            problems.append(CodeProblem(
                severity="warning",
                message="Use print() com parênteses",
                line=line_num,
                code="print-statement"
            ))
    
    return problems

def analyze_json_problems(content: str, filepath: str) -> List[CodeProblem]:
    """Analisa problemas em arquivos JSON."""
    problems = []
    
    try:
        json.loads(content)
    except json.JSONDecodeError as e:
        problems.append(CodeProblem(
            severity="error",
            message=f"JSON inválido: {e.msg}",
            line=e.lineno if hasattr(e, 'lineno') else 1,
            column=e.colno if hasattr(e, 'colno') else 0,
            code="invalid-json"
        ))
        return problems
    
    lines = content.split('\n')
    
    for line_num, line in enumerate(lines, 1):
        stripped = line.strip()
        
        if stripped.endswith(',}') or stripped.endswith(',]'):
            problems.append(CodeProblem(
                severity="warning",
                message="Vírgula desnecessária antes de fechamento",
                line=line_num,
                code="trailing-comma"
            ))
        
        if "'" in stripped and '"' not in stripped:
            problems.append(CodeProblem(
                severity="error",
                message="JSON deve usar aspas duplas, não simples",
                line=line_num,
                code="single-quotes"
            ))
        
        if '//' in stripped or '/*' in stripped:
            problems.append(CodeProblem(
                severity="error",
                message="Comentários não são permitidos em JSON",
                line=line_num,
                code="json-comments"
            ))
    
    return problems

def analyze_javascript_problems(content: str, filepath: str) -> List[CodeProblem]:
    """Analisa problemas em código JavaScript/TypeScript/JSX."""
    problems = []
    lines = content.split('\n')
    
    for line_num, line in enumerate(lines, 1):
        stripped = line.strip()
        
        if re.match(r'^\s*var\s+', stripped):
            problems.append(CodeProblem(
                severity="warning",
                message="Prefira 'let' ou 'const' em vez de 'var'",
                line=line_num,
                code="no-var"
            ))
        
        if 'eval(' in stripped:
            problems.append(CodeProblem(
                severity="warning",
                message="Uso de eval() pode ser perigoso",
                line=line_num,
                code="dangerous-eval"
            ))
        
        if '==' in stripped and '===' not in stripped and '!=' in stripped and '!==' not in stripped:
            problems.append(CodeProblem(
                severity="warning",
                message="Use '===' em vez de '==' para comparação estrita",
                line=line_num,
                code="strict-equality"
            ))
        
        if 'console.log(' in stripped:
            problems.append(CodeProblem(
                severity="info",
                message="Console.log encontrado - remover antes da produção",
                line=line_num,
                code="console-log"
            ))
        
        if (stripped.endswith(')') or stripped.endswith(']') or 
            re.match(r'.*\w$', stripped)) and not stripped.endswith(';') and not stripped.endswith('{') and not stripped.endswith('}'):
            if not any(keyword in stripped for keyword in ['if', 'for', 'while', 'function', 'class', 'else', 'try', 'catch']):
                problems.append(CodeProblem(
                    severity="info",
                    message="Ponto e vírgula ausente",
                    line=line_num,
                    code="missing-semicolon"
                ))
        
        if '=' in stripped and not any(keyword in stripped for keyword in ['let ', 'const ', 'var ', 'function', 'class', '==', '!=', '<=', '>=']):
            var_match = re.match(r'^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=', stripped)
            if var_match:
                var_name = var_match.group(1)
                if not _is_js_variable_declared(var_name, content, line_num):
                    problems.append(CodeProblem(
                        severity="warning",
                        message=f"Variável '{var_name}' pode não estar declarada",
                        line=line_num,
                        code="undeclared-variable"
                    ))
        
        if len(line) > 120:
            problems.append(CodeProblem(
                severity="info",
                message=f"Linha muito longa ({len(line)} caracteres)",
                line=line_num,
                code="line-too-long"
            ))
    
    return problems

@mcp.tool()
def get_code_problems(filepath: str, severity_filter: Optional[str] = None) -> Dict[str, Any]:
    """Analisa um arquivo de código e retorna uma lista de problemas encontrados."""
    LANGUAGE_MAP = {
        '.py': 'python',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.json': 'json',
    }
    
    try:
        path = Path(filepath)
        if not path.is_file():
            raise FileNotFoundError(f"Arquivo '{filepath}' não encontrado.")
        
        content = path.read_text(encoding='utf-8')
        extension = path.suffix.lower()
        language = LANGUAGE_MAP.get(extension, 'unknown')
        
        if language == 'unknown':
            return {
                "success": False,
                "error": f"Análise de problemas não é suportada para a extensão '{extension}'."
            }
        
        problems = []
        if language == 'python':
            problems = analyze_python_problems(content, filepath)
        elif language == 'json':
            problems = analyze_json_problems(content, filepath)
        elif language in ['javascript', 'typescript']:
            problems = analyze_javascript_problems(content, filepath)
        
        if severity_filter:
            problems = [p for p in problems if p.severity == severity_filter]
        
        problems_dict = [p.to_dict() for p in problems]
        
        summary = {
            "total": len(problems),
            "errors": len([p for p in problems if p.severity == "error"]),
            "warnings": len([p for p in problems if p.severity == "warning"]),
            "info": len([p for p in problems if p.severity == "info"])
        }
        
        return {
            "success": True,
            "filepath": filepath,
            "language": language,
            "problems": problems_dict,
            "summary": summary
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@mcp.tool()
def _find_entity_node(filepath: str, entity_name: str) -> Tuple[ast.AST, str]:
    """Encontra e retorna o nó AST de uma função ou classe Python em um arquivo."""
    path = Path(filepath)
    source_code = path.read_text(encoding='utf-8')
    tree = ast.parse(source_code)

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and node.name == entity_name:
            return node, source_code
    raise ValueError(f"Entidade '{entity_name}' não encontrada em '{filepath}'")

if __name__ == "__main__":
    mcp.run(transport="stdio") 