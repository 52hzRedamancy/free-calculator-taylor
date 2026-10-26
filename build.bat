@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
set PYTHONUTF8=1

echo ============================================================
echo   FreeCalculator v1.0.0 - PyInstaller onedir build
echo ============================================================

if exist "dist\FreeCalculator.exe" del /q "dist\FreeCalculator.exe"

pyinstaller --noconfirm --clean --noconsole ^
  --add-data "index.html;." ^
  --add-data "assets;assets" ^
  --add-data "core;core" ^
  --collect-all pythonnet ^
  --collect-all clr_loader ^
  --hidden-import webview.platforms.edgechromium ^
  --hidden-import webview.platforms.winforms ^
  --hidden-import webview.platforms.win32 ^
  --hidden-import webview.platforms.mshtml ^
  --hidden-import clr ^
  --hidden-import pythonnet ^
  --exclude-module torch ^
  --exclude-module torchvision ^
  --exclude-module torchaudio ^
  --exclude-module functorch ^
  --exclude-module pytorch_lightning ^
  --exclude-module lightning ^
  --exclude-module lightning_fabric ^
  --exclude-module torchmetrics ^
  --exclude-module transformers ^
  --exclude-module huggingface_hub ^
  --exclude-module wandb ^
  --exclude-module sklearn ^
  --exclude-module scipy ^
  --exclude-module pandas ^
  --exclude-module matplotlib ^
  --exclude-module mpl_toolkits ^
  --exclude-module networkx ^
  --exclude-module IPython ^
  --exclude-module ipykernel ^
  --exclude-module jupyter ^
  --exclude-module notebook ^
  --exclude-module PyQt5 ^
  --exclude-module PyQt6 ^
  --exclude-module PySide2 ^
  --exclude-module PySide6 ^
  --exclude-module qtpy ^
  --exclude-module cefpython3 ^
  --exclude-module pyglet ^
  --exclude-module pygame ^
  --exclude-module gi ^
  --icon "assets/app.ico" ^
  --name FreeCalculator app.py

if errorlevel 1 (
  echo.
  echo [BUILD FAILED] PyInstaller returned an error.
  exit /b 1
)

if not exist "dist\FreeCalculator\FreeCalculator.exe" (
  echo.
  echo [BUILD FAILED] dist\FreeCalculator\FreeCalculator.exe was not created.
  exit /b 1
)

echo.
echo [BUILD OK] dist\FreeCalculator\FreeCalculator.exe
for %%F in ("dist\FreeCalculator\FreeCalculator.exe") do echo EXE size: %%~zF bytes
powershell -NoProfile -Command "$s=(Get-ChildItem 'dist\FreeCalculator' -Recurse -File | Measure-Object Length -Sum).Sum; Write-Host ('Folder size: {0:N1} MB' -f ($s/1MB))"
endlocal
