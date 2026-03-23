import {
  addText,
  drawArrow,
  drawColumnBars,
  drawGridSelection,
  drawMiniBars,
  drawNumericCard,
  drawPanel,
  drawValueGrid,
  getPanelColors,
  matchesSpotlight,
  resetPlot,
} from "./neural-shared.js";
import { renderAttentionPlot } from "./neural-attention.js";
import { createSvgElement } from "./shared.js";

function drawPlusNode(svg, x, y) {
  svg.appendChild(
    createSvgElement("circle", {
      cx: x,
      cy: y,
      r: 18,
      fill: "rgba(255, 255, 255, 0.94)",
      stroke: "rgba(0, 95, 115, 0.24)",
      "stroke-width": 2,
    })
  );
  addText(svg, x, y + 5, "+", "plot-annotation", {
    "text-anchor": "middle",
    fill: "#005f73",
    "font-size": 22,
    "font-weight": 800,
  });
}

function gridChangeMagnitude(current = [], previous = []) {
  return current.reduce(
    (sum, row, rowIndex) =>
      sum + row.reduce((rowSum, value, columnIndex) => rowSum + Math.abs(value - (previous[rowIndex]?.[columnIndex] ?? value)), 0),
    0
  );
}

function getCnnFocus(guide, spotlight) {
  const verticalDelta = gridChangeMagnitude(guide.kernelVertical, guide.previousKernelVertical);
  const horizontalDelta = gridChangeMagnitude(guide.kernelHorizontal, guide.previousKernelHorizontal);
  const preferVertical =
    spotlight === "update"
      ? verticalDelta >= horizontalDelta
      : Math.abs(guide.pooled.vertical) >= Math.abs(guide.pooled.horizontal);

  return preferVertical
    ? {
        label: "Vertical detector",
        shortLabel: "vertical",
        otherLabel: "Horizontal detector",
        otherShortLabel: "horizontal",
        color: "#005f73",
        otherColor: "#bb3e03",
        kernel: guide.kernelVertical,
        previousKernel: guide.previousKernelVertical,
        map: guide.verticalMap,
        pooledValue: guide.pooled.vertical,
        otherValue: guide.pooled.horizontal,
        bestPatch: spotlight === "update" ? guide.updatedVerticalBestPatch : guide.verticalBestPatch,
        bestPatchPosition:
          spotlight === "update" ? guide.updatedVerticalBestPatchPosition : guide.verticalBestPatchPosition,
      }
    : {
        label: "Horizontal detector",
        shortLabel: "horizontal",
        otherLabel: "Vertical detector",
        otherShortLabel: "vertical",
        color: "#bb3e03",
        otherColor: "#005f73",
        kernel: guide.kernelHorizontal,
        previousKernel: guide.previousKernelHorizontal,
        map: guide.horizontalMap,
        pooledValue: guide.pooled.horizontal,
        otherValue: guide.pooled.vertical,
        bestPatch: spotlight === "update" ? guide.updatedHorizontalBestPatch : guide.horizontalBestPatch,
        bestPatchPosition:
          spotlight === "update" ? guide.updatedHorizontalBestPatchPosition : guide.horizontalBestPatchPosition,
      };
}

