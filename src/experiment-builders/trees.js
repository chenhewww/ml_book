import {
  PHASES,
  round,
  sigmoid,
  getTraceStatus,
  getCurrentTraceIndex,
} from "./shared.js";

function countLabels(samples) {
  return samples.reduce(
    (counts, sample) => {
      if (sample.label === 1) {
        counts.ones += 1;
      } else {
        counts.zeros += 1;
      }
      return counts;
    },
    { zeros: 0, ones: 0 }
  );
}

function giniImpurity(samples) {
  if (!samples.length) {
    return 0;
  }
  const counts = countLabels(samples);
  const p0 = counts.zeros / samples.length;
  const p1 = counts.ones / samples.length;
  return 1 - (p0 * p0 + p1 * p1);
}

function majorityLabel(samples) {
  const counts = countLabels(samples);
  return counts.ones >= counts.zeros ? 1 : 0;
}

function splitByThreshold(samples, feature, threshold) {
  const left = samples.filter((sample) => sample[feature] <= threshold);
  const right = samples.filter((sample) => sample[feature] > threshold);
  return { left, right };
}

function findBestSplit(samples, candidateFeatures = ["x1", "x2"]) {
  if (!Array.isArray(samples) || samples.length < 2 || giniImpurity(samples) === 0) {
    return null;
  }

  const parentImpurity = giniImpurity(samples);
  let bestSplit = null;

  candidateFeatures.forEach((feature) => {
    const values = [...new Set(samples.map((sample) => sample[feature]).sort((a, b) => a - b))];
    for (let index = 0; index < values.length - 1; index += 1) {
      const threshold = (values[index] + values[index + 1]) / 2;
      const { left, right } = splitByThreshold(samples, feature, threshold);
      if (!left.length || !right.length) {
        continue;
      }

      const leftImpurity = giniImpurity(left);
      const rightImpurity = giniImpurity(right);
      const weightedImpurity = (left.length / samples.length) * leftImpurity + (right.length / samples.length) * rightImpurity;
      const gain = parentImpurity - weightedImpurity;

      const candidate = {
        feature,
        threshold,
        gain,
        parentImpurity,
        weightedImpurity,
        leftImpurity,
        rightImpurity,
        left,
        right,
        leftCounts: countLabels(left),
        rightCounts: countLabels(right),
      };

      if (
        !bestSplit ||
        candidate.gain > bestSplit.gain + 1e-9 ||
        (Math.abs(candidate.gain - bestSplit.gain) <= 1e-9 && candidate.weightedImpurity < bestSplit.weightedImpurity) ||
        (
          Math.abs(candidate.gain - bestSplit.gain) <= 1e-9 &&
          Math.abs(candidate.weightedImpurity - bestSplit.weightedImpurity) <= 1e-9 &&
          (candidate.feature < bestSplit.feature ||
            (candidate.feature === bestSplit.feature && candidate.threshold < bestSplit.threshold))
        )
      ) {
        bestSplit = candidate;
      }
    }
  });

  return bestSplit;
}

function buildDecisionLeaf(samples, pathId) {
  const counts = countLabels(samples);
  return {
    pathId,
    prediction: majorityLabel(samples),
    counts,
    impurity: giniImpurity(samples),
    sampleIds: samples.map((sample) => sample.id),
  };
}

function serializeDecisionSplit(split, nodeId) {
  if (!split) {
    return null;
  }

  return {
    nodeId,
    feature: split.feature,
    threshold: split.threshold,
    gain: split.gain,
    parentImpurity: split.parentImpurity,
    weightedImpurity: split.weightedImpurity,
    leftImpurity: split.leftImpurity,
    rightImpurity: split.rightImpurity,
    leftCounts: split.leftCounts,
    rightCounts: split.rightCounts,
    leftIds: split.left.map((sample) => sample.id),
    rightIds: split.right.map((sample) => sample.id),
  };
}

function buildDecisionTreeExplanation(sample, phase, rootSplit, branchSplit, leaf, rootSide, branchSide) {
  const featureLabel = rootSplit?.feature ?? "x1";
  const branchLabel = branchSplit?.feature ?? featureLabel;
  if (phase === "forward") {
    return `The tree first checks whether ${featureLabel} <= ${round(rootSplit?.threshold ?? sample[featureLabel])}. This sends the sample into the ${rootSide} branch.`;
  }
  if (phase === "loss") {
    return `At the root node, the Gini impurity drops from ${round(rootSplit?.parentImpurity ?? 0)} to ${round(rootSplit?.weightedImpurity ?? 0)}, so this split gains ${round(rootSplit?.gain ?? 0)} in purity.`;
  }
  if (phase === "backward") {
    if (!branchSplit) {
      return `The active ${rootSide} branch is already pure enough, so the tree can stop splitting and keep a direct leaf vote.`;
    }
    return `Inside the ${rootSide} branch, the next best question is whether ${branchLabel} <= ${round(branchSplit.threshold)}. That sends this sample toward the ${branchSide} leaf.`;
  }
  return `The reached leaf predicts class ${leaf.prediction} with counts 0:${leaf.counts.zeros}, 1:${leaf.counts.ones}. The leaf impurity is ${round(leaf.impurity)}.`;
}

