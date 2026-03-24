import { renderMathExpression } from "../math-renderer.js";

function formatKey(key) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function isStatActive(key, spotlight) {
  if (spotlight === "gradient") {
    return key.toLowerCase().includes("gradient") || key.startsWith("grad");
  }
  if (spotlight === "parameters" || spotlight === "update") {
    return !key.toLowerCase().includes("gradient") && !key.startsWith("grad") && key !== "learningRate";
  }
  if (spotlight === "loss") {
    return key.toLowerCase().includes("bias") || key.toLowerCase().includes("weight");
  }
  return key === "learningRate";
}

function getVisualFocusLabel(spotlight) {
  return {
    parameters: "参数 / state",
    prediction: "主输出 / output",
    loss: "误差 / loss signal",
    gradient: "梯度 / gradient",
    update: "更新前后 / update delta",
  }[spotlight] ?? "当前高亮对象";
}

function getFlowStatusLabel(stepState, language) {
  if (stepState === "current") {
    return language === "zh" ? "当前步骤" : "Current";
  }
  if (stepState === "done") {
    return language === "zh" ? "前情步骤" : "Done";
  }
  return language === "zh" ? "后续步骤" : "Next";
}

function getTraceStatusLabel(status, language) {
  const zh = {
    done: "前情",
    current: "当前",
    upcoming: "后续",
  };
  const en = {
    done: "Done",
    current: "Current",
    upcoming: "Next",
  };
  return (language === "zh" ? zh : en)[status] ?? (language === "zh" ? "步骤" : "Step");
}

function getCurrentTraceIndex(snapshot) {
  const traces = snapshot?.calculationTrace ?? [];
  const currentIndex = traces.findIndex((trace) => trace.status === "current");
  return currentIndex === -1 ? 0 : currentIndex;
}

function getFlowTraceIndex(node, index) {
  return Number.isInteger(node?.traceIndex) ? node.traceIndex : index;
}

function getTraceStageKey(trace) {
  return trace?.stageKey ?? null;
}

function getFlowStageKey(node) {
  return node?.stageKey ?? null;
}

function getTraceIndexByStageKey(snapshot, stageKey) {
  if (!stageKey) {
    return getCurrentTraceIndex(snapshot);
  }
  const traces = snapshot?.calculationTrace ?? [];
  const matchIndex = traces.findIndex((trace) => getTraceStageKey(trace) === stageKey);
  return matchIndex === -1 ? getCurrentTraceIndex(snapshot) : matchIndex;
}

function getTraceIndexBySpotlight(snapshot, spotlight) {
  if (!spotlight) {
    return getCurrentTraceIndex(snapshot);
  }
  const traces = snapshot?.calculationTrace ?? [];
  const matchIndex = traces.findIndex((trace) => trace.spotlight === spotlight);
  return matchIndex === -1 ? getCurrentTraceIndex(snapshot) : matchIndex;
}

export function renderFlow(container, snapshot, selectedTraceIndex = null, language = "zh") {
  const currentTraceIndex = getCurrentTraceIndex(snapshot);
  const currentTrace = (snapshot?.calculationTrace ?? [])[currentTraceIndex] ?? null;
  const currentStageKey = getTraceStageKey(currentTrace);
  const linkedTraceIndex = Number.isInteger(selectedTraceIndex)
    ? selectedTraceIndex
    : currentStageKey
      ? getTraceIndexByStageKey(snapshot, currentStageKey)
      : getTraceIndexBySpotlight(snapshot, currentTrace?.spotlight ?? null);
  container.innerHTML = snapshot.modelFlow
    .map((node, index) => {
      const traceIndex = getFlowTraceIndex(node, index);
      const stepState = traceIndex < currentTraceIndex ? "done" : traceIndex === currentTraceIndex ? "current" : "upcoming";
      return `
        <button class="flow-node ${stepState}${linkedTraceIndex === traceIndex ? " linked" : ""}" data-flow-index="${index}" data-trace-index="${traceIndex}" type="button">
          <span class="flow-node-step">${index + 1}</span>
          <div class="flow-node-copy">
            <div class="flow-node-meta">
              <span class="flow-node-status">${getFlowStatusLabel(stepState, language)}</span>
            </div>
            <strong>${node.title}</strong>
            <small>${node.detail}</small>
          </div>
        </button>
      `;
    })
    .join("");
}

export function renderStats(container, snapshot, spotlight, language = "zh") {
  container.innerHTML = Object.entries(snapshot.params)
    .map(
      ([key, value]) => `
        <div class="stat-card${isStatActive(key, spotlight) ? " active" : ""}">
          <span>${formatKey(key)}</span>
          <strong>${value}</strong>
          <small>${
            isStatActive(key, spotlight)
              ? language === "zh"
                ? "这一项正在影响当前页的高亮变化"
                : "This value is tied to the current highlight."
              : language === "zh"
                ? "作为背景状态保留在这里"
                : "Shown here as supporting state."
          }</small>
        </div>
      `
    )
    .join("");
}

