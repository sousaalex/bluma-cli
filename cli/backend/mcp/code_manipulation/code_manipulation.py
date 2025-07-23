import ast
import re
import os
from pathlib import Path
from typing import Dict, Any, Tuple, Literal, List, Optional
import difflib
import logging
from mcp.server.fastmcp import FastMCP
import fnmatch

# NOTA: Todas as funções neste módulo esperam caminhos absolutos no formato Windows
# começando com 'C:' e usando forward slashes (/) como separador de diretório.
# Exemplo: C:/Users/username/project/file.py

mcp = FastMCP("code-manipulation")
logger = logging.getLogger(__name__)

# Helper functions for intelligent code block detection
def find_complete_block_range(lines: List[str], start_line: int) -> Tuple[int, int]:
    """
    Encontre o intervalo completo de um bloco de código a partir de start_line.
Retorna (start_index, end_index) em indexação de base 0.
    """
    start_idx = start_line - 1  # Convert to 0-based
    
    if start_idx >= len(lines):
        return start_idx, start_idx
    
    # Check if this looks like a function/class/block start
    line = lines[start_idx].strip()
    
    # For JavaScript/TypeScript functions and interfaces
    if (line.startswith('function ') or 
        line.startswith('const ') and '=>' in lines[start_idx] or
        line.startswith('export function ') or
        line.startswith('async function ') or
        line.startswith('interface ') or
        line.startswith('export interface ') or
        line.startswith('type ') and '=' in line):
        
        return find_js_function_range(lines, start_idx)
    
    # For Python functions/classes
    elif line.startswith('def ') or line.startswith('class ') or line.startswith('async def '):
        return find_python_block_range(lines, start_idx)
    
    # For general bracket-based blocks
    elif '{' in line:
        return find_bracket_block_range(lines, start_idx)
    
    # Default: just the single line
    return start_idx, start_idx + 1

def find_js_function_range(lines: List[str], start_idx: int) -> Tuple[int, int]:
    """Find the complete range of a JavaScript/TypeScript function."""
    brace_count = 0
    in_function = False
    
    for i in range(start_idx, len(lines)):
        line = lines[i]
        
        # Count braces
        for char in line:
            if char == '{':
                brace_count += 1
                in_function = True
            elif char == '}':
                brace_count -= 1
        
        # If we've closed all braces and we were in a function
        if in_function and brace_count == 0:
            return start_idx, i + 1
    
    # If no closing brace found, return just the starting line
    return start_idx, start_idx + 1

def find_python_block_range(lines: List[str], start_idx: int) -> Tuple[int, int]:
    """Find the complete range of a Python function/class."""
    base_indent = len(lines[start_idx]) - len(lines[start_idx].lstrip())
    
    for i in range(start_idx + 1, len(lines)):
        line = lines[i]
        
        # Skip empty lines
        if not line.strip():
            continue
        
        # Check indentation
        current_indent = len(line) - len(line.lstrip())
        
        # If we're back to the same or less indentation, we've found the end
        if current_indent <= base_indent:
            return start_idx, i
    
    # If we reach the end of file, include everything
    return start_idx, len(lines)

def find_bracket_block_range(lines: List[str], start_idx: int) -> Tuple[int, int]:
    """Find the complete range of a bracket-delimited block."""
    bracket_count = 0
    
    for i in range(start_idx, len(lines)):
        line = lines[i]
        
        for char in line:
            if char == '{':
                bracket_count += 1
            elif char == '}':
                bracket_count -= 1
        
        # If we've closed all brackets
        if bracket_count == 0 and i > start_idx:
            return start_idx, i + 1
    
    # If no closing bracket found, return just the starting line
    return start_idx, start_idx + 1

# Funções auxiliares
#====================================================== init========================================
def find_entity_node(filepath: str, entity_name: str) -> Tuple[ast.AST, str]:
    """Encontra e retorna o nó AST de uma função, classe ou método em um arquivo Python."""
    path = Path(filepath)
    source_code = path.read_text(encoding='utf-8')
    tree = ast.parse(source_code)

    # Se o nome da entidade contém um ponto, é um método dentro de uma classe
    if '.' in entity_name:
        class_name, method_name = entity_name.split('.')
        
        # Primeiro encontra a classe
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name == class_name:
                # Depois procura o método dentro da classe
                for child in ast.iter_child_nodes(node):
                    if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)) and child.name == method_name:
                        return child, source_code
                raise ValueError(f"Método '{method_name}' não encontrado na classe '{class_name}'")
        raise ValueError(f"Classe '{class_name}' não encontrada em '{str(path)}'")
    else:
        # Busca normal por função ou classe
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and node.name == entity_name:
                return node, source_code
    raise ValueError(f"Entidade '{entity_name}' não encontrada em '{str(path)}'")