function buildDecisionTreeExplanationZh(sample, phase, rootSplit, branchSplit, leaf, rootSide, branchSide) {
  const featureLabel = rootSplit?.feature ?? "x1";
  const branchLabel = branchSplit?.feature ?? featureLabel;
  if (phase === "forward") {
    return `树先判断 ${featureLabel} 是否小于等于 ${round(rootSplit?.threshold ?? sample[featureLabel])}，当前样本因此进入 ${rootSide === "left" ? "左" : "右"} 分支。`;
  }
  if (phase === "loss") {
    return `在根节点上，这次切分把 Gini 从 ${round(rootSplit?.parentImpurity ?? 0)} 降到 ${round(rootSplit?.weightedImpurity ?? 0)}，信息增益是 ${round(rootSplit?.gain ?? 0)}。`;
  }
  if (phase === "backward") {
    if (!branchSplit) {
      return `当前 ${rootSide === "left" ? "左" : "右"} 分支已经足够纯，不需要继续切分，直接保留叶子投票。`;
    }
    return `进入 ${rootSide === "left" ? "左" : "右"} 分支后，下一步最优问题是 ${branchLabel} <= ${round(branchSplit.threshold)}，它会把样本送到 ${branchSide === "left" ? "左" : "右"} 叶子。`;
  }
  return `最终到达的叶子预测类别为 ${leaf.prediction}，叶子内计数是 0:${leaf.counts.zeros}、1:${leaf.counts.ones}，叶子 Gini 为 ${round(leaf.impurity)}。`;
}

function buildDecisionTreeTrace(sample, phase, rootSplit, branchSplit, leaf, rootSide, branchSide) {
  const currentIndex = getCurrentTraceIndex(phase);
  const rootFeature = rootSplit?.feature ?? "x1";
  const rootThreshold = round(rootSplit?.threshold ?? sample[rootFeature]);
  const branchFeature = branchSplit?.feature ?? rootFeature;
  const branchThreshold = round(branchSplit?.threshold ?? sample[branchFeature]);

  return [
    {
      title: "Dataset Snapshot",
      titleZh: "数据快照",
      formula: `sample = [${round(sample.x1)}, ${round(sample.x2)}], y = ${sample.label}; root Gini = ${round(rootSplit?.parentImpurity ?? leaf.impurity)}`,
      formulaZh: `样本 = [${round(sample.x1)}, ${round(sample.x2)}]，标签 = ${sample.label}；根节点 Gini = ${round(rootSplit?.parentImpurity ?? leaf.impurity)}`,
      status: getTraceStatus(0, currentIndex),
      spotlight: "parameters",
    },
    {
      title: "Root Split",
      titleZh: "根节点切分",
      formula: `${rootFeature} <= ${rootThreshold} => ${round(sample[rootFeature])} <= ${rootThreshold} => ${rootSide}`,
      formulaZh: `${rootFeature} <= ${rootThreshold} => ${round(sample[rootFeature])} <= ${rootThreshold} => 进入${rootSide === "left" ? "左" : "右"}分支`,
      status: getTraceStatus(1, currentIndex),
      spotlight: "prediction",
    },
    {
      title: "Gini Gain",
      titleZh: "Gini 增益",
      formula: `gain = ${round(rootSplit?.parentImpurity ?? 0)} - ${round(rootSplit?.weightedImpurity ?? 0)} = ${round(rootSplit?.gain ?? 0)}`,
      formulaZh: `增益 = ${round(rootSplit?.parentImpurity ?? 0)} - ${round(rootSplit?.weightedImpurity ?? 0)} = ${round(rootSplit?.gain ?? 0)}`,
      status: getTraceStatus(2, currentIndex),
      spotlight: "loss",
    },
    {
      title: "Branch Split",
      titleZh: "分支切分",
      formula: branchSplit
        ? `${branchFeature} <= ${branchThreshold} => ${round(sample[branchFeature])} <= ${branchThreshold} => ${branchSide}`
        : `branch is pure enough, so no second split is required`,
      formulaZh: branchSplit
        ? `${branchFeature} <= ${branchThreshold} => ${round(sample[branchFeature])} <= ${branchThreshold} => 进入${branchSide === "left" ? "左" : "右"}叶子`
        : "当前分支已经足够纯，不再继续切分",
      status: getTraceStatus(3, currentIndex),
      spotlight: "gradient",
    },
    {
      title: "Leaf Vote",
      titleZh: "叶子投票",
      formula: `leaf predicts ${leaf.prediction}; counts = [0:${leaf.counts.zeros}, 1:${leaf.counts.ones}], Gini = ${round(leaf.impurity)}`,
      formulaZh: `叶子预测 ${leaf.prediction}；计数 = [0:${leaf.counts.zeros}, 1:${leaf.counts.ones}]，Gini = ${round(leaf.impurity)}`,
      status: getTraceStatus(4, currentIndex),
      spotlight: "update",
    },
  ];
}

