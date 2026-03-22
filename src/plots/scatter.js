import { createSvgElement, createRegressionMapper, createScatterMapper, renderGrid } from "./shared.js";

function renderRegressionPlot({ svg, snapshot, getSelectedTrace }) {
  svg.innerHTML = "";
  renderGrid(svg);
  const mapper = createRegressionMapper(snapshot);
  const selectedTrace = getSelectedTrace(snapshot);
  const spotlight = selectedTrace?.spotlight ?? "prediction";
  const showComparison = spotlight === "update" && snapshot.visualGuide;
  const showGradient = spotlight === "gradient";
  const showPrediction = spotlight === "prediction" || spotlight === "loss";
  const showLoss = spotlight === "loss";
  const previousLineClass = spotlight === "update" ? "plot-line previous" : "plot-line";
  const visibleCurvePoints = showComparison && snapshot.visualGuide?.updatedCurvePoints
    ? snapshot.visualGuide.updatedCurvePoints
    : snapshot.curvePoints;

  if (showComparison && snapshot.curvePoints?.length && snapshot.visualGuide.previousCurvePoints?.length) {
    const previousPath = snapshot.visualGuide.previousCurvePoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${mapper.x(point.x)} ${mapper.y(point.y)}`)
      .join(" ");
    svg.appendChild(createSvgElement("path", { d: previousPath, class: "plot-curve previous" }));
  }

  if (visibleCurvePoints?.length) {
    const path = visibleCurvePoints
      .map((point, index) => `${index === 0 ? "M" : "L"} ${mapper.x(point.x)} ${mapper.y(point.y)}`)
      .join(" ");
    svg.appendChild(createSvgElement("path", { d: path, class: `plot-curve${spotlight === "parameters" ? " emphasis" : ""}` }));
  } else {
    const startX = -4;
    const endX = 4;
    const previousModel = snapshot.visualGuide?.previousModel ?? snapshot.params;
    const currentModel = spotlight === "update" && snapshot.visualGuide?.updatedModel ? snapshot.visualGuide.updatedModel : snapshot.params;

    if (showComparison && snapshot.visualGuide?.previousModel) {
      const prevY1 = previousModel.weight * startX + previousModel.bias;
      const prevY2 = previousModel.weight * endX + previousModel.bias;
      svg.appendChild(createSvgElement("line", {
        x1: mapper.x(startX),
        y1: mapper.y(prevY1),
        x2: mapper.x(endX),
        y2: mapper.y(prevY2),
        class: previousLineClass,
      }));
    }

    const y1 = currentModel.weight * startX + currentModel.bias;
    const y2 = currentModel.weight * endX + currentModel.bias;

    svg.appendChild(createSvgElement("line", {
      x1: mapper.x(startX),
      y1: mapper.y(y1),
      x2: mapper.x(endX),
      y2: mapper.y(y2),
      class: `plot-line${spotlight === "parameters" || spotlight === "update" ? " emphasis" : ""}`,
    }));
  }

  snapshot.points.forEach((point) => {
    const isFocus = point.id === snapshot.focusSample.id;
    svg.appendChild(createSvgElement("circle", {
      cx: mapper.x(point.x),
      cy: mapper.y(point.y),
      r: isFocus ? 9 : 7,
      fill: isFocus ? "#bb3e03" : "#2a9d8f",
      class: `plot-point${isFocus ? " focus" : ""}`,
    }));
  });

  if (showPrediction || showLoss || showGradient || showComparison) {
    svg.appendChild(createSvgElement("line", {
      x1: mapper.x(snapshot.focusSample.x),
      y1: mapper.y(snapshot.focusSample.y),
      x2: mapper.x(snapshot.focusSample.x),
      y2: mapper.y(snapshot.metrics.prediction),
      class: `plot-sample-ray${showLoss ? " loss" : ""}`,
    }));

    svg.appendChild(createSvgElement("circle", {
      cx: mapper.x(snapshot.focusSample.x),
      cy: mapper.y(snapshot.metrics.prediction),
      r: 7,
      fill: showLoss ? "#bb3e03" : "#005f73",
      class: "plot-point focus predicted",
    }));
  }

  if (showGradient) {
    svg.appendChild(createSvgElement("text", {
      x: mapper.x(snapshot.focusSample.x) + 12,
      y: mapper.y(snapshot.metrics.prediction) - 12,
      class: "plot-annotation",
    })).textContent = snapshot.algorithmId === "two_layer_network"
      ? `dW = [${snapshot.params.gradInputToHidden1}, ${snapshot.params.gradInputToHidden2}]`
      : `grad = ${snapshot.params.gradientWeight ?? snapshot.params.gradientWeight1}`;
  }
}

function renderClassificationPlot({ svg, snapshot, getSelectedTrace }) {
  svg.innerHTML = "";
  renderGrid(svg);
  const selectedTrace = getSelectedTrace(snapshot);
  const spotlight = selectedTrace?.spotlight ?? "prediction";
  const showComparison = spotlight === "update" && snapshot.visualGuide;
  const showGradient = spotlight === "gradient";
  const showPrediction = spotlight === "prediction" || spotlight === "loss";
  const extraPoints = snapshot.visualGuide?.projectedPoint ? [snapshot.visualGuide.projectedPoint] : [];
  const mapper = createScatterMapper(snapshot, extraPoints);

  const currentModel = showComparison && snapshot.visualGuide?.updatedModel ? snapshot.visualGuide.updatedModel : snapshot.params;
  const { weight1, weight2, bias } = currentModel;
  const xLeft = mapper.minX;
  const xRight = mapper.maxX;
  const yLeft = weight2 === 0 ? 0 : -(weight1 * xLeft + bias) / weight2;
  const yRight = weight2 === 0 ? 0 : -(weight1 * xRight + bias) / weight2;
  const isSvm = snapshot.algorithmId === "linear_svm";

  function drawBoundary(model, className, offset = 0) {
    const leftY = model.weight2 === 0 ? 0 : -(model.weight1 * xLeft + model.bias + offset) / model.weight2;
    const rightY = model.weight2 === 0 ? 0 : -(model.weight1 * xRight + model.bias + offset) / model.weight2;
    svg.appendChild(createSvgElement("line", {
      x1: mapper.x(xLeft),
      y1: mapper.y(leftY),
      x2: mapper.x(xRight),
      y2: mapper.y(rightY),
      class: className,
    }));
  }

  if (showComparison && snapshot.visualGuide?.previousModel) {
    const previous = snapshot.visualGuide.previousModel;
    drawBoundary(previous, "plot-boundary previous");
  }

  drawBoundary(currentModel, `plot-boundary${spotlight === "parameters" || spotlight === "update" ? " emphasis" : ""}`);

  if (isSvm) {
    drawBoundary(currentModel, "plot-margin", 1);
    drawBoundary(currentModel, "plot-margin", -1);
  }

  snapshot.points.forEach((point) => {
    const isFocus = point.id === snapshot.focusSample.id;
    svg.appendChild(createSvgElement("circle", {
      cx: mapper.x(point.x1),
      cy: mapper.y(point.x2),
      r: isFocus ? 10 : 8,
      fill: point.label === 1 ? "#005f73" : "#ee9b00",
      class: `plot-point${isFocus ? " focus" : ""}`,
    }));
  });

  if (showPrediction || showGradient) {
    svg.appendChild(createSvgElement("text", {
      x: mapper.x(snapshot.focusSample.x1) + 12,
      y: mapper.y(snapshot.focusSample.x2) - 12,
      class: "plot-annotation",
    })).textContent = showGradient
      ? `dw = [${snapshot.params.gradientWeight1}, ${snapshot.params.gradientWeight2}]`
      : isSvm
        ? `margin = ${snapshot.params.margin}`
        : `p = ${snapshot.metrics.prediction}`;
  }
}

function renderPcaPlot({ svg, snapshot, getSelectedTrace }) {
  svg.innerHTML = "";
  renderGrid(svg);
  const selectedTrace = getSelectedTrace(snapshot);
  const spotlight = selectedTrace?.spotlight ?? "prediction";
  const guide = snapshot.visualGuide;
  const mapper = createScatterMapper(snapshot, [
    guide?.mean ? { x1: guide.mean.x1, x2: guide.mean.x2 } : null,
    guide?.projectedPoint ? { x1: guide.projectedPoint.x1, x2: guide.projectedPoint.x2 } : null,
  ]);
  const principalScale = Math.max(mapper.maxX - mapper.minX, mapper.maxY - mapper.minY) * 0.8;
  const x1 = guide.mean.x1 - guide.principalVector.x * principalScale;
  const y1 = guide.mean.x2 - guide.principalVector.y * principalScale;
  const x2 = guide.mean.x1 + guide.principalVector.x * principalScale;
  const y2 = guide.mean.x2 + guide.principalVector.y * principalScale;

  svg.appendChild(createSvgElement("line", {
    x1: mapper.x(x1),
    y1: mapper.y(y1),
    x2: mapper.x(x2),
    y2: mapper.y(y2),
    class: `plot-boundary${spotlight === "gradient" || spotlight === "update" ? " emphasis" : ""}`,
  }));

  snapshot.points.forEach((point) => {
    const isFocus = point.id === snapshot.focusSample.id;
    svg.appendChild(createSvgElement("circle", {
      cx: mapper.x(point.x1),
      cy: mapper.y(point.x2),
      r: isFocus ? 10 : 8,
      fill: isFocus ? "#bb3e03" : "#2a9d8f",
      class: `plot-point${isFocus ? " focus" : ""}`,
    }));
  });

  svg.appendChild(createSvgElement("circle", {
    cx: mapper.x(guide.mean.x1),
    cy: mapper.y(guide.mean.x2),
    r: 8,
    fill: "#005f73",
    class: "plot-point mean",
  }));

  if (spotlight === "prediction" || spotlight === "update" || spotlight === "loss") {
    svg.appendChild(createSvgElement("line", {
      x1: mapper.x(snapshot.focusSample.x1),
      y1: mapper.y(snapshot.focusSample.x2),
      x2: mapper.x(guide.projectedPoint.x1),
      y2: mapper.y(guide.projectedPoint.x2),
      class: "plot-sample-ray",
    }));
  }

  svg.appendChild(createSvgElement("circle", {
    cx: mapper.x(guide.projectedPoint.x1),
    cy: mapper.y(guide.projectedPoint.x2),
    r: 7,
    fill: "#ee9b00",
    class: "plot-point projected",
  }));

  const annotationText =
    spotlight === "loss"
      ? `var = ${snapshot.params.covarianceXY}`
      : spotlight === "gradient"
        ? `PC1 = [${snapshot.params.principalX}, ${snapshot.params.principalY}]`
        : `z = ${snapshot.metrics.prediction}`;

  svg.appendChild(createSvgElement("text", {
    x: mapper.x(guide.projectedPoint.x1) + 12,
    y: mapper.y(guide.projectedPoint.x2) - 12,
    class: "plot-annotation",
  })).textContent = annotationText;
}

function renderClusteringPlot({ svg, snapshot, getSelectedTrace }) {
  svg.innerHTML = "";
  renderGrid(svg);
  const guide = snapshot.visualGuide;
  const selectedTrace = getSelectedTrace(snapshot);
  const spotlight = selectedTrace?.spotlight ?? "prediction";
  const mapper = createScatterMapper(snapshot, guide.centroids);
  const palette = ["#ee9b00", "#2a9d8f", "#005f73"];

  snapshot.points.forEach((point) => {
    const isFocus = point.id === snapshot.focusSample.id;
    svg.appendChild(createSvgElement("circle", {
      cx: mapper.x(point.x1),
      cy: mapper.y(point.x2),
      r: isFocus ? 10 : 8,
      fill: palette[point.cluster ?? guide.assignedCluster],
      class: `plot-point${isFocus ? " focus" : ""}`,
    }));
  });

  if (spotlight === "update") {
    guide.previousCentroids.forEach((centroid) => {
      svg.appendChild(createSvgElement("circle", {
        cx: mapper.x(centroid.x1),
        cy: mapper.y(centroid.x2),
        r: 11,
        class: "plot-centroid previous",
      }));
    });
  }

  guide.centroids.forEach((centroid, index) => {
    svg.appendChild(createSvgElement("circle", {
      cx: mapper.x(centroid.x1),
      cy: mapper.y(centroid.x2),
      r: 12,
      fill: palette[index],
      class: "plot-centroid",
    }));
  });

  if (spotlight === "prediction" || spotlight === "loss" || spotlight === "gradient") {
    const centroid = guide.centroids[guide.assignedCluster];
    svg.appendChild(createSvgElement("line", {
      x1: mapper.x(snapshot.focusSample.x1),
      y1: mapper.y(snapshot.focusSample.x2),
      x2: mapper.x(centroid.x1),
      y2: mapper.y(centroid.x2),
      class: "plot-sample-ray",
    }));
  }

  const note = createSvgElement("text", {
    x: 420,
    y: 54,
    class: "plot-annotation",
  });
  note.textContent = `cluster=${snapshot.params.assignedCluster} inertia=${snapshot.metrics.loss}`;
  svg.appendChild(note);
}

export {
  renderRegressionPlot,
  renderClassificationPlot,
  renderPcaPlot,
  renderClusteringPlot,
};
