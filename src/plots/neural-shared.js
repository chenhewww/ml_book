import { createSvgElement } from "./shared.js";

function resetPlot(svg, width, height) {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
}

function addText(svg, x, y, text, className = "plot-annotation", attributes = {}) {
  const node = createSvgElement("text", {
    x,
    y,
    class: className,
    ...attributes,
  });
  node.textContent = text;
  svg.appendChild(node);
  return node;
}

function drawPanel(
  svg,
  x,
  y,
  width,
  height,
  {
    title = "",
    subtitle = "",
    fill = "rgba(255, 252, 245, 0.82)",
    stroke = "rgba(111, 115, 105, 0.24)",
  } = {}
) {
  svg.appendChild(
    createSvgElement("rect", {
      x,
      y,
      width,
      height,
      rx: 24,
      fill,
      stroke,
      "stroke-width": 1.5,
      class: "plot-panel-box",
    })
  );

  if (title) {
    addText(svg, x + 18, y + 28, title);
  }

  if (subtitle) {
    subtitle.split("\n").forEach((line, index) => {
      addText(svg, x + 18, y + 48 + index * 15, line, "plot-token-label");
    });
  }
}

function drawArrow(svg, x1, y1, x2, y2, { label = "", active = true } = {}) {
  const color = active ? "#005f73" : "rgba(111, 115, 105, 0.62)";
  svg.appendChild(
    createSvgElement("line", {
      x1,
      y1,
      x2,
      y2,
      stroke: color,
      "stroke-width": active ? 3.5 : 2.5,
      class: active ? "plot-tree-edge active" : "plot-tree-edge",
    })
  );

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 8;
  const points = [
    `${x2},${y2}`,
    `${x2 - size * Math.cos(angle - Math.PI / 6)},${y2 - size * Math.sin(angle - Math.PI / 6)}`,
    `${x2 - size * Math.cos(angle + Math.PI / 6)},${y2 - size * Math.sin(angle + Math.PI / 6)}`,
  ].join(" ");
  svg.appendChild(createSvgElement("polygon", { points, fill: color }));

  if (label) {
    addText(svg, (x1 + x2) / 2, (y1 + y2) / 2 - 8, label, "plot-token-label", {
      "text-anchor": "middle",
    });
  }
}