function buildDecisionTreeSnapshots(dataset, learningRate) {
  const rootRaw = findBestSplit(dataset);
  const leftRaw = rootRaw ? findBestSplit(rootRaw.left) : null;
  const rightRaw = rootRaw ? findBestSplit(rootRaw.right) : null;
  const rootSplit = serializeDecisionSplit(rootRaw, "root");
  const leftSplit = serializeDecisionSplit(leftRaw, "left");
  const rightSplit = serializeDecisionSplit(rightRaw, "right");
  const snapshots = [];

  dataset.forEach((sample, sampleIndex) => {
    const rootSide = rootSplit
      ? (sample[rootSplit.feature] <= rootSplit.threshold ? "left" : "right")
      : "root";
    const branchSplit = rootSide === "left" ? leftSplit : rightSplit;
    const branchSide = branchSplit
      ? (sample[branchSplit.feature] <= branchSplit.threshold ? "left" : "right")
      : null;

    const leafSamples = !rootRaw
      ? dataset
      : branchSplit
        ? (branchSide === "left"
            ? (rootSide === "left" ? leftRaw.left : rightRaw.left)
            : (rootSide === "left" ? leftRaw.right : rightRaw.right))
        : (rootSide === "left" ? rootRaw.left : rootRaw.right);
    const leaf = buildDecisionLeaf(leafSamples, branchSplit ? `${rootSide}-${branchSide}` : rootSide);
    const isCorrect = leaf.prediction === sample.label ? 1 : 0;

    PHASES.forEach((phase) => {
      snapshots.push({
        algorithmId: "decision_tree",
        title: "Decision Tree",
        datasetLabel: "Greedy axis-aligned tree over labeled 2D points",
        stepLabel: `Sample ${sampleIndex + 1} / ${dataset.length}`,
        phase,
        chartType: "decision_tree",
        points: dataset,
        focusSample: sample,
        params: {
          rootFeature: rootSplit?.feature ?? "leaf",
          rootThreshold: rootSplit ? round(rootSplit.threshold) : "-",
          rootGain: rootSplit ? round(rootSplit.gain) : 0,
          branchFeature: branchSplit?.feature ?? "leaf",
          branchThreshold: branchSplit ? round(branchSplit.threshold) : "-",
          branchGain: branchSplit ? round(branchSplit.gain) : 0,
          leafPrediction: leaf.prediction,
          leafImpurity: round(leaf.impurity),
          leafConfidence: round(Math.max(leaf.counts.zeros, leaf.counts.ones) / Math.max(leafSamples.length, 1)),
          treeDepth: branchSplit ? 2 : 1,
          learningRate: round(learningRate),
        },
        metrics: {
          prediction: leaf.prediction,
          target: sample.label,
          loss: round(leaf.impurity),
        },
        visualGuide: {
          rootSplit,
          leftSplit,
          rightSplit,
          activePath: {
            rootSide,
            branchSide,
          },
          leaf,
          focusCorrect: isCorrect,
        },
        modelFlow: [
          { title: "Dataset point", detail: `x = [${round(sample.x1)}, ${round(sample.x2)}], y = ${sample.label}`, active: phase === "forward" },
          { title: "Root split", detail: rootSplit ? `${rootSplit.feature} <= ${round(rootSplit.threshold)}` : "pure dataset", active: phase === "forward" },
          { title: "Gini gain", detail: rootSplit ? `gain = ${round(rootSplit.gain)}` : `leaf impurity = ${round(leaf.impurity)}`, active: phase === "loss" },
          { title: "Branch split", detail: branchSplit ? `${branchSplit.feature} <= ${round(branchSplit.threshold)}` : "stop splitting", active: phase === "backward" },
          { title: "Leaf vote", detail: `predict ${leaf.prediction} from 0:${leaf.counts.zeros}, 1:${leaf.counts.ones}`, active: phase === "update" },
        ],
        explanation: buildDecisionTreeExplanation(sample, phase, rootSplit, branchSplit, leaf, rootSide, branchSide),
        explanationZh: buildDecisionTreeExplanationZh(sample, phase, rootSplit, branchSplit, leaf, rootSide, branchSide),
        calculationTrace: buildDecisionTreeTrace(sample, phase, rootSplit, branchSplit, leaf, rootSide, branchSide),
      });
    });
  });

  return snapshots;
}

