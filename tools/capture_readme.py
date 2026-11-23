# -*- coding: utf-8 -*-
"""启动自由计算器并截取主窗口画面，用于 README。"""
import ctypes
import ctypes.wintypes as w
import subprocess
import time
from pathlib import Path

from PIL import ImageGrab

EXE = Path(r"D:\Users\MECHREVO\Desktop\FreeCalculatorDerivative\DerivativeLab.exe")
OUT = Path(r"D:\Users\MECHREVO\Documents\deepseek-harness\derivative-lab\docs\screenshot.png")
TITLE = "自由计算器 v1.5.0"

user32 = ctypes.windll.user32

proc = subprocess.Popen([str(EXE)], cwd=str(EXE.parent))

hwnd = 0
deadline = time.time() + 25
while time.time() < deadline:
    hwnd = user32.FindWindowW(None, TITLE)
    if hwnd:
        break
    time.sleep(0.4)

if not hwnd:
    raise SystemExit("window not found")

# 等开屏消失、自动计算完成
time.sleep(8.5)

# WebView2 会恢复上次滚动位置：聚焦窗口后 Ctrl+Home 回顶部
user32.ShowWindow(ctypes.c_void_p(hwnd), 9)  # SW_RESTORE
user32.SetForegroundWindow(ctypes.c_void_p(hwnd))
time.sleep(0.4)
VK_CONTROL, VK_HOME = 0x11, 0x24
user32.keybd_event(VK_CONTROL, 0, 0, 0)
user32.keybd_event(VK_HOME, 0, 0, 0)
user32.keybd_event(VK_HOME, 0, 2, 0)
user32.keybd_event(VK_CONTROL, 0, 2, 0)
time.sleep(0.8)

rect = w.RECT()
user32.GetWindowRect(ctypes.c_void_p(hwnd), ctypes.byref(rect))
left, top, right, bottom = rect.left, rect.top, rect.right, rect.bottom
print("window rect:", left, top, right - left, bottom - top)

img = ImageGrab.grab(bbox=(left, top, right, bottom))
OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, "PNG")
print("saved:", OUT, img.size)

try:
    proc.terminate()
    proc.wait(timeout=6)
except Exception:
    subprocess.run(["taskkill", "/F", "/IM", "DerivativeLab.exe"], capture_output=True)
