function createSvgElement(tagName, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}

function mapLinearX(x) {
  return 60 + ((x + 4) / 8) * 520;
}

function mapLinearY(y) {
  return 370 - ((y + 7) / 14) * 300;
}

function createRegressionMapper(snapshot) {
  const curvePoints = snapshot.curvePoints ?? [];
  const xValues = [...snapshot.points.map((point) => point.x), ...curvePoints.map((point) => point.x)];
  const yValues = [...snapshot.points.map((point) => point.y), ...curvePoints.map((point) => point.y)];
  const minX = Math.min(...xValues) - 0.4;
  const maxX = Math.max(...xValues) + 0.4;
  const minY = Math.min(...yValues) - 0.8;
  const maxY = Math.max(...yValues) + 0.8;

  return {
    x: (value) => 60 + ((value - minX) / (maxX - minX)) * 520,
    y: (value) => 370 - ((value - minY) / (maxY - minY)) * 300,
  };
}

function createScatterMapper(snapshot, extraPoints = []) {
  const points = [...(snapshot.points ?? []), ...extraPoints].filter(Boolean);
  const xValues = points.map((point) => point.x1);
  const yValues = points.map((point) => point.x2);
  const minX = Math.min(...xValues) - 0.5;
  const maxX = Math.max(...xValues) + 0.5;
  const minY = Math.min(...yValues) - 0.5;
  const maxY = Math.max(...yValues) + 0.5;

  return {
    x: (value) => 70 + ((value - minX) / (maxX - minX || 1)) * 500,
    y: (value) => 370 - ((value - minY) / (maxY - minY || 1)) * 290,
    minX,
    maxX,
    minY,
    maxY,
  };
}

function renderGrid(svg) {
  [140, 220, 300].forEach((y) => {
    svg.appendChild(createSvgElement("line", { x1: 50, y1: y, x2: 590, y2: y, class: "plot-grid" }));
  });

  [140, 240, 340, 440, 540].forEach((x) => {
    svg.appendChild(createSvgElement("line", { x1: x, y1: 40, x2: x, y2: 380, class: "plot-grid" }));
  });

  svg.appendChild(createSvgElement("line", { x1: 50, y1: 380, x2: 590, y2: 380, class: "plot-axis" }));
  svg.appendChild(createSvgElement("line", { x1: 50, y1: 40, x2: 50, y2: 380, class: "plot-axis" }));
}

export {
  createSvgElement,
  mapLinearX,
  mapLinearY,
  createRegressionMapper,
  createScatterMapper,
  renderGrid,
};