function buildDecisionTreeModel(samples, candidateFeatures = ["x1", "x2"]) {
  const rootRaw = findBestSplit(samples, candidateFeatures);
  const leftRaw = rootRaw ? findBestSplit(rootRaw.left, candidateFeatures) : null;
  const rightRaw = rootRaw ? findBestSplit(rootRaw.right, candidateFeatures) : null;
  return {
    samples,
    candidateFeatures,
    rootRaw,
    leftRaw,
    rightRaw,
    rootSplit: serializeDecisionSplit(rootRaw, "root"),
    leftSplit: serializeDecisionSplit(leftRaw, "left"),
    rightSplit: serializeDecisionSplit(rightRaw, "right"),
  };
}

function getDecisionLeafSamples(model, rootSide, branchSide = null) {
  if (!model.rootRaw) {
    return model.samples;
  }
  if (rootSide === "left") {
    if (!model.leftRaw) {
      return model.rootRaw.left;
    }
    return branchSide === "right" ? model.leftRaw.right : model.leftRaw.left;
  }
  if (!model.rightRaw) {
    return model.rootRaw.right;
  }
  return branchSide === "right" ? model.rightRaw.right : model.rightRaw.left;
}

function evaluateDecisionTreeModel(model, sample) {
  const rootSide = model.rootSplit
    ? (sample[model.rootSplit.feature] <= model.rootSplit.threshold ? "left" : "right")
    : "root";
  const branchSplit = rootSide === "left" ? model.leftSplit : model.rightSplit;
  const branchSide = branchSplit
    ? (sample[branchSplit.feature] <= branchSplit.threshold ? "left" : "right")
    : null;
  const leafSamples = getDecisionLeafSamples(model, rootSide, branchSide);
  const leaf = buildDecisionLeaf(leafSamples, branchSplit ? `${rootSide}-${branchSide}` : rootSide);
  return {
    rootSide,
    branchSplit,
    branchSide,
    leaf,
    prediction: leaf.prediction,
  };
}

function serializeLeafSet(model) {
  const leafSet = {
    left: model.rootRaw ? buildDecisionLeaf(model.rootRaw.left, "left") : buildDecisionLeaf(model.samples, "root"),
    right: model.rootRaw ? buildDecisionLeaf(model.rootRaw.right, "right") : null,
    leftLeft: model.leftRaw ? buildDecisionLeaf(model.leftRaw.left, "left-left") : null,
    leftRight: model.leftRaw ? buildDecisionLeaf(model.leftRaw.right, "left-right") : null,
    rightLeft: model.rightRaw ? buildDecisionLeaf(model.rightRaw.left, "right-left") : null,
    rightRight: model.rightRaw ? buildDecisionLeaf(model.rightRaw.right, "right-right") : null,
  };
  return leafSet;
}

function buildRandomForestExplanation(sample, phase, trees, voteCounts, finalPrediction, agreement) {
  if (phase === "forward") {
    return `Three bootstrap trees inspect sample [${round(sample.x1)}, ${round(sample.x2)}]. Each tree asks a slightly different split question because it saw a different bagged subset or feature pool.`;
  }
  if (phase === "loss") {
    return `The ensemble vote is class 0:${voteCounts.zeros} vs class 1:${voteCounts.ones}. Agreement is ${round(agreement)}, which exposes how confident the forest is on this point.`;
  }
  if (phase === "backward") {
    const treeNames = trees.map((tree) => `${tree.name}(${tree.featurePool.join("+")})`).join(", ");
    return `Bagging and feature subsampling diversify the trees: ${treeNames}. The forest gains robustness because the trees do not all fail in the same way.`;
  }
  return `Majority voting predicts class ${finalPrediction}. Even if one tree is noisy, the combined vote stabilizes the final decision.`;
}

