import { createSvgElement, createScatterMapper } from "./shared.js";

function renderDecisionTreePlot({ svg, snapshot, getSelectedTrace, round }) {
  svg.innerHTML = "";
  const guide = snapshot.visualGuide ?? {};
  const selectedTrace = getSelectedTrace(snapshot);
  const spotlight = selectedTrace?.spotlight ?? "prediction";
  const scatterPanel = { x: 44, y: 42, width: 272, height: 336 };
  const treePanel = { x: 338, y: 42, width: 260, height: 336 };
  const points = snapshot.points ?? [];
  const xValues = points.map((point) => point.x1);
  const yValues = points.map((point) => point.x2);
  const minX = Math.min(...xValues) - 0.4;
  const maxX = Math.max(...xValues) + 0.4;
  const minY = Math.min(...yValues) - 0.4;
  const maxY = Math.max(...yValues) + 0.4;
  const region = { minX, maxX, minY, maxY };
  const pointMap = new Map(points.map((point) => [point.id, point]));
  const mapper = {
    x: (value) => scatterPanel.x + 24 + ((value - minX) / (maxX - minX || 1)) * (scatterPanel.width - 48),
    y: (value) => scatterPanel.y + scatterPanel.height - 24 - ((value - minY) / (maxY - minY || 1)) * (scatterPanel.height - 48),
  };

  function computeLeaf(ids, pathId) {
    const samples = (ids ?? []).map((id) => pointMap.get(id)).filter(Boolean);
    const counts = samples.reduce(
      (result, sample) => {
        if (sample.label === 1) {
          result.ones += 1;
        } else {
          result.zeros += 1;
        }
        return result;
      },
      { zeros: 0, ones: 0 }
    );
    const total = Math.max(samples.length, 1);
    const p0 = counts.zeros / total;
    const p1 = counts.ones / total;
    return {
      pathId,
      prediction: counts.ones >= counts.zeros ? 1 : 0,
      counts,
      impurity: 1 - (p0 * p0 + p1 * p1),
      sampleIds: samples.map((sample) => sample.id),
    };
  }

  function splitRegion(currentRegion, split, branch) {
    if (!split) {
      return currentRegion;
    }
    if (split.feature === "x1") {
      return branch === "left"
        ? { ...currentRegion, maxX: split.threshold }
        : { ...currentRegion, minX: split.threshold };
    }
    return branch === "left"
      ? { ...currentRegion, maxY: split.threshold }
      : { ...currentRegion, minY: split.threshold };
  }

  function drawPanel(panel, title) {
    svg.appendChild(createSvgElement("rect", {
      x: panel.x,
      y: panel.y,
      width: panel.width,
      height: panel.height,
      rx: 18,
      class: "plot-panel-box",
    }));
    const label = createSvgElement("text", {
      x: panel.x + 18,
      y: panel.y + 24,
      class: "plot-annotation",
    });
    label.textContent = title;
    svg.appendChild(label);
  }

  function drawScatterGrid() {
    for (let index = 1; index <= 4; index += 1) {
      const x = scatterPanel.x + 24 + ((scatterPanel.width - 48) / 5) * index;
      const y = scatterPanel.y + 24 + ((scatterPanel.height - 48) / 5) * index;
      svg.appendChild(createSvgElement("line", {
        x1: x,
        y1: scatterPanel.y + 24,
        x2: x,
        y2: scatterPanel.y + scatterPanel.height - 24,
        class: "plot-grid",
      }));
      svg.appendChild(createSvgElement("line", {
        x1: scatterPanel.x + 24,
        y1: y,
        x2: scatterPanel.x + scatterPanel.width - 24,
        y2: y,
        class: "plot-grid",
      }));
    }

    svg.appendChild(createSvgElement("line", {
      x1: scatterPanel.x + 24,
      y1: scatterPanel.y + scatterPanel.height - 24,
      x2: scatterPanel.x + scatterPanel.width - 24,
      y2: scatterPanel.y + scatterPanel.height - 24,
      class: "plot-axis",
    }));
    svg.appendChild(createSvgElement("line", {
      x1: scatterPanel.x + 24,
      y1: scatterPanel.y + 24,
      x2: scatterPanel.x + 24,
      y2: scatterPanel.y + scatterPanel.height - 24,
      class: "plot-axis",
    }));
  }

  function drawSplitLine(split, currentRegion, active = false) {
    if (!split) {
      return;
    }
    const className = `plot-split-line${active ? " active" : ""}`;
    if (split.feature === "x1") {
      svg.appendChild(createSvgElement("line", {
        x1: mapper.x(split.threshold),
        y1: mapper.y(currentRegion.maxY),
        x2: mapper.x(split.threshold),
        y2: mapper.y(currentRegion.minY),
        class: className,
      }));
    } else {
      svg.appendChild(createSvgElement("line", {
        x1: mapper.x(currentRegion.minX),
        y1: mapper.y(split.threshold),
        x2: mapper.x(currentRegion.maxX),
        y2: mapper.y(split.threshold),
        class: className,
      }));
    }
  }

  function drawTreeEdge(from, to, active = false) {
    svg.appendChild(createSvgElement("line", {
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      class: `plot-tree-edge${active ? " active" : ""}`,
    }));
  }

  function drawTreeNode(node, title, detail, options = {}) {
    const width = options.width ?? 92;
    const height = options.height ?? 52;
    const groupClass = `plot-tree-node${options.active ? " active" : ""}${options.leaf ? " leaf" : ""}`;
    svg.appendChild(createSvgElement("rect", {
      x: node.x - width / 2,
      y: node.y - height / 2,
      width,
      height,
      rx: 14,
      class: groupClass,
      fill: options.fill,
    }));
    const titleNode = createSvgElement("text", {
      x: node.x,
      y: node.y - 4,
      class: "plot-tree-text",
      "text-anchor": "middle",
    });
    titleNode.textContent = title;
    svg.appendChild(titleNode);
    const detailNode = createSvgElement("text", {
      x: node.x,
      y: node.y + 14,
      class: "plot-tree-subtext",
      "text-anchor": "middle",
    });
    detailNode.textContent = detail;
    svg.appendChild(detailNode);
  }

  drawPanel(scatterPanel, "Data Split");
  drawPanel(treePanel, "Tree Path");
  drawScatterGrid();

  const rootSplit = guide.rootSplit;
  const leftSplit = guide.leftSplit;
  const rightSplit = guide.rightSplit;
  const leftLeaf = rootSplit ? computeLeaf(rootSplit.leftIds, "left") : guide.leaf;
  const rightLeaf = rootSplit ? computeLeaf(rootSplit.rightIds, "right") : guide.leaf;
  const leftLeftLeaf = leftSplit ? computeLeaf(leftSplit.leftIds, "left-left") : null;
  const leftRightLeaf = leftSplit ? computeLeaf(leftSplit.rightIds, "left-right") : null;
  const rightLeftLeaf = rightSplit ? computeLeaf(rightSplit.leftIds, "right-left") : null;
  const rightRightLeaf = rightSplit ? computeLeaf(rightSplit.rightIds, "right-right") : null;

  if (rootSplit) {
    drawSplitLine(rootSplit, region, spotlight !== "gradient");
    if (leftSplit) {
      drawSplitLine(leftSplit, splitRegion(region, rootSplit, "left"), spotlight === "gradient" || spotlight === "update");
    }
    if (rightSplit) {
      drawSplitLine(rightSplit, splitRegion(region, rootSplit, "right"), spotlight === "gradient" || spotlight === "update");
    }
  }

  const activeLeafIds = new Set((guide.leaf?.sampleIds ?? []));
  points.forEach((point) => {
    const isFocus = point.id === snapshot.focusSample.id;
    const isLeafPoint = spotlight === "update" && activeLeafIds.has(point.id);
    if (isLeafPoint) {
      svg.appendChild(createSvgElement("circle", {
        cx: mapper.x(point.x1),
        cy: mapper.y(point.x2),
        r: isFocus ? 15 : 12,
        class: "plot-leaf-ring",
      }));
    }
    svg.appendChild(createSvgElement("circle", {
      cx: mapper.x(point.x1),
      cy: mapper.y(point.x2),
      r: isFocus ? 10 : 8,
      fill: point.label === 1 ? "#005f73" : "#ee9b00",
      class: `plot-point${isFocus ? " focus" : ""}`,
    }));
  });

  const note = createSvgElement("text", {
    x: 56,
    y: 400,
    class: "plot-annotation",
  });
  note.textContent = `predict=${guide.leaf?.prediction} target=${snapshot.focusSample.label} leaf gini=${snapshot.metrics.loss}`;
  svg.appendChild(note);

  const rootNode = { x: 468, y: 104 };
  const leftNode = { x: 406, y: 196 };
  const rightNode = { x: 532, y: 196 };
  const leftLeftNode = { x: 372, y: 300 };
  const leftRightNode = { x: 442, y: 300 };
  const rightLeftNode = { x: 494, y: 300 };
  const rightRightNode = { x: 564, y: 300 };
  const activeRootSide = guide.activePath?.rootSide;
  const activeBranchSide = guide.activePath?.branchSide;
  const isLeftPath = activeRootSide === "left";
  const isRightPath = activeRootSide === "right";

  if (rootSplit) {
    drawTreeEdge(rootNode, leftNode, isLeftPath);
    drawTreeEdge(rootNode, rightNode, isRightPath);
    drawTreeNode(
      rootNode,
      `${rootSplit.feature} <= ${round(rootSplit.threshold)}`,
      `gain ${round(rootSplit.gain)}`,
      { active: spotlight === "prediction" || spotlight === "loss" || spotlight === "update" }
    );

    if (leftSplit) {
      drawTreeEdge(leftNode, leftLeftNode, isLeftPath && activeBranchSide === "left");
      drawTreeEdge(leftNode, leftRightNode, isLeftPath && activeBranchSide === "right");
      drawTreeNode(
        leftNode,
        `${leftSplit.feature} <= ${round(leftSplit.threshold)}`,
        `gain ${round(leftSplit.gain)}`,
        { active: isLeftPath && (spotlight === "gradient" || spotlight === "update") }
      );
      drawTreeNode(
        leftLeftNode,
        `Leaf ${leftLeftLeaf.prediction}`,
        `0:${leftLeftLeaf.counts.zeros} 1:${leftLeftLeaf.counts.ones}`,
        {
          active: isLeftPath && activeBranchSide === "left" && spotlight === "update",
          leaf: true,
          fill: leftLeftLeaf.prediction === 1 ? "rgba(0,95,115,0.16)" : "rgba(238,155,0,0.18)",
        }
      );
      drawTreeNode(
        leftRightNode,
        `Leaf ${leftRightLeaf.prediction}`,
        `0:${leftRightLeaf.counts.zeros} 1:${leftRightLeaf.counts.ones}`,
        {
          active: isLeftPath && activeBranchSide === "right" && spotlight === "update",
          leaf: true,
          fill: leftRightLeaf.prediction === 1 ? "rgba(0,95,115,0.16)" : "rgba(238,155,0,0.18)",
        }
      );
    } else {
      drawTreeNode(
        leftNode,
        `Leaf ${leftLeaf.prediction}`,
        `0:${leftLeaf.counts.zeros} 1:${leftLeaf.counts.ones}`,
        {
          active: isLeftPath && spotlight === "update",
          leaf: true,
          fill: leftLeaf.prediction === 1 ? "rgba(0,95,115,0.16)" : "rgba(238,155,0,0.18)",
        }
      );
    }

    if (rightSplit) {
      drawTreeEdge(rightNode, rightLeftNode, isRightPath && activeBranchSide === "left");
      drawTreeEdge(rightNode, rightRightNode, isRightPath && activeBranchSide === "right");
      drawTreeNode(
        rightNode,
        `${rightSplit.feature} <= ${round(rightSplit.threshold)}`,
        `gain ${round(rightSplit.gain)}`,
        { active: isRightPath && (spotlight === "gradient" || spotlight === "update") }
      );
      drawTreeNode(
        rightLeftNode,
        `Leaf ${rightLeftLeaf.prediction}`,
        `0:${rightLeftLeaf.counts.zeros} 1:${rightLeftLeaf.counts.ones}`,
        {
          active: isRightPath && activeBranchSide === "left" && spotlight === "update",
          leaf: true,
          fill: rightLeftLeaf.prediction === 1 ? "rgba(0,95,115,0.16)" : "rgba(238,155,0,0.18)",
        }
      );
      drawTreeNode(
        rightRightNode,
        `Leaf ${rightRightLeaf.prediction}`,
        `0:${rightRightLeaf.counts.zeros} 1:${rightRightLeaf.counts.ones}`,
        {
          active: isRightPath && activeBranchSide === "right" && spotlight === "update",
          leaf: true,
          fill: rightRightLeaf.prediction === 1 ? "rgba(0,95,115,0.16)" : "rgba(238,155,0,0.18)",
        }
      );
    } else {
      drawTreeNode(
        rightNode,
        `Leaf ${rightLeaf.prediction}`,
        `0:${rightLeaf.counts.zeros} 1:${rightLeaf.counts.ones}`,
        {
          active: isRightPath && spotlight === "update",
          leaf: true,
          fill: rightLeaf.prediction === 1 ? "rgba(0,95,115,0.16)" : "rgba(238,155,0,0.18)",
        }
      );
    }
  } else {
    drawTreeNode(
      rootNode,
      `Leaf ${guide.leaf?.prediction ?? 0}`,
      `0:${guide.leaf?.counts?.zeros ?? 0} 1:${guide.leaf?.counts?.ones ?? 0}`,
      {
        active: true,
        leaf: true,
        fill: (guide.leaf?.prediction ?? 0) === 1 ? "rgba(0,95,115,0.16)" : "rgba(238,155,0,0.18)",
      }
    );
  }
}