function renderCnnPlot({ svg, snapshot, getSelectedTrace, round }) {
  resetPlot(svg, 760, 470);
  const guide = snapshot.visualGuide;
  const spotlight = getSelectedTrace(snapshot)?.spotlight ?? "prediction";
  const focus = getCnnFocus(guide, spotlight);
  const maxFeature = Math.max(1, ...focus.map.flat().map((value) => Math.abs(value)));
  const inputPanel = getPanelColors({ active: matchesSpotlight(spotlight, "parameters"), accent: "#ee9b00" });
  const kernelPanel = getPanelColors({
    active: matchesSpotlight(spotlight, ["parameters", "gradient", "update"]),
    accent: focus.color,
  });
  const mapPanel = getPanelColors({ active: matchesSpotlight(spotlight, ["prediction", "gradient"]), accent: focus.color });
  const outputPanel = getPanelColors({ active: matchesSpotlight(spotlight, ["loss", "prediction", "update"]), accent: "#2a9d8f" });
  const bestPatchLabel =
    Number.isInteger(focus.bestPatchPosition?.row) && Number.isInteger(focus.bestPatchPosition?.column)
      ? `best patch r${focus.bestPatchPosition.row + 1} c${focus.bestPatchPosition.column + 1}`
      : "best patch";

  addText(svg, 44, 42, "CNN: one local patch -> one detector -> one class decision");
  addText(svg, 44, 60, `target class ${snapshot.focusSample.label} · loss ${snapshot.metrics.loss}`, "plot-token-label");

  drawPanel(svg, 24, 82, 184, 198, {
    title: "1. Input patch",
    subtitle: "see the whole image, but track one local patch",
    ...inputPanel,
  });
  drawValueGrid(
    svg,
    guide.inputGrid,
    48,
    128,
    26,
    "",
    "plot-grid-cell image",
    {
      maxValue: 1,
      showValues: spotlight === "parameters",
      color: (normalized) => `rgba(238, 155, 0, ${Math.max(0.18, normalized)})`,
    },
    round
  );
  if (focus.bestPatchPosition) {
    drawGridSelection(svg, {
      originX: 48,
      originY: 128,
      cellSize: 26,
      row: focus.bestPatchPosition.row,
      column: focus.bestPatchPosition.column,
      rows: focus.bestPatch?.length ?? 3,
      columns: focus.bestPatch?.[0]?.length ?? 3,
      stroke: focus.color,
    });
    addText(svg, 48, 264, bestPatchLabel, "plot-token-label", { fill: focus.color });
  }

  drawPanel(svg, 236, 82, 188, 156, {
    title: `2. ${focus.label}`,
    subtitle:
      spotlight === "gradient"
        ? "the highlighted patch drives this gradient"
        : spotlight === "update"
          ? "compare the old detector with the updated one"
          : `pooled score ${round(focus.pooledValue)}`,
    ...kernelPanel,
  });
  drawValueGrid(
    svg,
    focus.kernel,
    272,
    128,
    24,
    "",
    "plot-grid-cell kernel",
    {
      maxValue: 2,
      absolute: true,
      showValues: spotlight === "gradient" || spotlight === "update",
      color: (normalized, value) =>
        value >= 0
          ? `rgba(0, 95, 115, ${Math.max(0.18, normalized)})`
          : `rgba(187, 62, 3, ${Math.max(0.18, normalized)})`,
    },
    round
  );

  if (spotlight === "update" && focus.previousKernel) {
    addText(svg, 350, 118, "before", "plot-token-label");
    drawValueGrid(
      svg,
      focus.previousKernel,
      350,
      132,
      16,
      "",
      "plot-grid-cell kernel",
      {
        maxValue: 2,
        absolute: true,
        showValues: false,
        color: (normalized, value) =>
          value >= 0
            ? `rgba(0, 95, 115, ${Math.max(0.14, normalized * 0.75)})`
            : `rgba(187, 62, 3, ${Math.max(0.14, normalized * 0.75)})`,
      },
      round
    );
  }

  drawPanel(svg, 236, 258, 188, 168, {
    title: spotlight === "gradient" ? "3. Best response patch" : "3. Response map",
    subtitle:
      spotlight === "gradient"
        ? "follow the strongest activation back to one local cause"
        : "watch where the detector fires most strongly",
    ...mapPanel,
  });
  if (spotlight === "gradient" && focus.bestPatch?.length) {
    drawValueGrid(
      svg,
      focus.bestPatch,
      282,
      314,
      32,
      bestPatchLabel,
      "plot-grid-cell image",
      {
        maxValue: 1,
        showValues: true,
        color: (normalized) => `rgba(238, 155, 0, ${Math.max(0.22, normalized)})`,
      },
      round
    );
  } else {
    drawValueGrid(
      svg,
      focus.map,
      272,
      304,
      30,
      "",
      "plot-grid-cell feature",
      {
        maxValue: maxFeature,
        absolute: true,
        showValues: spotlight === "gradient" || spotlight === "update",
        color: (normalized) =>
          focus.shortLabel === "vertical"
            ? `rgba(0, 95, 115, ${Math.max(0.16, normalized)})`
            : `rgba(187, 62, 3, ${Math.max(0.16, normalized)})`,
      },
      round
    );
  }

  drawPanel(svg, 452, 82, 280, 344, {
    title: spotlight === "loss" ? "4. Loss from class choice" : "4. Pool and classify",
    subtitle:
      spotlight === "loss"
        ? `prediction ${snapshot.metrics.prediction} vs target ${snapshot.focusSample.label}`
        : `compare ${focus.shortLabel} with ${focus.otherShortLabel}`,
    ...outputPanel,
  });
  addText(svg, 478, 128, "Detector evidence", "plot-token-label");
  drawColumnBars(
    svg,
    [
      { label: focus.shortLabel, value: round(focus.pooledValue), color: focus.color },
      { label: focus.otherShortLabel, value: round(focus.otherValue), color: focus.otherColor },
    ],
    500,
    236,
    {
      maxValue: Math.max(1, Math.abs(focus.pooledValue), Math.abs(focus.otherValue)),
      barWidth: 36,
      gap: 92,
      showValues: spotlight === "gradient" || spotlight === "update",
      maxHeight: 78,
    }
  );

  addText(svg, 478, 286, "Class probabilities", "plot-token-label");
  drawColumnBars(
    svg,
    [
      { label: "class 0", value: round(guide.probabilities[0]), color: "#ee9b00" },
      { label: "class 1", value: round(guide.probabilities[1]), color: "#2a9d8f" },
    ],
    500,
    392,
    {
      maxValue: 1,
      barWidth: 36,
      gap: 92,
      showValues: spotlight === "loss" || spotlight === "update",
      maxHeight: 78,
    }
  );

  addText(
    svg,
    478,
    418,
    `prediction ${snapshot.metrics.prediction} · target ${snapshot.focusSample.label}`,
    "plot-token-label"
  );

  drawArrow(svg, 208, 182, 236, 162, { label: spotlight === "gradient" ? "reuse this patch" : "slide detector" });
  drawArrow(svg, 330, 238, 330, 258, { label: spotlight === "gradient" ? "strongest local cause" : "reuse" });
  drawArrow(svg, 424, 342, 452, 220, { label: spotlight === "loss" ? "becomes logits" : "strongest match" });
}

