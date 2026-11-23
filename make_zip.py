# -*- coding: utf-8 -*-
"""将 dist/FreeCalculator 打包为 FreeCalculator_Portable.zip。

用法：先运行 build.bat 完成 PyInstaller onedir 打包，再运行：
    python make_zip.py
"""

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / "dist"
APP_DIR = DIST / "FreeCalculator"
ZIP_BASE = ROOT / "FreeCalculator_Portable"

USAGE_TEXT = (
    "本软件已内置独立运行环境，无需安装 Python。"
    "请将压缩包完整解压后，双击 FreeCalculator.exe 运行。"
    "请勿单独将 exe 文件移出文件夹，否则会报错找不到依赖。"
)


def main() -> None:
    exe = APP_DIR / "FreeCalculator.exe"
    if not exe.is_file():
        raise SystemExit(f"[ERROR] 未找到 {exe}，请先运行 build.bat")

    README = APP_DIR / "使用说明.txt"
    README.write_text(USAGE_TEXT, encoding="utf-8-sig", newline="\r\n")

    zip_path = ZIP_BASE.with_suffix(".zip")
    if zip_path.exists():
        zip_path.unlink()

    shutil.make_archive(str(ZIP_BASE), "zip", root_dir=str(DIST), base_dir="FreeCalculator")

    size_mb = zip_path.stat().st_size / (1024 * 1024)
    print(f"[OK] {zip_path} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()
