# -*- mode: python ; coding: utf-8 -*-

# CORREÇÃO 1: Aumentar o limite de recursão para evitar crashes
import sys
sys.setrecursionlimit(5000)

a = Analysis(
    ['cli/backend/bluma.py'], # O seu ficheiro principal
    pathex=[],
    binaries=[],
    datas=[
        # CORREÇÃO 2: A MAIS IMPORTANTE
        # Diz ao PyInstaller para copiar a pasta 'cli/config' para dentro do .exe.
        # Isto resolve o seu erro 'FileNotFoundError'.
        ('cli/config', 'cli/config')
    ],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # CORREÇÃO 3: Excluir módulos desnecessários para uma compilação mais estável
        'SQLAlchemy', 'sqlalchemy',
        'pygame',
        'Tkinter', 'tkinter',
        'scipy',
        'pandas',
        'torch',
        'matplotlib'
    ],
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