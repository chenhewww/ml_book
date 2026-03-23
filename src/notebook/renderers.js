import { renderMathExpression } from "../math-renderer.js";

function formulaMentionsSymbol(formula, symbol) {
  const target = `${formula.label} ${formula.expression} ${formula.explanation}`;
  return (symbol?.aliases ?? []).some((alias) => target.includes(alias));
}

function renderFormulaExpression(expression) {
  return `<div class="math-block">${renderMathExpression(expression, { displayMode: true })}</div>`;
}

function getNotebookPhaseLabel(phase) {
  return {
    forward: "先看输入怎样进入模型，再盯住当前高亮对象如何被变换。",
    loss: "这一页要把误差或目标函数看成可被观察的结果，而不是孤立公式。",
    backward: "重点追踪误差怎样逆着数据流回去，哪些量在决定梯度方向。",
    update: "把注意力放在更新前后：模型到底改了哪里，为什么会这样改。",
  }[phase] ?? "跟着当前页高亮，一次只看一条数据流。";
}

function isCompactNotebookFormula(expression = "") {
  if (!expression || expression.length > 100) {
    return false;
  }
  const noisyTokens = ["HeadA=", "HeadB=", "mask,", "mask]", "query=", "target="];
  return !noisyTokens.some((token) => expression.includes(token));
}

function buildCurrentFormula(page, selectedTrace, linkedSymbol) {
  const pageFormulas = page.formulas ?? [];
  const matchedFormula = linkedSymbol
    ? pageFormulas.find((formula) => formulaMentionsSymbol(formula, linkedSymbol))
    : null;

  if (selectedTrace?.formula && isCompactNotebookFormula(selectedTrace.formula)) {
    return {
      title: selectedTrace.titleZh || selectedTrace.title || "当前步骤",
      expression: selectedTrace.formulaZh || selectedTrace.formula,
      explanation: linkedSymbol
        ? `当前焦点符号：${linkedSymbol.label}。${linkedSymbol.meaning}`
        : "这条公式和当前步骤同步变化，适合边拖步骤边看。",
      detailInTrace: false,
    };
  }

  if (matchedFormula) {
    return {
      title: selectedTrace?.titleZh || selectedTrace?.title || matchedFormula.label,
      expression: matchedFormula.expression,
      explanation: `${matchedFormula.explanation} 详细推导留在下面的逐步推导区。`,
      detailInTrace: true,
    };
  }

  if (pageFormulas.length) {
    return {
      title: selectedTrace?.titleZh || selectedTrace?.title || pageFormulas[0].label,
      expression: pageFormulas[0].expression,
      explanation: `${pageFormulas[0].explanation} 详细推导留在下面的逐步推导区。`,
      detailInTrace: true,
    };
  }

  return {
    title: selectedTrace?.titleZh || selectedTrace?.title || "当前步骤",
    expression: "",
    explanation: linkedSymbol
      ? `当前焦点符号：${linkedSymbol.label}。${linkedSymbol.meaning} 详细推导留在下面的逐步推导区。`
      : "这一页没有额外的紧凑公式，先看图和数据流，再按需展开逐步推导。",
    detailInTrace: true,
  };
}

function getSpotlightLabel(spotlight) {
  return {
    parameters: "参数 / 状态",
    prediction: "主输出 / 关注对象",
    loss: "误差 / 约束",
    gradient: "梯度 / 回传信号",
    update: "更新前后差异",
  }[spotlight] ?? "当前高亮";
}

export function renderNotebookBridge(page) {
  return `
    <section class="book-section notebook-bridge">
      <div class="notebook-intro">
        <div class="notebook-kicker">正文里的交互图解</div>
        <h3>先读懂这一页，再动这幅图</h3>
        <p>
          这一块不再是独立的调试台，而是正文中的交互图解。先理解这页在回答什么问题，
          再拖动步骤，让图、公式和解释一起变化。
        </p>
      </div>
      <div class="notebook-rhythm">
        <article class="notebook-rhythm-card">
          <strong>本页阶段</strong>
          <p>${getNotebookPhaseLabel(page.phase)}</p>
        </article>
        <article class="notebook-rhythm-card">
          <strong>建议读法</strong>
          <p>问题 → 图解 → 主公式 → 数据如何流动 → 逐步推导</p>
        </article>
        <article class="notebook-rhythm-card">
          <strong>动手观察</strong>
          <p>${page.experimentPrompt ?? "跟着当前高亮步骤往下读。"}</p>
        </article>
      </div>
      <div id="notebookContext" class="notebook-context"></div>
      <div id="notebookMount" class="notebook-mount"></div>
    </section>
  `;
}

