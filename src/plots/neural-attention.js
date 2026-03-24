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
  { x, y, width, title, subtitle = "active query row", tokens, weights, mask, targetIndex, topIndex, round, panelColors = {}, showWeights = false }
) {
  drawPanel(svg, x, y, width, 82, {
    title,
    subtitle,
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

function getTransformerStageMeta({ stageKey, stageLabel, queryToken, spotlight, isUpdate }) {
  const stageMap = {
    "token-position": {
      title: "1. Token + position",
      subtitle: "build one token state before attention starts",
      contextTitle: "2. Query row preview",
      contextSubtitle: "the row is about to compare visible tokens",
      ffnTitle: "3. Attention path ahead",
      ffnSubtitle: "next comes masking, mixing, and stabilization",
      outputTitle: "4. Block output later",
      outputSubtitle: "residual + FFN will rewrite the token after attention",
      queryCaption: "token + position vector",
      attentionCaption: "project into heads",
      contextCaption: "attention mix arrives here",
      ffnCaption: "FFN has not acted yet",
      outputCaption: "LN2 appears after the full block",
      queryValueLabel: "x + pos",
      contextValueLabel: "attn",
      ffnValueLabel: "ffn",
      outputValueLabel: "ln2",
      emphasis: "start with the token representation, not the full matrix",
    },
    "qkv-head-scoring": {
      title: "1. Q / K / V row",
      subtitle: "project one token into the row that asks for context",
      contextTitle: "2. Head scores",
      contextSubtitle: "compare the active query with visible tokens in both heads",
      ffnTitle: "3. Attention mix next",
      ffnSubtitle: "the score row will become a weighted value mixture",
      outputTitle: "4. Block output later",
      outputSubtitle: "residual + FFN still come after the mix step",
      queryCaption: "query token state",
      attentionCaption: "active query row",
      contextCaption: "mixed values appear next",
      ffnCaption: "FFN is still downstream",
      outputCaption: "final token state comes later",
      queryValueLabel: "x + pos",
      contextValueLabel: "attn",
      ffnValueLabel: "ffn",
      outputValueLabel: "ln2",
      emphasis: "fix one query row and compare where each head points",
    },
    "masked-attention-mix": {
      title: "1. Query row with mask",
      subtitle: "future tokens are blocked before the weights mix values",
      contextTitle: "2. Mask + attention mix",
      contextSubtitle: "visible value vectors are mixed into one context state",
      ffnTitle: "3. Residual path next",
      ffnSubtitle: "the mixed context is about to be written back and normalized",
      outputTitle: "4. Final block output later",
      outputSubtitle: "FFN and LN2 still refine the token after this mix",
      queryCaption: "query row after masking",
      attentionCaption: "active query row",
      contextCaption: "context after weighted value mix",
      ffnCaption: "LN1 comes next",
      outputCaption: "LN2 comes after FFN",
      queryValueLabel: "x + pos",
      contextValueLabel: "attn",
      ffnValueLabel: "ffn",
      outputValueLabel: "ln2",
      emphasis: "watch masked cells disappear, then follow the surviving value mix",
    },
    "residual-norm-1": {
      title: "1. Query row source",
      subtitle: "the original token state is ready to be written back",
      contextTitle: "2. Residual 1 + LN1",
      contextSubtitle: "attention output rejoins the token, then LayerNorm stabilizes it",
      ffnTitle: "3. FFN rewrite next",
      ffnSubtitle: "the normalized vector now enters the feed-forward block",
      outputTitle: "4. Final block output later",
      outputSubtitle: "LN2 will finish the block after FFN",
      queryCaption: "token state before write-back",
      attentionCaption: "attention branch already computed",
      contextCaption: "ln1",
      ffnCaption: "FFN consumes LN1",
      outputCaption: "LN2 still comes after FFN",
      queryValueLabel: "x + pos",
      contextValueLabel: "ln1",
      ffnValueLabel: "ffn",
      outputValueLabel: "ln2",
      emphasis: "move from the weight row to the vector path: add back, then normalize",
    },
    "ffn-residual-norm-2": {
      title: "1. Query row origin",
      subtitle: "keep the original token in mind while the block finishes rewriting it",
      contextTitle: "2. LN1 context",
      contextSubtitle: "the normalized attention result is the input to the FFN rewrite",
      ffnTitle: "3. FFN + residual 2",
      ffnSubtitle: "a per-token non-linear rewrite is added back into the main path",
      outputTitle: "4. Final block output",
      outputSubtitle: "the second LayerNorm produces the token state that leaves the block",
      queryCaption: "original token state",
      attentionCaption: "attention row already consumed",
      contextCaption: "ln1",
      ffnCaption: "ffn",
      outputCaption: "ln2",
      queryValueLabel: "x + pos",
      contextValueLabel: "ln1",
      ffnValueLabel: "ffn",
      outputValueLabel: "ln2",
      emphasis: "stay on the vector path and watch the token leave the block with a new state",
    },
  };
  return {
    key: stageKey,
    label: stageLabel,
    ...(stageMap[stageKey] ?? {
      title: "1. Query token",
      subtitle:
        spotlight === "parameters"
          ? "token + position build the row that will ask for context"
          : "track one token row through the whole block",
      contextTitle: spotlight === "loss" ? "2. Attention output" : "2. Context + norm",
      contextSubtitle:
        spotlight === "loss"
          ? "the row weights mix visible value vectors into one context"
          : "mix visible values, then stabilize with LN",
      ffnTitle: spotlight === "gradient" ? "3. FFN learning path" : "3. FFN correction",
      ffnSubtitle:
        spotlight === "gradient"
          ? "the gradient passes through this non-linear rewrite step"
          : "a per-token non-linear refinement step",
      outputTitle: spotlight === "update" ? "4. Updated block output" : "4. Block output",
      outputSubtitle:
        spotlight === "update"
          ? "compare how the final residual + norm rewrite the token state"
          : "second residual + LN produce the final token state",
      queryCaption: isUpdate ? "updated weights" : "future tokens masked",
      attentionCaption: "active query row",
      contextCaption: "ln1",
      ffnCaption: "ffn",
      outputCaption: "ln2",
      queryValueLabel: `${formatTokenLabel(queryToken, 8)} + pos`,
      contextValueLabel: "ln1",
      ffnValueLabel: "ffn",
      outputValueLabel: "ln2",
      emphasis: null,
    }),
  };
}

function getStageContextValues(guide, stageKey) {
  return stageKey === "residual-norm-1" || stageKey === "ffn-residual-norm-2"
    ? guide.normalizedVector ?? guide.outputVector ?? []
    : guide.outputVector ?? guide.normalizedVector ?? [];
}

function renderAttentionPlot({ svg, snapshot, getSelectedTrace, round }) {
  resetPlot(svg, 860, 520);
  const guide = snapshot.visualGuide;
  const tokens = guide.tokens ?? [];
  const queryToken = snapshot.focusSample.token;
  const spotlight = getSelectedTrace(snapshot)?.spotlight ?? "prediction";
  const isUpdate = spotlight === "update";
  const stageMeta = getTransformerStageMeta({
    stageKey: guide.stageKey,
    stageLabel: guide.stageLabel,
    queryToken,
    spotlight,
    isUpdate,
  });
  const [headA, headB] = guide.heads ?? [];
  const rowA = headA ? getAttentionRow(headA, guide.queryIndex, isUpdate) : { row: [], mask: [] };
  const rowB = headB ? getAttentionRow(headB, guide.queryIndex, isUpdate) : { row: [], mask: [] };
  const queryPanel = getPanelColors({ active: matchesSpotlight(spotlight, "parameters"), accent: "#005f73" });
  const attentionPanel = getPanelColors({ active: matchesSpotlight(spotlight, ["prediction", "loss"]), accent: "#ee9b00" });
  const contextPanel = getPanelColors({ active: matchesSpotlight(spotlight, ["loss", "gradient"]), accent: "#2a9d8f" });
  const ffnPanel = getPanelColors({ active: matchesSpotlight(spotlight, "gradient"), accent: "#bb3e03" });
  const outputPanel = getPanelColors({ active: matchesSpotlight(spotlight, "update"), accent: "#6a4c93" });
  const stageContextValues = getStageContextValues(guide, guide.stageKey);

  addText(svg, 44, 42, `Transformer block · ${stageMeta.label ?? "current stage"}`);
  addText(
    svg,
    44,
    60,
    `query "${queryToken}" · target "${tokens[guide.targetIndex] ?? ""}" · loss ${snapshot.metrics.loss}`,
    "plot-token-label"
  );
  if (stageMeta.emphasis) {
    addText(svg, 44, 78, stageMeta.emphasis, "plot-token-label");
  }

  drawPanel(svg, 24, 90, 184, 148, {
    title: stageMeta.title,
    subtitle: stageMeta.subtitle,
    ...queryPanel,
  });
  drawMiniBars(svg, guide.tokenPlusPosition ?? [], 54, 158, stageMeta.queryValueLabel, "#005f73", {
    width: 118,
    height: 74,
  });
  addText(svg, 54, 222, stageMeta.queryCaption, "plot-token-label");

  if (headA) {
    drawAttentionRow(svg, {
      x: 236,
      y: 90,
      width: 600,
      title: headA.name,
      subtitle: stageMeta.attentionCaption,
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
      subtitle: stageMeta.attentionCaption,
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
    title: stageMeta.contextTitle,
    subtitle: stageMeta.contextSubtitle,
    ...contextPanel,
  });
  drawMiniBars(svg, stageContextValues, 266, 372, stageMeta.contextValueLabel, "#2a9d8f", {
    width: 120,
    height: 78,
  });
  addText(svg, 266, 456, stageMeta.contextCaption, "plot-token-label");

  drawPanel(svg, 448, 300, 180, 180, {
    title: stageMeta.ffnTitle,
    subtitle: stageMeta.ffnSubtitle,
    ...ffnPanel,
  });
  drawMiniBars(svg, guide.ffnOutput ?? [], 478, 372, stageMeta.ffnValueLabel, "#bb3e03", {
    width: 120,
    height: 78,
  });
  addText(svg, 478, 456, stageMeta.ffnCaption, "plot-token-label");

  drawPanel(svg, 660, 300, 180, 180, {
    title: stageMeta.outputTitle,
    subtitle: stageMeta.outputSubtitle,
    ...outputPanel,
  });
  drawMiniBars(svg, guide.normalized2Vector ?? [], 690, 372, stageMeta.outputValueLabel, "#6a4c93", {
    width: 120,
    height: 78,
  });
  addText(svg, 690, 438, stageMeta.outputCaption, "plot-token-label");
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
