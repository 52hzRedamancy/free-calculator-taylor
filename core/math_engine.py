"""泰勒极限观测引擎 v1.3.0。

安全边界：
* 只接受 x、数字、四则运算/幂运算、括号、逗号（仅 log 底数）和固定的初等函数白名单；
* 解析后的自由符号必须只有 x；
* 所有计算在单线程池中执行，5 秒未返回即明确报超时，超时后引擎短暂冷却；
* 任何未预期异常都会追加写入 crash.log，并返回结构化错误。

v1.1.0：
* 趋近点可自定义（任意有限常数，或 ±∞）；
* `log(x, 10)` 形式支持自定义底数；
* 函数白名单扩展：sqrt / abs / asin / acos / atan / sinh / cosh / tanh；
* 支持隐式乘法（2x、2(x+1)、(x+1)(x-1)、2sin(x) 等自动补 `*`）；
* 展开阶数可选 1--10；
* 附带本地采样曲线数据，供前端 canvas 绘制函数图像。
"""

from __future__ import annotations

import math
import os
import re
import sys
import tempfile
import threading
import time
import traceback
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeoutError
from datetime import datetime
from pathlib import Path
from typing import Any

import sympy as sp


def _log(value: Any, base: Any = None) -> Any:
    """log(x) 自然对数；log(x, b) 以 b 为底。"""
    if base is None:
        return sp.log(value)
    return sp.log(value, base)