function drawValueGrid(
  svg,
  grid,
  originX,
  originY,
  cellSize,
  label,
  className = "plot-grid-cell",
  options = {},
  round = (value) => value
) {
  if (label) {
    addText(svg, originX, originY - 10, label);
  }

  const showValues = options.showValues ?? true;

  grid.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      const normalized = options.absolute
        ? Math.min(1, Math.abs(value) / (options.maxValue || 1))
        : Math.min(1, Math.max(0, value) / (options.maxValue || 1));
      const fill = options.color
        ? options.color(normalized, value)
        : `rgba(0, 95, 115, ${Math.max(0.12, normalized)})`;
      svg.appendChild(
        createSvgElement("rect", {
          x: originX + columnIndex * cellSize,
          y: originY + rowIndex * cellSize,
          width: cellSize - 3,
          height: cellSize - 3,
          rx: 6,
          class: className,
          fill,
        })
      );
      if (!showValues) {
        return;
      }
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

function drawGridSelection(
  svg,
  { originX, originY, cellSize, row = 0, column = 0, rows = 1, columns = 1, stroke = "#bb3e03" }
) {
  svg.appendChild(
    createSvgElement("rect", {
      x: originX + column * cellSize - 1,
      y: originY + row * cellSize - 1,
      width: columns * cellSize - 1,
      height: rows * cellSize - 1,
      rx: 10,
      fill: "none",
      stroke,
      "stroke-width": 3,
      "stroke-dasharray": "6 4",
    })
  );
}

function drawMiniBars(svg, values, originX, originY, label, color, options = {}) {
  if (label) {
    addText(svg, originX, originY - 12, label, "plot-token-label");
  }

  if (!values.length) {
    return;
  }

  const previousValues = options.previousValues ?? [];
  const width = options.width ?? Math.max(96, values.length * 18);
  const height = options.height ?? 72;
  const maxAbs = Math.max(
    1,
    ...values.map((value) => Math.abs(value)),
    ...previousValues.map((value) => Math.abs(value))
  );
  const step = width / Math.max(values.length, 1);
  const barWidth = Math.max(10, step - 6);
  const baselineY = originY + height / 2;

  svg.appendChild(
    createSvgElement("line", {
      x1: originX,
      y1: baselineY,
      x2: originX + width,
      y2: baselineY,
      stroke: "rgba(111, 115, 105, 0.28)",
      "stroke-width": 1.5,
    })
  );

  if (previousValues.length) {
    previousValues.forEach((value, index) => {
      const barHeight = Math.max(3, (Math.abs(value) / maxAbs) * (height / 2 - 10));
      const x = originX + index * step + (step - barWidth) / 2;
      const y = value >= 0 ? baselineY - barHeight : baselineY;
      svg.appendChild(
        createSvgElement("rect", {
          x,
          y,
          width: barWidth,
          height: barHeight,
          rx: 6,
          fill: "rgba(111, 115, 105, 0.18)",
          stroke: "rgba(111, 115, 105, 0.45)",
          "stroke-width": 1.2,
          "stroke-dasharray": "4 3",
        })
      );
    });
  }

  values.forEach((value, index) => {
    const barHeight = Math.max(3, (Math.abs(value) / maxAbs) * (height / 2 - 10));
    const x = originX + index * step + (step - barWidth) / 2;
    const y = value >= 0 ? baselineY - barHeight : baselineY;
    svg.appendChild(
      createSvgElement("rect", {
        x,
        y,
        width: barWidth,
        height: barHeight,
        rx: 6,
        fill: color,
        opacity: 0.9,
        class: "plot-output-bar",
      })
    );
  });
}

function drawColumnBars(svg, items, originX, baselineY, options = {}) {
  const barWidth = options.barWidth ?? 28;
  const gap = options.gap ?? 72;
  const maxHeight = options.maxHeight ?? 78;
  const maxValue = options.maxValue ?? Math.max(1, ...items.map((item) => Math.abs(item.value ?? 0)));

  items.forEach((item, index) => {
    const value = item.value ?? 0;
    const height = Math.max(4, (Math.abs(value) / maxValue) * maxHeight);
    const x = originX + index * gap;
    const y = baselineY - height;
    svg.appendChild(
      createSvgElement("rect", {
        x,
        y,
        width: barWidth,
        height,
        rx: 10,
        fill: item.color,
        class: "plot-vote-bar",
      })
    );

    if (options.showValues) {
      addText(svg, x + barWidth / 2, y - 6, String(item.value), "plot-token-label", {
        "text-anchor": "middle",
      });
    }

    addText(svg, x + barWidth / 2, baselineY + 18, item.label, "plot-token-label", {
      "text-anchor": "middle",
    });
  });
}

function drawNumericCard(
  svg,
  x,
  y,
  width,
  height,
  { title, value, subtitle = "", fill = "rgba(255, 255, 255, 0.88)", valueColor = "#005f73" }
) {
  drawPanel(svg, x, y, width, height, { title, fill });
  addText(svg, x + 18, y + 64, value, "plot-annotation", {
    fill: valueColor,
    "font-size": 24,
    "font-weight": 800,
  });
  if (subtitle) {
    subtitle.split("\n").forEach((line, index) => {
      addText(svg, x + 18, y + 86 + index * 15, line, "plot-token-label");
    });
  }
}

function matchesSpotlight(spotlight, values) {
  const list = Array.isArray(values) ? values : [values];
  return list.includes(spotlight);
}

function getPanelColors({ active = false, accent = "#005f73" } = {}) {
  if (active) {
    return (
      {
        "#005f73": { fill: "rgba(0, 95, 115, 0.09)", stroke: "rgba(0, 95, 115, 0.34)" },
        "#bb3e03": { fill: "rgba(187, 62, 3, 0.09)", stroke: "rgba(187, 62, 3, 0.34)" },
        "#2a9d8f": { fill: "rgba(42, 157, 143, 0.09)", stroke: "rgba(42, 157, 143, 0.34)" },
        "#6a4c93": { fill: "rgba(106, 76, 147, 0.09)", stroke: "rgba(106, 76, 147, 0.34)" },
        "#ee9b00": { fill: "rgba(238, 155, 0, 0.1)", stroke: "rgba(238, 155, 0, 0.34)" },
      }[accent] ?? { fill: "rgba(0, 95, 115, 0.09)", stroke: "rgba(0, 95, 115, 0.34)" }
    );
  }

  return {
    fill: "rgba(255, 252, 245, 0.68)",
    stroke: "rgba(111, 115, 105, 0.16)",
  };
}

export {
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
};
