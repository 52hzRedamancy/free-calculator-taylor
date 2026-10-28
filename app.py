"""自由计算器 v1.3.0 - pywebview 桌面入口。"""

from __future__ import annotations

import os
import sys

import webview

from core.math_engine import MathEngine


def resource_path(relative_path: str) -> str:
    """兼容源码运行与 PyInstaller onefile 解包目录。"""
    base = getattr(sys, "_MEIPASS", None)
    if not base:
        base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, relative_path)


def fit_window_size(
    preferred: tuple[int, int] = (1180, 820),
    minimum: tuple[int, int] = (860, 600),
) -> tuple[int, int, int | None, int | None]:
    """按当前屏幕工作区收窗口，避免高度被任务栏截掉，并居中显示。"""
    try:
        import ctypes
        from ctypes import wintypes

        rect = wintypes.RECT()
        ok = ctypes.windll.user32.SystemParametersInfoW(
            0x0030, 0, ctypes.byref(rect), 0  # SPI_GETWORKAREA
        )
        if not ok:
            raise OSError("SystemParametersInfoW failed")
        left, top = int(rect.left), int(rect.top)
        work_w = int(rect.right - rect.left)
        work_h = int(rect.bottom - rect.top)
    except Exception:
        return preferred[0], preferred[1], None, None

    # pywebview 的宽高按逻辑像素换算成物理像素（125% 缩放 → ×1.25），
    # 而 SPI_GETWORKAREA 给的是物理像素，这里先折回逻辑像素再居中。
    scale = 1.0
    try:
        import ctypes

        # GetDpiForSystem 在未声明 DPI 的进程里恒为 96，优先问 shcore 拿真实缩放比
        percent = 0
        try:
            percent = int(ctypes.windll.shcore.GetScaleFactorForDevice(0))
        except Exception:
            percent = 0
        if percent >= 100:
            scale = percent / 100.0
        else:
            dpi = int(ctypes.windll.user32.GetDpiForSystem())
            if dpi > 0:
                scale = dpi / 96.0
    except Exception:
        scale = 1.0
    if not (0.9 <= scale <= 4.0):
        scale = 1.0

    logical_w = int(work_w / scale)
    logical_h = int(work_h / scale)
    width = max(minimum[0], min(preferred[0], logical_w - 40))
    height = max(minimum[1], min(preferred[1], logical_h - 40))
    x = int(left / scale) + max(0, (logical_w - width) // 2)
    y = int(top / scale) + max(0, (logical_h - height) // 2)
    return width, height, x, y


def main() -> None:
    index_file = resource_path("index.html")
    if not os.path.isfile(index_file):
        raise FileNotFoundError(f"找不到界面文件：{index_file}")

    # WebView2 默认拦截下载；推导报告通过 Blob 下载，必须显式放行。
    webview.settings["ALLOW_DOWNLOADS"] = True

    width, height, x, y = fit_window_size()
    window_args = dict(
        title="自由计算器 v1.3.0",
        url=index_file,
        js_api=MathEngine(),
        width=width,
        height=height,
        min_size=(860, 600),
        background_color="#040b14",
        text_select=True,
    )
    if x is not None and y is not None:
        window_args["x"] = x
        window_args["y"] = y
    webview.create_window(**window_args)
    # private_mode 默认开启会让 WebView2 每次启动清空 localStorage，
    # 皮肤/开屏时长等偏好无法跨启动保存，这里显式关掉。
    webview.start(private_mode=False)


if __name__ == "__main__":
    main()
