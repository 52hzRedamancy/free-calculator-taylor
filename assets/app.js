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
  var splashSelect = document.getElementById("splashSelect");
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
  var helpBtn = document.getElementById("helpBtn");
  var helpModal = document.getElementById("helpModal");
  var helpGrid = document.getElementById("helpGrid");
  var helpClose = document.getElementById("helpClose");
  var resetZoomBtn = document.getElementById("resetZoomBtn");
  var rangeMin = document.getElementById("rangeMin");
  var rangeMax = document.getElementById("rangeMax");
  var applyRangeBtn = document.getElementById("applyRangeBtn");
  var fullRangeBtn = document.getElementById("fullRangeBtn");
  var rangeError = document.getElementById("rangeError");
  var rangeToggle = document.getElementById("rangeToggle");
  var rangeFields = document.getElementById("rangeFields");
  var funcHint = document.getElementById("funcHint");
  var resultBreak = document.getElementById("resultBreak");
  var modeLimitTab = document.getElementById("modeLimitTab");
  var modeDerivTab = document.getElementById("modeDerivTab");
  var modeIntegralTab = document.getElementById("modeIntegralTab");
  var heroTitle = document.getElementById("heroTitle");
  var heroSubtitle = document.getElementById("heroSubtitle");
  var heroLede = document.getElementById("heroLede");
  var heroBadges = document.getElementById("heroBadges");
  var limitParams = document.getElementById("limitParams");
  var derivativeParams = document.getElementById("derivativeParams");
  var derivativeOrderSelect = document.getElementById("derivativeOrderSelect");
  var integralParams = document.getElementById("integralParams");
  var lowerBoundInput = document.getElementById("lowerBoundInput");
  var upperBoundInput = document.getElementById("upperBoundInput");
  var limitTag = document.getElementById("limitTag");
  var inputTitle = document.getElementById("inputTitle");
  var plotLoading = document.getElementById("plotLoading");
  var plotLoadingText = document.getElementById("plotLoadingText");
  var exprLabel = document.getElementById("exprLabel");
  var resultTitle = document.getElementById("resultTitle");
  var resultKicker = document.getElementById("resultKicker");
  var limitCardEl = document.getElementById("limitCard");
  var stepsCardEl = document.getElementById("stepsCard");
  var derivativeCard = document.getElementById("derivativeCard");
  var derivLabel = document.getElementById("derivLabel");
  var derivStatus = document.getElementById("derivStatus");
  var derivFormula = document.getElementById("derivFormula");
  var derivSlope = document.getElementById("derivSlope");
  var derivY0 = document.getElementById("derivY0");
  var derivOrder = document.getElementById("derivOrder");
  var derivTangent = document.getElementById("derivTangent");
  var derivPointSlope = document.getElementById("derivPointSlope");
  var derivNote = document.getElementById("derivNote");
  var derivExpression = document.getElementById("derivExpression");
  var derivExpressionWrap = document.getElementById("derivExpressionWrap");
  var integralCard = document.getElementById("integralCard");
  var integralLabel = document.getElementById("integralLabel");
  var integralStatus = document.getElementById("integralStatus");
  var integralFormula = document.getElementById("integralFormula");
  var integralAntiderivative = document.getElementById("integralAntiderivative");
  var integralValue = document.getElementById("integralValue");
  var integralMethod = document.getElementById("integralMethod");
  var integralMethodNote = document.getElementById("integralMethodNote");
  var integralMethodText = document.getElementById("integralMethodText");
  var integralNote = document.getElementById("integralNote");
  var plotTip = document.getElementById("plotTip");
  var plotCaption = document.getElementById("plotCaption");
  var plotTitle = document.getElementById("plotTitle");
  var plotZoom = null;
  var fullPlot = null;
  var zoomDrag = null;
  var zoomBox = null;
  var pendingCompletion = "";
  var helpReturnFocus = null;

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
  // 三模式完整版：极限 / 求导 / 积分共享同一套 UI 代码
  var mode = window.FREECALC_MODE === "derivative" ? "derivative" : "limit";
  var derivativeLocked = false;
  var lastDerivative = null;
  var lastIntegral = null;
  var requestSeq = 0; // 快速切换/防连点：只认最后一次有效请求
  var runDebounceTimer = null;
  var plotOverlay = null;
  var precheckTimer = null;
  var lastCenterText = "";
  var modeState = { limit: null, derivative: null, integral: null };

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

  var MODE_LABELS = {
    limit: { working: "展开观测中…", idle: "观测极限", status: "正在展开泰勒级数…" },
    derivative: { working: "求导中…", idle: "计算求导", status: "正在求导并计算切线…" },
    integral: { working: "积分计算中…", idle: "计算积分", status: "正在积分（3 秒内快速失败，超时自动泰勒近似）…" }
  };

  // 顶部 Hero 区随模式切换：标题 / 副标题 / 介绍 / 特性徽章一起换
  var HERO_COPY = {
    limit: {
      title: "极限观测",
      subtitle: "自由计算器 · 泰勒极限引擎",
      lede: "在任意趋近点（含 ±∞）把函数展开成 1–10 阶泰勒级数，逐阶代入看清收敛；断点类型、曲线缩放、键盘指定区间重播一应俱全。所有计算都在你的电脑上完成。",
      badges: ["本地 SymPy", "1–10 阶展开", "断点类型", "曲线缩放"]
    },
    derivative: {
      title: "微分求导",
      subtitle: "自由计算器 · 求导与切线引擎",
      lede: "在任意 x₀ 处求 1–5 阶导数，给出该点斜率与切线方程，并在曲线上直接画出切线；尖点、断点与无穷导数会被当场拦下。所有计算都在你的电脑上完成。",
      badges: ["本地 SymPy", "1–5 阶导数", "切线可视化", "不可导防护"]
    },
    integral: {
      title: "积分计算",
      subtitle: "自由计算器 · 定/不定积分引擎",
      lede: "求不定积分的原函数族，或定积分的数值与面积；积分自带 3 秒快速失败，超时自动降级泰勒近似，区间跨奇点（如 1/x）当场给出发散警告。所有计算都在你的电脑上完成。",
      badges: ["本地 SymPy", "定/不定积分", "泰勒近似降级", "奇点发散拦截"]
    }
  };

  function applyHeroCopy(target) {
    var copy = HERO_COPY[target] || HERO_COPY.limit;
    if (heroTitle) {
      var textNode = heroTitle.firstChild;
      if (textNode && textNode.nodeType === 3) {
        textNode.nodeValue = copy.title;
      }
    }
    if (heroSubtitle) {
      heroSubtitle.textContent = copy.subtitle;
    }
    if (heroLede) {
      heroLede.textContent = copy.lede;
    }
    if (heroBadges) {
      heroBadges.replaceChildren();
      copy.badges.forEach(function (label) {
        var span = document.createElement("span");
        span.appendChild(document.createElement("b"));
        span.appendChild(document.createTextNode(label));
        heroBadges.appendChild(span);
      });
    }
    // 文案切换时来一记轻淡入，避免生硬跳字
    [heroTitle, heroLede].forEach(function (node) {
      if (!node) {
        return;
      }
      node.classList.remove("is-switching");
      void node.offsetWidth;
      node.classList.add("is-switching");
    });
  }

  function setLoading(loading) {
    busy = loading;
    var labels = MODE_LABELS[mode] || MODE_LABELS.limit;
    observeBtn.disabled = loading || (mode === "derivative" && derivativeLocked);
    if (loading) {
      observeBtn.setAttribute("aria-busy", "true");
      observeBtn.textContent = labels.working;
    } else {
      observeBtn.removeAttribute("aria-busy");
      observeBtn.textContent = labels.idle;
    }
    if (plotLoading) {
      plotLoading.hidden = !loading;
      if (plotLoadingText) {
        plotLoadingText.textContent = labels.working;
      }
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

  // ------------------------------------------------- v1.3.0 输入归一化
  var FULLWIDTH_EXTRA = {
    "（": "(",
    "）": ")",
    "【": "(",
    "】": ")",
    "，": ",",
    "。": ".",
    "＋": "+",
    "－": "-",
    "−": "-",
    "—": "-",
    "–": "-",
    "＊": "*",
    "×": "*",
    "／": "/",
    "＝": "=",
    "＾": "**",
    "　": " "
  };

  function normalizeExpression(value) {
    var text = String(value == null ? "" : value);
    // 全角 ASCII → 半角
    text = text.replace(/[\uFF01-\uFF5E]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
    });
    text = text.replace(/[（）【】，。＋－−—–＊×／＝＾　]/g, function (ch) {
      return FULLWIDTH_EXTRA[ch] || ch;
    });
    // 引擎只认小写标识符：X → x，SIN → sin
    text = text.replace(/[A-Z]/g, function (ch) {
      return ch.toLowerCase();
    });
    return text;
  }

  function normalizeField(element) {
    if (!element) {
      return false;
    }
    var before = element.value;
    var after = normalizeExpression(before);
    if (after === before) {
      return false;
    }
    var caret = element.selectionStart;
    element.value = after;
    if (typeof caret === "number" && document.activeElement === element) {
      var shift = after.length - before.length;
      var pos = Math.max(0, Math.min(after.length, caret + shift));
      element.setSelectionRange(pos, pos);
    }
    return true;
  }

  // ------------------------------------------------- 函数手册
  var FUNCTION_MANUAL = [
    { name: "sin", desc: "正弦", call: true },
    { name: "cos", desc: "余弦", call: true },
    { name: "tan", desc: "正切", call: true },
    { name: "asin", desc: "反正弦", call: true },
    { name: "acos", desc: "反余弦", call: true },
    { name: "atan", desc: "反正切", call: true },
    { name: "sinh", desc: "双曲正弦", call: true },
    { name: "cosh", desc: "双曲余弦", call: true },
    { name: "tanh", desc: "双曲正切", call: true },
    { name: "exp", desc: "自然指数 e^x", call: true },
    { name: "ln", desc: "自然对数", call: true },
    { name: "log", desc: "任意底数 log(x, b)", call: true },
    { name: "sqrt", desc: "平方根", call: true },
    { name: "abs", desc: "绝对值", call: true },
    { name: "pi", desc: "圆周率 π", call: false },
    { name: "e", desc: "自然常数 e", call: false }
  ];

  function insertIntoExpression(snippet, caretOffset) {
    if (!input) {
      return;
    }
    var start =
      typeof input.selectionStart === "number" ? input.selectionStart : input.value.length;
    var end = typeof input.selectionEnd === "number" ? input.selectionEnd : start;
    var value = input.value;
    input.value = value.slice(0, start) + snippet + value.slice(end);
    var caret = start + (typeof caretOffset === "number" ? caretOffset : snippet.length);
    input.focus();
    input.setSelectionRange(caret, caret);
    userInteracted = true;
    clearError();
    refreshFuncHint();
  }

  function buildHelpGrid() {
    if (!helpGrid || helpGrid.dataset.built === "1") {
      return;
    }
    helpGrid.dataset.built = "1";
    FUNCTION_MANUAL.forEach(function (item) {
      var chip = document.createElement("button");
      chip.type = "button";
      chip.className = "fn-chip";

      var code = document.createElement("code");
      code.textContent = item.call ? item.name + "()" : item.name;
      var desc = document.createElement("span");
      desc.textContent = item.desc;

      chip.appendChild(code);
      chip.appendChild(desc);
      chip.addEventListener("click", function () {
        var snippet = item.call ? item.name + "()" : item.name;
        var offset = item.call ? item.name.length + 1 : item.name.length;
        closeHelp();
        insertIntoExpression(snippet, offset);
      });
      helpGrid.appendChild(chip);
    });
  }

  function openHelp() {
    if (!helpModal) {
      return;
    }
    buildHelpGrid();
    helpReturnFocus = document.activeElement;
    helpModal.hidden = false;
    if (helpClose) {
      helpClose.focus();
    }
  }

  function closeHelp() {
    if (!helpModal || helpModal.hidden) {
      return;
    }
    helpModal.hidden = true;
    var target = helpReturnFocus && helpReturnFocus.focus ? helpReturnFocus : input;
    helpReturnFocus = null;
    if (target && target.focus) {
      target.focus();
    }
  }

  // ------------------------------------------------- 函数名提示 / Tab 补全
  var FUNC_NAMES = FUNCTION_MANUAL.filter(function (item) {
    return item.call;
  }).map(function (item) {
    return item.name;
  });

  function hideFuncHint() {
    pendingCompletion = "";
    if (funcHint && !funcHint.hidden) {
      funcHint.hidden = true;
      funcHint.textContent = "";
    }
  }

  function refreshFuncHint() {
    if (!funcHint || !input) {
      return;
    }
    var value = input.value;
    var caret = input.selectionStart;
    if (typeof caret !== "number" || caret !== value.length || !caret) {
      hideFuncHint();
      return;
    }
    var match = /(^|[^A-Za-z0-9_.])([A-Za-z]{2,})$/.exec(value.slice(0, caret));
    if (!match) {
      hideFuncHint();
      return;
    }
    var token = match[2].toLowerCase();
    var exact = FUNC_NAMES.indexOf(token) >= 0;
    var suggestion = null;
    if (exact) {
      suggestion = token;
    } else {
      var candidates = FUNC_NAMES.filter(function (name) {
        return name.indexOf(token) === 0;
      });
      suggestion = candidates.length === 1 ? candidates[0] : null;
    }
    if (!suggestion) {
      hideFuncHint();
      return;
    }
    pendingCompletion = suggestion;
    funcHint.hidden = false;
    funcHint.textContent =
      "提示：" +
      suggestion +
      " 需要写成 " +
      suggestion +
      "(x)，按 Tab 自动补全。";
  }

  function completeFuncName() {
    if (!pendingCompletion) {
      return false;
    }
    var name = pendingCompletion;
    var value = input.value;
    var caret = input.selectionStart;
    var head = value.slice(0, caret);
    var match = /([A-Za-z]+)$/.exec(head);
    if (!match) {
      hideFuncHint();
      return false;
    }
    var start = caret - match[1].length;
    var snippet = name + "(x)";
    input.value = value.slice(0, start) + snippet + value.slice(caret);
    var pos = start + snippet.length - 1;
    input.setSelectionRange(pos, pos);
    userInteracted = true;
    hideFuncHint();
    clearError();
    return true;
  }

  // ------------------------------------------------- 曲线缩放（dataZoom）
  var PLOT_HEIGHT = 260;
  var PLOT_PAD = { left: 52, right: 18, top: 16, bottom: 30 };

  function plotWindow(plot) {
    var win = { min: plot.x_min, max: plot.x_max };
    if (!plotZoom) {
      return win;
    }
    var lo = Math.max(plot.x_min, plotZoom.min);
    var hi = Math.min(plot.x_max, plotZoom.max);
    if (hi - lo > (plot.x_max - plot.x_min) * 0.01) {
      win.min = lo;
      win.max = hi;
    }
    return win;
  }

  function plotYWindow(plot, win) {
    var zoomedY = plotZoom ? visibleYBounds(plot.points, win) : null;
    var min = zoomedY ? zoomedY.min : plot.y_min;
    var max = zoomedY ? zoomedY.max : plot.y_max;
    if (!(max > min)) {
      min = plot.y_min;
      max = plot.y_max;
    }
    return { min: min, max: max };
  }

  function visibleYBounds(points, win) {
    var ys = [];
    points.forEach(function (point) {
      if (point[0] >= win.min && point[0] <= win.max) {
        ys.push(point[1]);
      }
    });
    if (ys.length < 2) {
      return null;
    }
    ys.sort(function (a, b) {
      return a - b;
    });
    var lo = ys[Math.max(0, Math.floor(ys.length * 0.02))];
    var hi = ys[Math.min(ys.length - 1, Math.max(0, Math.ceil(ys.length * 0.98) - 1))];
    if (hi <= lo) {
      lo = ys[0];
      hi = ys[ys.length - 1];
    }
    if (hi - lo < 1e-9) {
      lo -= 1;
      hi += 1;
    }
    var pad = (hi - lo) * 0.08;
    return { min: lo - pad, max: hi + pad };
  }

  function plotGeometry() {
    if (!plotCanvas) {
      return null;
    }
    var wrap = plotCanvas.parentElement;
    var width = Math.max(280, Math.round(wrap ? wrap.clientWidth : 640));
    return {
      width: width,
      pad: PLOT_PAD,
      plotW: width - PLOT_PAD.left - PLOT_PAD.right,
      plotH: PLOT_HEIGHT - PLOT_PAD.top - PLOT_PAD.bottom
    };
  }

  function dataXFromPixel(px) {
    var geo = plotGeometry();
    if (!geo || !lastPlot || !lastPlot.valid) {
      return null;
    }
    var win = plotWindow(lastPlot);
    return win.min + ((px - geo.pad.left) / geo.plotW) * (win.max - win.min);
  }

  function showRangeError(message) {
    if (!rangeError) {
      return;
    }
    rangeError.textContent = message;
    rangeError.hidden = false;
  }

  function clearRangeError() {
    if (rangeError && !rangeError.hidden) {
      rangeError.hidden = true;
      rangeError.textContent = "";
    }
  }

  function parseRangeValue(text) {
    var raw = (text || "").trim();
    if (!raw) {
      return null;
    }
    var piMatch = /^([+-]?)(?:pi|π)(?:\/(\d+(?:\.\d+)?))?$/i.exec(raw);
    if (piMatch) {
      var base = (piMatch[1] === "-" ? -Math.PI : Math.PI);
      var divisor = piMatch[2] ? Number(piMatch[2]) : 1;
      return divisor ? base / divisor : null;
    }
    var number = Number(raw);
    return isFinite(number) ? number : null;
  }

  var rangeBusy = false;
  var rangeFailures = [];
  var RANGE_API_TIMEOUT_MS = 10000;
  var RANGE_CIRCUIT_WINDOW_MS = 60000;
  var RANGE_MAX_FAILURES = 3;

  function rangeCircuitOpen() {
    var now = Date.now();
    rangeFailures = rangeFailures.filter(function (stamp) {
      return now - stamp < RANGE_CIRCUIT_WINDOW_MS;
    });
    return rangeFailures.length >= RANGE_MAX_FAILURES;
  }

  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var timer = window.setTimeout(function () {
        reject(new Error(label + "超过 " + Math.round(ms / 1000) + " 秒，已中止。"));
      }, ms);
      promise.then(
        function (value) {
          window.clearTimeout(timer);
          resolve(value);
        },
        function (error) {
          window.clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  function setRangeBusy(busy) {
    rangeBusy = busy;
    [applyRangeBtn, rangeToggle, rangeMin, rangeMax].forEach(function (field) {
      if (field) {
        field.disabled = busy;
      }
    });
    if (applyRangeBtn) {
      applyRangeBtn.textContent = busy ? "采样中…" : "应用";
    }
  }

  // 键盘输入区间 → 后端按该区间加密采样 → 重新播放生长动画
  async function applyPlotRange() {
    if (rangeBusy) {
      return;
    }
    if (!lastPlot || !lastPlot.valid) {
      showRangeError("先完成一次观测，再指定区间。");
      return;
    }
    if (!window.pywebview || !window.pywebview.api) {
      showRangeError("本地引擎尚未连接。");
      return;
    }
    if (rangeCircuitOpen()) {
      showRangeError("区间采样连续失败，已自动暂停 60 秒，请稍后再试。");
      return;
    }
    var lo = parseRangeValue(rangeMin ? rangeMin.value : "");
    var hi = parseRangeValue(rangeMax ? rangeMax.value : "");
    if (lo == null || hi == null) {
      showRangeError("请输入区间端点，例如 -0.5 与 0.5（支持 pi/2）。");
      return;
    }
    if (!(hi > lo)) {
      showRangeError("右端点要大于左端点。");
      return;
    }
    clearRangeError();
    setRangeBusy(true);
    try {
      var result = await callEngine("plot_range", {
        expression: input.value.trim(),
        center: centerInput.value.trim() || "0",
        x_min: lo,
        x_max: hi
      });
      if (!result || !result.success) {
        rangeFailures.push(Date.now());
        showRangeError(
          (result && result.error) || "区间采样失败，请检查表达式与区间。"
        );
        return;
      }
      if (result.plot && result.plot.valid) {
        if (!fullPlot) {
          fullPlot = lastPlot;
        }
        lastPlot = result.plot;
        plotZoom = null;
        if (resetZoomBtn) {
          resetZoomBtn.hidden = true;
        }
        if (fullRangeBtn) {
          fullRangeBtn.hidden = false;
        }
        renderNewFrame(lastPlot);
        if (motionMode === "animated") {
          startPlotAnimation(lastPlot);
        }
      } else {
        lastPlot = result.plot;
        drawPlot(lastPlot);
        showRangeError("该区间内没有有效采样点。");
      }
    } catch (error) {
      rangeFailures.push(Date.now());
      showRangeError(
        "区间采样失败：" + (error && error.message ? error.message : error)
      );
    } finally {
      setRangeBusy(false);
    }
  }

  function restoreFullRange() {
    if (!fullPlot) {
      return;
    }
    lastPlot = fullPlot;
    plotZoom = null;
    if (fullRangeBtn) {
      fullRangeBtn.hidden = true;
    }
    if (resetZoomBtn) {
      resetZoomBtn.hidden = true;
    }
    clearRangeError();
    renderNewFrame(lastPlot);
    if (motionMode === "animated") {
      startPlotAnimation(lastPlot);
    }
  }

  function resetPlotZoom() {
    if (!plotZoom) {
      return;
    }
    plotZoom = null;
    if (resetZoomBtn) {
      resetZoomBtn.hidden = true;
    }
    if (zoomBox) {
      zoomBox.hidden = true;
    }
    drawPlot(lastPlot);
  }

  function ensureZoomBox() {
    if (zoomBox || !plotCanvas) {
      return zoomBox;
    }
    var wrap = plotCanvas.parentElement;
    if (!wrap) {
      return null;
    }
    zoomBox = document.createElement("div");
    zoomBox.className = "plot-zoom-box";
    zoomBox.hidden = true;
    wrap.appendChild(zoomBox);
    return zoomBox;
  }

  function drawBreakEffects(ctx, win, segments, pad, sx, sy, phase, plotH, progress, yRange) {
    if (!segments || segments.length < 2) {
      return;
    }
    var reveal = typeof progress === "number" ? progress : 1;
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
      if (x < win.min || x > win.max) {
        continue;
      }
      var xRatio = (x - win.min) / (win.max - win.min);
      if (xRatio > reveal) {
        continue;
      }
      var gx = sx(x);
      if (Math.abs(gx - lastGx) < 28) {
        continue;
      }
      lastGx = gx;
      var dangerColor = cssColor("--danger", "#ff4d6d");
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = dangerColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(gx, pad.top);
      ctx.lineTo(gx, pad.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = dangerColor;
      [a, b].forEach(function (point) {
        ctx.beginPath();
        ctx.arc(sx(point[0]), sy(point[1]), 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.font = '10px "Cascadia Code", Consolas, monospace';
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("断点", gx + 6, pad.top + 8);

      // 渐近线/断点处的红色动态脉冲点
      var pulse =
        typeof phase === "number" ? (Math.sin(phase / 130) + 1) / 2 : 0.35;
      var pulseY = pad.top + plotH / 2;
      ctx.strokeStyle = dangerColor;
      ctx.globalAlpha = 0.85 - pulse * 0.55;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(gx, pulseY, 4 + pulse * 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.55 + pulse * 0.45;
      ctx.fillStyle = dangerColor;
      ctx.beginPath();
      ctx.arc(gx, pulseY, 3 + pulse * 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  function startPlotAnimation(plot) {
    plotAnimationStart = performance.now();
    function step(now) {
      var elapsed = now - plotAnimationStart;
      if (elapsed >= 2400) {
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

  // v1.5.0 平滑过渡：500ms 旧帧 → 新帧交叉淡入。
  // 图表实例全局单例（#plotCanvas 只 init 一次），切换数据只用
  // clear + 重绘 + setOption 语义，绝不 dispose 重建。
  var FADE_MS = 500;
  var fadeRafId = 0;

  function renderNewFrame(plot) {
    if (!plotCanvas || !plot || !plot.valid) {
      drawPlot(plot, null);
      return;
    }
    if (motionMode === "animated") {
      // 动态模式沿用 2400ms 生长动画（整帧绘制后由调用方启动重播）
      drawPlot(plot, null);
      return;
    }
    if (fadeRafId) {
      cancelAnimationFrame(fadeRafId);
      fadeRafId = 0;
    }
    var snapshot = document.createElement("canvas");
    snapshot.width = plotCanvas.width;
    snapshot.height = plotCanvas.height;
    var sctx = snapshot.getContext("2d");
    if (!sctx) {
      drawPlot(plot, null);
      return;
    }
    sctx.drawImage(plotCanvas, 0, 0);
    var startedAt = performance.now();
    function step(now) {
      var t = Math.min(1, (now - startedAt) / FADE_MS);
      var eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      var ctx = plotCanvas.getContext("2d");
      if (!ctx) {
        return;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
      ctx.drawImage(snapshot, 0, 0);
      drawPlot(plot, null, eased);
      if (t < 1) {
        fadeRafId = requestAnimationFrame(step);
      } else {
        fadeRafId = 0;
        drawPlot(plot, null);
      }
    }
    fadeRafId = requestAnimationFrame(step);
  }

  // v1.5.0 积分可视化：定积分面积填充（曲线与 x 轴之间的半透明蓝色）
  function drawAreaFill(ctx, area, win, pad, sx, sy, plotH) {
    if (!area || !Array.isArray(area.points) || area.points.length < 2) {
      return;
    }
    var baseline = sy(0);
    var clippedBaseline = Math.max(pad.top, Math.min(pad.top + plotH, baseline));
    var fillColor = cssColor("--area", "rgba(84, 176, 255, 0.26)");
    var lineColor = cssColor("--area-line", "rgba(116, 199, 255, 0.85)");

    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 4]);
    var ax = sx(area.a);
    var bx = sx(area.b);
    ctx.beginPath();
    ctx.moveTo(ax, pad.top);
    ctx.lineTo(ax, pad.top + plotH);
    ctx.moveTo(bx, pad.top);
    ctx.lineTo(bx, pad.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(ax, clippedBaseline);
    area.points.forEach(function (point) {
      var gy = sy(point[1]);
      if (!isFinite(gy)) {
        gy = point[1] >= 0 ? pad.top : pad.top + plotH;
      }
      ctx.lineTo(
        sx(point[0]),
        Math.max(pad.top - 60, Math.min(pad.top + plotH + 60, gy))
      );
    });
    ctx.lineTo(bx, clippedBaseline);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  }

  // v1.5.0 对比曲线：任意采样点集画成虚线（导数曲线 / 泰勒近似）
  function drawDashedCurve(ctx, points, sx, sy, yRange, stroke) {
    if (!Array.isArray(points) || points.length < 2) {
      return;
    }
    var segments = [];
    var current = [];
    var previous = null;
    points.forEach(function (point) {
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
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 5]);
    segments.forEach(function (segment) {
      if (segment.length < 2) {
        return;
      }
      ctx.beginPath();
      for (var i = 0; i < segment.length; i += 1) {
        var gx = sx(segment[i][0]);
        var gy = sy(segment[i][1]);
        if (i === 0) {
          ctx.moveTo(gx, gy);
        } else {
          ctx.lineTo(gx, gy);
        }
      }
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();
  }

  // v1.5.0 不定积分：原函数族 F(x)+C 虚线（与主曲线相同的断点切分）
  function drawFamilyCurves(ctx, family, win, pad, sx, sy, plotH, yRange) {
    family.forEach(function (member) {
      drawDashedCurve(ctx, member.points, sx, sy, yRange, "rgba(125, 255, 203, 0.48)");
    });
  }

  function drawPlot(plot, phase, layerAlpha) {
    if (!plotCanvas) {
      return;
    }
    var fading = typeof layerAlpha === "number" && layerAlpha < 1;
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
    if (!fading) {
      plotCanvas.width = Math.round(width * dpr);
      plotCanvas.height = Math.round(height * dpr);
      plotCanvas.style.width = width + "px";
      plotCanvas.style.height = height + "px";
    }

    var ctx = plotCanvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!fading) {
      ctx.clearRect(0, 0, width, height);
    }

    if (!plot || !plot.valid || !Array.isArray(plot.points) || !plot.points.length) {
      if (!fading) {
        plotCanvas.style.display = "none";
        plotEmpty.textContent =
          "⚠️ 在实数域内无有效采样点（函数可能包含复数或无定义）";
        plotEmpty.hidden = false;
      }
      return;
    }
    plotCanvas.style.display = "block";
    plotEmpty.hidden = true;

    if (fading) {
      ctx.save();
      ctx.globalAlpha = layerAlpha;
    }

    var pad = { left: 52, right: 18, top: 16, bottom: 30 };
    var plotW = width - pad.left - pad.right;
    var plotH = height - pad.top - pad.bottom;

    // 缩放窗口：plotZoom 为空时用后端给的完整采样范围
    var win = plotWindow(plot);
    var yWindow = plotYWindow(plot, win);
    var vyMin = yWindow.min;
    var vyMax = yWindow.max;
    var visible = plot.points.filter(function (point) {
      return point[0] >= win.min && point[0] <= win.max;
    });
    if (visible.length < 2) {
      visible = plot.points;
      win = { min: plot.x_min, max: plot.x_max };
    }

    function sx(x) {
      return pad.left + ((x - win.min) / (win.max - win.min)) * plotW;
    }
    function sy(y) {
      return pad.top + plotH - ((y - vyMin) / (vyMax - vyMin)) * plotH;
    }

    ctx.font = '11px "Cascadia Code", Consolas, monospace';
    ctx.lineWidth = 1;

    var yStep = niceStep(vyMax - vyMin, 4);
    var yStart = Math.ceil(vyMin / yStep) * yStep;
    var yCount = Math.floor((vyMax - yStart) / yStep + 1e-9) + 1;
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

    var xStep = niceStep(win.max - win.min, 4);
    var xStart = Math.ceil(win.min / xStep) * xStep;
    var xCount = Math.floor((win.max - xStart) / xStep + 1e-9) + 1;
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
      plot.center_x >= win.min &&
      plot.center_x <= win.max
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
    var yRange = vyMax - vyMin;
    visible.forEach(function (point) {
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
    var animating = typeof phase === "number";
    if (animating) {
      var t = Math.min(1, Math.max(0, phase / 2000));
      // easeInOutCubic：起收都放慢，生长不再生硬
      progress = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.left, pad.top, plotW, plotH);
    ctx.clip();

    // v1.5.0 积分可视化：面积填充与原函数族（都在曲线下层绘制）
    if (plot.area) {
      drawAreaFill(ctx, plot.area, win, pad, sx, sy, plotH);
    }
    if (plot.family && plot.family.length) {
      drawFamilyCurves(ctx, plot.family, win, pad, sx, sy, plotH, yRange);
    }
    // v1.5.0 对比曲线：泰勒近似（金）与导数函数（绿），与原函数同图对比
    if (plot.taylor_points) {
      drawDashedCurve(ctx, plot.taylor_points, sx, sy, yRange, "rgba(243, 202, 124, 0.8)");
    }
    if (plot.derivative_points) {
      drawDashedCurve(ctx, plot.derivative_points, sx, sy, yRange, "rgba(125, 255, 203, 0.72)");
    }

    // 导轨：先铺整条低亮度轨迹，让曲线有"跑道"可循
    if (animating) {
      ctx.strokeStyle = cssColor("--cyan", "#5ce9ff");
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 1.1;
      ctx.lineJoin = "round";
      segments.forEach(function (segment) {
        if (segment.length < 2) {
          return;
        }
        ctx.beginPath();
        for (var i = 0; i < segment.length; i += 1) {
          var rx = sx(segment[i][0]);
          var ry = sy(segment[i][1]);
          if (i === 0) {
            ctx.moveTo(rx, ry);
          } else {
            ctx.lineTo(rx, ry);
          }
        }
        ctx.stroke();
      });
      ctx.globalAlpha = fading ? layerAlpha : 1;
    }

    // 高亮段：沿导轨从左到右生长
    var head = null;
    ctx.strokeStyle = cssColor("--cyan", "#5ce9ff");
    ctx.lineWidth = 1.8;
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
      if (count > 1) {
        head = segment[count - 1];
      }
    });

    // 导轨头：跟随生长的柔和光点，收尾渐隐
    if (head && animating) {
      var hx = sx(head[0]);
      var hy = sy(head[1]);
      var fade = progress >= 1 ? 0 : Math.min(1, progress * 6);
      var glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 15);
      glow.addColorStop(0, "rgba(130, 246, 255, " + 0.85 * fade + ")");
      glow.addColorStop(0.45, "rgba(92, 233, 255, " + 0.3 * fade + ")");
      glow.addColorStop(1, "rgba(92, 233, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(hx, hy, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(238, 253, 255, " + fade + ")";
      ctx.beginPath();
      ctx.arc(hx, hy, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (
      typeof plot.center_x === "number" &&
      plot.center_x >= win.min &&
      plot.center_x <= win.max
    ) {
      ctx.fillStyle = cssColor("--gold", "#f3ca7c");
      ctx.beginPath();
      ctx.arc(sx(plot.center_x), pad.top + plotH / 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    drawBreakEffects(
      ctx,
      win,
      segments,
      pad,
      sx,
      sy,
      typeof phase === "number" ? phase : null,
      plotH,
      progress,
      yRange
    );

    drawDerivativeOverlay(ctx, plotOverlay, win, pad, sx, sy, plotW, plotH);

    if (fading) {
      ctx.restore();
    }
  }

  function drawDerivativeOverlay(ctx, overlay, win, pad, sx, sy, plotW, plotH) {
    if (!overlay || typeof overlay.x0 !== "number") {
      return;
    }
    var x0 = overlay.x0;
    if (x0 < win.min || x0 > win.max) {
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.left, pad.top, plotW, plotH);
    ctx.clip();
    if (
      overlay.kind === "tangent" &&
      typeof overlay.k === "number" &&
      typeof overlay.y0 === "number" &&
      isFinite(overlay.k) &&
      isFinite(overlay.y0)
    ) {
      var span = 2;
      var xa = Math.max(win.min, x0 - span);
      var xb = Math.min(win.max, x0 + span);
      ctx.strokeStyle = cssColor("--rose", "#ff6f9c");
      ctx.lineWidth = 1.8;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(sx(xa), sy(overlay.y0 + overlay.k * (xa - x0)));
      ctx.lineTo(sx(xb), sy(overlay.y0 + overlay.k * (xb - x0)));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      var px = sx(x0);
      var py = sy(overlay.y0);
      var glow = ctx.createRadialGradient(px, py, 0, px, py, 17);
      glow.addColorStop(0, "rgba(255, 77, 109, 0.55)");
      glow.addColorStop(1, "rgba(255, 77, 109, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ff4d6d";
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 199, 216, 0.95)";
      ctx.font = '11px "Cascadia Code", Consolas, monospace';
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("k = " + formatTick(overlay.k), px + 10, py - 8);
      return;
    }

    // 不可导 / 无定义：黄色高亮散点 + 竖虚线
    ctx.strokeStyle = "rgba(255, 210, 77, 0.5)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(sx(x0), pad.top);
    ctx.lineTo(sx(x0), pad.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    var mx = sx(x0);
    var my =
      typeof overlay.y0 === "number" ? sy(overlay.y0) : pad.top + plotH / 2;
    var halo = ctx.createRadialGradient(mx, my, 0, mx, my, 19);
    halo.addColorStop(0, "rgba(255, 210, 77, 0.5)");
    halo.addColorStop(1, "rgba(255, 210, 77, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(mx, my, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 179, 0, 0.9)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(mx, my, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffd24d";
    ctx.beginPath();
    ctx.arc(mx, my, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffb300";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(mx - 4, my - 4);
    ctx.lineTo(mx + 4, my + 4);
    ctx.moveTo(mx + 4, my - 4);
    ctx.lineTo(mx - 4, my + 4);
    ctx.stroke();
  }

  function overlayMarkerPixel() {
    if (!plotOverlay || !lastPlot || !lastPlot.valid) {
      return null;
    }
    var geo = plotGeometry();
    if (!geo) {
      return null;
    }
    var win = plotWindow(lastPlot);
    var x0 = plotOverlay.x0;
    if (typeof x0 !== "number" || x0 < win.min || x0 > win.max) {
      return null;
    }
    var px = geo.pad.left + ((x0 - win.min) / (win.max - win.min)) * geo.plotW;
    var py;
    if (typeof plotOverlay.y0 === "number") {
      var yWindow = plotYWindow(lastPlot, win);
      var ratio = (plotOverlay.y0 - yWindow.min) / (yWindow.max - yWindow.min);
      py = geo.pad.top + geo.plotH - ratio * geo.plotH;
    } else {
      py = geo.pad.top + geo.plotH / 2;
    }
    return { x: px, y: py };
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
    if (resultBreak) {
      var breaks = result.break_summary || "未检测到断点";
      resultBreak.textContent = breaks;
      resultBreak.title = breaks;
    }
    if (plotCaption) {
      plotCaption.textContent =
        "实线 f(x) · 金色虚线 = " +
        (result.max_order || 6) +
        " 阶泰勒近似 · 本地采样";
      plotCaption.dataset.mode = "limit";
      plotCenterLabel = null;
    }

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
    fullPlot = lastPlot;
    if (fullRangeBtn) {
      fullRangeBtn.hidden = true;
    }
    clearRangeError();
    plotZoom = null;
    if (resetZoomBtn) {
      resetZoomBtn.hidden = true;
    }
    if (zoomBox) {
      zoomBox.hidden = true;
    }
    downloadBtn.style.display = lastReport ? "inline-flex" : "none";
    copyLatexBtn.style.display = lastLatex ? "inline-flex" : "none";
    copyResultBtn.style.display = lastResultText ? "inline-flex" : "none";
    copyReportBtn.style.display = lastReport ? "inline-flex" : "none";
    downloadHint.textContent = "报告包含输入、极限结论与完整逐阶推导。";
    plotOverlay = null;
    lastDerivative = null;
    lastIntegral = null;
    derivativeLocked = false;
    if (plotTip) {
      plotTip.hidden = true;
    }
    if (limitCardEl) {
      limitCardEl.hidden = false;
    }
    if (stepsCardEl) {
      stepsCardEl.hidden = false;
    }
    if (derivativeCard) {
      derivativeCard.hidden = true;
    }
    if (integralCard) {
      integralCard.hidden = true;
    }
    resultSection.hidden = false;
    errorBox.hidden = true;
    replayAnimation(limitCard);
    if (resultSection.classList) {
      replayAnimation(resultSection);
    }
    lastCenterText = centerText;
    saveModeState("limit");
    renderNewFrame(lastPlot);
    pendingPlotAnimation = motionMode === "animated";
    tryStartPlotAnimation();
  }

  // ------------------------------------------------- v1.4.0 求导模式

  function showResultCardsForMode(target) {
    var isDeriv = target === "derivative";
    var isInt = target === "integral";
    if (limitCardEl) {
      limitCardEl.hidden = isDeriv || isInt;
    }
    if (stepsCardEl) {
      stepsCardEl.hidden = isDeriv || isInt;
    }
    if (derivativeCard) {
      derivativeCard.hidden = !(isDeriv && lastDerivative);
    }
    if (integralCard) {
      integralCard.hidden = !(isInt && lastIntegral);
    }
  }

  function lockDerivative() {
    derivativeLocked = true;
    if (observeBtn) {
      observeBtn.disabled = true;
    }
  }

  function unlockDerivative() {
    derivativeLocked = false;
    if (observeBtn && !busy) {
      observeBtn.disabled = false;
    }
    if (apiStatus && apiStatus.dataset.state === "warn") {
      setApiStatus("ready", "本地引擎就绪 · 可继续求导");
    }
  }

  function showBanner(message) {
    if (!errorBox || !errorText) {
      return;
    }
    errorText.textContent = message || "";
    errorBox.hidden = false;
  }

  function setPlotCaption(target) {
    if (!plotCaption) {
      return;
    }
    if (target === "derivative") {
      plotCaption.textContent =
        "红色虚线为切线 · 红点为切点 · 黄点为不可导点";
      plotCaption.dataset.mode = "derivative";
      plotCenterLabel = null;
    } else if (target === "integral") {
      plotCaption.textContent =
        "蓝色填充 = 定积分面积 · 蓝色虚线 = 上下限 · 虚线 = 原函数族 F(x)+C";
      plotCaption.dataset.mode = "integral";
      plotCenterLabel = null;
    } else if (plotCaption.dataset.mode !== "limit") {
      plotCaption.innerHTML =
        '灰色虚线为 <span class="inline-math" id="plotCenterLabel">x = 0</span> · 本地采样';
      plotCaption.dataset.mode = "limit";
      plotCenterLabel = document.getElementById("plotCenterLabel");
    }
  }

  function applyModeUI(target) {
    unlockDerivative();
    clearError();
    hideFuncHint();
    [
      ["limit", modeLimitTab],
      ["derivative", modeDerivTab],
      ["integral", modeIntegralTab]
    ].forEach(function (pair) {
      var tab = pair[1];
      if (!tab) {
        return;
      }
      var active = target === pair[0];
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (limitParams) {
      limitParams.hidden = target !== "limit";
    }
    if (derivativeParams) {
      derivativeParams.hidden = target !== "derivative";
    }
    if (integralParams) {
      integralParams.hidden = target !== "integral";
    }
    if (centerInput) {
      centerInput.hidden = target === "integral";
    }
    if (limitTag) {
      if (target === "derivative") {
        limitTag.innerHTML = "f′<small>x₀</small>";
      } else if (target === "integral") {
        limitTag.innerHTML = "∫<small>dx</small>";
      } else {
        limitTag.innerHTML = "lim<small>x₀</small>";
      }
    }
    var labelText = {
      limit: "关于 x 的表达式与趋近点",
      derivative: "关于 x 的表达式与求导点",
      integral: "被积函数（关于 x）"
    }[target];
    if (exprLabel) {
      var textNode = exprLabel.firstChild;
      if (textNode && textNode.nodeType === 3) {
        textNode.nodeValue = "\n          " + labelText + "\n          ";
      }
    }
    if (inputTitle) {
      inputTitle.textContent = {
        limit: "输入待观测函数",
        derivative: "输入待求导函数",
        integral: "输入被积函数"
      }[target];
    }
    if (observeBtn && !busy) {
      observeBtn.textContent = (MODE_LABELS[target] || MODE_LABELS.limit).idle;
    }
    if (resultTitle) {
      resultTitle.textContent = {
        limit: "观测结果",
        derivative: "求导结果",
        integral: "积分结果"
      }[target];
    }
    if (resultKicker) {
      resultKicker.textContent = {
        limit: "02 / OBSERVATION",
        derivative: "02 / DERIVATIVE",
        integral: "02 / INTEGRAL"
      }[target];
    }
    if (plotTitle) {
      plotTitle.textContent = {
        limit: "趋近点附近的函数曲线",
        derivative: "原函数与导数曲线对比",
        integral: "积分区间内的函数曲线"
      }[target];
    }
    setPlotCaption(target);
    applyHeroCopy(target);
    setApiStatus(
      "ready",
      {
        limit: "本地引擎就绪 · 可继续观测",
        derivative: "本地引擎就绪 · 可计算导数",
        integral: "本地引擎就绪 · 可计算积分"
      }[target]
    );
    updateDerivativePrecheck();
    updateIntegralPrecheck();
  }

  // 每个模式各存一份「结果卡片 + 图表 + 报告」快照：
  // 切换 Tab 时上下一起还原，绝不出现「上卡片是 A、下图表还是 B」的错位。
  function saveModeState(target) {
    modeState[target] = {
      plot: lastPlot,
      fullPlot: fullPlot,
      plotZoom: plotZoom,
      overlay: plotOverlay,
      report: lastReport,
      filename: lastFilename,
      latex: lastLatex,
      resultText: lastResultText,
      centerText: lastCenterText,
      hint: downloadHint ? downloadHint.textContent : "",
      caption: plotCaption ? plotCaption.textContent : "",
      zoomHidden: !resetZoomBtn || resetZoomBtn.hidden,
      fullRangeHidden: !fullRangeBtn || fullRangeBtn.hidden
    };
  }

  function restoreModeState(target) {
    var state = modeState[target];
    clearError();
    if (!state) {
      lastPlot = null;
      fullPlot = null;
      plotZoom = null;
      plotOverlay = null;
      lastReport = "";
      lastLatex = "";
      lastResultText = "";
      lastCenterText = "";
      if (reportPreview) {
        reportPreview.textContent = "";
      }
      downloadBtn.style.display = "none";
      copyLatexBtn.style.display = "none";
      copyResultBtn.style.display = "none";
      copyReportBtn.style.display = "none";
      if (resetZoomBtn) {
        resetZoomBtn.hidden = true;
      }
      if (fullRangeBtn) {
        fullRangeBtn.hidden = true;
      }
      if (zoomBox) {
        zoomBox.hidden = true;
      }
      if (plotTip) {
        plotTip.hidden = true;
      }
      if (plotCanvas) {
        plotCanvas.style.display = "none";
        var emptyCtx = plotCanvas.getContext("2d");
        if (emptyCtx) {
          emptyCtx.setTransform(1, 0, 0, 1, 0, 0);
          emptyCtx.clearRect(0, 0, plotCanvas.width, plotCanvas.height);
        }
      }
      if (plotEmpty) {
        plotEmpty.hidden = true;
      }
      resultSection.hidden = true;
      return;
    }
    lastPlot = state.plot;
    fullPlot = state.fullPlot;
    plotZoom = state.plotZoom;
    plotOverlay = state.overlay;
    lastReport = state.report;
    lastFilename = state.filename || "FreeCalculator_Report.md";
    lastLatex = state.latex;
    lastResultText = state.resultText;
    lastCenterText = state.centerText || "";
    if (reportPreview) {
      reportPreview.textContent = lastReport;
    }
    downloadBtn.style.display = lastReport ? "inline-flex" : "none";
    copyLatexBtn.style.display = lastLatex ? "inline-flex" : "none";
    copyResultBtn.style.display = lastResultText ? "inline-flex" : "none";
    copyReportBtn.style.display = lastReport ? "inline-flex" : "none";
    if (downloadHint) {
      downloadHint.textContent = state.hint || "报告由本地引擎生成。";
    }
    if (resetZoomBtn) {
      resetZoomBtn.hidden = state.zoomHidden;
    }
    if (fullRangeBtn) {
      fullRangeBtn.hidden = state.fullRangeHidden;
    }
    if (zoomBox) {
      zoomBox.hidden = true;
    }
    if (plotTip) {
      plotTip.hidden = true;
    }
    resultSection.hidden = false;
    showResultCardsForMode(target);
    if (plotCaption && state.caption) {
      plotCaption.textContent = state.caption;
    }
    if (state.centerText) {
      updateCenterLabels(state.centerText);
    }
    drawPlot(lastPlot);
  }

  function setMode(next) {
    var target =
      next === "derivative" || next === "integral" ? next : "limit";
    if (mode === target) {
      return;
    }
    // 离开前把当前模式的实时状态（缩放/报告/按钮）存回去
    if (modeState[mode]) {
      saveModeState(mode);
    }
    mode = target;
    // 快速切换防抖：作废一切在途请求的渲染资格，只认最后一次有效提交
    requestSeq += 1;
    setLoading(false);
    applyModeUI(target);
    restoreModeState(target);
  }

  function schedulePrecheck() {
    clearTimeout(precheckTimer);
    precheckTimer = setTimeout(function () {
      updateDerivativePrecheck();
      updateIntegralPrecheck();
    }, 220);
  }

  function updateIntegralPrecheck() {
    if (mode !== "integral") {
      return;
    }
    var lower = (lowerBoundInput ? lowerBoundInput.value : "").trim();
    var upper = (upperBoundInput ? upperBoundInput.value : "").trim();
    var paired = (lower && upper) || (!lower && !upper);
    if (!paired) {
      if (funcHint) {
        funcHint.hidden = false;
        funcHint.textContent =
          "定积分需要上下限成对填写；都留空则计算不定积分。";
      }
      if (observeBtn && !busy) {
        observeBtn.disabled = true;
      }
      return;
    }
    if (
      funcHint &&
      funcHint.textContent.indexOf("定积分需要上下限成对填写") === 0
    ) {
      hideFuncHint();
    }
    if (observeBtn && !busy && !derivativeLocked) {
      observeBtn.disabled = false;
    }
  }

  function updateDerivativePrecheck() {
    if (mode !== "derivative" || !centerInput) {
      return;
    }
    var raw = (centerInput.value || "").trim();
    if (!raw) {
      if (funcHint) {
        funcHint.hidden = false;
        funcHint.textContent = "求导点 x₀ 不能为空：请填 0、1、pi/2 之类的常数。";
      }
      if (observeBtn && !busy) {
        observeBtn.disabled = true;
      }
      return;
    }
    if (funcHint && funcHint.textContent.indexOf("求导点 x₀ 不能为空") === 0) {
      hideFuncHint();
    }
    if (observeBtn && !busy && !derivativeLocked) {
      observeBtn.disabled = false;
    }
  }

  function buildDerivativeSentence(result) {
    var order = result.derivative_order || 1;
    var mark = order === 1 ? "'" : order === 2 ? "''" : "^{(" + order + ")}";
    return (
      "f" +
      mark +
      "\\left(" +
      (result.center_latex || "0") +
      "\\right) = " +
      (result.slope_latex || "0")
    );
  }

  function buildDerivativeFunctionSentence(result) {
    var order = result.derivative_order || 1;
    var mark = order === 1 ? "'" : order === 2 ? "''" : "^{(" + order + ")}";
    return "f" + mark + "(x) = " + (result.derivative_latex || "0");
  }

  function formatNumberText(value) {
    if (typeof value === "number" && isFinite(value)) {
      return String(Math.round(value * 1e10) / 1e10);
    }
    return "—";
  }

  function renderDerivativeResult(result) {
    var expression = result.expression || input.value.trim();
    var centerText = result.center_text || "0";
    var order = result.derivative_order || 1;

    lastDerivative = result;
    lastIntegral = null;
    unlockDerivative();
    if (derivFormula) {
      derivFormula.classList.remove("is-alert");
    }

    updateCenterLabels(centerText);
    if (derivLabel) {
      derivLabel.textContent = "DERIVATIVE FOUND";
    }
    if (derivStatus) {
      derivStatus.textContent = "可导";
    }
    if (derivFormula) {
      renderMath(derivFormula, buildDerivativeSentence(result), true);
    }
    if (derivExpressionWrap) {
      derivExpressionWrap.hidden = false;
    }
    if (derivExpression) {
      renderMath(derivExpression, buildDerivativeFunctionSentence(result), false);
    }
    if (derivSlope) {
      derivSlope.textContent =
        typeof result.slope_num === "number"
          ? formatNumberText(result.slope_num)
          : result.slope || "—";
    }
    if (derivY0) {
      derivY0.textContent =
        typeof result.y0_num === "number"
          ? formatNumberText(result.y0_num)
          : result.y0 || "—";
    }
    if (derivOrder) {
      derivOrder.textContent = "n = " + order;
    }
    if (derivTangent) {
      renderMath(derivTangent, result.tangent_latex || "—", false);
    }
    if (derivPointSlope) {
      renderMath(derivPointSlope, result.tangent_point_latex || "", false);
    }
    if (derivNote) {
      derivNote.textContent =
        "曲线为原函数 f(x)；红色虚线是 x₀ 处的切线，红点为切点 (x₀, f(x₀))。";
    }
    if (plotCaption) {
      var derivMark = order === 1 ? "′" : order === 2 ? "″" : "⁽" + order + "⁾";
      plotCaption.textContent =
        "实线 f(x) · 绿虚线 = 导数 f" +
        derivMark +
        "(x) · 红虚线 = 切线 · 红点 = 切点";
      plotCaption.dataset.mode = "derivative";
    }

    resultExpression.textContent = expression;
    resultExpression.title = expression;
    var normalized = result.normalized || "—";
    resultNormalized.textContent = normalized;
    resultNormalized.title = normalized;
    resultCenter.textContent =
      "x₀ = " + centerText + " · " + order + " 阶导数";
    resultEngine.textContent = result.engine || "SymPy";
    if (resultBreak) {
      resultBreak.textContent = "不适用（求导模式）";
      resultBreak.title = "";
    }
    resultTime.textContent =
      (result.elapsed_ms || 0) + " ms · " + (result.engine || "SymPy");

    if (limitCardEl) {
      limitCardEl.hidden = true;
    }
    if (stepsCardEl) {
      stepsCardEl.hidden = true;
    }
    if (derivativeCard) {
      derivativeCard.hidden = false;
    }
    if (integralCard) {
      integralCard.hidden = true;
    }

    reportPreview.textContent = result.raw_report || "";
    lastReport = result.raw_report || "";
    lastFilename = result.report_filename || "Derivative_Report.md";
    lastLatex = result.derivative_latex || "";
    lastResultText =
      "f(" +
      order +
      " 阶)(" +
      centerText +
      ") = " +
      (result.slope || "?") +
      "，切线 " +
      (result.tangent_text || "");
    downloadBtn.style.display = lastReport ? "inline-flex" : "none";
    copyLatexBtn.style.display = lastLatex ? "inline-flex" : "none";
    copyResultBtn.style.display = lastResultText ? "inline-flex" : "none";
    copyReportBtn.style.display = lastReport ? "inline-flex" : "none";
    downloadHint.textContent =
      "报告包含原始函数、求导点与阶数、导数表达式与切线方程。";

    lastPlot = result.plot || null;
    fullPlot = lastPlot;
    plotZoom = null;
    if (resetZoomBtn) {
      resetZoomBtn.hidden = true;
    }
    if (fullRangeBtn) {
      fullRangeBtn.hidden = true;
    }
    if (zoomBox) {
      zoomBox.hidden = true;
    }
    clearRangeError();
    plotOverlay = null;
    if (
      typeof result.x0_num === "number" &&
      typeof result.y0_num === "number" &&
      typeof result.slope_num === "number"
    ) {
      plotOverlay = {
        kind: "tangent",
        x0: result.x0_num,
        y0: result.y0_num,
        k: result.slope_num,
        hint: "切点 (x₀, f(x₀))"
      };
    }
    if (plotTip) {
      plotTip.hidden = true;
    }
    resultSection.hidden = false;
    errorBox.hidden = true;
    replayAnimation(resultSection);
    lastCenterText = centerText;
    saveModeState("derivative");
    renderNewFrame(lastPlot);
    pendingPlotAnimation = motionMode === "animated";
    tryStartPlotAnimation();
  }

  function renderDerivativeBlocked(result) {
    var reason = result.reason || result.error || "该点不可导。";
    var isDomain = result.error_code === "DOMAIN_ERROR";
    var headline =
      result.headline ||
      (isDomain
        ? "该点无定义或趋于无穷，无法求导。"
        : "该点不可导（可能存在尖点、断点或无穷导数）。");

    lastDerivative = result;
    lastIntegral = null;
    lockDerivative();
    showBanner(reason);
    setApiStatus(
      "warn",
      isDomain ? "定义域错误 · 该点无定义" : "尖点 / 不可导预警"
    );

    if (derivLabel) {
      derivLabel.textContent = isDomain ? "DOMAIN ERROR" : "NOT DIFFERENTIABLE";
    }
    if (derivStatus) {
      derivStatus.textContent = isDomain ? "定义域错误" : "不可导";
    }
    if (derivFormula) {
      derivFormula.textContent = reason;
      derivFormula.classList.add("is-alert");
    }
    if (derivExpressionWrap) {
      derivExpressionWrap.hidden = true;
    }
    if (derivSlope) {
      derivSlope.textContent = "—";
    }
    if (derivY0) {
      derivY0.textContent =
        typeof result.y0_num === "number"
          ? formatNumberText(result.y0_num)
          : "—";
    }
    if (derivOrder) {
      derivOrder.textContent = "n = " + (result.derivative_order || 1);
    }
    if (derivTangent) {
      derivTangent.textContent = "—";
    }
    if (derivPointSlope) {
      derivPointSlope.textContent = "";
    }
    if (derivNote) {
      derivNote.textContent =
        "无法绘制切线：该点不可导或无定义，黄色标记即问题位置。";
    }
    if (plotCaption) {
      plotCaption.textContent = "该点不可导或无定义 · 黄色标记为问题位置";
    }
    resultExpression.textContent = result.expression || input.value.trim();
    resultExpression.title = resultExpression.textContent;
    var blockedNormalized =
      result.normalized || result.expression_latex || "—";
    resultNormalized.textContent = blockedNormalized;
    resultNormalized.title = blockedNormalized;
    resultCenter.textContent =
      "x₀ = " +
      (result.center_text || "0") +
      " · " +
      (result.derivative_order || 1) +
      " 阶导数";
    resultEngine.textContent = result.engine || "SymPy";
    if (resultBreak) {
      resultBreak.textContent = "不适用（求导模式）";
      resultBreak.title = "";
    }
    resultTime.textContent =
      (result.elapsed_ms || 0) + " ms · " + (result.engine || "SymPy");

    if (limitCardEl) {
      limitCardEl.hidden = true;
    }
    if (stepsCardEl) {
      stepsCardEl.hidden = true;
    }
    if (derivativeCard) {
      derivativeCard.hidden = false;
    }
    if (integralCard) {
      integralCard.hidden = true;
    }

    reportPreview.textContent = result.raw_report || "";
    lastReport = result.raw_report || "";
    lastFilename = result.report_filename || "Derivative_Report.md";
    lastLatex = "";
    lastResultText = "求导失败：" + reason;
    downloadBtn.style.display = lastReport ? "inline-flex" : "none";
    copyLatexBtn.style.display = "none";
    copyResultBtn.style.display = "inline-flex";
    copyReportBtn.style.display = lastReport ? "inline-flex" : "none";
    downloadHint.textContent = "失败报告同样可下载，包含失败阶数与原因。";

    lastPlot = result.plot || null;
    fullPlot = lastPlot;
    plotZoom = null;
    if (resetZoomBtn) {
      resetZoomBtn.hidden = true;
    }
    if (fullRangeBtn) {
      fullRangeBtn.hidden = true;
    }
    if (zoomBox) {
      zoomBox.hidden = true;
    }
    clearRangeError();
    plotOverlay = null;
    if (typeof result.x0_num === "number") {
      plotOverlay = {
        kind: "na",
        x0: result.x0_num,
        y0: typeof result.y0_num === "number" ? result.y0_num : null,
        hint: isDomain ? "该点无定义" : "该点无切线"
      };
    }
    if (plotTip) {
      plotTip.hidden = true;
    }
    resultSection.hidden = false;
    replayAnimation(resultSection);
    lastCenterText = result.center_text || "0";
    saveModeState("derivative");
    renderNewFrame(lastPlot);
  }

  // ------------------------------------------------- v1.5.0 积分模式

  function buildIntegralSentence(result) {
    if (result.definite === true) {
      return (
        "\\\\int_{" +
        formatLatexBound(result.lower) +
        "}^{" +
        formatLatexBound(result.upper) +
        "} f(x)\\\\,dx = " +
        (result.value_latex || "\\\\text{?}")
      );
    }
    return "F(x) = " + (result.antiderivative_latex || "\\\\text{?}") + " + C";
  }

  function formatLatexBound(value) {
    if (typeof value === "number" && isFinite(value)) {
      var text = String(Math.round(value * 1e10) / 1e10);
      var piMatch = text.indexOf("3.141592653") === 0;
      if (piMatch) {
        return "\\\\pi";
      }
      return text;
    }
    return "\\\\text{?}";
  }

  function renderIntegralResult(result) {
    var expression = result.expression || input.value.trim();
    var isDefinite = result.definite === true;
    var taylor = result.taylor_approx === true;

    lastIntegral = result;
    lastDerivative = null;

    if (integralLabel) {
      integralLabel.textContent = "INTEGRAL FOUND";
    }
    if (integralStatus) {
      integralStatus.textContent = isDefinite ? "可积" : "原函数族";
      integralStatus.classList.remove("is-warn");
    }
    if (integralFormula) {
      integralFormula.classList.remove("is-alert");
      renderMath(integralFormula, buildIntegralSentence(result), true);
    }
    if (integralAntiderivative) {
      integralAntiderivative.textContent = result.antiderivative_text || "—";
      integralAntiderivative.title = integralAntiderivative.textContent;
    }
    if (integralValue) {
      integralValue.textContent = isDefinite
        ? (typeof result.value_num === "number"
            ? formatNumberText(result.value_num)
            : result.value_text || "—")
        : "F(x) + C";
    }
    if (integralMethod) {
      integralMethod.textContent = taylor ? "泰勒近似" : "精确积分";
      integralMethod.classList.toggle("is-taylor", taylor);
    }
    if (integralMethodNote) {
      integralMethodNote.hidden = !taylor;
    }
    if (integralMethodText) {
      integralMethodText.textContent = taylor
        ? "⚠ 原函数过于复杂，已自动启用泰勒近似积分（8 阶展开）"
        : "";
    }
    if (integralNote) {
      integralNote.textContent = isDefinite
        ? "曲线下方蓝色填充为定积分面积，蓝色虚线为上下限位置。"
        : "实线为 f(x)；虚线为原函数族 F(x)+C（C 取 -2…2）。";
    }
    if (plotCaption) {
      plotCaption.textContent = isDefinite
        ? "蓝色填充 = 定积分面积 · 蓝色虚线 = 上下限"
        : "实线 = f(x) · 虚线 = 原函数族 F(x)+C";
    }

    resultExpression.textContent = expression;
    resultExpression.title = expression;
    var normalized = result.normalized || "—";
    resultNormalized.textContent = normalized;
    resultNormalized.title = normalized;
    resultCenter.textContent = isDefinite
      ? "∫ [" + (result.lower ?? "?") + ", " + (result.upper ?? "?") + "]"
      : "不定积分 ∫ f(x) dx";
    resultEngine.textContent = result.engine || "SymPy";
    if (resultBreak) {
      resultBreak.textContent = "不适用（积分模式）";
      resultBreak.title = "";
    }
    resultTime.textContent =
      (result.elapsed_ms || 0) + " ms · " + (result.engine || "SymPy");

    if (limitCardEl) {
      limitCardEl.hidden = true;
    }
    if (stepsCardEl) {
      stepsCardEl.hidden = true;
    }
    if (derivativeCard) {
      derivativeCard.hidden = true;
    }
    if (integralCard) {
      integralCard.hidden = false;
    }

    reportPreview.textContent = result.raw_report || "";
    lastReport = result.raw_report || "";
    lastFilename = result.report_filename || "Integral_Report.md";
    lastLatex = result.value_latex || result.antiderivative_latex || "";
    lastResultText = isDefinite
      ? "∫[" + result.lower + "," + result.upper + "] " + expression + " dx = " + (result.value_text || "?")
      : "∫ " + expression + " dx = " + (result.antiderivative_text || "?") + " + C";
    downloadBtn.style.display = lastReport ? "inline-flex" : "none";
    copyLatexBtn.style.display = lastLatex ? "inline-flex" : "none";
    copyResultBtn.style.display = "inline-flex";
    copyReportBtn.style.display = lastReport ? "inline-flex" : "none";
    downloadHint.textContent = "报告包含被积函数、原函数、积分值与求解方式（泰勒近似会明确注明）。";

    lastPlot = result.plot || null;
    fullPlot = lastPlot;
    plotZoom = null;
    if (resetZoomBtn) {
      resetZoomBtn.hidden = true;
    }
    if (fullRangeBtn) {
      fullRangeBtn.hidden = true;
    }
    if (zoomBox) {
      zoomBox.hidden = true;
    }
    clearRangeError();
    plotOverlay = null;
    if (plotTip) {
      plotTip.hidden = true;
    }
    resultSection.hidden = false;
    errorBox.hidden = true;
    replayAnimation(resultSection);
    lastCenterText = "";
    saveModeState("integral");
    renderNewFrame(lastPlot);
    pendingPlotAnimation = motionMode === "animated";
    tryStartPlotAnimation();
  }

  function renderIntegralBlocked(result) {
    var reason = result.reason || result.error || "该积分发散或无法计算。";
    lastIntegral = result;
    lastDerivative = null;
    showBanner(reason);
    setApiStatus("warn", "积分发散警告");

    if (integralLabel) {
      integralLabel.textContent = "DIVERGES";
    }
    if (integralStatus) {
      integralStatus.textContent = "发散";
      integralStatus.classList.add("is-warn");
    }
    if (integralFormula) {
      integralFormula.textContent = reason;
      integralFormula.classList.add("is-alert");
    }
    if (integralAntiderivative) {
      integralAntiderivative.textContent = "—";
    }
    if (integralValue) {
      integralValue.textContent = "不收敛";
    }
    if (integralMethod) {
      integralMethod.textContent = "—";
    }
    if (integralMethodNote) {
      integralMethodNote.hidden = true;
    }
    if (integralNote) {
      integralNote.textContent =
        "被积函数在积分区间内无界，定积分发散；请拆分区间或更换端点。";
    }
    if (plotCaption) {
      plotCaption.textContent = "黄色高亮为奇点位置 · 定积分不收敛";
    }

    resultExpression.textContent = result.expression || input.value.trim();
    resultExpression.title = resultExpression.textContent;
    var blockedNormalized = result.normalized || "—";
    resultNormalized.textContent = blockedNormalized;
    resultNormalized.title = blockedNormalized;
    resultCenter.textContent =
      "∫ [" + (result.lower ?? "?") + ", " + (result.upper ?? "?") + "]";
    resultEngine.textContent = result.engine || "SymPy";
    if (resultBreak) {
      resultBreak.textContent = "不适用（积分模式）";
      resultBreak.title = "";
    }
    resultTime.textContent =
      (result.elapsed_ms || 0) + " ms · " + (result.engine || "SymPy");

    if (limitCardEl) {
      limitCardEl.hidden = true;
    }
    if (stepsCardEl) {
      stepsCardEl.hidden = true;
    }
    if (derivativeCard) {
      derivativeCard.hidden = true;
    }
    if (integralCard) {
      integralCard.hidden = false;
    }

    reportPreview.textContent = result.raw_report || "";
    lastReport = result.raw_report || "";
    lastFilename = result.report_filename || "Integral_Report.md";
    lastLatex = "";
    lastResultText = "积分发散：" + reason;
    downloadBtn.style.display = lastReport ? "inline-flex" : "none";
    copyLatexBtn.style.display = "none";
    copyResultBtn.style.display = "inline-flex";
    copyReportBtn.style.display = lastReport ? "inline-flex" : "none";
    downloadHint.textContent = "发散警告同样生成报告，可下载留存。";

    lastPlot = result.plot || null;
    fullPlot = lastPlot;
    plotZoom = null;
    if (resetZoomBtn) {
      resetZoomBtn.hidden = true;
    }
    if (fullRangeBtn) {
      fullRangeBtn.hidden = true;
    }
    if (zoomBox) {
      zoomBox.hidden = true;
    }
    clearRangeError();
    plotOverlay = null;
    if (typeof result.singular_x === "number") {
      plotOverlay = {
        kind: "na",
        x0: result.singular_x,
        y0: null,
        hint: "奇点 · 定积分发散"
      };
    }
    if (plotTip) {
      plotTip.hidden = true;
    }
    resultSection.hidden = false;
    replayAnimation(resultSection);
    lastCenterText = "";
    saveModeState("integral");
    renderNewFrame(lastPlot);
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

  // ------------------------------------------------- v1.5.0 异步任务协议
  // Python 侧用 submit/poll 双调用：UI 线程只做入队与查状态（常数级），
  // SymPy 计算全部在后台线程池执行，pywebview 窗口在计算期间依然丝滑。

  var API_POLL_INTERVAL_MS = 120;
  var API_TASK_TIMEOUT_MS = 20000;

  function sleep(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  async function callEngine(task, payload) {
    if (!window.pywebview || !window.pywebview.api) {
      throw new Error(
        "桌面计算引擎尚未连接。请通过桌面程序（DerivativeLab.exe）启动本页面。"
      );
    }
    var submitted = await window.pywebview.api.submit(task, payload);
    if (!submitted || submitted.success !== true || !submitted.task_id) {
      throw new Error(
        (submitted && submitted.error) || "任务提交失败，请重试。"
      );
    }
    var taskId = submitted.task_id;
    var deadline = Date.now() + API_TASK_TIMEOUT_MS;
    for (;;) {
      await sleep(API_POLL_INTERVAL_MS);
      var status = await window.pywebview.api.poll(taskId);
      if (status && status.done) {
        return status.result;
      }
      if (Date.now() > deadline) {
        throw new Error("计算超过 20 秒仍未返回，已中止等待。");
      }
    }
  }

  // 防连点 + 快速点击防抖：150ms 内的多次触发合并成最后一次有效请求
  function requestObservation() {
    clearTimeout(runDebounceTimer);
    runDebounceTimer = window.setTimeout(runObservation, 150);
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

    var center = centerInput.value.trim() || "0";
    var order = orderSelect.value || "6";
    var direction = directionSelect ? directionSelect.value : "auto";
    var derivativeOrder = derivativeOrderSelect
      ? derivativeOrderSelect.value || "1"
      : "1";
    var lower = lowerBoundInput ? lowerBoundInput.value.trim() : "";
    var upper = upperBoundInput ? upperBoundInput.value.trim() : "";

    if (mode === "derivative" && !center) {
      updateDerivativePrecheck();
      showError("求导点 x₀ 不能为空：请填 0、1、pi/2 之类的常数。");
      return;
    }
    if (mode === "integral" && !((lower && upper) || (!lower && !upper))) {
      updateIntegralPrecheck();
      showError("定积分需要上下限成对填写；都留空则为不定积分。");
      return;
    }

    var seq = ++requestSeq;
    setLoading(true);
    setApiStatus("busy", (MODE_LABELS[mode] || MODE_LABELS.limit).status);

    try {
      var result;
      if (mode === "derivative") {
        result = await callEngine("derivative", {
          expression: expression,
          center: center,
          order: derivativeOrder
        });
      } else if (mode === "integral") {
        result = await callEngine("integral", {
          expression: expression,
          lower: lower || null,
          upper: upper || null
        });
      } else {
        result = await callEngine("limit", {
          expression: expression,
          center: center,
          max_order: order,
          direction: direction
        });
      }

      if (seq !== requestSeq) {
        return; // 已被快速切换 Tab / 新请求作废
      }
      if (!result || typeof result !== "object") {
        throw new Error("计算引擎返回了空结果。");
      }

      if (mode === "derivative") {
        if (!result.success) {
          if (
            result.error_code === "NOT_DIFFERENTIABLE" ||
            result.error_code === "DOMAIN_ERROR"
          ) {
            renderDerivativeBlocked(result);
            return;
          }
          throw new Error(result.error || "求导失败，请检查表达式。");
        }
        renderDerivativeResult(result);
        setApiStatus("ok", "导数计算成功 · 切线已高亮");
        return;
      }

      if (mode === "integral") {
        if (!result.success) {
          if (result.error_code === "SINGULARITY") {
            renderIntegralBlocked(result);
            return;
          }
          throw new Error(result.error || "积分失败，请检查表达式。");
        }
        renderIntegralResult(result);
        setApiStatus(
          "ok",
          result.taylor_approx
            ? "积分完成 · 已启用泰勒近似"
            : "积分成功 · 原函数已求出"
        );
        return;
      }

      if (!result.success) {
        throw new Error(result.error || "计算失败，请检查表达式。");
      }
      renderResult(result);
      setApiStatus("ready", "本地引擎就绪 · 计算完成");
    } catch (error) {
      if (seq !== requestSeq) {
        return;
      }
      var message =
        error && error.message ? error.message : String(error || "未知错误");
      showError(message);
      setApiStatus("ready", "本地引擎就绪 · 可继续观测");
    } finally {
      if (seq === requestSeq) {
        setLoading(false);
        updateDerivativePrecheck();
        updateIntegralPrecheck();
      }
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

  window.addEventListener("load", function () {
    // 页面 load 事件在背景大图解码完后才触发，WebView2 此时才恢复滚动位置
    instantTop();
  });

  function instantTop() {
    // 直接改 scrollTop，绕过 CSS 的 scroll-behavior: smooth
    document.documentElement.scrollTop = 0;
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }

  function hideSplash() {
    if (!splash || splash.dataset.gone === "1") {
      return;
    }
    splash.dataset.gone = "1";
    splashGone = true;
    // 关掉开屏后回一次顶部，避免 WebView2 恢复上次的滚动位置
    instantTop();
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
    requestObservation();
  });

  function expandLogTemplate(element) {
    var value = element.value;
    var caret = element.selectionStart;
    if (typeof caret !== "number" || caret < 4) {
      return false;
    }
    var head = value.slice(0, caret);
    if (!/(^|[^A-Za-z_])log\($/i.test(head)) {
      return false;
    }
    var after = value.slice(caret);
    var nextChar = after.charAt(0);
    if (after && nextChar !== ")" && nextChar !== " ") {
      return false;
    }
    var insert = nextChar === ")" ? "x, " : "x, )";
    element.value = head + insert + after;
    element.setSelectionRange(head.length + 3, head.length + 3);
    return true;
  }

  input.addEventListener("input", function (event) {
    if (event && event.isComposing) {
      return;
    }
    // 大写 X、全角符号就地归一化
    normalizeField(input);
    // 只在真正输入字符时补模板；退格/删除时绝不重新插入，保证能从右往左删干净
    if (event && event.inputType === "insertText") {
      expandLogTemplate(input);
    }
    userInteracted = true;
    clearError();
    unlockDerivative();
    refreshFuncHint();
    schedulePrecheck();
  });

  centerInput.addEventListener("input", function (event) {
    if (event && event.isComposing) {
      return;
    }
    normalizeField(centerInput);
    userInteracted = true;
    clearError();
    unlockDerivative();
    schedulePrecheck();
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Tab" && !event.shiftKey && pendingCompletion) {
      if (completeFuncName()) {
        event.preventDefault();
        return;
      }
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      requestObservation();
    }
    // log( 自动补出的右括号留在最左边时，退格也能直接从右往左删干净
    if (
      event.key === "Backspace" &&
      input.selectionStart === 0 &&
      input.selectionEnd === 0 &&
      /^\)+$/.test(input.value)
    ) {
      event.preventDefault();
      input.value = "";
      clearError();
    }
  });

  document.querySelectorAll(".example-chip").forEach(function (button) {
    button.addEventListener("click", function () {
      userInteracted = true;
      autoRan = true;
      input.value = button.dataset.expression || "";
      centerInput.value =
        button.dataset.center !== undefined ? button.dataset.center : "0";
      if (lowerBoundInput) {
        lowerBoundInput.value =
          button.dataset.lower !== undefined ? button.dataset.lower : "";
      }
      if (upperBoundInput) {
        upperBoundInput.value =
          button.dataset.upper !== undefined ? button.dataset.upper : "";
      }
      clearError();
      requestObservation();
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

  if (splashSelect) {
    var savedSplash = parseFloat(localStorage.getItem("freecalc.splash"));
    if (!isFinite(savedSplash)) {
      savedSplash = 3;
    }
    savedSplash = Math.min(3, Math.max(1, Math.round(savedSplash)));
    splashSelect.value = String(savedSplash);
    splashSelect.addEventListener("change", function () {
      try {
        localStorage.setItem("freecalc.splash", splashSelect.value);
      } catch (error) {}
    });
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

  // ---------------- 图表框选缩放（dataZoom）
  function pointerPixel(event) {
    var rect = plotCanvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function insidePlot(px, py) {
    var geo = plotGeometry();
    if (!geo) {
      return false;
    }
    return (
      px >= geo.pad.left &&
      px <= geo.pad.left + geo.plotW &&
      py >= geo.pad.top &&
      py <= geo.pad.top + geo.plotH
    );
  }

  function endZoomDrag(event) {
    if (!zoomDrag) {
      return;
    }
    var point = pointerPixel(event);
    var from = Math.min(zoomDrag.startX, point.x);
    var to = Math.max(zoomDrag.startX, point.x);
    var box = zoomDrag.box;
    zoomDrag = null;
    if (box) {
      box.hidden = true;
    }
    try {
      plotCanvas.releasePointerCapture(event.pointerId);
    } catch (error) {}
    if (to - from < 14) {
      return;
    }
    var x1 = dataXFromPixel(from);
    var x2 = dataXFromPixel(to);
    if (x1 == null || x2 == null || !(x2 > x1)) {
      return;
    }
    plotZoom = { min: x1, max: x2 };
    if (resetZoomBtn) {
      resetZoomBtn.hidden = false;
    }
    drawPlot(lastPlot);
  }

  if (plotCanvas) {
    plotCanvas.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || !lastPlot || !lastPlot.valid) {
        return;
      }
      var point = pointerPixel(event);
      if (!insidePlot(point.x, point.y)) {
        return;
      }
      var box = ensureZoomBox();
      if (!box) {
        return;
      }
      zoomDrag = {
        startX: point.x,
        startY: point.y,
        pointerId: event.pointerId,
        box: box
      };
      box.hidden = false;
      box.style.left = point.x + plotCanvas.offsetLeft + "px";
      box.style.top = point.y + plotCanvas.offsetTop + "px";
      box.style.width = "0px";
      box.style.height = "0px";
      try {
        plotCanvas.setPointerCapture(event.pointerId);
      } catch (error) {}
    });

    plotCanvas.addEventListener("pointermove", function (event) {
      if (!zoomDrag) {
        return;
      }
      var point = pointerPixel(event);
      var left = Math.min(zoomDrag.startX, point.x);
      var top = Math.min(zoomDrag.startY, point.y);
      zoomDrag.box.style.left = left + plotCanvas.offsetLeft + "px";
      zoomDrag.box.style.top = top + plotCanvas.offsetTop + "px";
      zoomDrag.box.style.width = Math.abs(point.x - zoomDrag.startX) + "px";
      zoomDrag.box.style.height = Math.abs(point.y - zoomDrag.startY) + "px";
    });

    plotCanvas.addEventListener("pointerup", endZoomDrag);
    plotCanvas.addEventListener("pointercancel", function (event) {
      if (!zoomDrag) {
        return;
      }
      var box = zoomDrag.box;
      zoomDrag = null;
      if (box) {
        box.hidden = true;
      }
      try {
        plotCanvas.releasePointerCapture(event.pointerId);
      } catch (error) {}
    });
    plotCanvas.addEventListener("dblclick", resetPlotZoom);
  }

  function syncRangeFields() {
    var enabled = Boolean(rangeToggle && rangeToggle.checked);
    if (rangeFields) {
      rangeFields.hidden = !enabled;
    }
    if (!enabled) {
      clearRangeError();
    }
  }

  if (rangeToggle) {
    try {
      rangeToggle.checked = localStorage.getItem("freecalc.rangePanel.v2") !== "0";
    } catch (error) {}
    syncRangeFields();
    rangeToggle.addEventListener("change", function () {
      try {
        localStorage.setItem("freecalc.rangePanel.v2", rangeToggle.checked ? "1" : "0");
      } catch (error) {}
      syncRangeFields();
      if (rangeToggle.checked && rangeMin) {
        rangeMin.focus();
      }
    });
  }

  if (applyRangeBtn) {
    applyRangeBtn.addEventListener("click", applyPlotRange);
  }
  if (fullRangeBtn) {
    fullRangeBtn.addEventListener("click", restoreFullRange);
  }
  [rangeMin, rangeMax].forEach(function (field) {
    if (!field) {
      return;
    }
    field.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        applyPlotRange();
      }
    });
    field.addEventListener("input", function () {
      clearRangeError();
    });
  });

  if (resetZoomBtn) {
    resetZoomBtn.addEventListener("click", resetPlotZoom);
  }

  if (helpBtn) {
    helpBtn.addEventListener("click", openHelp);
  }
  if (helpClose) {
    helpClose.addEventListener("click", closeHelp);
  }
  if (helpModal) {
    helpModal.addEventListener("click", function (event) {
      if (event.target === helpModal) {
        closeHelp();
      }
    });
  }
  if (modeLimitTab) {
    modeLimitTab.addEventListener("click", function () {
      setMode("limit");
    });
  }

  if (modeDerivTab) {
    modeDerivTab.addEventListener("click", function () {
      setMode("derivative");
    });
  }

  if (modeIntegralTab) {
    modeIntegralTab.addEventListener("click", function () {
      setMode("integral");
    });
  }

  if (derivativeOrderSelect) {
    derivativeOrderSelect.addEventListener("change", function () {
      unlockDerivative();
      clearError();
      updateDerivativePrecheck();
    });
  }

  [lowerBoundInput, upperBoundInput].forEach(function (field) {
    if (!field) {
      return;
    }
    field.addEventListener("input", function () {
      clearError();
      schedulePrecheck();
    });
    field.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        requestObservation();
      }
    });
  });

  if (plotCanvas) {
    plotCanvas.addEventListener("mousemove", function (event) {
      if (!plotTip) {
        return;
      }
      var hit = overlayMarkerPixel();
      if (!hit) {
        plotTip.hidden = true;
        return;
      }
      var rect = plotCanvas.getBoundingClientRect();
      var mx = event.clientX - rect.left;
      var my = event.clientY - rect.top;
      var distance = Math.sqrt(
        (mx - hit.x) * (mx - hit.x) + (my - hit.y) * (my - hit.y)
      );
      if (distance <= 15) {
        plotTip.textContent = plotOverlay.hint || "该点无切线";
        plotTip.style.left = plotCanvas.offsetLeft + hit.x + "px";
        plotTip.style.top = plotCanvas.offsetTop + hit.y + "px";
        plotTip.hidden = false;
      } else {
        plotTip.hidden = true;
      }
    });
    plotCanvas.addEventListener("mouseleave", function () {
      if (plotTip) {
        plotTip.hidden = true;
      }
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && helpModal && !helpModal.hidden) {
      closeHelp();
    }
  });

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
    var splashSeconds = parseFloat(splash.dataset.duration);
    if (!isFinite(splashSeconds)) {
      splashSeconds = 2.75;
    }
    splashSeconds = Math.min(3, Math.max(1, splashSeconds));
    splashHideTimer = window.setTimeout(hideSplash, splashSeconds * 1000);
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && splash && splash.dataset.gone !== "1") {
      hideSplash();
    }
  });

  applyModeUI(mode);
  restoreModeState(mode);

  window.addEventListener("pywebviewready", markApiReady);
  markApiReady();
  pollForApi();
})();
