import { createSvgElement } from "./shared.js";

function drawValueGrid(svg, grid, originX, originY, cellSize, label, className = "plot-grid-cell", options = {}, round = (value) => value) {
  const title = createSvgElement("text", {
    x: originX,
    y: originY - 10,
    class: "plot-annotation",
  });
  title.textContent = label;
  svg.appendChild(title);

  grid.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      const normalized = options.absolute ? Math.min(1, Math.abs(value) / (options.maxValue || 1)) : Math.min(1, Math.max(0, value) / (options.maxValue || 1));
      const fill = options.color
        ? options.color(normalized, value)
        : `rgba(0, 95, 115, ${Math.max(0.12, normalized)})`;
      svg.appendChild(createSvgElement("rect", {
        x: originX + columnIndex * cellSize,
        y: originY + rowIndex * cellSize,
        width: cellSize - 3,
        height: cellSize - 3,
        rx: 6,
        class: className,
        fill,
      }));
      const text = createSvgElement("text", {
        x: originX + columnIndex * cellSize + (cellSize - 3) / 2,
        y: originY + rowIndex * cellSize + cellSize / 2 + 4,
        class: "plot-cell-value",
        "text-anchor": "middle",
      });
      text.textContent = String(round(value, 1));
      svg.appendChild(text);
    });
  });
}

function drawVectorBars(svg, values, originX, baselineY, label, color, className = "plot-output-bar") {
  const title = createSvgElement("text", {
    x: originX,
    y: baselineY - 72,
    class: "plot-token-label",
  });
  title.textContent = label;
  svg.appendChild(title);

  values.forEach((value, index) => {
    const height = Math.abs(value) * 34;
    svg.appendChild(createSvgElement("rect", {
      x: originX + index * 20,
      y: baselineY - (value >= 0 ? height : 0),
      width: 13,
      height,
      rx: 6,
      fill: color,
      class: className,
      opacity: 0.9,
    }));
    const tick = createSvgElement("text", {
      x: originX + index * 20 + 6,
      y: baselineY + (value >= 0 ? 14 : height + 18),
      class: "plot-token-label",
      "text-anchor": "middle",
    });
    tick.textContent = `${index + 1}`;
    svg.appendChild(tick);
  });
}

function renderCnnPlot({ svg, snapshot, getSelectedTrace, round }) {
  svg.innerHTML = "";
  const guide = snapshot.visualGuide;
  const selectedTrace = getSelectedTrace(snapshot);
  const spotlight = selectedTrace?.spotlight ?? "prediction";
  const inputGrid = guide.inputGrid;
  const maxFeature = Math.max(
    1,
    ...guide.verticalMap.flat().map((value) => Math.abs(value)),
    ...guide.horizontalMap.flat().map((value) => Math.abs(value))
  );

  drawValueGrid(svg, inputGrid, 44, 72, 28, "Input Patch", "plot-grid-cell image", {
    maxValue: 1,
    color: (normalized) => `rgba(238, 155, 0, ${Math.max(0.18, normalized)})`,
  }, round);
  drawValueGrid(svg, guide.kernelVertical, 210, 94, 24, spotlight === "update" ? "Kernel V'" : "Kernel V", "plot-grid-cell kernel", {
    maxValue: 2,
    absolute: true,
    color: (normalized, value) => value >= 0 ? `rgba(0, 95, 115, ${Math.max(0.18, normalized)})` : `rgba(187, 62, 3, ${Math.max(0.18, normalized)})`,
  }, round);
  drawValueGrid(svg, guide.kernelHorizontal, 210, 198, 24, spotlight === "update" ? "Kernel H'" : "Kernel H", "plot-grid-cell kernel", {
    maxValue: 2,
    absolute: true,
    color: (normalized, value) => value >= 0 ? `rgba(0, 95, 115, ${Math.max(0.18, normalized)})` : `rgba(187, 62, 3, ${Math.max(0.18, normalized)})`,
  }, round);
  drawValueGrid(svg, guide.verticalMap, 310, 94, 28, "Feature Map V", "plot-grid-cell feature", {
    maxValue: maxFeature,
    absolute: true,
  }, round);
  drawValueGrid(svg, guide.horizontalMap, 410, 94, 28, "Feature Map H", "plot-grid-cell feature", {
    maxValue: maxFeature,
    absolute: true,
  }, round);

  const probTitle = createSvgElement("text", {
    x: 310,
    y: 234,
    class: "plot-annotation",
  });
  probTitle.textContent = "Pooling + Softmax";
  svg.appendChild(probTitle);

  [
    { label: "vert", value: guide.pooled.vertical, x: 310, color: "#005f73" },
    { label: "hori", value: guide.pooled.horizontal, x: 366, color: "#bb3e03" },
    { label: "p0", value: guide.probabilities[0], x: 436, color: "#ee9b00" },
    { label: "p1", value: guide.probabilities[1], x: 492, color: "#2a9d8f" },
  ].forEach((bar) => {
    const height = bar.value * 80;
    svg.appendChild(createSvgElement("rect", {
      x: bar.x,
      y: 322 - height,
      width: 24,
      height,
      rx: 8,
      fill: bar.color,
      class: "plot-vote-bar",
    }));
    const label = createSvgElement("text", {
      x: bar.x + 12,
      y: 338,
      class: "plot-token-label",
      "text-anchor": "middle",
    });
    label.textContent = bar.label;
    svg.appendChild(label);
  });

  const note = createSvgElement("text", {
    x: 44,
    y: 400,
    class: "plot-annotation",
  });
  note.textContent = `class1 prob=${snapshot.metrics.prediction} target=${snapshot.focusSample.label} loss=${snapshot.metrics.loss}`;
  svg.appendChild(note);
}