function renderRandomForestPlot({ svg, snapshot, getSelectedTrace, round }) {
  svg.innerHTML = "";
  const guide = snapshot.visualGuide ?? {};
  const trees = guide.trees ?? [];
  const selectedTrace = getSelectedTrace(snapshot);
  const spotlight = selectedTrace?.spotlight ?? "prediction";
  const scatterPanel = { x: 44, y: 42, width: 272, height: 336 };
  const forestPanel = { x: 336, y: 42, width: 264, height: 336 };
  const points = snapshot.points ?? [];
  const xValues = points.map((point) => point.x1);
  const yValues = points.map((point) => point.x2);
  const minX = Math.min(...xValues) - 0.4;
  const maxX = Math.max(...xValues) + 0.4;
  const minY = Math.min(...yValues) - 0.4;
  const maxY = Math.max(...yValues) + 0.4;
  const mapper = {
    x: (value) => scatterPanel.x + 24 + ((value - minX) / (maxX - minX || 1)) * (scatterPanel.width - 48),
    y: (value) => scatterPanel.y + scatterPanel.height - 24 - ((value - minY) / (maxY - minY || 1)) * (scatterPanel.height - 48),
  };

  function drawPanel(panel, title) {
    svg.appendChild(createSvgElement("rect", {
      x: panel.x,
      y: panel.y,
      width: panel.width,
      height: panel.height,
      rx: 18,
      class: "plot-panel-box",
    }));
    const label = createSvgElement("text", {
      x: panel.x + 18,
      y: panel.y + 24,
      class: "plot-annotation",
    });
    label.textContent = title;
    svg.appendChild(label);
  }

  function drawScatterGrid() {
    for (let index = 1; index <= 4; index += 1) {
      const x = scatterPanel.x + 24 + ((scatterPanel.width - 48) / 5) * index;
      const y = scatterPanel.y + 24 + ((scatterPanel.height - 48) / 5) * index;
      svg.appendChild(createSvgElement("line", {
        x1: x,
        y1: scatterPanel.y + 24,
        x2: x,
        y2: scatterPanel.y + scatterPanel.height - 24,
        class: "plot-grid",
      }));
      svg.appendChild(createSvgElement("line", {
        x1: scatterPanel.x + 24,
        y1: y,
        x2: scatterPanel.x + scatterPanel.width - 24,
        y2: y,
        class: "plot-grid",
      }));
    }

    svg.appendChild(createSvgElement("line", {
      x1: scatterPanel.x + 24,
      y1: scatterPanel.y + scatterPanel.height - 24,
      x2: scatterPanel.x + scatterPanel.width - 24,
      y2: scatterPanel.y + scatterPanel.height - 24,
      class: "plot-axis",
    }));
    svg.appendChild(createSvgElement("line", {
      x1: scatterPanel.x + 24,
      y1: scatterPanel.y + 24,
      x2: scatterPanel.x + 24,
      y2: scatterPanel.y + scatterPanel.height - 24,
      class: "plot-axis",
    }));
  }

  function drawSplitLine(split, color, emphasis = false) {
    if (!split) {
      return;
    }
    const lineAttrs = {
      stroke: color,
      "stroke-width": emphasis ? 4 : 2.5,
      "stroke-dasharray": emphasis ? "6 3" : "7 5",
      opacity: emphasis ? 0.98 : 0.6,
    };
    if (split.feature === "x1") {
      svg.appendChild(createSvgElement("line", {
        x1: mapper.x(split.threshold),
        y1: scatterPanel.y + 24,
        x2: mapper.x(split.threshold),
        y2: scatterPanel.y + scatterPanel.height - 24,
        ...lineAttrs,
      }));
    } else {
      svg.appendChild(createSvgElement("line", {
        x1: scatterPanel.x + 24,
        y1: mapper.y(split.threshold),
        x2: scatterPanel.x + scatterPanel.width - 24,
        y2: mapper.y(split.threshold),
        ...lineAttrs,
      }));
    }
  }

  function drawForestNode(x, y, text, subtext, color, active = false, leaf = false) {
    svg.appendChild(createSvgElement("rect", {
      x: x - 32,
      y: y - 18,
      width: 64,
      height: 36,
      rx: 12,
      class: `plot-tree-node${active ? " active" : ""}${leaf ? " leaf" : ""}`,
      fill: leaf ? `${color}22` : undefined,
      stroke: active ? color : undefined,
    }));
    const title = createSvgElement("text", {
      x,
      y: y - 2,
      class: "plot-tree-text",
      "text-anchor": "middle",
    });
    title.textContent = text;
    svg.appendChild(title);
    const detail = createSvgElement("text", {
      x,
      y: y + 12,
      class: "plot-tree-subtext",
      "text-anchor": "middle",
    });
    detail.textContent = subtext;
    svg.appendChild(detail);
  }

  function drawForestEdge(x1, y1, x2, y2, color, active = false) {
    svg.appendChild(createSvgElement("line", {
      x1,
      y1,
      x2,
      y2,
      class: `plot-tree-edge${active ? " active" : ""}`,
      stroke: active ? color : undefined,
    }));
  }

  drawPanel(scatterPanel, "Bagged Data View");
  drawPanel(forestPanel, "Forest Vote");
  drawScatterGrid();

  trees.forEach((tree) => {
    const emphasizeRoot = spotlight === "prediction" || spotlight === "loss";
    drawSplitLine(tree.rootSplit, tree.color, emphasizeRoot);
    if ((spotlight === "gradient" || spotlight === "update") && tree.activePath?.rootSide) {
      const activeBranchSplit = tree.activePath.rootSide === "left" ? tree.leftSplit : tree.rightSplit;
      drawSplitLine(activeBranchSplit, tree.color, true);
    }
  });

  points.forEach((point) => {
    const isFocus = point.id === snapshot.focusSample.id;
    svg.appendChild(createSvgElement("circle", {
      cx: mapper.x(point.x1),
      cy: mapper.y(point.x2),
      r: isFocus ? 11 : 8,
      fill: point.label === 1 ? "#005f73" : "#ee9b00",
      class: `plot-point${isFocus ? " focus" : ""}`,
    }));
  });

  const voteCounts = guide.voteCounts ?? { zeros: 0, ones: 0 };
  const voteMax = Math.max(voteCounts.zeros, voteCounts.ones, 1);
  const voteBarY = 88;
  [
    { label: "Class 0", value: voteCounts.zeros, color: "#ee9b00", x: 366 },
    { label: "Class 1", value: voteCounts.ones, color: "#005f73", x: 480 },
  ].forEach((bar) => {
    const title = createSvgElement("text", {
      x: bar.x,
      y: voteBarY,
      class: "plot-token-label",
    });
    title.textContent = `${bar.label} ${bar.value}`;
    svg.appendChild(title);
    svg.appendChild(createSvgElement("rect", {
      x: bar.x,
      y: voteBarY + 8,
      width: 86,
      height: 12,
      rx: 6,
      fill: "rgba(111, 115, 105, 0.16)",
    }));
    svg.appendChild(createSvgElement("rect", {
      x: bar.x,
      y: voteBarY + 8,
      width: (bar.value / voteMax) * 86,
      height: 12,
      rx: 6,
      fill: bar.color,
      class: "plot-vote-bar",
    }));
  });

  trees.forEach((tree, index) => {
    const cardX = 352;
    const cardY = 124 + index * 82;
    const cardWidth = 232;
    const cardHeight = 72;
    const branchSplit = tree.activePath?.rootSide === "left" ? tree.leftSplit : tree.rightSplit;
    const branchSide = tree.activePath?.branchSide;
    const bagText = tree.bootstrapIds.slice(0, 4).join(",");

    svg.appendChild(createSvgElement("rect", {
      x: cardX,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      rx: 16,
      class: "plot-forest-card",
      stroke: tree.color,
    }));

    const header = createSvgElement("text", {
      x: cardX + 14,
      y: cardY + 18,
      class: "plot-annotation",
      fill: tree.color,
    });
    header.textContent = `${tree.name} | ${tree.featurePool.join("+")} | bag ${bagText}`;
    svg.appendChild(header);

    const rootX = cardX + 38;
    const rootY = cardY + 46;
    const branchX = cardX + 116;
    const leafX = cardX + 194;
    drawForestEdge(rootX + 32, rootY, branchX - 32, rootY, tree.color, spotlight !== "update");
    drawForestEdge(branchX + 32, rootY, leafX - 32, rootY, tree.color, spotlight === "update");
    drawForestNode(
      rootX,
      rootY,
      tree.rootSplit ? tree.rootSplit.feature : "leaf",
      tree.rootSplit ? `<=${round(tree.rootSplit.threshold)}` : "pure",
      tree.color,
      spotlight === "prediction" || spotlight === "loss"
    );
    drawForestNode(
      branchX,
      rootY,
      branchSplit ? branchSplit.feature : "stop",
      branchSplit ? `<=${round(branchSplit.threshold)}` : tree.activePath?.rootSide ?? "leaf",
      tree.color,
      spotlight === "gradient" || spotlight === "update"
    );
    drawForestNode(
      leafX,
      rootY,
      `vote ${tree.prediction}`,
      `gini ${round(tree.leaf?.impurity ?? 0)}`,
      tree.color,
      spotlight === "update",
      true
    );

    const leafNote = createSvgElement("text", {
      x: cardX + 14,
      y: cardY + 66,
      class: "plot-token-label",
    });
    leafNote.textContent = `path ${tree.activePath?.rootSide ?? "root"}${branchSide ? `/${branchSide}` : ""} | 0:${tree.leaf?.counts?.zeros ?? 0} 1:${tree.leaf?.counts?.ones ?? 0}`;
    svg.appendChild(leafNote);
  });

  const note = createSvgElement("text", {
    x: 56,
    y: 400,
    class: "plot-annotation",
  });
  note.textContent = `forest predict=${guide.finalPrediction} target=${snapshot.focusSample.label} disagreement=${snapshot.metrics.loss}`;
  svg.appendChild(note);
}