function buildRandomForestExplanationZh(sample, phase, trees, voteCounts, finalPrediction, agreement) {
  if (phase === "forward") {
    return `三个 bootstrap 树会同时查看样本 [${round(sample.x1)}, ${round(sample.x2)}]。由于抽样子集和特征子集不同，每棵树提出的问题也会略有差异。`;
  }
  if (phase === "loss") {
    return `当前集成投票结果为类别 0:${voteCounts.zeros}，类别 1:${voteCounts.ones}。一致性是 ${round(agreement)}，它直接反映了森林对当前样本的把握程度。`;
  }
  if (phase === "backward") {
    const treeNames = trees.map((tree) => `${tree.name}(${tree.featurePool.join("+")})`).join("、");
    return `Bagging 和特征子采样让不同树形成差异：${treeNames}。正因为它们不会犯同一种错，集成后才会更稳。`;
  }
  return `最终通过多数投票预测为类别 ${finalPrediction}。即使个别树受到噪声影响，整体投票仍然能稳定最终判断。`;
}

function buildRandomForestTrace(sample, phase, trees, voteCounts, agreement, finalPrediction) {
  const currentIndex = getCurrentTraceIndex(phase);
  const treeSummaries = trees.map((tree) => `${tree.name}:${tree.prediction}`).join(", ");
  const bagSummary = trees.map((tree) => `${tree.name}[${tree.bootstrapIds.slice(0, 4).join(",")}...]`).join(" ");
  const featureSummary = trees.map((tree) => `${tree.name}:{${tree.featurePool.join(",")}}`).join(" ");
  return [
    {
      title: "Bootstrap Bags",
      titleZh: "Bootstrap 抽样",
      formula: `sample = [${round(sample.x1)}, ${round(sample.x2)}], bags = ${bagSummary}`,
      formulaZh: `样本 = [${round(sample.x1)}, ${round(sample.x2)}]，抽样袋 = ${bagSummary}`,
      status: getTraceStatus(0, currentIndex),
      spotlight: "parameters",
    },
    {
      title: "Tree Votes",
      titleZh: "单树投票",
      formula: treeSummaries,
      formulaZh: treeSummaries.replace(/Tree/g, "树"),
      status: getTraceStatus(1, currentIndex),
      spotlight: "prediction",
    },
    {
      title: "Vote Aggregation",
      titleZh: "投票聚合",
      formula: `votes(0) = ${voteCounts.zeros}, votes(1) = ${voteCounts.ones}, agreement = ${round(agreement)}`,
      formulaZh: `0 类票数 = ${voteCounts.zeros}，1 类票数 = ${voteCounts.ones}，一致性 = ${round(agreement)}`,
      status: getTraceStatus(2, currentIndex),
      spotlight: "loss",
    },
    {
      title: "Feature Diversity",
      titleZh: "特征多样性",
      formula: featureSummary,
      formulaZh: featureSummary.replace(/Tree/g, "树"),
      status: getTraceStatus(3, currentIndex),
      spotlight: "gradient",
    },
    {
      title: "Forest Prediction",
      titleZh: "森林最终预测",
      formula: `majority vote => class ${finalPrediction}`,
      formulaZh: `多数投票 => 预测类别 ${finalPrediction}`,
      status: getTraceStatus(4, currentIndex),
      spotlight: "update",
    },
  ];
}

