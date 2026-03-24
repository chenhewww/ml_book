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
import { renderRnnPlot, renderResNetPlot } from "./neural-recurrent.js";

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

export { renderCnnPlot, renderRnnPlot, renderResNetPlot, renderAttentionPlot };
