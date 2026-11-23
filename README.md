# 自由计算器 v1.5.0 · 微积分引擎

微积分全生命周期引擎：**极限观测 / 微分求导（1–5 阶）/ 定·不定积分** 三大模式，Tab 秒切。桌面快捷方式为「自由计算器」；与原版「极限观测」（FreeCalculator）是两个独立程序，源码、构建产物、桌面目录互不覆盖。

## 功能

- **极限观测**：任意趋近点（含 ±∞）、泰勒逐阶展开、断点类型、曲线框选缩放（沿用 v1.3.2 全套能力）。
- **微分求导**：任意点 1–5 阶导数（安全上限 5 阶，超过拦截），斜率、函数值、切线方程；红色虚线切线 + 大红点切点；尖点、断点、无穷导数返回 `NOT_DIFFERENTIABLE`，域外点返回 `DOMAIN_ERROR`。
- **积分计算**：
  - 上下限留空 = 不定积分（画 f(x) 与原函数族 F(x)+C）；成对填写 = 定积分（曲线下方半透明蓝色面积填充）。
  - **3 秒 Fast-Fail**：精确 `sp.integrate` 超时或未求值即降级为 **8 阶泰勒多项式近似积分**，报告明确注明「使用了泰勒近似」。
  - 奇点防护：区间内跨过奇点（如 `1/x` 在 `[-1,1]`）返回发散警告并黄色高亮位置；反常积分（如 ∫₀¹ ln x = −1）交由 SymPy 直算。
  - `MemoryError` 统一拦截，返回「计算量过大，已触发内存保护」。
- **防弹级安全**：字符白名单 + 标识符白名单 + 5 秒线程池超时熔断 + crash.log + 每次计算结束 `gc.collect()`。
- **零卡顿**：前端 `submit/poll` 异步任务协议，SymPy 全部在后台线程池执行，pywebview 主 UI 线程只做入队与查状态；按钮防连点状态机、150ms 防抖、在途请求作废机制。
- **丝滑切换**：三个面板 DOM 一次写好，只用 display 切换 + 淡入动画；输入内容跨 Tab 保持；图表实例全局单例，`clear + 重绘 + 500ms 交叉淡入`，绝不 dispose 重建；计算期间 Loading 转圈但保留上一次曲线。
- 三种模式各自生成 Markdown 报告（极限 / 求导 / 积分），可下载或复制。

## 环境要求

- Windows 10/11 + WebView2 Runtime
- Python 3.11（开发验证：3.11.5，sympy 1.13.2）
- 打包：PyInstaller 6.x

## 运行

```bat
cd /d D:\Users\MECHREVO\Documents\deepseek-harness\derivative-lab
python app.py
```

## 打包

```bat
build.bat
python make_zip.py
```

产物：`dist\DerivativeLab\DerivativeLab.exe`（onedir）与 `DerivativeLab_Portable.zip`。

## 目录

```text
derivative-lab/
├── app.py               # 入口（自由计算器 v1.5.0）
├── index.html           # 三模式界面（极限 / 求导 / 积分）
├── assets/              # app.js / style.css / KaTeX / Pico / 立绘
├── core/math_engine.py  # 微积分全生命周期引擎（白名单 + 超时熔断 + 积分降级 + 异步协议）
├── build.bat / make_zip.py
```

## 与「自由计算器」的关系

- 极限程序：`D:\Users\MECHREVO\Documents\deepseek-harness\default-workspace`（v1.3.2，桌面 `FreeCalculator`）。
- 微积分程序：本目录（v1.5.0，桌面 `FreeCalculatorDerivative`，exe 名沿用 `DerivativeLab.exe`）。
- 启动器「自由计算器工作台」在前面对两者做切换，退出子程序会回到工作台。