function renderRnnPlot({ svg, snapshot, getSelectedTrace, round }) {
  resetPlot(svg, 760, 430);
  const guide = snapshot.visualGuide;
  const spotlight = getSelectedTrace(snapshot)?.spotlight ?? "prediction";
  const sequence = guide.sequence ?? [];
  const hiddenStates = guide.hiddenStates ?? [];
  const previousHiddenStates = guide.previousHiddenStates ?? hiddenStates;
  const finalHidden = hiddenStates.at(-1) ?? 0;
  const previousFinalHidden = previousHiddenStates.at(-1) ?? finalHidden;
  const innerWidth = 430;
  const boxWidth = 58;
  const sequencePanel = getPanelColors({ active: matchesSpotlight(spotlight, "parameters"), accent: "#ee9b00" });
  const hiddenPanel = getPanelColors({ active: matchesSpotlight(spotlight, ["prediction", "gradient"]), accent: "#005f73" });
  const decisionPanel = getPanelColors({ active: matchesSpotlight(spotlight, ["loss", "update"]), accent: "#2a9d8f" });

  addText(svg, 44, 42, "RNN: keep one rolling memory instead of many separate outputs");
  addText(svg, 44, 60, `target ${snapshot.focusSample.label} · loss ${snapshot.metrics.loss}`, "plot-token-label");

  drawPanel(svg, 24, 82, 520, 98, {
    title: "1. Input sequence",
    subtitle: "read left to right, one value per time step",
    ...sequencePanel,
  });

  sequence.forEach((value, index) => {
    const x = 54 + index * (sequence.length > 1 ? innerWidth / (sequence.length - 1) : 0);
    svg.appendChild(
      createSvgElement("rect", {
        x,
        y: 124,
        width: boxWidth,
        height: 36,
        rx: 14,
        class: "plot-stage-box",
      })
    );
    addText(svg, x + boxWidth / 2, 146, `x${index + 1}=${round(value, 2)}`, "plot-tree-text", {
      "text-anchor": "middle",
    });
    if (index < sequence.length - 1) {
      const nextX = 54 + (index + 1) * (sequence.length > 1 ? innerWidth / (sequence.length - 1) : 0);
      drawArrow(svg, x + boxWidth, 142, nextX - 8, 142, { active: true });
    }
  });

  drawPanel(svg, 24, 206, 520, 168, {
    title: spotlight === "gradient" ? "2. BPTT path" : "2. Hidden-state chain",
    subtitle:
      spotlight === "gradient"
        ? "the error at the end still points backward through earlier states"
        : "treat h1 ... hT as one memory chain; only hT reaches the classifier",
    ...hiddenPanel,
  });

  hiddenStates.forEach((value, index) => {
    const x = 54 + index * (hiddenStates.length > 1 ? innerWidth / (hiddenStates.length - 1) : 0);
    const isFinal = index === hiddenStates.length - 1;
    const width = isFinal ? 72 : 60;
    const height = isFinal ? 56 : 46;
    const y = isFinal ? 274 : 280;
    const isActiveState = spotlight === "prediction" ? isFinal : spotlight === "gradient" ? index >= Math.max(0, hiddenStates.length - 3) : isFinal;
    svg.appendChild(
      createSvgElement("rect", {
        x,
        y,
        width,
        height,
        rx: 16,
        fill: isActiveState ? "rgba(0, 95, 115, 0.14)" : "rgba(255, 255, 255, 0.88)",
        stroke: isActiveState ? "rgba(0, 95, 115, 0.35)" : "rgba(111, 115, 105, 0.28)",
        "stroke-width": isActiveState ? 2.5 : 1.5,
        class: "plot-stage-box",
      })
    );
    addText(svg, x + width / 2, y + 22, `h${index + 1}`, "plot-token-label", {
      "text-anchor": "middle",
    });
    addText(svg, x + width / 2, y + 42, isActiveState ? String(round(value)) : "…", "plot-annotation", {
      "text-anchor": "middle",
      fill: isActiveState ? "#005f73" : undefined,
    });

    if (index < hiddenStates.length - 1) {
      const nextX = 54 + (index + 1) * (hiddenStates.length > 1 ? innerWidth / (hiddenStates.length - 1) : 0);
      drawArrow(svg, x + width, y + height / 2, nextX - 10, 303, {
        active: spotlight === "gradient" ? index >= Math.max(0, hiddenStates.length - 3) : true,
      });
    }
  });

  drawPanel(svg, 570, 82, 166, 292, {
    title: "3. Final decision",
    subtitle:
      spotlight === "loss"
        ? "turn the final memory into one probability"
        : spotlight === "update"
          ? "compare the final memory before and after the update"
          : "the classifier reads the final state",
    ...decisionPanel,
  });
  drawNumericCard(svg, 588, 128, 130, 110, {
    title: "Final memory",
    value: `hT=${round(finalHidden)}`,
    subtitle:
      spotlight === "update"
        ? `before hT=${round(previousFinalHidden)}`
        : "one summary for the whole sequence",
    fill: decisionPanel.fill,
    valueColor: "#005f73",
  });

  addText(svg, 588, 270, spotlight === "update" ? "Probability shift" : "Probability", "plot-token-label");
  drawColumnBars(
    svg,
    spotlight === "update"
      ? [
          { label: "before", value: guide.previousProbability, color: "rgba(111, 115, 105, 0.55)" },
          { label: "now", value: guide.outputProbability, color: "#2a9d8f" },
        ]
      : [{ label: "p", value: guide.outputProbability, color: "#2a9d8f" }],
    spotlight === "update" ? 602 : 628,
    336,
    {
      maxValue: 1,
      barWidth: spotlight === "update" ? 30 : 38,
      gap: 64,
      showValues: spotlight === "loss" || spotlight === "update",
      maxHeight: 78,
    }
  );
  addText(svg, 588, 362, `prediction ${snapshot.metrics.prediction}`, "plot-token-label");

  drawArrow(svg, 544, 302, 570, 228, { label: spotlight === "gradient" ? "back from hT" : "use hT" });
}

