# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

datas = [('index.html', '.'), ('assets', 'assets'), ('core', 'core')]
binaries = []
hiddenimports = ['webview.platforms.edgechromium', 'webview.platforms.winforms', 'webview.platforms.win32', 'webview.platforms.mshtml', 'clr', 'pythonnet']
tmp_ret = collect_all('pythonnet')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]
tmp_ret = collect_all('clr_loader')
datas += tmp_ret[0]; binaries += tmp_ret[1]; hiddenimports += tmp_ret[2]


a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['numpy', 'torch', 'torchvision', 'torchaudio', 'functorch', 'pytorch_lightning', 'lightning', 'lightning_fabric', 'torchmetrics', 'transformers', 'huggingface_hub', 'wandb', 'sklearn', 'scipy', 'pandas', 'matplotlib', 'mpl_toolkits', 'networkx', 'IPython', 'ipykernel', 'jupyter', 'notebook', 'PyQt5', 'PyQt6', 'PySide2', 'PySide6', 'qtpy', 'cefpython3', 'pyglet', 'pygame', 'gi'],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='DerivativeLab',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['assets/app.ico'],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='DerivativeLab',
)
