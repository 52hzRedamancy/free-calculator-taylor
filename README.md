# 自由计算器 v1.2.0 · 泰勒极限观测引擎

一个完全离线的 Windows 桌面数学工具：用 SymPy 计算函数在任意趋近点 `x → a` 的极限，同时输出 `1` 到 `N` 阶泰勒展开，并逐阶代入 `x = a` 观察结果，附带本地采样的函数曲线。界面由 pywebview 承载，公式由本地 KaTeX 渲染，全程不请求任何 CDN 或在线字体。

## 功能

- 默认示例：`(tan(x) - sin(x)) / x**3`，趋近 `0`，极限为 `1/2`。
- 任意趋近点：`0`、`1`、`pi/2`、`-3`，或 `oo` / `-oo`（无穷远处只求极限，不做局部展开）。
- `1`–`10` 阶 `sympy.series` 展开，每阶去掉大 O 余项并代入趋近点。
- 极限方向可选：自动 / 右极限 / 左极限 / 双侧；`auto` 遇到 `sqrt(x)`、`log(x)` 这类非解析函数会自动改按右极限计算并提示。
- 支持 `log(x, b)` 自定义底数，例如 `log(x, 10)`；输入 `log(` 会自动补成 `log(x, ▮)`，光标停在底数位，`2log(` 同样适用。
- 支持隐式乘法：`2x`、`2(x+1)`、`(x+1)(x-1)`、`2sin(x)` 会自动补 `*`。
- KaTeX 渲染表达式、极限与每一步展开。
- 趋近点附近的函数曲线由本地采样 + canvas 绘制，不联网；断点处有虚线、标记与脉冲动画，曲线按轨迹渐显。
- 曲线效果可切换「动态 / 静态」，滚动到曲线时自动播放，也可点「↻ 重播断点动画」。
- 皮肤可手动切换（下拉框或点击右上角头像循环），选择会记住；开屏立绘与主题色同步。
- 生成中文 Markdown 推导报告，可下载为 `.md`，也可一键复制 LaTeX / 结论 / 报告。
- 逐阶结果带渐入动画，观测过程更有节奏。
- 5 秒线程池超时护栏，超时后自动冷却，避免连续重试堆积后台线程。
- 严格的字符/函数白名单，拒绝任意代码执行。
- 左右极限自动比对，`abs(x)/x` 这类会明确标注「左右不一致」。
- 异常写入 `crash.log`，界面返回可读错误。
- 1–3 秒 DeepSeek「专业工作模式」开屏（默认 3 秒，可在「开屏」下拉框选 1 / 2 / 3 秒）：黑底 DeepSeek 标识 + 欢迎语 + 终端初始化，随后鲸鱼娘壁纸揭幕、应用名浮现，再交叉叠化进主界面；点击任意处或按 `Esc` 可跳过。
- 主界面用同一张 DeepSeek 壁纸压暗铺在右侧作背景，左侧保留深色渐变保证可读性。
- 窗口按屏幕工作区自适应并居中，避免被任务栏截断。
- 全部静态资源本地化：Pico.css、KaTeX CSS/JS、20 个 woff2 字体文件、鲸鱼娘立绘。

## 环境要求

- Windows 10/11
- Python 3.11（开发验证版本：3.11.5）
- Microsoft Edge WebView2 Runtime（Windows 10/11 通常已预装）
- 打包使用 PyInstaller 6.22.1

## 安装

```bat
cd /d D:\Users\MECHREVO\Documents\deepseek-harness\default-workspace
python -m pip install -r requirements.txt
```

## 运行

```bat
python app.py
```

程序会打开标题为「自由计算器 v1.2.0」的窗口。输入表达式与趋近点后点击「观测极限」，或按 `Ctrl + Enter`。

### 允许的语法

- 变量：`x`
- 数字、`+ - * / ( ) **`，以及 `log(x, 底数)` 里的逗号
- 函数：`sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, exp, ln, log, sqrt, abs`
- 常量：`pi, e`
- 趋近点：常数表达式（`0`、`1`、`pi/2`、`-2`、`1/3`）或 `oo` / `-oo`

`ln` / `log(x)` 均按自然对数解析；`log(x, 10)` 表示以 10 为底。隐式乘法（`2x`、`2(x+1)`、`(x+1)(x-1)`、`2sin(x)`、`pi x`）会自动补乘号。禁止 `^`、`//`、方括号等未列入白名单的语法。

## 打包与部署

```bat
build.bat
```

主体命令采用 **onedir**，避免 onefile 在部分机器上解压临时目录失败：

```bat
pyinstaller --noconsole --add-data "index.html;." --add-data "assets;assets" --add-data "core;core" --name FreeCalculator app.py
```

