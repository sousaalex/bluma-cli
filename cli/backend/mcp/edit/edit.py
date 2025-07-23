import os
import re
import json
import hashlib
import difflib
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from mcp.server.fastmcp import FastMCP

# --- Configuração ---
mcp = FastMCP("edit_tool")

@dataclass
class CalculatedEdit:
    """Represents the calculated result of an edit operation."""
    current_content: Optional[str]
    new_content: str
    occurrences: int
    error: Optional[Dict[str, str]] = None
    is_new_file: bool = False

class LruCache:
    """Simple LRU Cache implementation."""
    def __init__(self, max_size: int = 50):
        self.max_size = max_size
        self.cache = {}
        self.access_order = []
    
    def get(self, key: str) -> Any:
        if key in self.cache:
            self.access_order.remove(key)
            self.access_order.append(key)
            return self.cache[key]
        return None
    
    def set(self, key: str, value: Any) -> None:
        if key in self.cache:
            self.access_order.remove(key)
        elif len(self.cache) >= self.max_size:
            oldest = self.access_order.pop(0)
            del self.cache[oldest]
        
        self.cache[key] = value
        self.access_order.append(key)
    
    def clear(self) -> None:
        self.cache.clear()
        self.access_order.clear()

# Cache for edit correction results
edit_correction_cache = LruCache(50)
file_content_correction_cache = LruCache(50)

def validate_schema(schema: Dict[str, Any], data: Dict[str, Any]) -> bool:
    """
    Validates data against a JSON schema
    Args:
        schema: JSON Schema to validate against
        data: Data to validate
    Returns:
        True if valid, false otherwise
    """
    # Check for required fields
    if "required" in schema and isinstance(schema["required"], list):
        required = schema["required"]
        for field in required:
            if field not in data or data[field] is None:
                print(f"Missing required field: {field}")
                return False
    
    # Check property types if properties are defined
    if "properties" in schema and isinstance(schema["properties"], dict):
        properties = schema["properties"]
        for key, prop in properties.items():
            if key in data and data[key] is not None and "type" in prop:
                expected_type = prop["type"]
                actual_value = data[key]
                
                if expected_type == "string" and not isinstance(actual_value, str):
                    print(f"Type mismatch for property '{key}': expected string, got {type(actual_value).__name__}")
                    return False
                elif expected_type == "number" and not isinstance(actual_value, (int, float)):
                    print(f"Type mismatch for property '{key}': expected number, got {type(actual_value).__name__}")
                    return False
                elif expected_type == "array" and not isinstance(actual_value, list):
                    print(f"Type mismatch for property '{key}': expected array, got {type(actual_value).__name__}")
                    return False
    
    return True

