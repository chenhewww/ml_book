import {
  addText,
  drawArrow,
  drawMiniBars,
  drawNumericCard,
  drawPanel,
  getPanelColors,
  matchesSpotlight,
  resetPlot,
} from "./neural-shared.js";
import { createSvgElement } from "./shared.js";

function formatTokenLabel(token, maxLength = 5) {
  const text = String(token);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function getAttentionRow(head, queryIndex, isUpdate) {
  const matrix = isUpdate && head.updatedAttentionMatrix ? head.updatedAttentionMatrix : head.attentionMatrix;
  const row = matrix?.[queryIndex] ?? [];
  const mask = head.maskMatrix?.[queryIndex] ?? [];
  return { row, mask };
}

function drawAttentionRow(
  svg,
  { x, y, width, title, tokens, weights, mask, targetIndex, topIndex, round, panelColors = {}, showWeights = false }
) {
  drawPanel(svg, x, y, width, 82, {
    title,
    subtitle: "active query row",
    ...panelColors,
  });

  const innerX = x + 18;
  const innerWidth = width - 36;
  const slotWidth = innerWidth / Math.max(tokens.length, 1);
  const barWidth = Math.max(18, slotWidth - 12);
  const baselineY = y + 64;

  tokens.forEach((token, index) => {
    const masked = mask[index];
    const weight = weights[index] ?? 0;
    const barHeight = masked ? 12 : Math.max(10, weight * 30);
    const barX = innerX + index * slotWidth + (slotWidth - barWidth) / 2;
    const barY = baselineY - barHeight;
    const fill = masked ? "rgba(111, 115, 105, 0.28)" : index === targetIndex ? "#bb3e03" : index === topIndex ? "#ee9b00" : "#005f73";

    svg.appendChild(
      createSvgElement("rect", {
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        rx: 9,
        fill,
        opacity: masked ? 1 : 0.92,
      })
    );

    if (index === targetIndex) {
      svg.appendChild(
        createSvgElement("rect", {
          x: barX - 2,
          y: barY - 2,
          width: barWidth + 4,
          height: barHeight + 4,
          rx: 11,
          fill: "none",
          stroke: "#bb3e03",
          "stroke-width": 2.5,
        })
      );
    }

    addText(svg, barX + barWidth / 2, y + 76, formatTokenLabel(token), "plot-token-label", {
      "text-anchor": "middle",
    });

    addText(
      svg,
      barX + barWidth / 2,
      barY - 4,
      masked ? "×" : showWeights ? String(round(weight, 2)) : "",
      masked ? "plot-cell-value masked" : "plot-token-label",
      { "text-anchor": "middle" }
    );
  });
}

function renderAttentionPlot({ svg, snapshot, getSelectedTrace, round }) {
  resetPlot(svg, 860, 520);
  const guide = snapshot.visualGuide;
  const tokens = guide.tokens ?? [];
  const queryToken = snapshot.focusSample.token;
  const spotlight = getSelectedTrace(snapshot)?.spotlight ?? "prediction";
  const isUpdate = spotlight === "update";
  const [headA, headB] = guide.heads ?? [];
  const rowA = headA ? getAttentionRow(headA, guide.queryIndex, isUpdate) : { row: [], mask: [] };
  const rowB = headB ? getAttentionRow(headB, guide.queryIndex, isUpdate) : { row: [], mask: [] };
  const queryPanel = getPanelColors({ active: matchesSpotlight(spotlight, "parameters"), accent: "#005f73" });
  const attentionPanel = getPanelColors({ active: matchesSpotlight(spotlight, ["prediction", "loss"]), accent: "#ee9b00" });
  const contextPanel = getPanelColors({ active: matchesSpotlight(spotlight, "loss"), accent: "#2a9d8f" });
  const ffnPanel = getPanelColors({ active: matchesSpotlight(spotlight, "gradient"), accent: "#bb3e03" });
  const outputPanel = getPanelColors({ active: matchesSpotlight(spotlight, "update"), accent: "#6a4c93" });

  addText(svg, 44, 42, "Transformer block: one query row -> context mix -> block output");
  addText(
    svg,
    44,
    60,
    `query "${queryToken}" · target "${tokens[guide.targetIndex] ?? ""}" · loss ${snapshot.metrics.loss}`,
    "plot-token-label"
  );

  drawPanel(svg, 24, 90, 184, 148, {
    title: "1. Query token",
    subtitle:
      spotlight === "parameters"
        ? "token + position build the row that will ask for context"
        : "track one token row through the whole block",
    ...queryPanel,
  });
  drawMiniBars(svg, guide.tokenPlusPosition ?? [], 54, 158, `${formatTokenLabel(queryToken, 8)} + pos`, "#005f73", {
    width: 118,
    height: 74,
  });
  addText(svg, 54, 222, isUpdate ? "updated weights" : "future tokens masked", "plot-token-label");

  if (headA) {
    drawAttentionRow(svg, {
      x: 236,
      y: 90,
      width: 600,
      title: headA.name,
      tokens,
      weights: rowA.row,
      mask: rowA.mask,
      targetIndex: guide.targetIndex,
      topIndex: headA.topIndex,
      round,
      panelColors: attentionPanel,
      showWeights: spotlight === "loss" || spotlight === "update",
    });
  }

  if (headB) {
    drawAttentionRow(svg, {
      x: 236,
      y: 184,
      width: 600,
      title: headB.name,
      tokens,
      weights: rowB.row,
      mask: rowB.mask,
      targetIndex: guide.targetIndex,
      topIndex: headB.topIndex,
      round,
      panelColors: attentionPanel,
      showWeights: spotlight === "loss" || spotlight === "update",
    });
  }

  addText(svg, 748, 286, "× = masked future token", "plot-token-label", {
    "text-anchor": "end",
  });

  drawPanel(svg, 236, 300, 180, 180, {
    title: spotlight === "loss" ? "2. Attention output" : "2. Context + norm",
    subtitle:
      spotlight === "loss"
        ? "the row weights mix visible value vectors into one context"
        : "mix visible values, then stabilize with LN",
    ...contextPanel,
  });
  drawMiniBars(svg, guide.normalizedVector ?? guide.outputVector ?? [], 266, 372, "ln1", "#2a9d8f", {
    width: 120,
    height: 78,
  });

  drawPanel(svg, 448, 300, 180, 180, {
    title: spotlight === "gradient" ? "3. FFN learning path" : "3. FFN correction",
    subtitle:
      spotlight === "gradient"
        ? "the gradient passes through this non-linear rewrite step"
        : "a per-token non-linear refinement step",
    ...ffnPanel,
  });
  drawMiniBars(svg, guide.ffnOutput ?? [], 478, 372, "ffn", "#bb3e03", {
    width: 120,
    height: 78,
  });

  drawPanel(svg, 660, 300, 180, 180, {
    title: spotlight === "update" ? "4. Updated block output" : "4. Block output",
    subtitle:
      spotlight === "update"
        ? "compare how the final residual + norm rewrite the token state"
        : "second residual + LN produce the final token state",
    ...outputPanel,
  });
  drawMiniBars(svg, guide.normalized2Vector ?? [], 690, 372, "ln2", "#6a4c93", {
    width: 120,
    height: 78,
  });
  addText(
    svg,
    690,
    456,
    `LN1 ${guide.normStats?.std ?? "-"} · LN2 ${guide.norm2Stats?.std ?? "-"}`,
    "plot-token-label"
  );

  drawArrow(svg, 208, 164, 236, 132, { label: "project to heads" });
  drawArrow(svg, 536, 266, 326, 300, { label: spotlight === "loss" ? "mix context" : "mix value vectors" });
  drawArrow(svg, 416, 390, 448, 390, { label: spotlight === "gradient" ? "send gradient" : "refine" });
  drawArrow(svg, 628, 390, 660, 390, { label: spotlight === "update" ? "rewrite state" : "add + norm" });
}

export { renderAttentionPlot };
