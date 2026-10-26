"""自由计算器 v1.0.0 - pywebview 桌面入口。"""

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


def main() -> None:
    index_file = resource_path("index.html")
    if not os.path.isfile(index_file):
        raise FileNotFoundError(f"找不到界面文件：{index_file}")

    # WebView2 默认拦截下载；推导报告通过 Blob 下载，必须显式放行。
    webview.settings["ALLOW_DOWNLOADS"] = True

    webview.create_window(
        "自由计算器 v1.0.0",
        index_file,
        js_api=MathEngine(),
        width=1180,
        height=820,
        min_size=(900, 640),
        background_color="#040b14",
        text_select=True,
    )
    webview.start()


if __name__ == "__main__":
    main()
