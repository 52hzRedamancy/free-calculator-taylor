# -*- coding: utf-8 -*-
"""生成自由计算器 v1.5.0 便携版：新建文件夹 + 应用目录 + 使用说明 + 分享 zip。"""
import shutil
import zipfile
from pathlib import Path

DIST = Path(r"D:\Users\MECHREVO\Documents\deepseek-harness\derivative-lab\dist\DerivativeLab")
OUT = Path(r"D:\Users\MECHREVO\Desktop\自由计算器_便携版")
APP_NAME = "自由计算器"
APP_DIR = OUT / APP_NAME
ZIP_PATH = OUT / "自由计算器_便携版.zip"

USAGE = """自由计算器 v1.5.0 · 便携版
==============================

【怎么用】
1. 把整个「自由计算器」文件夹复制到任意电脑（U 盘也可以），不要只拷 exe 一个文件。
2. 双击「自由计算器.exe」运行。
3. 不需要安装 Python，也不需要联网，所有计算都在本机完成。

【系统要求】
- Windows 10 / 11（64 位）
- 需要 Microsoft Edge WebView2 Runtime（Win10/11 一般已自带）。
  如果启动时提示 WebView2 相关错误，请安装：
  https://developer.microsoft.com/microsoft-edge/webview2/ （选 Evergreen 安装包）

【功能】
- 极限观测 / 微分求导（1–5 阶，含切线与导数曲线对比）/
  定·不定积分（含 3 秒快速失败与泰勒近似降级、奇点发散拦截）
- 三种模式 Tab 秒切，结果卡片、图表、报告随模式同步

【数据位置】
- 皮肤/开屏时长等偏好保存在 %APPDATA%\\FreeCalcDerivative，换电脑可正常使用。

【常见问题】
- 杀毒软件误报：PyInstaller 打包程序偶被误判，添加信任即可。
- 双击没反应：确认解压完整（_internal 文件夹必须与 exe 放在同一目录）。
- 窗口打不开网页：多为缺少 WebView2 Runtime，按上面链接安装后重试。
"""


def main() -> None:
    exe = DIST / "DerivativeLab.exe"
    if not exe.is_file():
        raise SystemExit(f"[ERROR] 未找到 {exe}，请先运行 build.bat")

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    # 复制整包（onedir），保持 _internal 与 exe 同级
    shutil.copytree(DIST, APP_DIR)

    # 重命名主程序
    (APP_DIR / "DerivativeLab.exe").rename(APP_DIR / "自由计算器.exe")

    # 使用说明：包内 + 外层各放一份
    (APP_DIR / "使用说明.txt").write_text(USAGE, encoding="utf-8-sig")
    (OUT / "使用说明.txt").write_text(USAGE, encoding="utf-8-sig")

    # 生成分享用 zip（解压后就是一个「自由计算器」文件夹）
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for path in sorted(APP_DIR.rglob("*")):
            if path.is_file():
                zf.write(path, Path(APP_NAME) / path.relative_to(APP_DIR))

    total = sum(p.stat().st_size for p in APP_DIR.rglob("*") if p.is_file())
    print(f"[OK] 文件夹：{OUT}  ({total / 1024 / 1024:.1f} MB)")
    print(f"[OK] 分享包：{ZIP_PATH}  ({ZIP_PATH.stat().st_size / 1024 / 1024:.1f} MB)")


if __name__ == "__main__":
    main()
