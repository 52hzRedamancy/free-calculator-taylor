"""泰勒极限观测引擎。

安全边界：
* 只接受 x、数字、四则运算/幂运算、括号和固定的初等函数白名单；
* 解析后的自由符号必须只有 x；
* 所有计算在单线程池中执行，5 秒未返回即明确报超时；
* 任何未预期异常都会追加写入 crash.log，并返回结构化错误。
"""

from __future__ import annotations

import os
import re
import sys
import tempfile
import threading
import time
import traceback
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeoutError
from datetime import datetime
from pathlib import Path
from typing import Any

import sympy as sp


class MathEngine:
    """暴露给 pywebview 的本地计算 API。"""

    TIMEOUT_SECONDS = 5
    MAX_INPUT_LENGTH = 300
    SERIES_ORDERS = range(1, 7)

    _ALLOWED_IDENTIFIERS = frozenset(
        {"x", "sin", "cos", "tan", "exp", "ln", "log", "pi", "e"}
    )
    _FUNCTION_NAMES = frozenset({"sin", "cos", "tan", "exp", "ln", "log"})
    _IDENTIFIER_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
    _CHAR_WHITELIST_RE = re.compile(r"^[0-9A-Za-z+\-*/().\s]+$")
    _CRASH_LOCK = threading.Lock()

    def solve_limit(self, expression: Any) -> dict[str, Any]:
        """计算表达式在 x -> 0 时的极限，并返回 1--6 阶泰勒观测结果。"""
        try:
            checked = self._validate(expression)
            if "error" in checked:
                return {"success": False, "error": checked["error"]}

            clean = checked["expression"]
            symbol = sp.Symbol("x", real=True)
            local_dict = {
                "x": symbol,
                "sin": sp.sin,
                "cos": sp.cos,
                "tan": sp.tan,
                "exp": sp.exp,
                "ln": sp.log,
                "log": sp.log,
                "pi": sp.pi,
                "e": sp.E,
            }

            # 线程池隔离计算；超时后立即返回，避免冻结 GUI。
            executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="limit-engine")
            future = executor.submit(
                self._analyze,
                clean,
                symbol,
                local_dict,
            )
            try:
                return future.result(timeout=self.TIMEOUT_SECONDS)
            except FutureTimeoutError:
                future.cancel()
                return {
                    "success": False,
                    "timeout": True,
                    "error": (
                        f"计算超时：超过 {self.TIMEOUT_SECONDS} 秒仍未完成。"
                        "请降低表达式复杂度后重试。"
                    ),
                }
            finally:
                executor.shutdown(wait=False, cancel_futures=True)

        except Exception as exc:  # noqa: BLE001 - API 边界必须兜底
            crash_path = self._write_crash_log(exc)
            return {
                "success": False,
                "error": f"计算引擎发生异常：{exc}",
                "crash_log": str(crash_path),
            }

    def _validate(self, expression: Any) -> dict[str, str]:
        if not isinstance(expression, str):
            return {"error": "输入必须是字符串表达式。"}

        clean = re.sub(r"\s+", " ", expression).strip()
        if not clean:
            return {"error": "请输入一个关于 x 的表达式。"}
        if len(clean) > self.MAX_INPUT_LENGTH:
            return {"error": f"表达式过长（上限 {self.MAX_INPUT_LENGTH} 字符）。"}
        if not self._CHAR_WHITELIST_RE.fullmatch(clean):
            bad = sorted({ch for ch in clean if not re.match(r"[0-9A-Za-z+\-*/(). ]", ch)})
            shown = " ".join(repr(ch) for ch in bad)
            return {"error": f"包含不允许的字符：{shown}。仅支持 x、数字、+-*/()**。"}
        if "//" in clean:
            return {"error": "不支持整除运算符 //，请改用 /。"}

        identifiers = set(self._IDENTIFIER_RE.findall(clean))
        illegal = sorted(identifiers - self._ALLOWED_IDENTIFIERS)
        if illegal:
            return {
                "error": (
                    "检测到未允许的函数/标识符："
                    + "、".join(f"`{name}`" for name in illegal)
                    + "。允许：sin, cos, tan, exp, ln, log, pi, e。"
                )
            }

        for name in sorted(self._FUNCTION_NAMES & identifiers):
            if not re.search(rf"{name}\s*\(", clean):
                return {"error": f"函数 {name} 必须带括号调用，例如 {name}(x)。"}

        depth = 0
        for char in clean:
            if char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
                if depth < 0:
                    return {"error": "括号不匹配：出现了多余的右括号。"}
        if depth:
            return {"error": "括号不匹配：缺少右括号。"}

        return {"expression": clean}

    def _analyze(
        self,
        clean: str,
        symbol: sp.Symbol,
        local_dict: dict[str, Any],
    ) -> dict[str, Any]:
        started = time.perf_counter()
        global_dict = {
            "__builtins__": {},
            "Symbol": sp.Symbol,
            "Integer": sp.Integer,
            "Float": sp.Float,
            "Rational": sp.Rational,
        }
        try:
            parsed = sp.parse_expr(
                clean,
                local_dict=local_dict,
                global_dict=global_dict,
                evaluate=True,
            )
        except Exception as exc:  # 语法错误属于用户输入错误，不写 crash.log
            raise ValueError(f"无法解析表达式：{exc}") from exc

        if not isinstance(parsed, sp.Basic):
            raise ValueError("表达式没有解析为有效的数学对象。")
        free_symbols = parsed.free_symbols
        if free_symbols - {symbol}:
            names = "、".join(sorted(str(item) for item in free_symbols - {symbol}))
            raise ValueError(f"出现未允许的变量：{names}。只允许 x。")

        steps: list[dict[str, Any]] = []
        for order in self.SERIES_ORDERS:
            try:
                expansion = sp.series(parsed, symbol, 0, order).removeO()
                at_zero = expansion.subs(symbol, 0)
                simplified_zero = sp.simplify(at_zero)
                is_zero = bool(simplified_zero.is_zero is True)
                if at_zero.has(sp.nan):
                    is_zero = False
                steps.append(
                    {
                        "order": order,
                        "latex": sp.latex(expansion),
                        "at_zero_latex": sp.latex(at_zero),
                        "at_zero_text": str(at_zero),
                        "is_zero": is_zero,
                    }
                )
            except Exception as exc:  # noqa: BLE001 - 单阶失败也要生成可读报告
                steps.append(
                    {
                        "order": order,
                        "latex": r"\text{该阶展开不可用}",
                        "at_zero_latex": r"\text{—}",
                        "at_zero_text": "—",
                        "is_zero": None,
                        "error": str(exc),
                    }
                )

        limit_value = sp.limit(parsed, symbol, 0)
        if limit_value.has(sp.AccumBounds):
            limit_exists = False
            limit_note = "极限不存在（函数在 0 附近振荡）。"
        else:
            limit_exists = True
            limit_note = ""

        limit_approx = ""
        try:
            approx = sp.N(limit_value, 12)
            if approx.is_real:
                limit_approx = str(approx)
        except Exception:
            limit_approx = ""

        first_nonzero = next(
            (
                step["order"]
                for step in steps
                if step.get("is_zero") is False and "error" not in step
            ),
            None,
        )
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        expression_latex = sp.latex(parsed)
        limit_latex = sp.latex(limit_value)
        raw_report = self._build_report(
            clean=clean,
            parsed_latex=expression_latex,
            steps=steps,
            limit_latex=limit_latex,
            limit_text=str(limit_value),
            limit_note=limit_note,
            first_nonzero=first_nonzero,
            elapsed_ms=elapsed_ms,
        )

        return {
            "success": True,
            "expression": clean,
            "expression_latex": expression_latex,
            "normalized": str(parsed),
            "limit_latex": limit_latex,
            "limit_text": str(limit_value),
            "limit_approx": limit_approx,
            "limit_exists": limit_exists,
            "limit_note": limit_note,
            "first_nonzero_order": first_nonzero,
            "steps": steps,
            "elapsed_ms": elapsed_ms,
            "raw_report": raw_report,
            "engine": f"SymPy {sp.__version__}",
        }

    def _build_report(
        self,
        *,
        clean: str,
        parsed_latex: str,
        steps: list[dict[str, Any]],
        limit_latex: str,
        limit_text: str,
        limit_note: str,
        first_nonzero: int | None,
        elapsed_ms: int,
    ) -> str:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        lines = [
            "# 自由计算器 · 泰勒极限推导报告",
            "",
            "> 由 **自由计算器 v1.0.0 / 泰勒极限观测引擎** 在本机离线生成。",
            f"> 计算时间：{now} · 耗时：{elapsed_ms} ms · 引擎：SymPy {sp.__version__}",
            "",
            "## 输入",
            "",
            "```text",
            clean,
            "```",
            "",
            "## 极限结论",
            "",
            f"$$\\lim_{{x \\to 0}} {parsed_latex} = {limit_latex}$$",
            "",
            f"- 精确结果：`{limit_text}`",
        ]
        if limit_note:
            lines.append(f"- 说明：{limit_note}")
        lines += [
            "",
            "## 1–6 阶泰勒展开观测",
            "",
            "| 阶数 | 展开式（去除余项） | 代入 $x=0$ | 是否为零 |",
            "| ---: | :--- | :--- | :---: |",
        ]
        for step in steps:
            if step.get("error"):
                zero_cell = "—"
                zero_flag = "不可用"
            else:
                zero_cell = f"${step['at_zero_latex']}$"
                zero_flag = "✅ 是" if step["is_zero"] else "否"
            lines.append(
                f"| {step['order']} | ${step['latex']}$ | {zero_cell} | {zero_flag} |"
            )

        lines += ["", "## 观测说明", ""]
        if first_nonzero is None:
            lines.append(
                "1–6 阶展开逐阶代入 $x=0$ 均为 0，极限与零相容。"
            )
        else:
            lines.append(
                f"最早在 **{first_nonzero} 阶** 截断的泰勒展开中，代入 $x=0$ "
                "得到非零值；该值对应极限候选。"
            )
        lines.append(
            "每阶均使用 `sympy.series(..., x, 0, order).removeO()` 去掉大 O 余项后再代入 x=0。"
        )
        lines += [
            "",
            "---",
            "",
            "本报告完全由本地程序生成，未请求任何网络资源。",
            "",
        ]
        return "\n".join(lines)

    def _write_crash_log(self, exc: BaseException) -> Path:
        base = Path(__file__).resolve().parent.parent
        if getattr(sys, "frozen", False):
            base = Path(sys.executable).resolve().parent
        fallback = Path(tempfile.gettempdir()) / "FreeCalculator-crash.log"
        entry = (
            f"\n[{datetime.now().isoformat(timespec='seconds')}] "
            f"{type(exc).__name__}: {exc}\n"
            f"{traceback.format_exc()}\n"
        )
        with self._CRASH_LOCK:
            try:
                path = base / "crash.log"
                with open(path, "a", encoding="utf-8") as handle:
                    handle.write(entry)
                return path
            except OSError:
                try:
                    with open(fallback, "a", encoding="utf-8") as handle:
                        handle.write(entry)
                except OSError:
                    pass
                return fallback


if __name__ == "__main__":
    demo = MathEngine().solve_limit("(tan(x) - sin(x)) / x**3")
    print(demo.get("raw_report", demo))
