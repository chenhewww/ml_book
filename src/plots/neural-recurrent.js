import {
  addText,
  drawArrow,
  drawColumnBars,
  drawMiniBars,
  drawNumericCard,
  drawPanel,
  getPanelColors,
  matchesSpotlight,
  resetPlot,
} from "./neural-shared.js";
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

export { renderRnnPlot, renderResNetPlot };