def shorten_path(file_path: str, max_len: int = 35) -> str:
    """
    Shortens a path string if it exceeds maxLen, prioritizing the start and end segments.
    Example: /path/to/a/very/long/file.txt -> /path/.../long/file.txt
    """
    if len(file_path) <= max_len:
        return file_path
    
    path_obj = Path(file_path)
    parts = path_obj.parts
    
    if len(parts) <= 2:
        # Fallback to simple start/end truncation for very short paths
        keep_len = max((max_len - 3) // 2, 0)
        if keep_len <= 0:
            return file_path[:max_len - 3] + "..."
        start = file_path[:keep_len]
        end = file_path[-keep_len:]
        return f"{start}...{end}"
    
    # Build shortened path with start and end components
    start_component = str(Path(parts[0]) / parts[1]) if len(parts) > 1 else parts[0]
    end_components = []
    current_length = len(parts[-1])
    
    # Add components from the end working backwards
    for i in range(len(parts) - 2, 0, -1):
        part = parts[i]
        length_with_part = current_length + len(part) + 1  # +1 for separator
        
        if length_with_part <= max_len - len(start_component) - 4:  # -4 for "..." and separators
            end_components.insert(0, part)
            current_length = length_with_part
        else:
            break
    
    if end_components:
        end_path = "/".join(end_components + [parts[-1]])
        result = f"{start_component}/.../{end_path}"
    else:
        result = f"{start_component}/.../{parts[-1]}"
    
    return result if len(result) <= max_len else "..." + result[-(max_len - 3):]

def make_relative(target_path: str, root_directory: str) -> str:
    """
    Calculates the relative path from a root directory to a target path.
    """
    target = Path(target_path).resolve()
    root = Path(root_directory).resolve()
    
    try:
        relative = target.relative_to(root)
        return str(relative) if str(relative) != "." else "."
    except ValueError:
        return str(target)

def count_occurrences(text: str, substring: str) -> int:
    """Counts occurrences of a substring in a string."""
    if not substring:
        return 0
    
    count = 0
    start = 0
    while True:
        pos = text.find(substring, start)
        if pos == -1:
            break
        count += 1
        start = pos + len(substring)
    
    return count

def unescape_string_for_gemini_bug(input_string: str) -> str:
    """
    Unescapes a string that might have been overly escaped by an LLM.
    Specifically handles cases where LLMs insert literal \\n instead of actual newlines.
    """
    def replace_match(match):
        captured_char = match.group(1)
        
        replacements = {
            'n': '\n',
            't': '\t', 
            'r': '\r',
            "'": "'",
            '"': '"',
            '`': '`',
            '\\': '\\',
            '\n': '\n'
        }
        
        return replacements.get(captured_char, match.group(0))
    
    # Handle over-escaped sequences - specifically target \\n patterns
    result = re.sub(r'\\+(n|t|r|\'|"|`|\\|\n)', replace_match, input_string)
    
    # Additional check for double-escaped newlines that might be missed
    # Convert \\n to actual newlines for better formatting
    result = result.replace('\\n', '\n')
    result = result.replace('\\t', '\t')
    result = result.replace('\\r', '\r')
    
    return result

def ensure_correct_edit(current_content: str, old_string: str, new_string: str, expected_replacements: int = 1) -> Tuple[str, str, int]:
    """
    Attempts to correct edit parameters if the original old_string is not found.
    Returns corrected (old_string, new_string, occurrences)
    """
    cache_key = f"{hash(current_content)}---{hash(old_string)}---{hash(new_string)}"
    cached_result = edit_correction_cache.get(cache_key)
    if cached_result:
        return cached_result
    
    final_old_string = old_string
    final_new_string = new_string
    occurrences = count_occurrences(current_content, final_old_string)
    
    if occurrences != expected_replacements and occurrences == 0:
        # Try unescaping the old string
        unescaped_old_string = unescape_string_for_gemini_bug(old_string)
        unescaped_occurrences = count_occurrences(current_content, unescaped_old_string)
        
        if unescaped_occurrences == expected_replacements:
            final_old_string = unescaped_old_string
            occurrences = unescaped_occurrences
            
            # Also try to fix new_string if it looks escaped
            if unescape_string_for_gemini_bug(new_string) != new_string:
                final_new_string = unescape_string_for_gemini_bug(new_string)
    
    # Try trimming whitespace if exact match fails
    if occurrences != expected_replacements:
        trimmed_old = final_old_string.strip()
        trimmed_occurrences = count_occurrences(current_content, trimmed_old)
        
        if trimmed_occurrences == expected_replacements:
            final_old_string = trimmed_old
            final_new_string = final_new_string.strip()
            occurrences = trimmed_occurrences
    
    result = (final_old_string, final_new_string, occurrences)
    edit_correction_cache.set(cache_key, result)
    return result

def apply_replacement(current_content: Optional[str], old_string: str, new_string: str, is_new_file: bool) -> str:
    """Applies the replacement operation."""
    if is_new_file:
        return new_string
    
    if current_content is None:
        return new_string if old_string == "" else ""
    
    if old_string == "" and not is_new_file:
        return current_content
    
    return current_content.replace(old_string, new_string)

def calculate_edit(file_path: str, old_string: str, new_string: str, expected_replacements: int = 1) -> CalculatedEdit:
    """
    Calculates the potential outcome of an edit operation.
    """
    current_content = None
    file_exists = False
    is_new_file = False
    error = None
    
    # Pre-process new_string to fix common LLM formatting issues
    # Specifically handle cases where LLM sends \\n literals instead of actual newlines
    if '\\n' in new_string or '\\t' in new_string or '\\r' in new_string:
        new_string = unescape_string_for_gemini_bug(new_string)
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            current_content = f.read()
        # Normalize line endings to LF
        current_content = current_content.replace('\r\n', '\n')
        file_exists = True
    except FileNotFoundError:
        file_exists = False
    except Exception as e:
        error = {
            "display": f"Error reading file: {str(e)}",
            "raw": f"Error reading file {file_path}: {str(e)}"
        }
        return CalculatedEdit(
            current_content=current_content,
            new_content="",
            occurrences=0,
            error=error,
            is_new_file=is_new_file
        )
    
    if old_string == "" and not file_exists:
        # Creating a new file
        is_new_file = True
        occurrences = 1
        final_old_string = old_string
        final_new_string = new_string
    elif not file_exists:
        # Trying to edit a non-existent file
        error = {
            "display": "File not found. Cannot apply edit. Use an empty old_string to create a new file.",
            "raw": f"File not found: {file_path}"
        }
        occurrences = 0
        final_old_string = old_string
        final_new_string = new_string
    elif current_content is not None:
        # Editing an existing file
        if old_string == "":
            # Error: Trying to create a file that already exists
            error = {
                "display": "Failed to edit. Attempted to create a file that already exists.",
                "raw": f"File already exists, cannot create: {file_path}"
            }
            occurrences = 0
            final_old_string = old_string
            final_new_string = new_string
        else:
            final_old_string, final_new_string, occurrences = ensure_correct_edit(
                current_content, old_string, new_string, expected_replacements
            )
            
            if occurrences == 0:
                error = {
                    "display": "Failed to edit, could not find the string to replace.",
                    "raw": f"Failed to edit, 0 occurrences found for old_string in {file_path}. No edits made. The exact text in old_string was not found. Ensure you're not escaping content incorrectly and check whitespace, indentation, and context."
                }
            elif occurrences != expected_replacements:
                error = {
                    "display": f"Failed to edit, expected {expected_replacements} occurrence(s) but found {occurrences}.",
                    "raw": f"Failed to edit, Expected {expected_replacements} occurrences but found {occurrences} for old_string in file: {file_path}"
                }
    else:
        error = {
            "display": "Failed to read content of file.",
            "raw": f"Failed to read content of existing file: {file_path}"
        }
        occurrences = 0
        final_old_string = old_string
        final_new_string = new_string
    
    new_content = apply_replacement(current_content, final_old_string, final_new_string, is_new_file)
    
    return CalculatedEdit(
        current_content=current_content,
        new_content=new_content,
        occurrences=occurrences,
        error=error,
        is_new_file=is_new_file
    )

def create_diff(filename: str, old_content: str, new_content: str) -> str:
    """Creates a unified diff between old and new content."""
    old_lines = old_content.splitlines(keepends=True)
    new_lines = new_content.splitlines(keepends=True)
    
    diff = difflib.unified_diff(
        old_lines,
        new_lines,
        fromfile=f"Current/{filename}",
        tofile=f"Proposed/{filename}",
        lineterm=""
    )
    
    return "".join(diff)

def ensure_parent_directories_exist(file_path: str) -> None:
    """Creates parent directories if they don't exist."""
    parent_dir = Path(file_path).parent
    parent_dir.mkdir(parents=True, exist_ok=True)

def validate_tool_params(params: Dict[str, Any]) -> Optional[str]:
    """Validates the parameters for the Edit tool."""
    schema = {
        "type": "object",
        "properties": {
            "file_path": {"type": "string"},
            "old_string": {"type": "string"},
            "new_string": {"type": "string"},
            "expected_replacements": {"type": "number"}
        },
        "required": ["file_path", "old_string", "new_string"]
    }
    
    if not validate_schema(schema, params):
        return "Parameters failed schema validation."
    
    file_path = params["file_path"]
    
    if not os.path.isabs(file_path):
        return f"File path must be absolute: {file_path}"
    
    # Basic security check - ensure path doesn't try to escape via .. 
    normalized_path = os.path.normpath(file_path)
    if ".." in Path(normalized_path).parts:
        return f"File path contains invalid components: {file_path}"
    
    return None

@mcp.tool()
def edit_tool(
    file_path: str,
    old_string: str, 
    new_string: str,
    expected_replacements: int = 1
) -> Dict[str, Any]:
    """
    Replaces text within a file. By default, replaces a single occurrence, but can replace multiple occurrences when `expected_replacements` is specified. This tool requires providing significant context around the change to ensure precise targeting. Always examine the file's current content before attempting a text replacement.

    Expectation for required parameters:
    1. `file_path` MUST be an absolute path; otherwise an error will be thrown.
    2. `old_string` MUST be the exact literal text to replace (including all whitespace, indentation, newlines, and surrounding code etc.).
    3. `new_string` MUST be the exact literal text to replace `old_string` with (also including all whitespace, indentation, newlines, and surrounding code etc.). Ensure the resulting code is correct and idiomatic.
    4. NEVER escape `old_string` or `new_string`, that would break the exact literal text requirement.
    
    **Important:** If ANY of the above are not satisfied, the tool will fail. CRITICAL for `old_string`: Must uniquely identify the single instance to change. Include at least 3 lines of context BEFORE and AFTER the target text, matching whitespace and indentation precisely. If this string matches multiple locations, or does not match exactly, the tool will fail.
    
    **Multiple replacements:** Set `expected_replacements` to the number of occurrences you want to replace. The tool will replace ALL occurrences that match `old_string` exactly. Ensure the number of replacements matches your expectation.
    
    Args:
        file_path: The absolute path to the file to modify. Must start with '/'.
        old_string: The exact literal text to replace, preferably unescaped. For single replacements (default), include at least 3 lines of context BEFORE and AFTER the target text, matching whitespace and indentation precisely. For multiple replacements, specify expected_replacements parameter. If this string is not the exact literal text (i.e. you escaped it) or does not match exactly, the tool will fail.
        new_string: The exact literal text to replace `old_string` with, preferably unescaped. Provide the EXACT text. Ensure the resulting code is correct and idiomatic.
        expected_replacements: Number of replacements expected. Defaults to 1 if not specified. Use when you want to replace multiple occurrences.
    
    Returns:
        Dict containing success status, file path, and operation details
    """
    params = {
        "file_path": file_path,
        "old_string": old_string,
        "new_string": new_string,
        "expected_replacements": expected_replacements
    }
    
    # Validate parameters
    validation_error = validate_tool_params(params)
    if validation_error:
        return {
            "success": False,
            "error": f"Invalid parameters provided. Reason: {validation_error}",
            "file_path": file_path
        }
    
    try:
        # Calculate the edit
        edit_data = calculate_edit(file_path, old_string, new_string, expected_replacements)
        
        if edit_data.error:
            return {
                "success": False,
                "error": edit_data.error["display"],
                "details": edit_data.error["raw"],
                "file_path": file_path
            }
        
        # Execute the edit
        ensure_parent_directories_exist(file_path)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(edit_data.new_content)
        
        # Prepare response
        relative_path = make_relative(file_path, os.getcwd())
        shortened_path = shorten_path(relative_path)
        
        if edit_data.is_new_file:
            description = f"Created {shortened_path}"
            llm_message = f"Created new file: {file_path} with provided content."
        else:
            # Generate diff for display
            filename = os.path.basename(file_path)
            file_diff = create_diff(filename, edit_data.current_content or "", edit_data.new_content)
            
            old_snippet = old_string.split('\n')[0][:30]
            if len(old_string) > 30:
                old_snippet += "..."
            
            new_snippet = new_string.split('\n')[0][:30] 
            if len(new_string) > 30:
                new_snippet += "..."
            
            if old_string == new_string:
                description = f"No file changes to {shortened_path}"
            else:
                description = f"{shortened_path}: {old_snippet} => {new_snippet}"
            
            llm_message = f"Successfully modified file: {file_path} ({edit_data.occurrences} replacements)."
        
        return {
            "success": True,
            "file_path": file_path,
            "description": description,
            "message": llm_message,
            "is_new_file": edit_data.is_new_file,
            "occurrences": edit_data.occurrences,
            "relative_path": relative_path
        }
        
    except Exception as e:
        error_msg = str(e)
        return {
            "success": False,
            "error": f"Error executing edit: {error_msg}",
            "file_path": file_path
        }

if __name__ == "__main__":
    # Initialize and run the server
    mcp.run(transport='stdio')