def find_c_style_block(content: str, block_name: str) -> Tuple[int, int]:
    """Encontra o início e o fim de um bloco de código delimitado por chavetas."""
    pattern = re.compile(r"(\b(function|class|func|public|private|protected|static|void|async)\s+)?\b" + 
                        re.escape(block_name) + r"\b[^\{]*\{")
    match = pattern.search(content)
    
    if not match:
        raise ValueError(f"Não foi possível encontrar o início do bloco '{block_name}'.")

    start_pos = match.start()
    brace_pos = content.find('{', start_pos)
    
    if brace_pos == -1:
        raise ValueError(f"Início do bloco '{block_name}' encontrado, mas sem chaveta de abertura '{{'.")

    brace_count = 1
    end_pos = -1
    for i in range(brace_pos + 1, len(content)):
        if content[i] == '{':
            brace_count += 1
        elif content[i] == '}':
            brace_count -= 1
        
        if brace_count == 0:
            end_pos = i + 1
            break
            
    if end_pos == -1:
        raise ValueError(f"Não foi possível encontrar a chaveta de fecho '}}' correspondente para o bloco '{block_name}'.")

    return start_pos, end_pos 

#================================================Fim==============================================


# @mcp.tool()  # COMMENTED: Substituído pela ferramenta 'edit' mais robusta
def insert_code(filepath: str, line: int, code: str, position: Literal["before", "after"]) -> dict:
    """DEPRECATED: Introduza o código antes ou depois de uma linha específica.
    
    Esta ferramenta foi substituída pela ferramenta 'edit' que oferece:
    - Correção automática de strings escapadas
    - Melhor tratamento de erros
    - Geração de diffs
    - Cache para otimização
    - Validação mais rigorosa
    
    Use a ferramenta 'edit' em vez desta.
    """
    try:
        path = Path(filepath)
        if not path.is_file():
            raise FileNotFoundError(f"File '{str(path)}' not found.")

        with open(path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        line_index = line - 1
        if not (0 <= line_index < len(lines)):
            raise ValueError(f"Line {line} out of range (1 to {len(lines)}).")

        # Determine correct indentation
        current_indent = ""
        target_line = lines[line_index].rstrip('\n')
        
        if position == "after":
            if target_line.rstrip().endswith(':'):
                base_indent = re.match(r'^\s*', target_line).group()
                current_indent = base_indent + "    "
            else:
                current_indent = re.match(r'^\s*', target_line).group()
        else:
            current_indent = re.match(r'^\s*', target_line).group()

        # Prepare new code with correct indentation
        new_lines = []
        code_lines = code.splitlines()
        
        if position == "after" and not target_line.strip().endswith(':'):
            new_lines.append('')
            
        for code_line in code_lines:
            if code_line.strip():
                new_lines.append(current_indent + code_line.lstrip())
            else:
                new_lines.append('')
                
        if position == "after":
            new_lines.append('')

        new_content = '\n'.join(new_lines) + '\n'
        
        if position == "after":
            insert_index = line_index + 1
        else:
            insert_index = line_index

        original_content = ''.join(lines)
        lines.insert(insert_index, new_content)
        modified_content = ''.join(lines)

        # Validate Python syntax
        if str(path).endswith('.py'):
            try:
                ast.parse(modified_content)
            except SyntaxError as e:
                raise ValueError(f"Syntax error: {e}")

        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.writelines(lines)

        return {
            "success": True,
            "filepath": str(path),
            "inserted_at_line": line,
            "position": position
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# @mcp.tool()  # COMMENTED: Substituído pela ferramenta 'edit' mais robusta
def replace_lines(filepath: str, start_line: int, end_line: int, new_code: str) -> dict:
    """DEPRECATED: Substituir linhas de codigo por uma nova na mesma linha
    
    Esta ferramenta foi substituída pela ferramenta 'edit' que oferece:
    - Correção automática de strings escapadas
    - Melhor tratamento de erros  
    - Geração de diffs
    - Cache para otimização
    - Validação mais rigorosa
    - Suporte para múltiplas substituições
    
    Use a ferramenta 'edit' em vez desta.
    """
    try:
        path = Path(filepath)
        if not path.is_file():
            raise FileNotFoundError(f"Arquivo '{str(path)}' não encontrado.")

        with open(path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        start_index = start_line - 1
        end_index = end_line

        if not (0 <= start_index < len(lines) and start_index < end_index <= len(lines)):
            raise ValueError(f"Invalid line range. File has {len(lines)} lines.")

        new_code_lines = (new_code if new_code.endswith('\n') else new_code + '\n').splitlines(keepends=True)
        
        lines[start_index:end_index] = new_code_lines
        modified_content = ''.join(lines)

        # Validate Python syntax
        if str(path).endswith('.py'):
            try:
                ast.parse(modified_content)
            except SyntaxError as e:
                raise ValueError(f"Syntax error: {e}")

        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.writelines(lines)

        return {
            "success": True,
            "filepath": str(path),
            "replaced_range": (start_line, end_line)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    mcp.run(transport="stdio")