function renderBoostingPlot({ svg, snapshot, getSelectedTrace, round }) {
  svg.innerHTML = "";
  const guide = snapshot.visualGuide ?? {};
  const stages = guide.stages ?? [];
  const selectedTrace = getSelectedTrace(snapshot);
  const spotlight = selectedTrace?.spotlight ?? "prediction";
  const scatterPanel = { x: 44, y: 42, width: 272, height: 336 };
  const stagePanel = { x: 336, y: 42, width: 264, height: 336 };
  const points = snapshot.points ?? [];
  const xValues = points.map((point) => point.x1);
  const yValues = points.map((point) => point.x2);
  const minX = Math.min(...xValues) - 0.4;
  const maxX = Math.max(...xValues) + 0.4;
  const minY = Math.min(...yValues) - 0.4;
  const maxY = Math.max(...yValues) + 0.4;
  const mapper = {
    x: (value) => scatterPanel.x + 24 + ((value - minX) / (maxX - minX || 1)) * (scatterPanel.width - 48),
    y: (value) => scatterPanel.y + scatterPanel.height - 24 - ((value - minY) / (maxY - minY || 1)) * (scatterPanel.height - 48),
  };

  function drawPanel(panel, title) {
    svg.appendChild(createSvgElement("rect", {
      x: panel.x,
      y: panel.y,
      width: panel.width,
      height: panel.height,
      rx: 18,
      class: "plot-panel-box",
    }));
    const label = createSvgElement("text", {
      x: panel.x + 18,
      y: panel.y + 24,
      class: "plot-annotation",
    });
    label.textContent = title;
    svg.appendChild(label);
  }

  function drawScatterGrid() {
    for (let index = 1; index <= 4; index += 1) {
      const x = scatterPanel.x + 24 + ((scatterPanel.width - 48) / 5) * index;
      const y = scatterPanel.y + 24 + ((scatterPanel.height - 48) / 5) * index;
      svg.appendChild(createSvgElement("line", {
        x1: x,
        y1: scatterPanel.y + 24,
        x2: x,
        y2: scatterPanel.y + scatterPanel.height - 24,
        class: "plot-grid",
      }));
      svg.appendChild(createSvgElement("line", {
        x1: scatterPanel.x + 24,
        y1: y,
        x2: scatterPanel.x + scatterPanel.width - 24,
        y2: y,
        class: "plot-grid",
      }));
    }

    svg.appendChild(createSvgElement("line", {
      x1: scatterPanel.x + 24,
      y1: scatterPanel.y + scatterPanel.height - 24,
      x2: scatterPanel.x + scatterPanel.width - 24,
      y2: scatterPanel.y + scatterPanel.height - 24,
      class: "plot-axis",
    }));
    svg.appendChild(createSvgElement("line", {
      x1: scatterPanel.x + 24,
      y1: scatterPanel.y + 24,
      x2: scatterPanel.x + 24,
      y2: scatterPanel.y + scatterPanel.height - 24,
      class: "plot-axis",
    }));
  }

  function drawStump(stage, emphasis = false) {
    if (!stage.split) {
      return;
    }
    const attrs = {
      stroke: stage.color,
      "stroke-width": emphasis ? 4 : 2.5,
      "stroke-dasharray": emphasis ? "5 3" : "8 5",
      opacity: emphasis ? 1 : 0.6,
    };
    if (stage.split.feature === "x1") {
      svg.appendChild(createSvgElement("line", {
        x1: mapper.x(stage.split.threshold),
        y1: scatterPanel.y + 24,
        x2: mapper.x(stage.split.threshold),
        y2: scatterPanel.y + scatterPanel.height - 24,
        ...attrs,
      }));
    } else {
      svg.appendChild(createSvgElement("line", {
        x1: scatterPanel.x + 24,
        y1: mapper.y(stage.split.threshold),
        x2: scatterPanel.x + scatterPanel.width - 24,
        y2: mapper.y(stage.split.threshold),
        ...attrs,
      }));
    }
  }

  drawPanel(scatterPanel, "Residual Corrections");
  drawPanel(stagePanel, "Boosting Chain");
  drawScatterGrid();

  stages.forEach((stage) => {
    const emphasize =
      (spotlight === "prediction" && stage.name === "Stage 1") ||
      (spotlight === "gradient" && stage.name !== "Stage 1") ||
      spotlight === "update";
    drawStump(stage, emphasize);
  });

  points.forEach((point) => {
    const isFocus = point.id === snapshot.focusSample.id;
    svg.appendChild(createSvgElement("circle", {
      cx: mapper.x(point.x1),
      cy: mapper.y(point.x2),
      r: isFocus ? 11 : 8,
      fill: point.label === 1 ? "#005f73" : "#ee9b00",
      class: `plot-point${isFocus ? " focus" : ""}`,
    }));
  });

  const probabilityBars = guide.stageProbabilities ?? [];
  probabilityBars.forEach((probability, index) => {
    const x = 354 + index * 45;
    const barHeight = probability * 80;
    const isFinal = index === probabilityBars.length - 1;
    svg.appendChild(createSvgElement("rect", {
      x,
      y: 140 - barHeight,
      width: 24,
      height: barHeight,
      rx: 8,
      fill: isFinal ? "#005f73" : "rgba(0, 95, 115, 0.38)",
      class: "plot-vote-bar",
    }));
    const label = createSvgElement("text", {
      x: x + 12,
      y: 156,
      class: "plot-token-label",
      "text-anchor": "middle",
    });
    label.textContent = index === 0 ? "p0" : `p${index}`;
    svg.appendChild(label);
    const value = createSvgElement("text", {
      x: x + 12,
      y: 140 - barHeight - 8,
      class: "plot-token-label",
      "text-anchor": "middle",
    });
    value.textContent = String(round(probability, 2));
    svg.appendChild(value);
  });

  stages.forEach((stage, index) => {
    const cardX = 350;
    const cardY = 186 + index * 54;
    const cardWidth = 236;
    const cardHeight = 44;
    const active = (spotlight === "prediction" && index === 0) || (spotlight === "gradient" && index > 0) || spotlight === "update";
    svg.appendChild(createSvgElement("rect", {
      x: cardX,
      y: cardY,
      width: cardWidth,
      height: cardHeight,
      rx: 14,
      class: "plot-forest-card",
      stroke: stage.color,
      "stroke-width": active ? 3 : 2,
    }));
    const title = createSvgElement("text", {
      x: cardX + 14,
      y: cardY + 16,
      class: "plot-annotation",
      fill: stage.color,
    });
    title.textContent = `${stage.name} | ${stage.featurePool.join("+")} | ${stage.side}`;
    svg.appendChild(title);
    const detail = createSvgElement("text", {
      x: cardX + 14,
      y: cardY + 33,
      class: "plot-token-label",
    });
    detail.textContent = `${stage.split ? `${stage.split.feature}<=${round(stage.split.threshold)}` : "mean residual"} | raw=${round(stage.rawValue)} | add=${round(stage.contribution)}`;
    svg.appendChild(detail);
  });

  const residuals = guide.residuals ?? [];
  residuals.forEach((residual, index) => {
    const x = 354 + index * 45;
    const height = Math.abs(residual) * 48;
    svg.appendChild(createSvgElement("rect", {
      x,
      y: 352 - (residual >= 0 ? height : 0),
      width: 18,
      height,
      rx: 6,
      fill: residual >= 0 ? "#2a9d8f" : "#bb3e03",
      opacity: 0.84,
    }));
    const label = createSvgElement("text", {
      x: x + 9,
      y: residual >= 0 ? 346 - height : 370 + height,
      class: "plot-token-label",
      "text-anchor": "middle",
    });
    label.textContent = index === 0 ? "r0" : `r${index}`;
    svg.appendChild(label);
  });

  const note = createSvgElement("text", {
    x: 56,
    y: 400,
    class: "plot-annotation",
  });
  note.textContent = `boosted p=${snapshot.metrics.prediction} target=${snapshot.focusSample.label} logloss=${snapshot.metrics.loss}`;
  svg.appendChild(note);
}

export {
  renderDecisionTreePlot,
  renderRandomForestPlot,
  renderBoostingPlot,
};