function renderRnnPlot({ svg, snapshot, getSelectedTrace, round }) {
  svg.innerHTML = "";
  const guide = snapshot.visualGuide;
  const spotlight = getSelectedTrace(snapshot)?.spotlight ?? "prediction";
  const sequence = guide.sequence ?? [];
  const hiddenStates = guide.hiddenStates ?? [];
  const previousHidden = guide.previousHiddenStates ?? hiddenStates;

  const title = createSvgElement("text", {
    x: 44,
    y: 54,
    class: "plot-annotation",
  });
  title.textContent = "Sequence -> Hidden State Rollup";
  svg.appendChild(title);

  sequence.forEach((value, index) => {
    const x = 46 + index * 90;
    svg.appendChild(createSvgElement("rect", {
      x,
      y: 82,
      width: 56,
      height: 34,
      rx: 12,
      class: "plot-stage-box",
    }));
    const label = createSvgElement("text", {
      x: x + 28,
      y: 103,
      class: "plot-tree-text",
      "text-anchor": "middle",
    });
    label.textContent = `x${index + 1}=${round(value, 2)}`;
    svg.appendChild(label);
    if (index < sequence.length - 1) {
      svg.appendChild(createSvgElement("line", {
        x1: x + 56,
        y1: 99,
        x2: x + 84,
        y2: 99,
        class: "plot-tree-edge active",
      }));
    }
  });

  hiddenStates.forEach((value, index) => {
    const x = 52 + index * 90;
    const height = Math.abs(value) * 90;
    const baseY = 280;
    if (spotlight === "update") {
      const prevHeight = Math.abs(previousHidden[index]) * 90;
      svg.appendChild(createSvgElement("rect", {
        x,
        y: baseY - (previousHidden[index] >= 0 ? prevHeight : 0),
        width: 18,
        height: prevHeight,
        rx: 8,
        class: "plot-line previous",
      }));
    }
    svg.appendChild(createSvgElement("rect", {
      x: x + 22,
      y: baseY - (value >= 0 ? height : 0),
      width: 18,
      height,
      rx: 8,
      fill: "#005f73",
      class: "plot-output-bar",
    }));
    const label = createSvgElement("text", {
      x: x + 31,
      y: baseY + 18,
      class: "plot-token-label",
      "text-anchor": "middle",
    });
    label.textContent = `h${index + 1}`;
    svg.appendChild(label);
  });

  const probX = 500;
  const prob = guide.outputProbability;
  const probHeight = prob * 120;
  svg.appendChild(createSvgElement("rect", {
    x: probX,
    y: 250 - probHeight,
    width: 30,
    height: probHeight,
    rx: 10,
    fill: "#2a9d8f",
    class: "plot-vote-bar",
  }));
  const probLabel = createSvgElement("text", {
    x: probX + 15,
    y: 268,
    class: "plot-token-label",
    "text-anchor": "middle",
  });
  probLabel.textContent = "p";
  svg.appendChild(probLabel);

  const note = createSvgElement("text", {
    x: 44,
    y: 400,
    class: "plot-annotation",
  });
  note.textContent = `sequence prob=${snapshot.metrics.prediction} target=${snapshot.focusSample.label} loss=${snapshot.metrics.loss}`;
  svg.appendChild(note);
}