为兼容 pywebview 的 EdgeChromium 后端与 pythonnet，脚本补充了：

- `--collect-all pythonnet`
- `--collect-all clr_loader`
- `--hidden-import webview.platforms.edgechromium`
- `--hidden-import webview.platforms.winforms`
- `--hidden-import webview.platforms.win32`
- `--hidden-import clr`
- 排除 torch / matplotlib / PyQt5 等无关重量级依赖
- `--icon assets/app.ico`

输出：`dist\FreeCalculator\FreeCalculator.exe`（exe 约 15 MB，完整目录约 38 MB）。已排除 numpy（减少约 42 MB）与陈旧的 `core\__pycache__`，字体只保留 woff2。必须保留整个 `FreeCalculator` 文件夹（含 `_internal`），不能只复制 exe。

当前已部署到普通用户目录：

```text
D:\Users\MECHREVO\Desktop\FreeCalculator\FreeCalculator.exe
D:\Users\MECHREVO\Desktop\自由计算器.lnk
```

程序**没有**创建开机自启、计划任务或启动文件夹项；桌面快捷方式仅在用户点击时启动。若把文件夹移动到其他位置，需要同步修改快捷方式目标。

## 报告下载

点击「📥 下载推导报告 (.md)」后，前端把 `raw_report` 写入 `Blob`，通过 `<a download>` 触发保存。pywebview 默认拦截下载，因此 `app.py` 已设置：

```python
webview.settings["ALLOW_DOWNLOADS"] = True
```

WebView2 会弹出系统「另存为」对话框，选择位置即可保存 Markdown 文件。报告文件名由算式 + 时间戳生成，不会互相覆盖。

## 目录结构

```text
.
├─ app.py                 # pywebview 入口与 _MEIPASS 资源路径
├─ core/
│  ├─ __init__.py
│  └─ math_engine.py      # 白名单、超时、SymPy 展开、采样、Markdown 报告
├─ assets/
│  ├─ pico.min.css        # Pico.css v1.5.13
│  ├─ katex.min.css       # KaTeX 0.16.8
│  ├─ katex.min.js        # KaTeX 0.16.8
│  ├─ style.css           # 深海终端主题
│  ├─ app.js              # pywebview API 调用 / KaTeX / canvas / Blob 下载
│  ├─ app.ico
│  ├─ fonts/              # KaTeX 本地字体，CSS 使用相对路径 fonts/
│  └─ img/                # maid_whale / chibi_whale / orca_whale
├─ index.html
├─ build.bat
├─ requirements.txt
└─ README.md
```

## 安全设计

1. 先做字符白名单正则，再做标识符白名单，未知函数直接拒绝。
2. `parse_expr` 使用受限 `global_dict`（空 `__builtins__`）与显式 `local_dict`。
3. 解析结果必须只含变量 `x`；趋近点必须是与 `x` 无关的实数。
4. 计算投递到 `ThreadPoolExecutor`，`future.result(timeout=5)` 超时即返回明确错误；超时后丢弃旧线程池并冷却 2 秒。
5. `solve_limit` 外层区分「用户输入错误」与「引擎异常」，前者不写 `crash.log`。

## 故障排查

- **启动白屏或窗口打不开**：确认 WebView2 Runtime 已安装；尝试重新运行 `python app.py` 查看终端报错。
- **exe 启动失败**：确认运行的是 `FreeCalculator\FreeCalculator.exe`，且同目录 `_internal` 完整；不要只复制 exe。
- **下载没有反应**：确认使用的是本程序窗口；若系统弹出「另存为」，属于正常流程。
- **提示「引擎仍在收尾」**：上一次计算超时，等约 2 秒再试。
- **出现异常**：查看程序目录（打包版为 exe 同目录）的 `crash.log`。源码运行时为项目根目录。
- **端口冲突**：本程序使用本地文件加载页面，不启动 HTTP 服务，无需端口。

## 版本

- 应用：1.2.0
- pywebview：6.2.1
- SymPy：1.13.2
- PyInstaller：6.22.1
- KaTeX：0.16.8
- Pico.css：1.5.13
- 前端：原生 HTML/CSS/JS，无构建步骤

## 许可与素材

- 代码：MIT，见 [LICENSE](LICENSE)。
- 鲸鱼娘立绘：来自 Small-tailqwq/dsh-deep-whale，角色原案上善、女仆装再设计 ZipZipPipe，按 CC BY-NC-SA 4.0 非商业使用；详见 [NOTICE-ARTWORK.md](NOTICE-ARTWORK.md)。
- KaTeX 与 Pico.css：各自 MIT 许可，全部本地化。
