# bluma.spec (VERSÃO FINAL - Mapeamento de 'cli/backend/...' para a raiz do .exe)

# -*- mode: python ; coding: utf-8 -*-

import sys
sys.setrecursionlimit(5000)

all_datas = [
    # Mapeamento: ('origem no seu projeto', 'destino na raiz do .exe')
    
    # Pega em C:\...\bluma-engineer\cli\backend\config
    # e coloca como 'config' dentro do bluma.exe
    ('cli/backend/config', 'config'),
    
    # Pega em C:\...\bluma-engineer\cli\backend\core
    # e coloca como 'core' dentro do bluma.exe
    ('cli/backend/core', 'core'),
    
    # Pega em C:\...\bluma-engineer\cli\backend\prompt_core
    # e coloca como 'prompt_core' dentro do bluma.exe
    ('cli/backend/prompt_core', 'prompt_core'),
    
    # Pega em C:\...\bluma-engineer\cli\backend\custom_tools
    # e coloca como 'custom_tools' dentro do bluma.exe
    ('cli/backend/custom_tools', 'custom_tools'),
    
    # Pega em C:\...\bluma-engineer\cli\backend\mcp
    # e coloca como 'mcp' dentro do bluma.exe
    ('cli/backend/mcp', 'mcp'),
]


a = Analysis(
    ['cli/backend/bluma.py'],
    pathex=[],
    binaries=[],
    datas=all_datas,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[ 'SQLAlchemy', 'pygame', 'Tkinter', 'scipy', 'pandas', 'torch', 'matplotlib' ],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='bluma',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)