export function renderNotebookContext({ mount, snapshot, page, currentStep, totalSteps, selectedTrace, linkedSymbol }) {
  if (!mount) {
    return;
  }

  const traceTitle = selectedTrace?.titleZh || selectedTrace?.title || "当前公式";
  const spotlight = getSpotlightLabel(linkedSymbol?.spotlight ?? selectedTrace?.spotlight ?? "prediction");
  mount.dataset.currentSpotlight = linkedSymbol?.spotlight ?? selectedTrace?.spotlight ?? "prediction";
  mount.innerHTML = `
    <div class="notebook-context-copy">
      <div class="notebook-status-row">
        <span class="pill accent">阶段 ${snapshot.phase.toUpperCase()}</span>
        <span class="pill">步骤 ${currentStep + 1} / ${totalSteps}</span>
        <span class="pill">样本 ${snapshot.focusSample?.id ?? "--"}</span>
      </div>
      <div class="notebook-context-text">
        <strong>${page.title}</strong>
        <p>当前这一小步重点看 <span>${spotlight}</span>。如果图里有变化，先用肉眼说清它为什么变，再回头看公式「${traceTitle}」。</p>
      </div>
    </div>
    <div class="notebook-jump-row">
      <button class="button ghost notebook-jump" data-notebook-target="plot" type="button">看主图</button>
      <button class="button ghost notebook-jump" data-notebook-target="flow" type="button">看数据如何流动</button>
      <button class="button ghost notebook-jump" data-notebook-target="trace" type="button">看逐步推导</button>
      <button class="button ghost notebook-jump" data-notebook-target="stats" type="button">看内部状态</button>
    </div>
  `;
}

export function renderFormulaCards({ page, selectedSymbol, symbols }) {
  const formulas = page.formulas ?? [];
  const symbolList = symbols ?? [];
  if (!formulas.length) {
    return "";
  }

  const symbolSection = symbolList.length
    ? `
      <section class="book-section symbol-section">
        <div class="symbol-section-header">
          <h3>公式里的关键符号</h3>
          <small>点一个符号，联动当前焦点提示和实验区高亮</small>
        </div>
        <div class="symbol-chip-row">
          ${symbolList
            .map(
              (symbol) => `
                <button
                  class="symbol-chip${selectedSymbol?.key === symbol.key ? " active" : ""}"
                  data-symbol-key="${symbol.key}"
                  type="button"
                >
                  ${symbol.label}
                </button>
              `
            )
            .join("")}
        </div>
        ${
          selectedSymbol
            ? `
              <article class="symbol-detail-card">
                <strong>${selectedSymbol.label}</strong>
                <p>${selectedSymbol.meaning}</p>
                <small>${selectedSymbol.visual}</small>
              </article>
            `
            : ""
        }
      </section>
    `
    : "";

  return `
    <section class="book-section formula-section">
      <div class="formula-section-heading">
        <h3>关键公式</h3>
        <small>正文公式负责建立结构，长推导交给下面的逐步推导区。</small>
      </div>
      <div class="formula-grid">
        ${formulas
          .map(
            (formula) => `
              <article class="formula-card${selectedSymbol && formulaMentionsSymbol(formula, selectedSymbol) ? " active" : ""}">
                <div class="formula-label">${formula.label}</div>
                <div class="formula-expression">${renderFormulaExpression(formula.expression)}</div>
                <p class="formula-explanation">${formula.explanation}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
    ${symbolSection}
  `;
}

export function renderLiveFormulaBoard({ root, page, selectedTrace, linkedSymbol, selectedSymbol, symbols }) {
  if (!root) {
    return;
  }

  const formulas = page.formulas ?? [];
  const currentSpotlight = linkedSymbol?.spotlight ?? selectedTrace?.spotlight ?? "prediction";
  const currentFormula = buildCurrentFormula(page, selectedTrace, linkedSymbol);
  root.dataset.currentSpotlight = currentSpotlight;
  root.innerHTML = `
    <div class="live-formula-header">
      <div>
        <h3>这一刻最该看的公式</h3>
        <small>先把当前变化说清楚，再决定要不要展开更长的推导。</small>
      </div>
      <span class="pill accent live-formula-spotlight">${getSpotlightLabel(currentSpotlight)}</span>
    </div>
    <article class="live-formula-card current${currentFormula.detailInTrace ? " trace-backed" : ""}">
      <div class="live-formula-label">当前运行公式</div>
      <strong>${currentFormula.title}</strong>
      ${currentFormula.expression ? `<div class="live-formula-math">${renderMathExpression(currentFormula.expression, { displayMode: true })}</div>` : ""}
      <p>${currentFormula.explanation}</p>
    </article>
    ${
      formulas.length
        ? `
          <details class="live-formula-details">
            <summary>查看这一页的其他关键公式</summary>
            <div class="live-formula-stack">
              ${formulas
                .map(
                  (formula) => `
                    <article class="live-formula-card${selectedSymbol && formulaMentionsSymbol(formula, selectedSymbol) ? " active" : ""}">
                      <div class="live-formula-label">${formula.label}</div>
                      <div class="live-formula-math">${renderMathExpression(formula.expression, { displayMode: true })}</div>
                      <p>${formula.explanation}</p>
                    </article>
                  `
                )
                .join("")}
            </div>
          </details>
        `
        : ""
    }
    ${
      symbols?.length
        ? `
          <div class="live-formula-footnote">
            <strong>当前符号焦点</strong>
            <span>${selectedSymbol?.label ?? symbols[0].label}</span>
          </div>
        `
        : ""
    }
  `;
}