class MathEngine:
    """暴露给 pywebview 的本地计算 API。"""

    TIMEOUT_SECONDS = 5
    TIMEOUT_COOLDOWN_SECONDS = 2.0
    MAX_INPUT_LENGTH = 300
    MAX_CENTER_LENGTH = 60
    MIN_ORDER = 1
    MAX_ORDER = 10
    DEFAULT_ORDER = 6
    PLOT_SAMPLES = 1201
    PLOT_HALF_SPAN = 2.0
    PLOT_MAX_SPAN = 40.0

    _FUNCTION_NAMES = frozenset(
        {
            "sin",
            "cos",
            "tan",
            "asin",
            "acos",
            "atan",
            "sinh",
            "cosh",
            "tanh",
            "exp",
            "ln",
            "log",
            "sqrt",
            "abs",
        }
    )
    _ALLOWED_IDENTIFIERS = frozenset({"x", "pi", "e"}) | _FUNCTION_NAMES
    _CENTER_IDENTIFIERS = frozenset({"pi", "e"})
    _IDENTIFIER_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
    _CHAR_WHITELIST_RE = re.compile(r"^[0-9A-Za-z+\-*/().,\s]+$")
    _CENTER_CHAR_RE = re.compile(r"^[0-9A-Za-z+\-*/().]+$")
    _NORMALIZE_MAP = str.maketrans(
        {
            "（": "(",
            "）": ")",
            "＋": "+",
            "－": "-",
            "＊": "*",
            "／": "/",
            "，": ",",
            "。": ".",
            "−": "-",
            "×": "*",
            "÷": "/",
            "π": "pi",
            "∞": "oo",
            "\u200b": "",
            "\u200c": "",
            "\u200d": "",
            "\ufeff": "",
        }
    )
    _NUMBER_RE = re.compile(r"\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+")
    _TOKEN_RE = re.compile(
        r"\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+|[A-Za-z_][A-Za-z0-9_]*|[()+\-*/,]"
    )
    _CRASH_LOCK = threading.Lock()
    _EXECUTOR_LOCK = threading.Lock()
    _executor: ThreadPoolExecutor | None = None
    _last_timeout_at = 0.0

    # ------------------------------------------------------------------ API

    def solve_limit(
        self,
        expression: Any,
        center: Any = None,
        max_order: Any = None,
        direction: Any = None,
    ) -> dict[str, Any]:
        """计算表达式在 x -> center 时的极限，并返回 1--max_order 阶泰勒观测结果。"""
        try:
            checked = self._validate(expression)
            if "error" in checked:
                return {"success": False, "error": checked["error"]}

            center_check = self._parse_center(center)
            if "error" in center_check:
                return {"success": False, "error": center_check["error"]}

            order_check = self._parse_order(max_order)
            if "error" in order_check:
                return {"success": False, "error": order_check["error"]}

            direction_check = self._parse_direction(direction)
            if "error" in direction_check:
                return {"success": False, "error": direction_check["error"]}

            cooldown = self._cooldown_remaining()
            if cooldown > 0:
                return {
                    "success": False,
                    "busy": True,
                    "error": (
                        "上一次计算超时后，引擎仍在收尾。"
                        f"请等待约 {cooldown:.1f} 秒再试，或简化表达式。"
                    ),
                }

            executor = self._get_executor()
            future = executor.submit(
                self._analyze,
                checked["expression"],
                center_check["center"],
                order_check["order"],
                checked.get("raw", checked["expression"]),
                direction_check["direction"],
            )
            try:
                return future.result(timeout=self.TIMEOUT_SECONDS)
            except ValueError as exc:
                # 用户输入/表达式问题：直接返回中文提示，不写 crash.log。
                return {"success": False, "error": str(exc)}
            except FutureTimeoutError:
                future.cancel()
                self._mark_timeout()
                return {
                    "success": False,
                    "timeout": True,
                    "error": (
                        f"计算超时：超过 {self.TIMEOUT_SECONDS} 秒仍未完成。"
                        "请降低表达式复杂度后重试。"
                    ),
                }

        except Exception as exc:  # noqa: BLE001 - API 边界必须兜底
            crash_path = self._write_crash_log(exc)
            return {
                "success": False,
                "error": f"计算引擎发生异常：{exc}",
                "crash_log": str(crash_path),
            }

    # ------------------------------------------------------------- validate

    def plot_range(
        self,
        expression: Any,
        center: Any = None,
        x_min: Any = None,
        x_max: Any = None,
    ) -> dict[str, Any]:
        """按区间重采样，套用与极限计算相同的超时/熔断保护。"""
        try:
            cooldown = self._cooldown_remaining()
            if cooldown > 0:
                return {
                    "success": False,
                    "busy": True,
                    "error": (
                        "上一次计算超时后，引擎仍在收尾。"
                        f"请等待约 {cooldown:.1f} 秒再试。"
                    ),
                }
            executor = self._get_executor()
            future = executor.submit(
                self._plot_range_job, expression, center, x_min, x_max
            )
            try:
                return future.result(timeout=self.TIMEOUT_SECONDS)
            except ValueError as exc:
                return {"success": False, "error": str(exc)}
            except FutureTimeoutError:
                future.cancel()
                self._mark_timeout()
                return {
                    "success": False,
                    "timeout": True,
                    "error": (
                        f"区间采样超时：超过 {self.TIMEOUT_SECONDS} 秒仍未完成，"
                        "请缩小范围或简化表达式。"
                    ),
                }
        except Exception as exc:  # noqa: BLE001 - API 边界必须兜底
            crash_path = self._write_crash_log(exc)
            return {
                "success": False,
                "error": f"区间采样发生异常：{exc}",
                "crash_log": str(crash_path),
            }

    def _plot_range_job(
        self,
        expression: Any,
        center: Any = None,
        x_min: Any = None,
        x_max: Any = None,
    ) -> dict[str, Any]:
        """按用户键盘指定的 x 区间重新加密采样，供曲线按区间重播动画。"""
        try:
            checked = self._validate(expression)
            if "error" in checked:
                return {"success": False, "error": checked["error"]}
            center_check = self._parse_center(center)
            if "error" in center_check:
                return {"success": False, "error": center_check["error"]}

            symbol = sp.Symbol("x", real=True)
            local_dict = {
                "x": symbol,
                "sin": sp.sin,
                "cos": sp.cos,
                "tan": sp.tan,
                "asin": sp.asin,
                "acos": sp.acos,
                "atan": sp.atan,
                "sinh": sp.sinh,
                "cosh": sp.cosh,
                "tanh": sp.tanh,
                "exp": sp.exp,
                "ln": sp.log,
                "log": _log,
                "sqrt": sp.sqrt,
                "abs": sp.Abs,
                "pi": sp.pi,
                "e": sp.E,
            }
            global_dict = {
                "__builtins__": {},
                "Symbol": sp.Symbol,
                "Integer": sp.Integer,
                "Float": sp.Float,
                "Rational": sp.Rational,
            }
            parsed = sp.parse_expr(
                checked["expression"],
                local_dict=local_dict,
                global_dict=global_dict,
                evaluate=True,
            )
            if parsed.free_symbols - {symbol}:
                return {"success": False, "error": "区间观察只支持关于 x 的表达式。"}

            if len(str(x_min)) > 32 or len(str(x_max)) > 32:
                return {"success": False, "error": "区间端点过长。"}
            lo = self._parse_range_value(x_min, "左端点")
            hi = self._parse_range_value(x_max, "右端点")
            if lo is None or hi is None:
                return {
                    "success": False,
                    "error": "区间端点需要是数字，例如 -0.5 与 0.5。",
                }
            if hi <= lo:
                return {"success": False, "error": "右端点必须大于左端点。"}
            if hi - lo > self.PLOT_MAX_SPAN:
                return {
                    "success": False,
                    "error": f"区间过宽（上限 {self.PLOT_MAX_SPAN:g}），请缩小观察范围。",
                }

            plot = self._sample_plot(
                parsed, symbol, center_check["center"], x_min=lo, x_max=hi
            )
            if not plot.get("valid"):
                return {"success": True, "plot": plot, "points": 0}
            return {"success": True, "plot": plot, "points": len(plot.get("points", []))}
        except Exception as exc:  # noqa: BLE001 - 区间重采样失败要给出可读提示
            return {"success": False, "error": f"区间采样失败：{exc}"}

    @staticmethod
    def _parse_range_value(value: Any, label: str) -> float | None:
        try:
            raw = str(value).strip().replace("，", ",").replace(" ", "")
            number = float(sp.N(sp.sympify(raw, locals={"pi": sp.pi, "e": sp.E}), 12))
        except Exception:  # noqa: BLE001 - 非法端点由调用方统一提示
            return None
        return number if math.isfinite(number) else None

    def _validate(self, expression: Any) -> dict[str, Any]:
        if not isinstance(expression, str):
            return {"error": "输入必须是字符串表达式。"}

        clean = re.sub(
            r"\s+", " ", unicodedata.normalize("NFKC", expression).translate(self._NORMALIZE_MAP)
        ).strip()
        # 大写标识符统一按小写处理：X → x、SIN(x) → sin(x)
        clean = clean.translate({code: code + 32 for code in range(ord("A"), ord("Z") + 1)})
        if not clean:
            return {"error": "请输入一个关于 x 的表达式。"}
        if len(clean) > self.MAX_INPUT_LENGTH:
            return {"error": f"表达式过长（上限 {self.MAX_INPUT_LENGTH} 字符）。"}
        if not self._CHAR_WHITELIST_RE.fullmatch(clean):
            bad = sorted(
                {ch for ch in clean if not re.fullmatch(r"[0-9A-Za-z+\-*/()., ]", ch)}
            )
            shown = "、".join(f"{repr(ch)} (U+{ord(ch):04X})" for ch in bad)
            return {
                "error": (
                    f"包含不允许的字符：{shown}。仅支持 x、数字、"
                    "+-*/() 与函数调用；中文括号/全角符号会自动转换。"
                )
            }
        if "//" in clean:
            return {"error": "不支持整除运算符 //，请改用 /。"}
        if "***" in clean.replace(" ", ""):
            return {"error": "出现了非法的 ***，乘方请写成 x**2。"}

        identifiers = set(self._IDENTIFIER_RE.findall(clean))
        illegal = sorted(identifiers - self._ALLOWED_IDENTIFIERS)
        if illegal:
            return {
                "error": (
                    "检测到未允许的函数/标识符："
                    + "、".join(f"`{name}`" for name in illegal)
                    + "。允许：sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, "
                    "exp, ln, log, sqrt, abs, pi, e。"
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

        calls = self._check_calls(clean)
        if calls.get("error"):
            return {"error": calls["error"]}

        with_mul = self._insert_implicit_multiplication(clean)
        return {"expression": with_mul, "raw": clean}

    def _check_calls(self, text: str) -> dict[str, Any]:
        """检查函数参数个数：只有 log 支持第二个参数（底数）；逗号不得裸用。"""
        stack: list[list[Any]] = []
        for index, char in enumerate(text):
            if char == "(":
                prefix = text[:index]
                match = re.search(r"([A-Za-z_][A-Za-z0-9_]*)$", prefix)
                name = match.group(1) if match else ""
                stack.append([name, 0])
            elif char == ")":
                if not stack:
                    continue
                name, commas = stack.pop()
                args = commas + 1
                if name in self._FUNCTION_NAMES:
                    if name == "log":
                        if args > 2:
                            return {
                                "error": "log 最多接受 2 个参数：log(x) 或 log(x, 底数)。"
                            }
                    elif args > 1:
                        return {"error": f"函数 {name} 只接受 1 个参数。"}
                elif commas:
                    return {"error": "逗号只能用于 log(x, 底数) 的第二参数。"}
            elif char == ",":
                if not stack:
                    return {"error": "逗号只能用于 log(x, 底数) 的第二参数。"}
                stack[-1][1] += 1
        return {}

    def _insert_implicit_multiplication(self, text: str) -> str:
        """在相邻的值之间补 `*`：2x、2(x+1)、(x+1)(x-1)、2sin(x)、pi x 等。"""
        tokens = self._TOKEN_RE.findall(text)
        out: list[str] = []
        for token in tokens:
            if out:
                prev = out[-1]
                prev_is_value = (
                    prev in {")", "x", "pi", "e"}
                    or prev in self._FUNCTION_NAMES
                    or bool(self._NUMBER_RE.fullmatch(prev))
                )
                cur_starts_value = (
                    token == "("
                    or token in self._ALLOWED_IDENTIFIERS
                    or bool(self._NUMBER_RE.fullmatch(token))
                )
                if prev_is_value and cur_starts_value:
                    if prev in self._FUNCTION_NAMES and token == "(":
                        pass  # 函数调用，不插乘号
                    else:
                        out.append("*")
            out.append(token)
        return "".join(out)

    def _parse_center(self, raw: Any) -> dict[str, Any]:
        text = "0" if raw is None else str(raw)
        clean = re.sub(
            r"\s+", "", unicodedata.normalize("NFKC", text).translate(self._NORMALIZE_MAP)
        )
        if not clean:
            clean = "0"
        if len(clean) > self.MAX_CENTER_LENGTH:
            return {"error": f"趋近点过长（上限 {self.MAX_CENTER_LENGTH} 字符）。"}

        lowered = clean.lower()
        if lowered in {"oo", "+oo", "inf", "+inf", "infinity", "+infinity", "∞", "+∞"}:
            return {"center": sp.oo}
        if lowered in {"-oo", "-inf", "-infinity", "-∞"}:
            return {"center": -sp.oo}

        if not self._CENTER_CHAR_RE.fullmatch(clean):
            return {"error": "趋近点只能是与 x 无关的常数，例如 0、1、pi/2、-3。"}
        identifiers = set(self._IDENTIFIER_RE.findall(clean))
        illegal = sorted(identifiers - self._CENTER_IDENTIFIERS)
        if illegal:
            return {
                "error": "趋近点里出现了不允许的符号："
                + "、".join(f"`{name}`" for name in illegal)
                + "。只允许数字、pi、e 和四则运算。"
            }

        global_dict = {
            "__builtins__": {},
            "Integer": sp.Integer,
            "Float": sp.Float,
            "Rational": sp.Rational,
        }
        try:
            value = sp.parse_expr(
                clean,
                local_dict={"pi": sp.pi, "e": sp.E},
                global_dict=global_dict,
                evaluate=True,
            )
        except Exception:
            return {"error": f"无法解析趋近点 `{clean}`，请写成常数，例如 0、1、pi/2。"}

        if not isinstance(value, sp.Basic):
            return {"error": "趋近点没有解析为有效的数学常数。"}
        if value.free_symbols:
            return {"error": "趋近点里不能包含变量，只接受常数。"}
        try:
            numeric = complex(sp.N(value, 15))
        except Exception:
            numeric = None
        if numeric is None or abs(numeric.imag) > 1e-12:
            return {"error": "趋近点必须是实数。"}
        return {"center": value}

    def _parse_order(self, raw: Any) -> dict[str, Any]:
        if raw is None or raw == "":
            return {"order": self.DEFAULT_ORDER}
        try:
            order = int(float(raw))
        except (TypeError, ValueError):
            return {"error": "阶数必须是整数。"}
        if order < self.MIN_ORDER or order > self.MAX_ORDER:
            return {
                "error": f"阶数范围是 {self.MIN_ORDER}--{self.MAX_ORDER}。"
            }
        return {"order": order}

    def _parse_direction(self, raw: Any) -> dict[str, Any]:
        text = "auto" if raw is None or str(raw).strip() == "" else str(raw).strip().lower()
        aliases = {
            "auto": "auto",
            "both": "both",
            "two-sided": "both",
            "双侧": "both",
            "right": "right",
            "right-sided": "right",
            "右": "right",
            "右极限": "right",
            "left": "left",
            "left-sided": "left",
            "左": "left",
            "左极限": "left",
        }
        if text not in aliases:
            return {"error": "方向只能是 auto、both、right 或 left。"}
        return {"direction": aliases[text]}

    def _is_nonanalytic_at_center(
        self, parsed: sp.Basic, symbol: sp.Symbol, center: sp.Basic
    ) -> bool:
        """判断函数在趋近点是否不是解析函数（如 log/sqrt 在 0 处）。"""
        for node in sp.preorder_traversal(parsed):
            try:
                if node.func == sp.log:
                    if node.args[0].subs(symbol, center) == 0:
                        return True
                elif node.func == sp.sqrt:
                    if node.args[0].subs(symbol, center) == 0:
                        return True
                elif node.func == sp.Pow:
                    base, exp = node.args
                    if (
                        base.subs(symbol, center) == 0
                        and getattr(exp, "is_rational", False)
                        and getattr(exp, "q", 1) != 1
                    ):
                        return True
            except Exception:  # noqa: BLE001 - 单个节点判断失败不影响其它节点
                continue
        return False

    def _limit_direction_symbol(self, direction: str) -> str:
        return {"right": "+", "left": "-"}.get(direction, "both")

    # -------------------------------------------------------------- analyze

    def _analyze(
        self,
        clean: str,
        center: sp.Basic,
        max_order: int,
        raw: str | None = None,
        direction: str = "auto",
    ) -> dict[str, Any]:
        started = time.perf_counter()
        symbol = sp.Symbol("x", real=True)
        local_dict = {
            "x": symbol,
            "sin": sp.sin,
            "cos": sp.cos,
            "tan": sp.tan,
            "asin": sp.asin,
            "acos": sp.acos,
            "atan": sp.atan,
            "sinh": sp.sinh,
            "cosh": sp.cosh,
            "tanh": sp.tanh,
            "exp": sp.exp,
            "ln": sp.log,
            "log": _log,
            "sqrt": sp.sqrt,
            "abs": sp.Abs,
            "pi": sp.pi,
            "e": sp.E,
        }
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
        except Exception as exc:
            raise ValueError(
                "无法解析表达式，请检查括号、函数参数与运算符（乘方用 **，"
                "如 2x 应写作 2*x）。"
            ) from exc

        if not isinstance(parsed, sp.Basic):
            raise ValueError("表达式没有解析为有效的数学对象。")
        free_symbols = parsed.free_symbols
        if free_symbols - {symbol}:
            names = "、".join(sorted(str(item) for item in free_symbols - {symbol}))
            raise ValueError(f"出现未允许的变量：{names}。只允许 x。")

        at_infinity = center in (sp.oo, -sp.oo)
        non_analytic = self._is_nonanalytic_at_center(parsed, symbol, center)
        effective_direction = direction
        if effective_direction == "auto":
            effective_direction = "right" if non_analytic else "both"
        direction_symbol = self._limit_direction_symbol(effective_direction)
        direction_label = {"right": "右极限", "left": "左极限", "both": "双侧极限"}[effective_direction]
        steps: list[dict[str, Any]] = []
        if not at_infinity:
            for order in range(1, max_order + 1):
                try:
                    expansion = sp.series(parsed, symbol, center, order).removeO()
                    at_center = expansion.subs(symbol, center)
                    simplified = sp.simplify(at_center)
                    is_zero = simplified.is_zero is True
                    if at_center.has(sp.nan):
                        is_zero = False
                    steps.append(
                        {
                            "order": order,
                            "latex": sp.latex(expansion),
                            "at_zero_latex": sp.latex(at_center),
                            "at_zero_text": str(at_center),
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

        if effective_direction == "both":
            limit_value = sp.limit(parsed, symbol, center)
        else:
            limit_value = sp.limit(parsed, symbol, center, dir=direction_symbol)
        limit_kind, limit_note = self._classify_limit(limit_value)
        if non_analytic and effective_direction != "both":
            limit_note = (
                f"按{direction_label}计算。函数在 x={center} 附近不是解析函数，"
                "标准双侧极限与泰勒展开不适用。"
            )
        if effective_direction == "both" and not at_infinity:
            right = self._try_directional_limit(parsed, symbol, center, "+")
            left = self._try_directional_limit(parsed, symbol, center, "-")
            if right is not None and left is not None and self._limits_differ(right, left):
                limit_kind = "one_sided"
                limit_note = (
                    f"左右极限不一致：x→{center}⁺ 为 {right}，"
                    f"x→{center}⁻ 为 {left}。双侧极限不存在。"
                )
            elif non_analytic and limit_kind in {"undefined", "divergent"}:
                limit_note = (
                    f"函数在 x={center} 附近不是解析函数；双侧极限不适用，"
                    f"请改用右极限或左极限。"
                )

        limit_approx = ""
        try:
            approx = sp.N(limit_value, 12)
            if approx.is_real and not approx.has(sp.oo, -sp.oo, sp.zoo, sp.nan):
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
        plot = self._sample_plot(parsed, symbol, center)
        break_summary, break_list = self._detect_breaks(parsed, symbol, center, plot)
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        center_text = str(center)
        center_latex = sp.latex(center)
        expression_latex = sp.latex(parsed)
        limit_latex = sp.latex(limit_value)
        display_expression = raw or clean
        filename = self._report_filename(display_expression, center_text)
        raw_report = self._build_report(
            clean=display_expression,
            parsed_latex=expression_latex,
            steps=steps,
            limit_latex=limit_latex,
            limit_text=str(limit_value),
            limit_note=limit_note,
            limit_kind=limit_kind,
            first_nonzero=first_nonzero,
            elapsed_ms=elapsed_ms,
            center_text=center_text,
            center_latex=center_latex,
            max_order=max_order,
            at_infinity=at_infinity,
            direction_label=direction_label,
            non_analytic=non_analytic,
        )

        return {
            "success": True,
            "expression": display_expression,
            "expression_latex": expression_latex,
            "normalized": str(parsed),
            "center_text": center_text,
            "center_latex": center_latex,
            "max_order": max_order,
            "limit_latex": limit_latex,
            "limit_text": str(limit_value),
            "limit_approx": limit_approx,
            "limit_exists": limit_kind == "converged",
            "limit_kind": limit_kind,
            "limit_note": limit_note,
            "direction": effective_direction,
            "direction_label": direction_label,
            "non_analytic": non_analytic,
            "taylor_applicable": not non_analytic,
            "first_nonzero_order": first_nonzero,
            "steps": steps,
            "plot": plot,
            "break_summary": break_summary,
            "break_list": break_list,
            "elapsed_ms": elapsed_ms,
            "raw_report": raw_report,
            "report_filename": filename,
            "engine": f"SymPy {sp.__version__}",
        }

    def _try_directional_limit(
        self,
        parsed: sp.Basic,
        symbol: sp.Symbol,
        center: sp.Basic,
        direction: str,
    ) -> Any:
        try:
            return sp.limit(parsed, symbol, center, dir=direction)
        except Exception:  # noqa: BLE001 - 单侧极限求不出时退化为不可用
            return None

    def _limits_differ(self, right: Any, left: Any) -> bool:
        try:
            if right == left:
                return False
            diff = sp.simplify(right - left)
            return diff.is_zero is not True
        except Exception:  # noqa: BLE001 - 无法比较时保守认为一致
            return False

    def _classify_limit(self, limit_value: Any) -> tuple[str, str]:
        if limit_value.has(sp.AccumBounds):
            return "oscillating", "极限不存在：函数在趋近点附近持续振荡。"
        if limit_value in (sp.oo, -sp.oo, sp.zoo):
            return "divergent", "极限发散到无穷，不存在有限极限。"
        if limit_value.has(sp.nan) or limit_value is sp.nan:
            return "undefined", "极限无定义。"
        if isinstance(limit_value, sp.Limit) or limit_value.has(sp.Limit):
            return "undefined", "SymPy 未能求出该极限的闭式结果。"
        return "converged", ""

    def _sample_plot(
        self,
        parsed: sp.Basic,
        symbol: sp.Symbol,
        center: sp.Basic,
        x_min: float | None = None,
        x_max: float | None = None,
    ) -> dict[str, Any]:
        """在趋近点附近采样，供前端 canvas 绘制曲线。可指定观察区间。"""
        center_x: float | None = None
        try:
            if x_min is not None and x_max is not None:
                if center is not sp.oo and center is not -sp.oo:
                    center_x = float(sp.N(center, 12))
                x_min = float(x_min)
                x_max = float(x_max)
                if not (math.isfinite(x_min) and math.isfinite(x_max) and x_max > x_min):
                    return {"valid": False}
            elif center is sp.oo:
                x_min, x_max = 0.5, 12.0
            elif center is -sp.oo:
                x_min, x_max = -12.0, -0.5
            else:
                center_x = float(sp.N(center, 12))
                if not math.isfinite(center_x):
                    return {"valid": False}
                x_min = center_x - self.PLOT_HALF_SPAN
                x_max = center_x + self.PLOT_HALF_SPAN
        except Exception:
            return {"valid": False}

        try:
            func = sp.lambdify(symbol, parsed, modules=[{"Abs": abs}, "math"])
        except Exception:
            return {"valid": False}

        points: list[list[float]] = []
        span = x_max - x_min
        for index in range(self.PLOT_SAMPLES):
            xv = x_min + span * index / (self.PLOT_SAMPLES - 1)
            try:
                yv = func(xv)
            except Exception:
                continue
            if isinstance(yv, complex):
                continue
            try:
                yv = float(yv)
            except (TypeError, ValueError):
                continue
            if not math.isfinite(yv) or abs(yv) > 1e7:
                continue
            points.append([round(xv, 6), round(yv, 6)])

        if len(points) < 8:
            return {"valid": False, "center_x": center_x}

        ys = sorted(point[1] for point in points)
        lo = ys[max(0, int(len(ys) * 0.02))]
        hi = ys[min(len(ys) - 1, max(0, int(len(ys) * 0.98) - 1))]
        if hi <= lo:
            lo, hi = ys[0], ys[-1]
        if hi - lo < 1e-9:
            lo, hi = lo - 1.0, hi + 1.0
        pad = (hi - lo) * 0.08
        return {
            "valid": True,
            "x_min": round(x_min, 6),
            "x_max": round(x_max, 6),
            "y_min": round(lo - pad, 6),
            "y_max": round(hi + pad, 6),
            "center_x": center_x,
            "points": points,
        }

    # -------------------------------------------------- discontinuity types

    def _numeric_sides(self, func: Any, x0: float) -> dict[str, list[float]] | None:
        """在 x0 两侧各取几档极小步长，收集两侧样本值。"""
        eps = (1e-3, 1e-5, 1e-7)
        sides: dict[str, list[float]] = {"left": [], "right": []}
        for step in eps:
            for key, sign in (("left", -1.0), ("right", 1.0)):
                try:
                    value = func(x0 + sign * step)
                except Exception:  # noqa: BLE001 - 取不到值即视为实数域外
                    return None
                if isinstance(value, complex):
                    return None
                try:
                    number = float(value)
                except (TypeError, ValueError):
                    return None
                if math.isnan(number):
                    return None
                sides[key].append(number)
        return sides

    def _classify_discontinuity(self, func: Any, x0: float) -> str | None:
        """按两侧数值走势判断断点类型；该点连续时返回 None。"""
        sides = self._numeric_sides(func, x0)
        if sides is None:
            return "复数域断点（实数域外）"
        left, right = sides["left"], sides["right"]

        try:
            center_value = float(func(x0))
            defined_center = math.isfinite(center_value)
        except Exception:  # noqa: BLE001 - 中心点无定义
            center_value = 0.0
            defined_center = False
        if defined_center:
            scale_center = max(1.0, abs(center_value))
            if (
                abs(left[-1] - center_value) < 1e-3 * scale_center
                and abs(right[-1] - center_value) < 1e-3 * scale_center
            ):
                return None

        def grows(seq: list[float]) -> bool:
            finite = [abs(value) for value in seq if math.isfinite(value)]
            if len(finite) < len(seq):
                return True
            if not finite:
                return True
            return finite[-1] > 100 * max(1.0, finite[0]) or finite[-1] > 1e6

        if grows(left) or grows(right):
            return "无穷间断点"

        def unstable(seq: list[float]) -> bool:
            high, low = max(seq), min(seq)
            return (high - low) > 0.25 * max(1.0, abs(high), abs(low))

        if unstable(left) or unstable(right):
            return "振荡间断点"

        scale = max(1.0, abs(left[-1]), abs(right[-1]))
        if abs(left[-1] - right[-1]) > 1e-2 * scale:
            return "跳跃间断点"
        return "可去间断点"

    def _refine_break(self, func: Any, xa: float, xb: float) -> float:
        """在 [xa, xb] 内二分逼近幅度最大的位置（用于定位极点）。"""
        lo, hi = min(xa, xb), max(xa, xb)

        def mag(value: float) -> float:
            try:
                number = float(func(value))
            except Exception:  # noqa: BLE001 - 无定义视为无限大
                return float("inf")
            if math.isnan(number):
                return float("inf")
            return abs(number)

        for _ in range(60):
            mid = (lo + hi) / 2.0
            if mid in (lo, hi):
                break
            if mag((lo + mid) / 2.0) > mag((mid + hi) / 2.0):
                hi = mid
            else:
                lo = mid
        return (lo + hi) / 2.0

    @staticmethod
    def _format_x(value: float) -> str:
        text = f"{value:.6g}"
        return "0" if text in {"-0", "-0.0"} else text

    def _detect_breaks(
        self,
        parsed: sp.Basic,
        symbol: sp.Symbol,
        center: sp.Basic,
        plot: dict[str, Any],
    ) -> tuple[str, list[dict[str, str]]]:
        """找出采样中疑似断开的位置并判定类型。"""
        try:
            func = sp.lambdify(symbol, parsed, modules=[{"Abs": abs}, "math"])
        except Exception:  # noqa: BLE001 - 无法数值化时不做断点分析
            return "无法分析", []

        candidates: list[float] = []
        points = plot.get("points") if isinstance(plot, dict) else None
        if points:
            values = [point[1] for point in points]
            span = max(values) - min(values) if values else 0.0
            if span <= 0:
                span = 1.0
            previous = None
            for point in points:
                if previous is not None and abs(point[1] - previous[1]) > span * 0.55:
                    candidates.append(
                        self._refine_break(func, previous[0], point[0])
                    )
                previous = point

        center_x: float | None = None
        try:
            center_number = complex(sp.N(center, 12))
            if abs(center_number.imag) < 1e-12 and math.isfinite(center_number.real):
                center_x = float(center_number.real)
        except Exception:  # noqa: BLE001 - 无穷趋近点不做中心断点分析
            center_x = None

        if center_x is not None:
            try:
                center_value = func(center_x)
                bad_center = not isinstance(center_value, (int, float, complex)) or (
                    isinstance(center_value, complex)
                    or not math.isfinite(float(center_value))
                )
            except Exception:  # noqa: BLE001 - 中心点无定义也算断点候选
                bad_center = True
            if bad_center:
                candidates.insert(0, center_x)

        picked: list[float] = []
        for value in candidates:
            if not math.isfinite(value):
                continue
            if any(
                abs(value - other) < 1e-3 * max(1.0, abs(value), abs(other))
                for other in picked
            ):
                continue
            picked.append(value)
            if len(picked) >= 4:
                break

        breaks: list[dict[str, str]] = []
        for value in picked:
            kind = self._classify_discontinuity(func, value)
            if not kind:
                continue
            breaks.append({"x": self._format_x(value), "type": kind})
        if not breaks:
            return "未检测到断点", []
        summary = "；".join(f"x = {item['x']} · {item['type']}" for item in breaks)
        return summary, breaks

    def _report_filename(self, clean: str, center_text: str) -> str:
        slug = re.sub(r"[^0-9A-Za-z]+", "_", clean).strip("_")[:36]
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if not slug:
            return f"Taylor_Report_{stamp}.md"
        return f"Taylor_{slug}_{stamp}.md"

    # --------------------------------------------------------------- report

    def _build_report(
        self,
        *,
        clean: str,
        parsed_latex: str,
        steps: list[dict[str, Any]],
        limit_latex: str,
        limit_text: str,
        limit_note: str,
        limit_kind: str,
        first_nonzero: int | None,
        elapsed_ms: int,
        center_text: str,
        center_latex: str,
        max_order: int,
        at_infinity: bool,
        direction_label: str = "双侧极限",
        non_analytic: bool = False,
    ) -> str:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        kind_text = {
            "converged": "收敛",
            "divergent": "发散",
            "oscillating": "振荡（极限不存在）",
            "one_sided": "左右极限不一致（双侧极限不存在）",
            "undefined": "未定/无法求值",
        }.get(limit_kind, "未知")
        verdict_text = {
            "converged": "结论：极限存在（收敛）",
            "divergent": "结论：极限发散（不存在有限极限）",
            "oscillating": "结论：极限不存在（振荡）",
            "one_sided": "结论：双侧极限不存在（左右极限不一致）",
            "undefined": "结论：极限未定 / 无法求值",
        }.get(limit_kind, "结论：未知")
        lines = [
            "# 自由计算器 · 泰勒极限推导报告",
            "",
            "> 由 **自由计算器 v1.3.0 / 泰勒极限观测引擎** 在本机离线生成。",
            f"> 计算时间：{now} · 耗时：{elapsed_ms} ms · 引擎：SymPy {sp.__version__}",
            f"> 趋近点：$x \\to {center_latex}$ · {direction_label} · 展开阶数：1–{max_order}",
            "",
            "## 输入",
            "",
            "```text",
            clean,
            "```",
            "",
            "## 极限结论",
            "",
            f"> **{verdict_text}**",
            ">",
            f"> $\\lim_{{x \\to {center_latex}}} {parsed_latex} = {limit_latex}$",
            ">",
            f"> 原始输入：`{clean}` · 精确结果：`{limit_text}`",
            f"> 引擎：SymPy {sp.__version__} · 生成时间：{now}",
            "",
            f"- 状态：{kind_text}",
        ]
        if limit_note:
            lines.append(f"- 说明：{limit_note}")
        lines += [
            "",
            f"## 1–{max_order} 阶{'形式展开（非泰勒）' if non_analytic else '泰勒展开'}观测",
            "",
        ]
        if non_analytic:
            lines.append(
                "函数在趋近点附近不是解析函数，标准泰勒展开不适用；"
                "下表是 SymPy 的形式展开，仅用于观察主导项。"
            )
            lines.append("")
        if at_infinity:
            lines += ["趋近点为无穷，泰勒展开不适用，此处仅给出极限结论。", ""]
        else:
            lines += [
                f"| 阶数 | 展开式（去除余项） | 代入 $x={center_latex}$ | 是否为零 |",
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
        if at_infinity:
            lines.append("该次观测的趋近点为无穷大，仅计算极限，不做局部泰勒展开。")
        elif first_nonzero is None:
            lines.append(
                f"1–{max_order} 阶展开逐阶代入 $x={center_latex}$ 均为 0，极限与零相容。"
            )
        else:
            lines.append(
                f"最早在 **{first_nonzero} 阶** 截断的"
                f"{'形式展开' if non_analytic else '泰勒展开'}中，代入 "
                f"$x={center_latex}$ 得到非零值；该值对应极限候选。"
            )
            if non_analytic:
                lines.append(
                    "注意：该函数在趋近点非解析，不能把这里的截断展开当作严格泰勒级数。"
                )
        lines.append(
            "每阶均使用 `sympy.series(..., x, 趋近点, 阶数).removeO()` 去掉大 O 余项后再代入。"
        )
        lines += [
            "",
            "---",
            "",
            "本报告完全由本地程序生成，未请求任何网络资源。",
            "",
        ]
        return "\n".join(lines)

    # -------------------------------------------------------------- runtime

    @classmethod
    def _get_executor(cls) -> ThreadPoolExecutor:
        with cls._EXECUTOR_LOCK:
            if cls._executor is None:
                cls._executor = ThreadPoolExecutor(
                    max_workers=1, thread_name_prefix="limit-engine"
                )
            return cls._executor

    @classmethod
    def _mark_timeout(cls) -> None:
        """超时后丢弃旧线程池，避免后续请求排在卡死的任务后面。"""
        with cls._EXECUTOR_LOCK:
            old = cls._executor
            cls._last_timeout_at = time.monotonic()
            cls._executor = ThreadPoolExecutor(
                max_workers=1, thread_name_prefix="limit-engine"
            )
        if old is not None:
            old.shutdown(wait=False, cancel_futures=True)

    @classmethod
    def _cooldown_remaining(cls) -> float:
        with cls._EXECUTOR_LOCK:
            if not cls._last_timeout_at:
                return 0.0
            elapsed = time.monotonic() - cls._last_timeout_at
        return max(0.0, cls.TIMEOUT_COOLDOWN_SECONDS - elapsed)

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