function renderResNetPlot({ svg, snapshot, getSelectedTrace }) {
  resetPlot(svg, 780, 460);
  const guide = snapshot.visualGuide;
  const spotlight = getSelectedTrace(snapshot)?.spotlight ?? "prediction";
  const identityPanel = getPanelColors({ active: matchesSpotlight(spotlight, "parameters"), accent: "#ee9b00" });
  const residualPanel = getPanelColors({ active: matchesSpotlight(spotlight, ["prediction", "gradient", "update"]), accent: "#2a9d8f" });
  const outputPanel = getPanelColors({ active: matchesSpotlight(spotlight, ["loss", "update"]), accent: "#6a4c93" });

  addText(svg, 44, 42, "ResNet: keep x, learn only the correction f(x)");
  addText(svg, 44, 60, `target ${snapshot.focusSample.label} · loss ${snapshot.metrics.loss}`, "plot-token-label");

  drawPanel(svg, 24, 94, 190, 280, {
    title: "1. Identity path",
    subtitle:
      spotlight === "gradient"
        ? "the skip path stays open, so gradients never lose x"
        : "the shortcut carries x forward without relearning it",
    ...identityPanel,
  });
  drawMiniBars(svg, guide.inputVector ?? [], 56, 178, "x", "#ee9b00", {
    width: 120,
    height: 94,
  });
  addText(svg, 56, 298, `skip mean ${snapshot.params.skipMean}`, "plot-token-label");

  drawPanel(svg, 252, 178, 190, 196, {
    title: spotlight === "gradient" ? "2. Learned delta" : "2. Learned correction",
    subtitle:
      spotlight === "update"
        ? "only the residual branch changes after the update"
        : spotlight === "gradient"
          ? "the branch learns the correction the gradient wants"
          : "the residual branch learns f(x)",
    ...residualPanel,
  });
  drawMiniBars(svg, guide.branch2Vector ?? [], 284, 246, "f(x)", "#2a9d8f", {
    width: 120,
    height: 92,
  });
  addText(svg, 284, 350, `delta mean ${snapshot.params.residualStrength}`, "plot-token-label");

  drawPanel(svg, 480, 94, 268, 280, {
    title: spotlight === "loss" ? "3. Classifier loss" : "3. Add and activate",
    subtitle:
      spotlight === "loss"
        ? "the loss is computed after skip-add and activation"
        : "the block outputs ReLU(x + f(x)) before classification",
    ...outputPanel,
  });
  drawMiniBars(svg, guide.outputVector ?? [], 516, 178, spotlight === "update" ? "output'" : "output", "#6a4c93", {
    width: 140,
    height: 94,
    previousValues: spotlight === "update" ? guide.previousOutputVector : [],
  });
  drawNumericCard(svg, 516, 278, 196, 74, {
    title: "Classifier",
    value: `p=${snapshot.metrics.prediction}`,
    subtitle: `bias ${snapshot.params.classifierBias}`,
    fill: outputPanel.fill,
    valueColor: "#6a4c93",
  });

  drawArrow(svg, 214, 180, 446, 180, { label: spotlight === "gradient" ? "keep x" : "skip x" });
  drawArrow(svg, 214, 274, 252, 274, { label: spotlight === "gradient" ? "learn correction" : "learn Δx" });
  drawArrow(svg, 442, 274, 480, 274, { label: spotlight === "loss" ? "classify" : "add" });
  drawPlusNode(svg, 462, 274);
}

export { renderCnnPlot, renderRnnPlot, renderResNetPlot, renderAttentionPlot };
