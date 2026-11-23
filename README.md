# 自由计算器 v1.5.0 · 微积分引擎

![自由计算器主界面](docs/screenshot.png)

> **极限观测 / 微分求导 / 定·不定积分** 三合一，本地离线的微积分实验室。

基于 **pywebview + SymPy + KaTeX** 的桌面程序：所有计算都在本机完成，不上传表达式、不依赖网络。
三个模式用顶部 Tab 秒切，结果卡片、图表与 Markdown 报告随模式同步，不串联、不错位。

---

## ✨ 功能

### 极限观测
- 任意趋近点（含 ±∞），1–10 阶泰勒逐阶展开，清楚看到函数如何收敛
- 断点类型识别（可去 / 跳跃 / 无穷 / 振荡）、曲线框选缩放、键盘指定区间重播

### 微分求导
- 任意点 **1–5 阶**导数（超过直接拦截），给出导数表达式 `f′(x)`、该点斜率、函数值与切线方程
- 图表叠加：红色虚线切线 + 大红切点 + **绿色虚线导数曲线**（与原函数同图对比）
- 不可导防护：尖点、断点、无穷导数当场拦下并黄色标记

### 积分计算
- **不定积分**：原函数 + 原函数族 `F(x)+C` 虚线同图展示
- **定积分**：曲线下方半透明蓝色面积填充，上下限蓝色虚线标出
- **3 秒 Fast-Fail**：精确积分超时 / 求不出时自动降级为 8 阶泰勒近似积分，报告明确注明「使用了泰勒近似」
- 奇点发散拦截（如 `1/x` 在 `[-1, 1]`）、反常积分由 SymPy 直算兜底、`MemoryError` 内存保护

### 通用体验
- Markdown 推导报告：一键下载 / 复制
- 三模式各自保存「结果卡片 + 图表 + 报告 + 复制/下载按钮 + 缩放」，切 Tab 上下同步还原
- 顶部 Hero 随模式切换（大标题 / 副标题 / 介绍 / 特性徽章）
- 皮肤切换（深海女仆 / 虎鲸链路 / Q版鲸鱼娘）、自定义开屏时长、曲线动态/静态效果

---

## 🔒 安全设计

| 防护 | 说明 |
| --- | --- |
| 字符白名单 | 只接受 `x`、数字、四则/幂运算、括号、逗号（仅 log 底数）与固定函数表 |
| 标识符白名单 | 解析后的自由符号必须只有 `x`，函数调用逐个校验参数个数 |
| 超时熔断 | 计算线程池 5 秒超时 + 超时冷却；积分额外 3 秒 Fast-Fail |
| 异常兜底 | 未预期异常写入 `crash.log`，向前端返回结构化错误，不崩溃 |
| 内存保护 | `MemoryError` 拦截；每次计算结束 `gc.collect()` |
| 阶数上限 | 求导最高 5 阶，超过拦截 |

---

## ⚡ 性能设计

- **异步任务协议**：前端走 `submit(task, payload)` / `poll(task_id)`，SymPy 计算全部在后台线程池，pywebview 主 UI 线程只做入队与状态查询，计算期间窗口不卡顿
- **图表单例**：canvas 只初始化一次，数据更新用 clear + 重绘 + 500ms 交叉淡入，绝不 dispose 重建
- **交互防护**：按钮防连点状态机（计算中禁用）、150ms 防抖、在途请求作废（只认最后一次有效提交）

---

## 🚀 快速开始

### 便携版（推荐分享）

1. 解压 `自由计算器_便携版.zip`
2. 双击 `自由计算器.exe` 运行

> 无需安装 Python / 联网；需要 **Windows 10/11（64 位）+ Microsoft Edge WebView2 Runtime**（系统一般自带）。
> 请勿把 exe 单独移出文件夹，`_internal` 目录必须与 exe 同级。

### 从源码运行

```bat
python -m pip install -r requirements.txt
python app.py
```

### 打包

```bat
build.bat              :: PyInstaller onedir 打包
python make_portable.py :: 生成便携版文件夹 + 分享 zip
```

---

## 🧱 项目结构

```text
free-calculator/
├── app.py                  # 入口：pywebview 窗口 + js_api
├── core/
│   ├── __init__.py
│   └── math_engine.py      # 微积分引擎：白名单 / 超时熔断 / 积分降级 / 异步协议
├── index.html              # 三模式界面
├── assets/                 # app.js / style.css / KaTeX / Pico / 立绘 / 皮肤
├── tools/
│   ├── dns_proxy.py        # 开发用：绕过被污染的 DNS 访问 GitHub
│   └── capture_readme.py   # 开发用：自动截取 README 截图
├── build.bat               # PyInstaller 打包脚本
├── DerivativeLab.spec      # 打包配置（产物名沿用 DerivativeLab）
├── make_zip.py             # 便携版 zip（旧简化脚本）
├── make_portable.py        # 便携版文件夹 + 分享 zip（推荐）
├── docs/screenshot.png     # README 截图
├── README.md
└── LICENSE / NOTICE-ARTWORK.md
```

---

## 🛡️ 引擎 API 摘要

| 方法 | 说明 |
| --- | --- |
| `solve_limit(expr, center, max_order, direction)` | 极限 + 泰勒逐阶展开 + 断点分析 + 采样曲线 |
| `solve_derivative(expr, center, order)` | 1–5 阶导数、切线、导数曲线采样、不可导防护 |
| `solve_integral(expr, lower, upper)` | 不定/定积分、泰勒降级、奇点发散、内存保护 |
| `plot_range(expr, center, x_min, x_max)` | 指定区间重采样 |
| `submit(task, payload)` / `poll(task_id)` | 非阻塞异步任务协议（前端使用） |

---

## 🖥️ 系统要求

- Windows 10 / 11（64 位）
- Microsoft Edge WebView2 Runtime
- 源码运行：Python 3.11（开发验证 3.11.5，SymPy 1.13.2）

---

## 📝 更新日志

- **v1.5.0**（2026-11-23）：积分引擎（Fast-Fail + 泰勒降级 + 奇点防护）、异步任务协议、三 Tab 合一、Hero 随模式切换、结果与原函数对比曲线、导数表达式行、便携版
- **v1.4.0**：求导并入原程序（历史版本，未发布）
- **v1.3.2**：泰勒极限观测独立程序（另一仓库 `free-calculator-taylor`）

---

## 📄 License

MIT License © 2026 52hzRedamancy

> 立绘与配图版权说明见 [NOTICE-ARTWORK.md](NOTICE-ARTWORK.md)。