function buildRandomForestSnapshots(dataset, learningRate) {
  const bagPlans = [
    { name: "Tree A", indices: [0, 1, 2, 3, 4, 5, 6, 6], featurePool: ["x1", "x2"], color: "#005f73" },
    { name: "Tree B", indices: [1, 2, 3, 4, 5, 7, 8, 9], featurePool: ["x1"], color: "#bb3e03" },
    { name: "Tree C", indices: [0, 2, 3, 4, 6, 7, 8, 9], featurePool: ["x2"], color: "#2a9d8f" },
  ];
  const forest = bagPlans.map((plan) => {
    const baggedSamples = plan.indices.map((index, bagIndex) => ({
      ...dataset[index % dataset.length],
      id: `${dataset[index % dataset.length].id}_b${bagIndex}`,
      sourceId: dataset[index % dataset.length].id,
    }));
    const model = buildDecisionTreeModel(baggedSamples, plan.featurePool);
    const leaves = serializeLeafSet(model);
    return {
      ...plan,
      model,
      leaves,
      bootstrapIds: baggedSamples.map((sample) => sample.sourceId),
    };
  });
  const snapshots = [];

  dataset.forEach((sample, sampleIndex) => {
    const treeStates = forest.map((tree) => {
      const evaluation = evaluateDecisionTreeModel(tree.model, sample);
      return {
        name: tree.name,
        color: tree.color,
        featurePool: tree.featurePool,
        bootstrapIds: tree.bootstrapIds,
        rootSplit: tree.model.rootSplit,
        leftSplit: tree.model.leftSplit,
        rightSplit: tree.model.rightSplit,
        leaves: tree.leaves,
        activePath: {
          rootSide: evaluation.rootSide,
          branchSide: evaluation.branchSide,
        },
        leaf: evaluation.leaf,
        prediction: evaluation.prediction,
      };
    });

    const voteCounts = treeStates.reduce(
      (counts, tree) => {
        if (tree.prediction === 1) {
          counts.ones += 1;
        } else {
          counts.zeros += 1;
        }
        return counts;
      },
      { zeros: 0, ones: 0 }
    );
    const finalPrediction = voteCounts.ones >= voteCounts.zeros ? 1 : 0;
    const agreement = Math.max(voteCounts.zeros, voteCounts.ones) / treeStates.length;
    const disagreement = 1 - agreement;

    PHASES.forEach((phase) => {
      snapshots.push({
        algorithmId: "random_forest",
        title: "Random Forest",
        datasetLabel: "Bagged axis-aligned trees over labeled 2D points",
        stepLabel: `Sample ${sampleIndex + 1} / ${dataset.length}`,
        phase,
        chartType: "random_forest",
        points: dataset,
        focusSample: sample,
        params: {
          tree1Prediction: treeStates[0].prediction,
          tree2Prediction: treeStates[1].prediction,
          tree3Prediction: treeStates[2].prediction,
          votesFor0: voteCounts.zeros,
          votesFor1: voteCounts.ones,
          agreement: round(agreement),
          disagreement: round(disagreement),
          forestPrediction: finalPrediction,
          treeCount: treeStates.length,
          learningRate: round(learningRate),
        },
        metrics: {
          prediction: finalPrediction,
          target: sample.label,
          loss: round(disagreement),
        },
        visualGuide: {
          trees: treeStates,
          voteCounts,
          agreement: round(agreement),
          finalPrediction,
        },
        modelFlow: [
          { title: "Bootstrap bags", detail: `3 trees, ${dataset.length} points sampled with replacement`, active: phase === "forward" },
          { title: "Independent trees", detail: treeStates.map((tree) => `${tree.name}:${tree.prediction}`).join(", "), active: phase === "forward" },
          { title: "Vote confidence", detail: `agreement = ${round(agreement)}`, active: phase === "loss" },
          { title: "Feature diversity", detail: treeStates.map((tree) => `${tree.name}[${tree.featurePool.join("+")}]`).join(", "), active: phase === "backward" },
          { title: "Ensemble vote", detail: `predict ${finalPrediction}`, active: phase === "update" },
        ],
        explanation: buildRandomForestExplanation(sample, phase, treeStates, voteCounts, finalPrediction, agreement),
        explanationZh: buildRandomForestExplanationZh(sample, phase, treeStates, voteCounts, finalPrediction, agreement),
        calculationTrace: buildRandomForestTrace(sample, phase, treeStates, voteCounts, agreement, finalPrediction),
      });
    });
  });

  return snapshots;
}

