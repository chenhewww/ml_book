import katex from "../node_modules/katex/dist/katex.mjs";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeMathExpression(expression) {
  return String(expression ?? "")
    .replaceAll("ŷ", "\\hat{y}")
    .replaceAll("α", "\\alpha")
    .replaceAll("β", "\\beta")
    .replaceAll("γ", "\\gamma")
    .replaceAll("σ", "\\sigma")
    .replaceAll("μ", "\\mu")
    .replaceAll("欧", "\\hat{y}");
}

function looksLikeMath(expression) {
  const source = String(expression ?? "").trim();
  if (!source) {
    return false;
  }

  return (
    /\\[A-Za-z]+/.test(source) ||
    /[_^=]/.test(source) ||
    /[(){}\[\]]/.test(source) ||
    /[+\-*/]/.test(source) ||
    /\d/.test(source)
  );
}

export function renderMathExpression(expression, { displayMode = false } = {}) {
  const source = String(expression ?? "").trim();
  if (!source) {
    return "";
  }

  if (!looksLikeMath(source)) {
    return escapeHtml(source);
  }

  return katex.renderToString(normalizeMathExpression(source), {
    displayMode,
    throwOnError: false,
    strict: "ignore",
    trust: true,
    output: "html",
  });
}