function renderResNetPlot({ svg, snapshot, getSelectedTrace }) {
  svg.innerHTML = "";
  const guide = snapshot.visualGuide;
  const spotlight = getSelectedTrace(snapshot)?.spotlight ?? "prediction";

  const title = createSvgElement("text", {
    x: 44,
    y: 54,
    class: "plot-annotation",
  });
  title.textContent = "Residual Block";
  svg.appendChild(title);

  drawVectorBars(svg, guide.inputVector ?? [], 44, 200, "Input", "#ee9b00");
  drawVectorBars(svg, guide.branch1Vector ?? [], 156, 200, "Branch 1", "#bb3e03");
  drawVectorBars(svg, guide.branch2Vector ?? [], 268, 200, "Branch 2", "#2a9d8f");
  drawVectorBars(svg, guide.addedVector ?? [], 380, 200, "Skip Add", "#005f73");
  drawVectorBars(svg, guide.outputVector ?? [], 492, 200, spotlight === "update" ? "Out'" : "Output", "#6a4c93");

  const skipLabel = createSvgElement("text", {
    x: 328,
    y: 92,
    class: "plot-annotation",
  });
  skipLabel.textContent = "identity + residual";
  svg.appendChild(skipLabel);

  const clsTitle = createSvgElement("text", {
    x: 44,
    y: 282,
    class: "plot-annotation",
  });
  clsTitle.textContent = "Classifier";
  svg.appendChild(clsTitle);
  drawVectorBars(svg, guide.classifierVector ?? [], 44, 380, "Head", "#005f73");

  const note = createSvgElement("text", {
    x: 230,
    y: 400,
    class: "plot-annotation",
  });
  note.textContent = `resnet prob=${snapshot.metrics.prediction} target=${snapshot.focusSample.label} loss=${snapshot.metrics.loss}`;
  svg.appendChild(note);
}

function formatTokenLabel(token, maxLength = 4) {
  return token.length > maxLength ? `${token.slice(0, maxLength - 1)}…` : token;
}

function drawAttentionHead(svg, tokens, matrix, headName, originX, originY, queryIndex, targetIndex, isUpdate, round, layout) {
  const { cellSize, labelColumnWidth } = layout;
  const matrixX = originX + labelColumnWidth;
  const activeMatrix = isUpdate && matrix.updatedAttentionMatrix ? matrix.updatedAttentionMatrix : matrix.attentionMatrix;
  const activeMask = matrix.maskMatrix ?? [];

  const headLabel = createSvgElement("text", {
    x: originX,
    y: originY - 48,
    class: "plot-annotation",
  });
  headLabel.textContent = headName;
  svg.appendChild(headLabel);

  tokens.forEach((token, index) => {
    const topLabel = createSvgElement("text", {
      x: matrixX + index * cellSize + cellSize / 2,
      y: originY - 16,
      class: "plot-token-label plot-token-label-top",
      "text-anchor": "end",
      transform: `rotate(-38 ${matrixX + index * cellSize + cellSize / 2} ${originY - 16})`,
    });
    topLabel.textContent = formatTokenLabel(token);
    svg.appendChild(topLabel);

    const leftLabel = createSvgElement("text", {
      x: originX + labelColumnWidth - 12,
      y: originY + index * cellSize + cellSize / 2 + 4,
      class: "plot-token-label",
      "text-anchor": "end",
    });
    leftLabel.textContent = token;
    svg.appendChild(leftLabel);
  });

  activeMatrix.forEach((row, rowIndex) => {
    row.forEach((weight, columnIndex) => {
      const rect = createSvgElement("rect", {
        x: matrixX + columnIndex * cellSize,
        y: originY + rowIndex * cellSize,
        width: cellSize - 4,
        height: cellSize - 4,
        rx: 8,
        fill: `rgba(0, 95, 115, ${Math.max(0.1, Math.min(0.95, weight))})`,
        class: `plot-attention-cell${rowIndex === queryIndex ? " focus-row" : ""}${activeMask[rowIndex]?.[columnIndex] ? " masked" : ""}`,
      });
      svg.appendChild(rect);

      if (activeMask[rowIndex]?.[columnIndex]) {
        const maskedText = createSvgElement("text", {
          x: matrixX + columnIndex * cellSize + (cellSize - 4) / 2,
          y: originY + rowIndex * cellSize + cellSize / 2 + 4,
          class: "plot-cell-value masked",
          "text-anchor": "middle",
        });
        maskedText.textContent = "×";
        svg.appendChild(maskedText);
      } else {
        const valueText = createSvgElement("text", {
          x: matrixX + columnIndex * cellSize + (cellSize - 4) / 2,
          y: originY + rowIndex * cellSize + cellSize / 2 + 4,
          class: "plot-cell-value",
          "text-anchor": "middle",
        });
        valueText.textContent = String(round(weight, 2));
        svg.appendChild(valueText);
      }
    });
  });

  svg.appendChild(createSvgElement("rect", {
    x: matrixX + targetIndex * cellSize - 2,
    y: originY + queryIndex * cellSize - 2,
    width: cellSize,
    height: cellSize,
    rx: 10,
    class: "plot-target-highlight",
  }));

  return {
    width: labelColumnWidth + tokens.length * cellSize,
    height: tokens.length * cellSize,
  };
}