function mean(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function binaryCrossEntropy(label, probability) {
  const clipped = Math.min(0.9999, Math.max(0.0001, probability));
  return -(label * Math.log(clipped) + (1 - label) * Math.log(1 - clipped));
}

function buildBoostingStageModel(samples, featurePool, stageName, color, learningRate) {
  const weightedSamples = samples.map((sample) => ({
    ...sample,
    label: sample.residual >= 0 ? 1 : 0,
  }));
  const stump = findBestSplit(weightedSamples, featurePool);
  const overallValue = mean(samples.map((sample) => sample.residual));
  if (!stump) {
    return {
      name: stageName,
      color,
      featurePool,
      split: null,
      leftValue: overallValue,
      rightValue: overallValue,
      learningRate,
    };
  }

  return {
    name: stageName,
    color,
    featurePool,
    split: serializeDecisionSplit(stump, "root"),
    leftValue: mean(stump.left.map((sample) => sample.residual)),
    rightValue: mean(stump.right.map((sample) => sample.residual)),
    learningRate,
  };
}

function evaluateBoostingStage(stage, sample) {
  if (!stage.split) {
    return {
      side: "all",
      rawValue: stage.leftValue,
      contribution: stage.learningRate * stage.leftValue,
    };
  }

  const side = sample[stage.split.feature] <= stage.split.threshold ? "left" : "right";
  const rawValue = side === "left" ? stage.leftValue : stage.rightValue;
  return {
    side,
    rawValue,
    contribution: stage.learningRate * rawValue,
  };
}

function buildGradientBoostingExplanation(sample, phase, stages, finalProbability, loss, residualAfterStages) {
  if (phase === "forward") {
    return `Boosting starts from a shared base score, then sends sample [${round(sample.x1)}, ${round(sample.x2)}] through three residual trees. Each stage adds a small correction instead of voting independently.`;
  }
  if (phase === "loss") {
    return `After all corrections, the probability becomes ${round(finalProbability)} and the log loss is ${round(loss)}. The residual chain is ${residualAfterStages.map((value) => round(value)).join(" -> ")}.`;
  }
  if (phase === "backward") {
    const focus = stages.map((stage) => `${stage.name}:${stage.side}/${round(stage.rawValue)}`).join(", ");
    return `Each tree is fit on what the previous stages still miss. For this sample the stage-wise corrections are ${focus}.`;
  }
  return `The final boosted score is the base logit plus three shrinked tree outputs. That is why boosting reduces bias stage by stage instead of averaging separate models.`;
}

function buildGradientBoostingExplanationZh(sample, phase, stages, finalProbability, loss, residualAfterStages) {
  if (phase === "forward") {
    return `Boosting 先从一个共享的基础分数开始，再让样本 [${round(sample.x1)}, ${round(sample.x2)}] 依次经过三棵残差树。每一阶段做的是小幅纠错，而不是像森林那样并行投票。`;
  }
  if (phase === "loss") {
    return `经过三次纠错后，当前概率变成 ${round(finalProbability)}，对数损失是 ${round(loss)}。这一样本的残差链路是 ${residualAfterStages.map((value) => round(value)).join(" -> ")}。`;
  }
  if (phase === "backward") {
    const focus = stages.map((stage) => `${stage.name}:${stage.side}/${round(stage.rawValue)}`).join("，");
    return `每棵树都在拟合前一阶段还没有解释掉的部分。对当前样本来说，三次阶段性纠错分别是 ${focus}。`;
  }
  return `最终的 boosted score 等于基础 logit 加上三次收缩后的树输出，所以 Boosting 的核心不是投票，而是逐阶段降低偏差。`;
}

function buildGradientBoostingTrace(sample, phase, baseLogit, baseProbability, stages, stageLogits, stageProbabilities, finalProbability, loss) {
  const currentIndex = getCurrentTraceIndex(phase);
  return [
    {
      title: "Base Score",
      titleZh: "基础分数",
      formula: `logit_0 = ${round(baseLogit)}, p_0 = sigmoid(logit_0) = ${round(baseProbability)}`,
      formulaZh: `logit_0 = ${round(baseLogit)}，p_0 = sigmoid(logit_0) = ${round(baseProbability)}`,
      status: getTraceStatus(0, currentIndex),
      spotlight: "parameters",
    },
    {
      title: "Stage Corrections",
      titleZh: "阶段纠错",
      formula: stages.map((stage, index) => `${stage.name}:${stage.side} => ${round(stage.contribution)}`).join(", "),
      formulaZh: stages.map((stage, index) => `${stage.name}:${stage.side} => ${round(stage.contribution)}`).join("，"),
      status: getTraceStatus(1, currentIndex),
      spotlight: "prediction",
    },
    {
      title: "Residual Chain",
      titleZh: "残差链路",
      formula: stageProbabilities.map((probability, index) => `p${index}=${round(probability)}`).join(" -> "),
      formulaZh: stageProbabilities.map((probability, index) => `p${index}=${round(probability)}`).join(" -> "),
      status: getTraceStatus(2, currentIndex),
      spotlight: "loss",
    },
    {
      title: "Feature Targeting",
      titleZh: "特征定位",
      formula: stages.map((stage) => `${stage.name}[${stage.featurePool.join("+")}] ${stage.split ? `${stage.split.feature}<=${round(stage.split.threshold)}` : "mean residual"}`).join("; "),
      formulaZh: stages.map((stage) => `${stage.name}[${stage.featurePool.join("+")}] ${stage.split ? `${stage.split.feature}<=${round(stage.split.threshold)}` : "均值残差"}`).join("；"),
      status: getTraceStatus(3, currentIndex),
      spotlight: "gradient",
    },
    {
      title: "Final Probability",
      titleZh: "最终概率",
      formula: `logit_3 = ${round(stageLogits[stageLogits.length - 1])}, p = ${round(finalProbability)}, loss = ${round(loss)}`,
      formulaZh: `logit_3 = ${round(stageLogits[stageLogits.length - 1])}，p = ${round(finalProbability)}，loss = ${round(loss)}`,
      status: getTraceStatus(4, currentIndex),
      spotlight: "update",
    },
  ];
}

function buildGradientBoostingSnapshots(dataset, learningRate) {
  const positiveRate = dataset.reduce((sum, sample) => sum + sample.label, 0) / Math.max(dataset.length, 1);
  const clippedRate = Math.min(0.95, Math.max(0.05, positiveRate));
  const baseLogit = Math.log(clippedRate / (1 - clippedRate));
  const stagePlans = [
    { name: "Stage 1", featurePool: ["x1"], color: "#005f73" },
    { name: "Stage 2", featurePool: ["x2"], color: "#bb3e03" },
    { name: "Stage 3", featurePool: ["x1", "x2"], color: "#2a9d8f" },
  ];
  let working = dataset.map((sample) => {
    const probability = sigmoid(baseLogit);
    return {
      ...sample,
      runningLogit: baseLogit,
      probability,
      residual: sample.label - probability,
    };
  });

  const stageModels = stagePlans.map((plan) => {
    const model = buildBoostingStageModel(working, plan.featurePool, plan.name, plan.color, learningRate);
    working = working.map((sample) => {
      const evaluation = evaluateBoostingStage(model, sample);
      const nextLogit = sample.runningLogit + evaluation.contribution;
      const nextProbability = sigmoid(nextLogit);
      return {
        ...sample,
        runningLogit: nextLogit,
        probability: nextProbability,
        residual: sample.label - nextProbability,
      };
    });
    return model;
  });

  const snapshots = [];

  dataset.forEach((sample, sampleIndex) => {
    const stageStates = [];
    let runningLogit = baseLogit;
    let runningProbability = sigmoid(runningLogit);
    const stageLogits = [runningLogit];
    const stageProbabilities = [runningProbability];
    const residualAfterStages = [sample.label - runningProbability];

    stageModels.forEach((stage) => {
      const evaluation = evaluateBoostingStage(stage, sample);
      runningLogit += evaluation.contribution;
      runningProbability = sigmoid(runningLogit);
      stageLogits.push(runningLogit);
      stageProbabilities.push(runningProbability);
      residualAfterStages.push(sample.label - runningProbability);
      stageStates.push({
        ...evaluation,
        name: stage.name,
        color: stage.color,
        featurePool: stage.featurePool,
        split: stage.split,
        leftValue: stage.leftValue,
        rightValue: stage.rightValue,
      });
    });

    const finalProbability = stageProbabilities[stageProbabilities.length - 1];
    const finalPrediction = finalProbability >= 0.5 ? 1 : 0;
    const loss = binaryCrossEntropy(sample.label, finalProbability);

    PHASES.forEach((phase) => {
      snapshots.push({
        algorithmId: "gradient_boosting",
        title: "Gradient Boosting",
        datasetLabel: "Sequential residual stumps over labeled 2D points",
        stepLabel: `Sample ${sampleIndex + 1} / ${dataset.length}`,
        phase,
        chartType: "boosting",
        points: dataset,
        focusSample: sample,
        params: {
          baseProbability: round(stageProbabilities[0]),
          stage1Contribution: round(stageStates[0]?.contribution ?? 0),
          stage2Contribution: round(stageStates[1]?.contribution ?? 0),
          stage3Contribution: round(stageStates[2]?.contribution ?? 0),
          stage1Residual: round(residualAfterStages[1]),
          stage2Residual: round(residualAfterStages[2]),
          stage3Residual: round(residualAfterStages[3]),
          finalProbability: round(finalProbability),
          finalPrediction,
          learningRate: round(learningRate),
        },
        metrics: {
          prediction: round(finalProbability),
          target: sample.label,
          loss: round(loss),
        },
        visualGuide: {
          baseLogit: round(baseLogit),
          baseProbability: round(stageProbabilities[0]),
          stages: stageStates,
          stageLogits: stageLogits.map((value) => round(value)),
          stageProbabilities: stageProbabilities.map((value) => round(value)),
          residuals: residualAfterStages.map((value) => round(value)),
          finalPrediction,
        },
        modelFlow: [
          { title: "Base score", detail: `p0 = ${round(stageProbabilities[0])}`, active: phase === "forward" },
          { title: "Residual stump 1", detail: `${stageStates[0].side} => ${round(stageStates[0].contribution)}`, active: phase === "forward" },
          { title: "Residual shrinkage", detail: `loss = ${round(loss)}`, active: phase === "loss" },
          { title: "Stage targeting", detail: stageStates.map((stage) => `${stage.name}[${stage.featurePool.join("+")}]`).join(", "), active: phase === "backward" },
          { title: "Boosted output", detail: `p = ${round(finalProbability)}`, active: phase === "update" },
        ],
        explanation: buildGradientBoostingExplanation(sample, phase, stageStates, finalProbability, loss, residualAfterStages),
        explanationZh: buildGradientBoostingExplanationZh(sample, phase, stageStates, finalProbability, loss, residualAfterStages),
        calculationTrace: buildGradientBoostingTrace(sample, phase, baseLogit, stageProbabilities[0], stageStates, stageLogits, stageProbabilities, finalProbability, loss),
      });
    });
  });

  return snapshots;
}

export {
  buildDecisionTreeSnapshots,
  buildRandomForestSnapshots,
  buildGradientBoostingSnapshots,
};