export function renderTrace({
  traceList,
  traceFilterButtons,
  traceToggleButton,
  language,
  traceCollapsed,
  traceFilter,
  selectedTraceIndex,
  snapshot,
}) {
  const traces = snapshot.calculationTrace ?? [];
  const traceShell = traceList.closest(".trace-shell");
  traceShell?.classList.toggle("collapsed", traceCollapsed);
  traceToggleButton.textContent = traceCollapsed ? "展开" : "折叠";
  traceFilterButtons.querySelectorAll("[data-trace-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.traceFilter === traceFilter);
  });

  traceList.innerHTML = traces
    .map((trace, index) => {
      const title = language === "zh" ? trace.titleZh || trace.title : trace.title;
      const formula = language === "zh" ? trace.formulaZh || trace.formula : trace.formula;
      const isVisible = traceFilter === "all" || trace.status === "current";

      return `
        <button class="trace-card ${trace.status}${index === selectedTraceIndex ? " active" : ""}${isVisible ? "" : " filtered-out"}" data-trace-index="${index}" type="button">
          <div class="trace-card-meta">
            <span class="trace-card-step">${index + 1}</span>
            <span class="trace-card-status">${getTraceStatusLabel(trace.status, language)}</span>
          </div>
          <h4>${title}</h4>
          <div class="trace-formula">${renderMathExpression(formula, { displayMode: true })}</div>
        </button>
      `;
    })
    .join("");

  if (!traceCollapsed && traceShell?.open) {
    const activeCard = traceList.querySelector(`[data-trace-index="${selectedTraceIndex}"]`);
    const traceBounds = traceList.getBoundingClientRect();
    const cardBounds = activeCard?.getBoundingClientRect();
    const isOutsideViewport = cardBounds
      ? cardBounds.top < traceBounds.top || cardBounds.bottom > traceBounds.bottom
      : false;
    if (isOutsideViewport) {
      activeCard?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }
}

export function renderFocusGuide(container, snapshot, selectedTrace, language, linkedSymbol = null, visualFocus = null) {
  const traceIndex = visualFocus?.stageKey
    ? getTraceIndexByStageKey(snapshot, visualFocus.stageKey)
    : linkedSymbol?.stageKey
      ? getTraceIndexByStageKey(snapshot, linkedSymbol.stageKey)
      : selectedTrace?.stageKey
        ? getTraceIndexByStageKey(snapshot, selectedTrace.stageKey)
        : getTraceIndexBySpotlight(snapshot, selectedTrace?.spotlight ?? null);
  const activeFlow =
    snapshot.modelFlow?.find((node, index) => getFlowTraceIndex(node, index) === traceIndex || getFlowStageKey(node) === visualFocus?.stageKey || getFlowStageKey(node) === linkedSymbol?.stageKey) ??
    snapshot.modelFlow?.find((node) => node.active) ??
    snapshot.modelFlow?.[0];
  const traceTitle =
    language === "zh"
      ? selectedTrace?.stageLabelZh || selectedTrace?.titleZh || selectedTrace?.title || "当前公式"
      : selectedTrace?.stageLabel || selectedTrace?.title || selectedTrace?.titleZh || "Current equation";
  const traceFormula =
    language === "zh"
      ? selectedTrace?.formulaZh || selectedTrace?.formula || ""
      : selectedTrace?.formula || selectedTrace?.formulaZh || "";
  const spotlight = selectedTrace?.spotlight ?? "prediction";
  const visualLabel = visualFocus?.label ?? getVisualFocusLabel(spotlight);
  const visualDetail =
    visualFocus?.detail ??
    (language === "zh"
      ? "先盯住图里被高亮的对象，再回到公式。"
      : "Inspect the highlighted object first, then map it back to the formula.");
  const visualIndices = [
    Number.isInteger(visualFocus?.queryIndex)
      ? `${language === "zh" ? "Query 行" : "Query row"} ${visualFocus.queryIndex + 1}`
      : null,
    Number.isInteger(visualFocus?.targetIndex)
      ? `${language === "zh" ? "Target 列" : "Target column"} ${visualFocus.targetIndex + 1}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  container.innerHTML = `
    <div class="focus-guide-header">
      <strong>当前先看这里</strong>
      <span class="focus-guide-badge">${snapshot.phase.toUpperCase()}</span>
    </div>
    ${
      linkedSymbol
        ? `
          <div class="focus-symbol-note">
            <strong>${linkedSymbol.label}</strong>
            <p>${linkedSymbol.meaning}</p>
            <small>${linkedSymbol.visual}</small>
          </div>
        `
        : ""
    }
    <div class="focus-guide-grid">
      <button class="focus-card" data-guide-role="flow" type="button">
        <span class="focus-step">1</span>
        <div>
          <h3>数据流节点</h3>
          <p>${activeFlow?.title || "当前步骤"}</p>
          <small>${activeFlow?.detail || "先理解当前数据在模型里处于哪一个环节。"}</small>
        </div>
      </button>
      <button class="focus-card accent" data-guide-role="visual" type="button">
        <span class="focus-step">2</span>
        <div>
          <h3>图上看哪里</h3>
          <p>${visualLabel}</p>
          <small>${visualDetail}</small>
          ${visualIndices ? `<small>${visualIndices}</small>` : ""}
        </div>
      </button>
      <button class="focus-card" data-guide-role="formula" type="button">
        <span class="focus-step">3</span>
        <div>
          <h3>对应公式</h3>
          <p>${traceTitle}</p>
          <small class="focus-formula">${renderMathExpression(traceFormula, { displayMode: false })}</small>
        </div>
      </button>
    </div>
  `;
}