function renderAttentionPlot({ svg, snapshot, getSelectedTrace, round }) {
  svg.innerHTML = "";
  const guide = snapshot.visualGuide;
  const tokens = guide.tokens;
  const isUpdate = getSelectedTrace(snapshot)?.spotlight === "update";
  const queryIndex = guide.queryIndex;
  const cellSize = Math.max(28, Math.min(38, Math.floor(330 / Math.max(tokens.length, 1))));
  const layout = {
    cellSize,
    labelColumnWidth: 108,
  };
  const heads = guide.heads ?? [{
    name: "Head",
    attentionMatrix: guide.attentionMatrix,
    updatedAttentionMatrix: guide.updatedAttentionMatrix,
  }];
  const headGap = 54;
  const topMargin = 110;
  const headOriginX = 44;
  const headWidth = layout.labelColumnWidth + tokens.length * cellSize;
  heads.forEach((head, index) => {
    drawAttentionHead(
      svg,
      tokens,
      head,
      head.name,
      headOriginX + index * (headWidth + headGap),
      topMargin,
      queryIndex,
      guide.targetIndex,
      isUpdate,
      round,
      layout
    );
  });

  const matrixBottom = topMargin + tokens.length * cellSize;
  const totalHeadsWidth = heads.length * headWidth + (heads.length - 1) * headGap;
  const note = createSvgElement("text", {
    x: headOriginX,
    y: 44,
    class: "plot-annotation",
  });
  note.textContent = `query="${snapshot.focusSample.token}" target="${tokens[guide.targetIndex]}" causal mask on residual+ln on`;
  svg.appendChild(note);

  if (guide.positionalEncodings?.length) {
    const posTitle = createSvgElement("text", {
      x: headOriginX,
      y: matrixBottom + 44,
      class: "plot-annotation",
    });
    posTitle.textContent = "Positional Encoding";
    svg.appendChild(posTitle);

    const rowsToShow = guide.positionalEncodings.length > 6
      ? [...guide.positionalEncodings.slice(0, 5), ["...", "...", "...", "..."], guide.positionalEncodings[guide.positionalEncodings.length - 1]]
      : guide.positionalEncodings;
    rowsToShow.forEach((encoding, index) => {
      const rowLabel = createSvgElement("text", {
        x: headOriginX,
        y: matrixBottom + 70 + index * 18,
        class: "plot-token-label",
      });
      if (encoding[0] === "...") {
        rowLabel.textContent = "...";
      } else {
        const tokenIndex = index < 5 || guide.positionalEncodings.length <= 6 ? index : guide.positionalEncodings.length - 1;
        rowLabel.textContent = `${tokens[tokenIndex]}: [${encoding.map((value) => round(value, 2)).join(", ")}]`;
      }
      svg.appendChild(rowLabel);
    });
  }

  const vectorStartX = Math.max(headOriginX + totalHeadsWidth - 290, 620);
  const vectorStartY = matrixBottom + 112;
  const vectorColumnGap = 106;
  const vectorRowGap = 108;
  const vectorGroups = [
    { label: "Attn", values: guide.outputVector ?? [], x: vectorStartX, y: vectorStartY, color: "#ee9b00" },
    { label: "Res1", values: guide.residualVector ?? [], x: vectorStartX + vectorColumnGap, y: vectorStartY, color: "#2a9d8f" },
    { label: "LN1", values: guide.normalizedVector ?? [], x: vectorStartX + vectorColumnGap * 2, y: vectorStartY, color: "#005f73" },
    { label: "FFN", values: guide.ffnOutput ?? [], x: vectorStartX, y: vectorStartY + vectorRowGap, color: "#bb3e03" },
    { label: "Res2", values: guide.residual2Vector ?? [], x: vectorStartX + vectorColumnGap, y: vectorStartY + vectorRowGap, color: "#94a51b" },
    { label: "LN2", values: guide.normalized2Vector ?? [], x: vectorStartX + vectorColumnGap * 2, y: vectorStartY + vectorRowGap, color: "#6a4c93" },
  ];
  vectorGroups.forEach((group) => drawVectorBars(svg, group.values, group.x, group.y, group.label, group.color));

  if (guide.normStats) {
    const normText = createSvgElement("text", {
      x: vectorStartX,
      y: vectorStartY + vectorRowGap + 94,
      class: "plot-token-label",
    });
    normText.textContent = `LN1 mean=${guide.normStats.mean} std=${guide.normStats.std} | LN2 mean=${guide.norm2Stats?.mean} std=${guide.norm2Stats?.std}`;
    svg.appendChild(normText);
  }

  const viewWidth = Math.max(1100, headOriginX + totalHeadsWidth + 40);
  const viewHeight = Math.max(760, vectorStartY + vectorRowGap + 120);
  svg.setAttribute("viewBox", `0 0 ${viewWidth} ${viewHeight}`);
}

export {
  renderCnnPlot,
  renderRnnPlot,
  renderResNetPlot,
  renderAttentionPlot,
};
