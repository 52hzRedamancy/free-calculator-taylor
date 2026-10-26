(function () {
  "use strict";

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
  window.scrollTo(0, 0);

  var form = document.getElementById("calcForm");
  var input = document.getElementById("expression");
  var centerInput = document.getElementById("centerInput");
  var orderSelect = document.getElementById("orderSelect");
  var directionSelect = document.getElementById("directionSelect");
  var skinSelect = document.getElementById("skinSelect");
  var motionSelect = document.getElementById("motionSelect");
  var replayPlotBtn = document.getElementById("replayPlotBtn");
  var observeBtn = document.getElementById("observeBtn");
  var resultSection = document.getElementById("resultSection");
  var limitFormula = document.getElementById("limitFormula");
  var limitLabel = document.getElementById("limitLabel");
  var limitStatus = document.getElementById("limitStatus");
  var limitNote = document.getElementById("limitNote");
  var limitApprox = document.getElementById("limitApprox");
  var limitCard = document.querySelector(".limit-card");
  var resultTime = document.getElementById("resultTime");
  var resultExpression = document.getElementById("resultExpression");
  var resultNormalized = document.getElementById("resultNormalized");
  var resultCenter = document.getElementById("resultCenter");
  var resultEngine = document.getElementById("resultEngine");
  var stepsBody = document.getElementById("stepsBody");
  var centerColLabel = document.getElementById("centerColLabel");
  var stepsCenterText = document.getElementById("stepsCenterText");
  var plotCenterLabel = document.getElementById("plotCenterLabel");
  var plotCanvas = document.getElementById("plotCanvas");
  var plotEmpty = document.getElementById("plotEmpty");
  var reportPreview = document.getElementById("reportPreview");
  var downloadBtn = document.getElementById("downloadBtn");
  var downloadHint = document.getElementById("downloadHint");
  var copyLatexBtn = document.getElementById("copyLatexBtn");
  var copyResultBtn = document.getElementById("copyResultBtn");
  var copyReportBtn = document.getElementById("copyReportBtn");
  var errorBox = document.getElementById("errorBox");
  var errorText = document.getElementById("errorText");
  var apiStatus = document.getElementById("apiStatus");
  var apiStatusText = document.getElementById("apiStatusText");
  var splash = document.getElementById("splash");

  var busy = false;
  var apiReady = false;
  var autoRan = false;
  var userInteracted = false;
  var autoRunTimer = null;
  var pollTimer = null;
  var lastReport = "";
  var lastFilename = "FreeCalculator_Taylor_Report.md";
  var lastLatex = "";
  var lastResultText = "";
  var lastPlot = null;
  var motionMode = localStorage.getItem("freecalc.motion") || "animated";
  var plotAnimationId = 0;
  var plotAnimationStart = 0;
  var splashGone = !splash;
  var plotVisible = false;
  var pendingPlotAnimation = false;
  var plotCard = document.querySelector(".plot-card");

  var SKIN_FILES = {
    maid: "maid_whale.png",
    orca: "orca_whale.png",
    chibi: "chibi_whale.png"
  };

  function applySkin(name) {
    var skin = SKIN_FILES[name] ? name : "maid";
    document.documentElement.dataset.skin = skin;
    document.documentElement.dataset.mascotFile = SKIN_FILES[skin];
    document.documentElement.style.setProperty(
      "--mascot-bg",
      'url("assets/img/' + SKIN_FILES[skin] + '")'
    );
    var splashWhale = document.getElementById("splashWhale");
    if (splashWhale) {
      splashWhale.src = "assets/img/" + SKIN_FILES[skin];
    }
    var hero = document.getElementById("heroMascot");
    if (hero) {
      hero.src = "assets/img/" + SKIN_FILES[skin];
    }
    if (skinSelect) {
      skinSelect.value = skin;
    }
    try {
      localStorage.setItem("freecalc.skin", skin);
    } catch (error) {}
  }

  var LIMIT_KIND_TEXT = {
    converged: "收敛",
    divergent: "发散",
    oscillating: "振荡",
    one_sided: "左右不一致",
    undefined: "未定"
  };

  var LIMIT_KIND_LABEL = {
    converged: "LIMIT FOUND",
    divergent: "DIVERGES",
    oscillating: "NO LIMIT",
    one_sided: "ONE-SIDED",
    undefined: "UNDEFINED"
  };

  var heroMascot = document.getElementById("heroMascot");
  if (heroMascot) {
    var mascotFile = document.documentElement.dataset.mascotFile;
    if (mascotFile) {
      heroMascot.src = "assets/img/" + mascotFile;
    }
  }

  function setApiStatus(state, text) {
    apiStatus.dataset.state = state;
    apiStatusText.textContent = text;
  }

  function showError(message) {
    errorText.textContent = message || "发生了未知错误。";
    errorBox.hidden = false;
    resultSection.hidden = true;
    downloadBtn.style.display = "none";
    copyLatexBtn.style.display = "none";
    copyResultBtn.style.display = "none";
    copyReportBtn.style.display = "none";
    downloadHint.textContent = "报告包含输入、极限结论与完整逐阶推导。";
    lastReport = "";
  }

  function clearError() {
    errorBox.hidden = true;
    errorText.textContent = "";
  }

  function setLoading(loading) {
    busy = loading;
    observeBtn.disabled = loading;
    if (loading) {
      observeBtn.setAttribute("aria-busy", "true");
      observeBtn.textContent = "展开观测中…";
    } else {
      observeBtn.removeAttribute("aria-busy");
      observeBtn.textContent = "观测极限";
    }
  }

  function renderMath(element, latex, displayMode) {
    if (!element) {
      return;
    }
    if (!window.katex) {
      element.textContent = latex || "—";
      return;
    }
    try {
      window.katex.render(latex || "\\text{—}", element, {
        displayMode: Boolean(displayMode),
        throwOnError: false,
        strict: "ignore",
        trust: false
      });
    } catch (error) {
      element.textContent = latex || "—";
    }
  }

  function makeElement(tagName, className, text) {
    var element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (typeof text === "string") {
      element.textContent = text;
    }
    return element;
  }

  function renderSteps(steps) {
    stepsBody.replaceChildren();
    if (!Array.isArray(steps) || steps.length === 0) {
      var emptyRow = document.createElement("tr");
      var emptyCell = document.createElement("td");
      emptyCell.colSpan = 4;
      emptyCell.textContent = "趋近点为无穷时不适用泰勒展开，仅给出极限结论。";
      emptyRow.appendChild(emptyCell);
      stepsBody.appendChild(emptyRow);
      return;
    }

    steps.forEach(function (step, index) {
      var row = document.createElement("tr");
      row.className = "step-row";
      row.style.animationDelay = index * 45 + "ms";

      var orderCell = document.createElement("td");
      orderCell.appendChild(
        makeElement("span", "order-pill", "n=" + String(step.order))
      );
      row.appendChild(orderCell);

      var mathCell = document.createElement("td");
      var math = makeElement("div", "step-math");
      renderMath(math, step.latex, false);
      mathCell.appendChild(math);
      row.appendChild(mathCell);

      var zeroCell = document.createElement("td");
      var atZero = makeElement("span", "step-at-zero");
      if (step.error) {
        atZero.textContent = "—";
      } else {
        renderMath(atZero, step.at_zero_latex, false);
      }
      zeroCell.appendChild(atZero);
      row.appendChild(zeroCell);

      var flagCell = document.createElement("td");
      var badge = makeElement("span", "zero-badge");
      if (step.error) {
        badge.classList.add("na");
        badge.textContent = "不可用";
        badge.title = step.error;
      } else if (step.is_zero === true) {
        badge.classList.add("yes");
        badge.textContent = "✓ 是";
      } else {
        badge.classList.add("no");
        badge.textContent = "否";
      }
      flagCell.appendChild(badge);
      row.appendChild(flagCell);

      stepsBody.appendChild(row);
    });
  }

  function formatLimitStatus(result) {
    var kind = result.limit_kind;
    var text =
      LIMIT_KIND_TEXT[kind] ||
      (result.limit_exists === false ? "未收敛" : "收敛");
    limitStatus.textContent = text;
    limitStatus.classList.toggle("is-warn", kind !== "converged");
    if (limitLabel) {
      limitLabel.textContent = LIMIT_KIND_LABEL[kind] || "LIMIT";
    }
  }

  function buildLimitSentence(result) {
    var expressionLatex = result.expression_latex || "f(x)";
    var valueLatex = result.limit_latex || "\\text{无法确定}";
    var centerLatex = result.center_latex || "0";
    var arrow =
      result.direction === "right" ? "^{+}" : result.direction === "left" ? "^{-}" : "";
    return "\\lim_{x \\to " + centerLatex + arrow + "} " + expressionLatex + " = " + valueLatex;
  }

  function formatTick(value) {
    if (!isFinite(value)) {
      return "";
    }
    if (Math.abs(value) >= 10000 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) {
      return value.toExponential(1);
    }
    var text = value.toFixed(2);
    if (text.indexOf(".") >= 0) {
      text = text.replace(/0+$/, "").replace(/\.$/, "");
    }
    return text === "-0" ? "0" : text;
  }

  function niceStep(range, targetCount) {
    var raw = range / Math.max(1, targetCount);
    if (!isFinite(raw) || raw <= 0) {
      return 1;
    }
    var magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    var normalized = raw / magnitude;
    var step =
      normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return step * magnitude;
  }

  function cssColor(name, fallback) {
    var value = getComputedStyle(document.documentElement).getPropertyValue(name);
    return value && value.trim() ? value.trim() : fallback;
  }

  function drawBreakEffects(ctx, plot, segments, pad, sx, sy, phase, plotH, progress) {
    if (!segments || segments.length < 2) {
      return;
    }
    var reveal = typeof progress === "number" ? progress : 1;
    var yRange = plot.y_max - plot.y_min;
    var lastGx = -Infinity;
    for (var i = 1; i < segments.length; i += 1) {
      var prev = segments[i - 1];
      var next = segments[i];
      if (!prev.length || !next.length) {
        continue;
      }
      var a = prev[prev.length - 1];
      var b = next[0];
      if (Math.abs(b[1] - a[1]) < yRange * 0.35) {
        continue;
      }
      var x = (a[0] + b[0]) / 2;
      if (x < plot.x_min || x > plot.x_max) {
        continue;
      }
      var xRatio = (x - plot.x_min) / (plot.x_max - plot.x_min);
      if (xRatio > reveal) {
        continue;
      }
      var gx = sx(x);
      if (Math.abs(gx - lastGx) < 28) {
        continue;
      }
      lastGx = gx;
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = cssColor("--gold", "#f3ca7c");
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(gx, pad.top);
      ctx.lineTo(gx, pad.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = cssColor("--gold", "#f3ca7c");
      [a, b].forEach(function (point) {
        ctx.beginPath();
        ctx.arc(sx(point[0]), sy(point[1]), 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.font = '10px "Cascadia Code", Consolas, monospace';
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("断点", gx + 6, pad.top + 8);

      if (typeof phase === "number") {
        var pulse = (Math.sin(phase / 150) + 1) / 2;
        ctx.strokeStyle = cssColor("--gold", "#f3ca7c");
        ctx.globalAlpha = 0.85 - pulse * 0.5;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(gx, pad.top + 20, 4 + pulse * 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }

  function startPlotAnimation(plot) {
    plotAnimationStart = performance.now();
    function step(now) {
      var elapsed = now - plotAnimationStart;
      if (elapsed >= 2300) {
        plotAnimationId = 0;
        drawPlot(plot, null);
        return;
      }
      drawPlot(plot, elapsed);
      plotAnimationId = requestAnimationFrame(step);
    }
    plotAnimationId = requestAnimationFrame(step);
  }

  function tryStartPlotAnimation() {
    if (!pendingPlotAnimation || !splashGone || !plotVisible || !lastPlot) {
      return;
    }
    if (motionMode !== "animated") {
      pendingPlotAnimation = false;
      return;
    }
    pendingPlotAnimation = false;
    startPlotAnimation(lastPlot);
  }

  function drawPlot(plot, phase) {
    if (!plotCanvas) {
      return;
    }
    if (typeof phase === "undefined") {
      if (plotAnimationId) {
        cancelAnimationFrame(plotAnimationId);
        plotAnimationId = 0;
      }
    }
    var wrap = plotCanvas.parentElement;
    var width = Math.max(280, Math.round(wrap ? wrap.clientWidth : 640));
    var height = 260;
    var dpr = window.devicePixelRatio || 1;
    plotCanvas.width = Math.round(width * dpr);
    plotCanvas.height = Math.round(height * dpr);
    plotCanvas.style.width = width + "px";
    plotCanvas.style.height = height + "px";

    var ctx = plotCanvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (!plot || !plot.valid || !Array.isArray(plot.points) || !plot.points.length) {
      plotCanvas.style.display = "none";
      plotEmpty.hidden = false;
      return;
    }
    plotCanvas.style.display = "block";
    plotEmpty.hidden = true;

    var pad = { left: 52, right: 18, top: 16, bottom: 30 };
    var plotW = width - pad.left - pad.right;
    var plotH = height - pad.top - pad.bottom;

    function sx(x) {
      return pad.left + ((x - plot.x_min) / (plot.x_max - plot.x_min)) * plotW;
    }
    function sy(y) {
      return pad.top + plotH - ((y - plot.y_min) / (plot.y_max - plot.y_min)) * plotH;
    }

    ctx.font = '11px "Cascadia Code", Consolas, monospace';
    ctx.lineWidth = 1;

    var yStep = niceStep(plot.y_max - plot.y_min, 4);
    var yStart = Math.ceil(plot.y_min / yStep) * yStep;
    var yCount = Math.floor((plot.y_max - yStart) / yStep + 1e-9) + 1;
    ctx.strokeStyle = cssColor("--line", "rgba(103,226,255,0.16)");
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (var yi = 0; yi < yCount; yi += 1) {
      var yValue = yStart + yi * yStep;
      var gy = sy(yValue);
      if (gy < pad.top - 0.5 || gy > pad.top + plotH + 0.5) {
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(pad.left + plotW, gy);
      ctx.stroke();
      ctx.fillStyle = cssColor("--dim", "#54788b");
      ctx.fillText(formatTick(yValue), pad.left - 8, gy);
    }

    var zeroY = sy(0);
    if (zeroY >= pad.top && zeroY <= pad.top + plotH) {
      ctx.strokeStyle = cssColor("--line-strong", "rgba(103,226,255,0.38)");
      ctx.beginPath();
      ctx.moveTo(pad.left, zeroY);
      ctx.lineTo(pad.left + plotW, zeroY);
      ctx.stroke();
    }

    var xStep = niceStep(plot.x_max - plot.x_min, 4);
    var xStart = Math.ceil(plot.x_min / xStep) * xStep;
    var xCount = Math.floor((plot.x_max - xStart) / xStep + 1e-9) + 1;
    ctx.fillStyle = cssColor("--dim", "#54788b");
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (var xi = 0; xi < xCount; xi += 1) {
      var xValue = xStart + xi * xStep;
      var gx = sx(xValue);
      if (gx < pad.left - 0.5 || gx > pad.left + plotW + 0.5) {
        continue;
      }
      ctx.fillText(formatTick(xValue), gx, pad.top + plotH + 8);
    }

    if (
      typeof plot.center_x === "number" &&
      plot.center_x >= plot.x_min &&
      plot.center_x <= plot.x_max
    ) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = cssColor("--gold", "#f3ca7c");
      ctx.beginPath();
      ctx.moveTo(sx(plot.center_x), pad.top);
      ctx.lineTo(sx(plot.center_x), pad.top + plotH);
      ctx.stroke();
      ctx.restore();
    }

    var segments = [];
    var current = [];
    var previous = null;
    var yRange = plot.y_max - plot.y_min;
    plot.points.forEach(function (point) {
      if (previous && Math.abs(point[1] - previous[1]) > yRange * 0.55) {
        if (current.length) {
          segments.push(current);
        }
        current = [];
      }
      current.push(point);
      previous = point;
    });
    if (current.length) {
      segments.push(current);
    }

    var progress = 1;
    if (typeof phase === "number") {
      var t = Math.min(1, Math.max(0, phase / 1500));
      progress = t * t * (3 - 2 * t);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.left, pad.top, plotW, plotH);
    ctx.clip();
    ctx.strokeStyle = cssColor("--cyan", "#5ce9ff");
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    segments.forEach(function (segment) {
      if (segment.length < 2) {
        return;
      }
      var count =
        progress >= 1
          ? segment.length
          : Math.max(2, Math.ceil(segment.length * progress));
      ctx.beginPath();
      for (var i = 0; i < count; i += 1) {
        var point = segment[i];
        var px = sx(point[0]);
        var py = sy(point[1]);
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    });
    ctx.restore();

    if (
      typeof plot.center_x === "number" &&
      plot.center_x >= plot.x_min &&
      plot.center_x <= plot.x_max
    ) {
      ctx.fillStyle = cssColor("--gold", "#f3ca7c");
      ctx.beginPath();
      ctx.arc(sx(plot.center_x), pad.top + plotH / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    drawBreakEffects(
      ctx,
      plot,
      segments,
      pad,
      sx,
      sy,
      typeof phase === "number" ? phase : null,
      plotH,
      progress
    );
  }

  function updateCenterLabels(centerText) {
    var label = "x = " + centerText;
    if (centerColLabel) {
      centerColLabel.textContent = label;
    }
    if (stepsCenterText) {
      stepsCenterText.textContent = label;
    }
    if (plotCenterLabel) {
      plotCenterLabel.textContent = label;
    }
  }

  function replayAnimation(element) {
    if (!element) {
      return;
    }
    element.classList.remove("is-fresh");
    void element.offsetWidth;
    element.classList.add("is-fresh");
  }

  function renderResult(result) {
    var expression = result.expression || input.value.trim();
    var firstNonzero = result.first_nonzero_order;
    var note = result.limit_note || "";
    var centerText = result.center_text || "0";

    if (!note) {
      if (firstNonzero) {
        note =
          "最早在 " +
          firstNonzero +
          " 阶截断展开中出现非零值，极限候选已锁定。";
      } else {
        note = "逐阶展开代入 x = " + centerText + " 均为零，极限与零相容。";
      }
    }

    updateCenterLabels(centerText);
    renderMath(limitFormula, buildLimitSentence(result), true);
    formatLimitStatus(result);
    limitNote.textContent = note;
    limitApprox.textContent = result.limit_approx
      ? "数值近似 ≈ " + result.limit_approx
      : "";
    resultTime.textContent =
      (result.elapsed_ms || 0) + " ms · " + (result.engine || "SymPy");

    resultExpression.textContent = expression;
    resultExpression.title = expression;

    var normalized = result.normalized || "—";
    resultNormalized.textContent = normalized;
    resultNormalized.title = normalized;
    resultCenter.textContent =
      "x → " + centerText + " · " + (result.direction_label || "双侧极限") +
      " · 1–" + (result.max_order || 6) + " 阶";
    resultEngine.textContent = result.engine || "SymPy";

    renderSteps(result.steps);
    reportPreview.textContent = result.raw_report || "";
    lastReport = result.raw_report || "";
    lastFilename = result.report_filename || "FreeCalculator_Taylor_Report.md";
    lastLatex =
      "\\lim_{x \\to " +
      (result.center_latex || "0") +
      "} " +
      (result.expression_latex || "") +
      " = " +
      (result.limit_latex || "");
    lastResultText =
      "lim(x→" +
      centerText +
      ") " +
      expression +
      " = " +
      (result.limit_text || "?") +
      "（" +
      (LIMIT_KIND_TEXT[result.limit_kind] || "未知") +
      "）";

    lastPlot = result.plot || null;
    downloadBtn.style.display = lastReport ? "inline-flex" : "none";
    copyLatexBtn.style.display = lastLatex ? "inline-flex" : "none";
    copyResultBtn.style.display = lastResultText ? "inline-flex" : "none";
    copyReportBtn.style.display = lastReport ? "inline-flex" : "none";
    downloadHint.textContent = "报告包含输入、极限结论与完整逐阶推导。";
    resultSection.hidden = false;
    errorBox.hidden = true;
    replayAnimation(limitCard);
    if (resultSection.classList) {
      replayAnimation(resultSection);
    }
    drawPlot(lastPlot);
    pendingPlotAnimation = motionMode === "animated";
    tryStartPlotAnimation();
  }

  function copyText(text, label) {
    if (!text) {
      showError("当前没有可复制的内容。");
      return;
    }
    function done(ok) {
      if (ok) {
        downloadHint.textContent = "已复制：" + label;
        window.setTimeout(function () {
          downloadHint.textContent = "报告包含输入、极限结论与完整逐阶推导。";
        }, 2600);
      } else {
        downloadHint.textContent = "复制失败，请手动选中文本复制。";
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          done(true);
        },
        function () {
          done(fallbackCopy(text));
        }
      );
      return;
    }
    done(fallbackCopy(text));
  }

  function fallbackCopy(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.left = "-9999px";
    area.style.top = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    var ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  async function runObservation() {
    if (busy) {
      return;
    }
    clearError();

    var expression = input.value.trim();
    if (!expression) {
      showError("请先输入一个关于 x 的表达式。");
      input.focus();
      return;
    }

    if (!window.pywebview || !window.pywebview.api) {
      showError("桌面计算引擎尚未连接。请通过 FreeCalculator.exe 或 python app.py 启动本程序。");
      setApiStatus("error", "桌面桥接未就绪");
      return;
    }

    autoRan = true;
    clearTimeout(autoRunTimer);
    setLoading(true);
    setApiStatus("busy", "正在展开泰勒级数…");

    var center = centerInput.value.trim() || "0";
    var order = orderSelect.value || "6";
    var direction = directionSelect ? directionSelect.value : "auto";

    try {
      var result = await window.pywebview.api.solve_limit(expression, center, order, direction);
      if (!result || typeof result !== "object") {
        throw new Error("计算引擎返回了空结果。");
      }
      if (!result.success) {
        throw new Error(result.error || "计算失败，请检查表达式。");
      }
      renderResult(result);
      setApiStatus("ready", "本地引擎就绪 · 计算完成");
    } catch (error) {
      var message =
        error && error.message ? error.message : String(error || "未知错误");
      showError(message);
      setApiStatus("ready", "本地引擎就绪 · 可继续观测");
    } finally {
      setLoading(false);
    }
  }

  function markApiReady() {
    if (apiReady) {
      return;
    }
    if (!window.pywebview || !window.pywebview.api) {
      return;
    }
    apiReady = true;
    clearInterval(pollTimer);
    pollTimer = null;
    setApiStatus("ready", "本地引擎就绪 · 离线计算");
    autoRunTimer = setTimeout(function autoObserve() {
      if (autoRan || userInteracted || !input.value.trim()) {
        return;
      }
      // 开屏还在时先别算，免得动画在遮罩后面演完
      if (!splashGone) {
        autoRunTimer = setTimeout(autoObserve, 220);
        return;
      }
      runObservation();
    }, 850);
  }

  function pollForApi() {
    var attempts = 0;
    pollTimer = setInterval(function () {
      attempts += 1;
      if (window.pywebview && window.pywebview.api) {
        markApiReady();
      } else if (attempts >= 20) {
        clearInterval(pollTimer);
        pollTimer = null;
        if (!apiReady) {
          setApiStatus("error", "等待桌面桥接（请使用桌面程序启动）");
        }
      }
    }, 500);
  }

  var splashHideTimer = null;

  function hideSplash() {
    if (!splash || splash.dataset.gone === "1") {
      return;
    }
    splash.dataset.gone = "1";
    splashGone = true;
    tryStartPlotAnimation();
    if (splashHideTimer) {
      window.clearTimeout(splashHideTimer);
      splashHideTimer = null;
    }
    splash.classList.add("is-gone");
    window.setTimeout(function () {
      if (splash && splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
    }, 420);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    userInteracted = true;
    runObservation();
  });

  input.addEventListener("input", function () {
    userInteracted = true;
    clearError();
  });

  centerInput.addEventListener("input", function () {
    userInteracted = true;
    clearError();
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      runObservation();
    }
  });

  document.querySelectorAll(".example-chip").forEach(function (button) {
    button.addEventListener("click", function () {
      userInteracted = true;
      autoRan = true;
      input.value = button.dataset.expression || "";
      centerInput.value =
        button.dataset.center !== undefined ? button.dataset.center : "0";
      clearError();
      runObservation();
    });
  });

  downloadBtn.addEventListener("click", function () {
    if (!lastReport) {
      showError("当前没有可下载的推导报告。");
      return;
    }
    try {
      var blob = new Blob(["\ufeff", lastReport], {
        type: "text/markdown;charset=utf-8"
      });
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = lastFilename;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 30000);
      downloadHint.textContent = "已触发下载：" + lastFilename;
    } catch (error) {
      showError("无法生成下载文件：" + error.message);
    }
  });

  copyLatexBtn.addEventListener("click", function () {
    copyText(lastLatex, "LaTeX 公式");
  });

  copyResultBtn.addEventListener("click", function () {
    copyText(lastResultText, "极限结论");
  });

  copyReportBtn.addEventListener("click", function () {
    copyText(lastReport, "Markdown 报告");
  });

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (lastPlot) {
        drawPlot(lastPlot);
      }
    }, 180);
  });

  if (skinSelect) {
    skinSelect.addEventListener("change", function () {
      applySkin(skinSelect.value);
    });
    applySkin(localStorage.getItem("freecalc.skin") || "maid");
  }

  if (motionSelect) {
    motionSelect.value = motionMode === "static" ? "static" : "animated";
    motionSelect.addEventListener("change", function () {
      motionMode = motionSelect.value === "static" ? "static" : "animated";
      try {
        localStorage.setItem("freecalc.motion", motionMode);
      } catch (error) {}
      if (lastPlot) {
        drawPlot(lastPlot);
        pendingPlotAnimation = motionMode === "animated";
        tryStartPlotAnimation();
      }
    });
  }

  if (replayPlotBtn) {
    replayPlotBtn.addEventListener("click", function () {
      if (!lastPlot) {
        return;
      }
      pendingPlotAnimation = false;
      startPlotAnimation(lastPlot);
    });
  }

  if (plotCard && "IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          plotVisible = entry.isIntersecting;
        });
        if (plotVisible) {
          tryStartPlotAnimation();
        }
      },
      { threshold: 0.32 }
    ).observe(plotCard);
  } else {
    plotVisible = true;
  }

  if (heroMascot) {
    heroMascot.addEventListener("click", function () {
      var order = ["maid", "orca", "chibi"];
      var current = document.documentElement.dataset.skin || "maid";
      var index = order.indexOf(current);
      applySkin(order[(index + 1) % order.length]);
    });
  }

  if (splash) {
    splash.addEventListener("click", hideSplash);
    splashHideTimer = window.setTimeout(hideSplash, 2750);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && splash && splash.dataset.gone !== "1") {
      hideSplash();
    }
  });

  window.addEventListener("pywebviewready", markApiReady);
  markApiReady();
  pollForApi();
})();
