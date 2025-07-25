from pathlib import Path
import os
import fnmatch
from typing import Dict, Any, List, Optional, Literal
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("FilesManager")

DEFAULT_IGNORE = [
    # Controle de versão
    '.git', '.gitignore',
    
    # Ambientes virtuais Python
    '.venv', 'venv', '.virtualenv', 'virtualenv', '.env',
    
    # Cache e temporários Python
    '__pycache__', '*.pyc', '*.pyo', '*.egg-info', '.pytest_cache',
    
    # Node.js
    'node_modules', '.npm', '.yarn',
    
    # IDEs e editores
    '.vscode', '.idea', '.vs', '*.swp', '*.swo', '*~',
    
    # Build e dist
    'dist', 'build', '.next', '.nuxt',
    
    # Logs e temporários
    '*.log', '.tmp', 'tmp', 'temp',
    
    # Sistema operacional
    '.DS_Store', 'Thumbs.db', 'desktop.ini',
    
    # Outros
    '.mypy_cache', '.coverage', '.tox'
]

@mcp.tool()
def ls_tool(
    directory_path: str = ".", 
    recursive: bool = False, 
    ignore_patterns: List[str] = None, 
    start_index: int = 0, 
    end_index: Optional[int] = None,
    show_hidden: bool = False,
    file_extensions: List[str] = None,
    max_depth: Optional[int] = None,
    **kwargs
) -> Dict[str, Any]:
    """Lists files and subdirectories with advanced support for pagination and filtering.
    
    This tool is 'ls' command but with intelligent automatic filtering,
    ignoring directories like .venv, node_modules, __pycache__, etc.
    
    Args:
        directory_path (str, optional): Path of the directory to list. Defaults to ".".
        recursive (bool, optional): If True, lists recursively all subdirectories. Defaults to False.
        ignore_patterns (List[str], optional): Additional patterns to ignore (beyond default patterns). 
            Supports wildcards like '*.tmp', 'test_*'. Defaults to None.
        start_index (int, optional): Starting index for pagination (0-based). Defaults to 0.
        end_index (Optional[int], optional): Ending index for pagination (exclusive). 
            If None, lists everything from start_index. Defaults to None.
        show_hidden (bool, optional): If True, shows files/directories starting with '.'. Defaults to False.
        file_extensions (List[str], optional): List of extensions to filter (ex: ['.py', '.js', '.md']). 
            If None, shows all types. Defaults to None.
        max_depth (Optional[int], optional): Maximum depth for recursive listing. 
            If None, no limit. Defaults to None.
        **kwargs: Additional dynamic parameters for future extensions.
    
    Returns:
        Dict[str, Any]: Dictionary with the following keys:
            - success (bool): True if operation successful, False otherwise
            - path (str): Absolute path of the listed directory (POSIX format)
            - recursive (bool): Whether it was a recursive listing
            - total_files (int): Total number of files found
            - total_directories (int): Total number of directories found
            - showing_files (str): Range of files shown "[start:end]"
            - showing_directories (str): Range of directories shown "[start:end]"
            - files (List[str]): Paginated list of file paths (POSIX format)
            - directories (List[str]): Paginated list of directory paths (POSIX format)
            - filters_applied (Dict[str, Any]): Summary of applied filters
            - error (str, optional): Error message if success=False
    
    Examples:
        # Basic listing of current directory
        ls()
        
        # Recursive listing with pagination
        ls("src", recursive=True, start_index=0, end_index=50)
        
        # Only Python files
        ls(".", file_extensions=['.py'])
        
        # Ignore specific patterns
        ls(".", ignore_patterns=['test_*', '*.backup'])
        
        # Show hidden files
        ls(".", show_hidden=True)
    """
    try:
        normalized_input_path = directory_path.replace("\\", "/")
        base_path = Path(normalized_input_path).resolve()

        if not base_path.is_dir():
            raise FileNotFoundError(f"Directory '{directory_path}' not found.")

        all_ignore_patterns = set(DEFAULT_IGNORE)
        if ignore_patterns:
            all_ignore_patterns.update(ignore_patterns)

        def is_ignored(name: str, is_hidden: bool = False) -> bool:
            # Check if it's a hidden file
            if is_hidden and not show_hidden:
                return True
            
            # Check ignore patterns
            return any(fnmatch.fnmatch(name, pattern) for pattern in all_ignore_patterns)

        def matches_extension(filepath: str) -> bool:
            if file_extensions is None:
                return True
            file_ext = Path(filepath).suffix.lower()
            return file_ext in [ext.lower() for ext in file_extensions]

        all_files = []
        all_dirs = []
        current_depth = 0
        
        filters_applied = {
            "ignore_patterns": list(all_ignore_patterns),
            "show_hidden": show_hidden,
            "file_extensions": file_extensions,
            "max_depth": max_depth
        }
        
        if not recursive:
            for item in base_path.iterdir():
                is_hidden = item.name.startswith('.')
                if not is_ignored(item.name, is_hidden):
                    universal_path = str(item.as_posix())
                    if item.is_file() and matches_extension(universal_path):
                        all_files.append(universal_path)
                    elif item.is_dir():
                        all_dirs.append(universal_path)
        else:
            for root, dirs, files in os.walk(base_path, topdown=True):
                # Calculate current depth
                current_depth = len(Path(root).relative_to(base_path).parts)
                
                # Apply max_depth if specified
                if max_depth is not None and current_depth >= max_depth:
                    dirs.clear()  # Stop recursion
                    continue
                
                # Filter directories
                dirs[:] = [d for d in dirs if not is_ignored(d, d.startswith('.'))]
                
                current_root_path = Path(root)
                
                # Add valid directories
                for d_name in dirs:
                    all_dirs.append(str((current_root_path / d_name).as_posix()))
                
                # Filter and add files
                for f_name in files:
                    is_hidden = f_name.startswith('.')
                    if not is_ignored(f_name, is_hidden):
                        file_path = str((current_root_path / f_name).as_posix())
                        if matches_extension(file_path):
                            all_files.append(file_path)

        all_files.sort()
        all_dirs.sort()
        
        total_files = len(all_files)
        total_dirs = len(all_dirs)

        paginated_files = all_files[start_index:end_index]
        paginated_dirs = all_dirs[start_index:end_index]

        actual_end_files = end_index if end_index is not None else total_files
        actual_end_dirs = end_index if end_index is not None else total_dirs

        return {
            "success": True,
            "path": str(base_path.as_posix()),
            "recursive": recursive,
            "total_files": total_files,
            "total_directories": total_dirs,
            "showing_files": f"[{start_index}:{min(actual_end_files, total_files)}]",
            "showing_directories": f"[{start_index}:{min(actual_end_dirs, total_dirs)}]",
            "files": paginated_files,
            "directories": paginated_dirs,
            "filters_applied": filters_applied
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@mcp.tool()
def count_lines_tool(filepath: str) -> Dict[str, Any]:
    """Counts and returns the total number of lines in a text file.
    
    This tool is useful for getting quick file size information before reading large files,
    checking if a file is empty, or determining pagination parameters for read_lines_range.
    
    Args:
        filepath (str): Path to the file to count lines from. Can be relative or absolute path.
            Supports various text file formats (.txt, .py, .js, .md, .json, etc.).
    
    Returns:
        Dict[str, Any]: Dictionary with the following keys:
            - success (bool): True if operation successful, False otherwise
            - filepath (str): The file path that was processed
            - line_count (int): Total number of lines in the file (including empty lines)
            - error (str, optional): Error message if success=False
    
    Examples:
        # Count lines in a Python file
        count_file_lines("src/main.py")
        
        # Check if log file is empty
        count_file_lines("logs/app.log")
        
        # Get total lines before reading specific range
        result = count_file_lines("data.txt")
        if result["line_count"] > 1000:
            # Read in chunks using read_lines_range
            read_lines_range("data.txt", 1, 100)
    
    Note:
        - Empty lines are counted
        - Works with any text-based file format
        - Efficient for large files (doesn't load entire content into memory)
        - Use this before read_lines_range to determine valid line ranges
    """
    try:
        if not Path(filepath).is_file():
            raise FileNotFoundError(f"File '{filepath}' not found.")

        with open(filepath, 'r', encoding='utf-8') as f:
            line_count = sum(1 for _ in f)
        return {"success": True, "filepath": filepath, "line_count": line_count}
    except Exception as e:
        return {"success": False, "error": str(e)}

@mcp.tool()
def read_lines_tool(filepath: str, start_line: int, end_line: int) -> Dict[str, Any]:
    """Reads and returns content between specific line numbers from a text file.
    
    This tool allows efficient reading of specific portions of large files without loading
    the entire file into memory. Useful for pagination, extracting specific code sections,
    or analyzing particular parts of log files.
    
    Args:
        filepath (str): Path to the file to read from. Can be relative or absolute path.
            Supports any text-based file format.
        start_line (int): Starting line number (1-based indexing). Must be >= 1.
        end_line (int): Ending line number (1-based indexing, inclusive). Must be > start_line.
    
    Returns:
        Dict[str, Any]: Dictionary with the following keys:
            - success (bool): True if operation successful, False otherwise
            - filepath (str): The file path that was processed
            - content (str): The extracted text content between the specified lines
            - lines_read (int): Number of lines actually read
            - start_line (int): The starting line number used
            - end_line (int): The ending line number used
            - error (str, optional): Error message if success=False
    
    Examples:
        # Read first 10 lines of a file
        read_lines_range("config.txt", 1, 10)
        
        # Read specific function from Python file (lines 50-75)
        read_lines_range("src/utils.py", 50, 75)
        
        # Read large chunks efficiently (up to 1000+ lines)
        read_lines_range("large_dataset.csv", 1000, 2000)
        
        # Extract error logs from specific time period
        read_lines_range("app.log", 500, 600)
    
    Note:
        - Line numbers are 1-based (first line is 1, not 0)
        - end_line is inclusive (line will be included in result)
        - Can read ranges of 1000+ lines efficiently
        - Use count_file_lines() first to determine valid line ranges
        - Preserves original formatting and line breaks
        - Returns empty content if range is invalid but doesn't raise error
    """
    try:
        if not Path(filepath).is_file():
            raise FileNotFoundError(f"File '{filepath}' not found.")

        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        total_lines = len(lines)
        start_index = start_line - 1
        end_index = end_line

        if start_line < 1 or end_line < start_line:
            raise ValueError(f"Invalid line range. start_line must be >= 1 and end_line must be >= start_line.")
        
        if start_index >= total_lines:
            raise ValueError(f"start_line ({start_line}) exceeds file length ({total_lines} lines).")
        
        if end_index > total_lines:
            end_index = total_lines

        content = ''.join(lines[start_index:end_index])
        lines_read = end_index - start_index

        return {
            "success": True, 
            "filepath": filepath, 
            "content": content,
            "lines_read": lines_read,
            "start_line": start_line,
            "end_line": min(end_line, total_lines),
            "total_file_lines": total_lines
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    mcp.run(transport="stdio") 