(function () {
  "use strict";

  var form = document.getElementById("calcForm");
  var input = document.getElementById("expression");
  var observeBtn = document.getElementById("observeBtn");
  var resultSection = document.getElementById("resultSection");
  var limitFormula = document.getElementById("limitFormula");
  var limitStatus = document.getElementById("limitStatus");
  var limitNote = document.getElementById("limitNote");
  var limitApprox = document.getElementById("limitApprox");
  var resultTime = document.getElementById("resultTime");
  var resultExpression = document.getElementById("resultExpression");
  var resultNormalized = document.getElementById("resultNormalized");
  var resultEngine = document.getElementById("resultEngine");
  var stepsBody = document.getElementById("stepsBody");
  var reportPreview = document.getElementById("reportPreview");
  var downloadBtn = document.getElementById("downloadBtn");
  var downloadHint = document.getElementById("downloadHint");
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

  function setApiStatus(state, text) {
    apiStatus.dataset.state = state;
    apiStatusText.textContent = text;
  }

  function showError(message) {
    errorText.textContent = message || "发生了未知错误。";
    errorBox.hidden = false;
    resultSection.hidden = true;
    downloadBtn.style.display = "none";
    downloadHint.textContent = "报告包含输入、极限结论与 1–6 阶完整推导。";
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
      emptyCell.textContent = "没有可用的展开步骤。";
      emptyRow.appendChild(emptyCell);
      stepsBody.appendChild(emptyRow);
      return;
    }

    steps.forEach(function (step) {
      var row = document.createElement("tr");

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
    var text = String(result.limit_text || "");
    var isInfinite = /oo|zoo|∞/.test(text);
    if (result.limit_exists === false) {
      limitStatus.textContent = "未收敛";
      limitStatus.classList.add("is-warn");
    } else if (isInfinite) {
      limitStatus.textContent = "发散";
      limitStatus.classList.add("is-warn");
    } else {
      limitStatus.textContent = "收敛";
      limitStatus.classList.remove("is-warn");
    }
  }

  function buildLimitSentence(result) {
    var expressionLatex = result.expression_latex || "f(x)";
    var valueLatex = result.limit_latex || "\\text{无法确定}";
    return "\\lim_{x \\to 0} " + expressionLatex + " = " + valueLatex;
  }

  function renderResult(result) {
    var expression = result.expression || input.value.trim();
    var firstNonzero = result.first_nonzero_order;
    var note = result.limit_note || "";

    if (!note) {
      if (firstNonzero) {
        note =
          "最早在 " +
          firstNonzero +
          " 阶截断展开中出现非零值，极限候选已锁定。";
      } else {
        note = "1–6 阶展开代入 x = 0 均为零，极限与零相容。";
      }
    }

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
    resultEngine.textContent = result.engine || "SymPy";

    renderSteps(result.steps);
    reportPreview.textContent = result.raw_report || "";
    lastReport = result.raw_report || "";
    lastFilename =
      "Taylor_Limit_" +
      expression
        .replace(/[^A-Za-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 36) +
      ".md";
    if (!lastFilename || lastFilename === "Taylor_Limit_.md") {
      lastFilename = "FreeCalculator_Taylor_Report.md";
    }

    downloadBtn.style.display = lastReport ? "inline-flex" : "none";
    downloadHint.textContent = "报告包含输入、极限结论与 1–6 阶完整推导。";
    resultSection.hidden = false;
    errorBox.hidden = true;
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
    setApiStatus("busy", "正在展开 1–6 阶泰勒级数…");

    try {
      var result = await window.pywebview.api.solve_limit(expression);
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
    autoRunTimer = setTimeout(function () {
      if (!autoRan && !userInteracted && input.value.trim()) {
        runObservation();
      }
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

  function hideSplash() {
    if (!splash) {
      return;
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

  window.addEventListener("pywebviewready", markApiReady);
  markApiReady();
  pollForApi();

  window.setTimeout(hideSplash, 2750);
})();
