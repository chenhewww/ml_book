import {
  PHASES,
  round,
  sigmoid,
  tanh,
  getTraceStatus,
  getCurrentTraceIndex,
} from "./shared.js";

function buildCurvePoints(params) {
  const points = [];
  for (let x = -3.5; x <= 3.5; x += 0.2) {
    const h1 = tanh(params.inputToHidden1 * x + params.hiddenBias1);
    const h2 = tanh(params.inputToHidden2 * x + params.hiddenBias2);
    const prediction = params.hiddenToOutput1 * h1 + params.hiddenToOutput2 * h2 + params.outputBias;
    points.push({
      x: round(x, 3),
      y: round(prediction, 4),
    });
  }
  return points;
}

function buildLinearExplanation(sample, phase, prediction, loss, gradW, gradB, nextWeight, nextBias) {
  if (phase === "forward") {
    return `The debugger feeds x = ${round(sample.x)} into the model and computes y_hat = w * x + b = ${round(prediction)}.`;
  }
  if (phase === "loss") {
    return `The prediction is compared with the target y = ${round(sample.y)}. The squared error becomes ${round(loss)}.`;
  }
  if (phase === "backward") {
    return `Backpropagation turns the error into gradients. dw = ${round(gradW)} and db = ${round(gradB)}.`;
  }
  return `Gradient descent applies the update. The next parameters become w = ${round(nextWeight)} and b = ${round(nextBias)}.`;
}

function buildLinearExplanationZh(sample, phase, prediction, loss, gradW, gradB, nextWeight, nextBias) {
  if (phase === "forward") {
    return `当前把 x = ${round(sample.x)} 输入模型，先做线性变换，得到预测值 y_hat = w*x + b = ${round(prediction)}。`;
  }
  if (phase === "loss") {
    return `再把预测值和真实值 y = ${round(sample.y)} 做比较，当前样本的平方误差损失是 ${round(loss)}。`;
  }
  if (phase === "backward") {
    return `反向传播会把误差转成梯度，这里 dw = ${round(gradW)}，db = ${round(gradB)}，表示斜率和截距应该往哪个方向调整。`;
  }
  return `梯度下降更新完成后，参数变成 w = ${round(nextWeight)}，b = ${round(nextBias)}，拟合直线会立刻跟着移动。`;
}

function buildLogisticExplanation(sample, phase, probability, loss, gradW1, gradW2, gradB, nextWeight1, nextWeight2, nextBias) {
  if (phase === "forward") {
    return `The 2D sample is mapped to a probability through a linear score plus sigmoid. Current p(class=1) = ${round(probability)}.`;
  }
  if (phase === "loss") {
    return `Cross-entropy compares the probability with the true label ${sample.label}. Current loss = ${round(loss)}.`;
  }
  if (phase === "backward") {
    return `The gradient tells the decision boundary how to move: dw1 = ${round(gradW1)}, dw2 = ${round(gradW2)}, db = ${round(gradB)}.`;
  }
  return `After the update, the separator uses w = [${round(nextWeight1)}, ${round(nextWeight2)}] and b = ${round(nextBias)}.`;
}

function buildLogisticExplanationZh(sample, phase, probability, loss, gradW1, gradW2, gradB, nextWeight1, nextWeight2, nextBias) {
  if (phase === "forward") {
    return `当前样本先经过线性打分，再经过 sigmoid，得到属于正类的概率 p = ${round(probability)}。`;
  }
  if (phase === "loss") {
    return `交叉熵损失会把预测概率和真实标签 ${sample.label} 做比较，当前损失是 ${round(loss)}。`;
  }
  if (phase === "backward") {
    return `反向传播给出决策边界的调整方向：dw1 = ${round(gradW1)}，dw2 = ${round(gradW2)}，db = ${round(gradB)}。`;
  }
  return `更新后参数变成 w = [${round(nextWeight1)}, ${round(nextWeight2)}]，b = ${round(nextBias)}，分类边界会随之平移或旋转。`;
}

function buildNeuralExplanation(sample, phase, prediction, loss, hidden1, hidden2, grads, nextParams) {
  if (phase === "forward") {
    return `The sample flows through two hidden neurons: h1 = tanh(z1) = ${round(hidden1)}, h2 = tanh(z2) = ${round(hidden2)}, then combines into y_hat = ${round(prediction)}.`;
  }
  if (phase === "loss") {
    return `The prediction is compared with y = ${round(sample.y)}. This sample produces a loss of ${round(loss)}, showing how well the current nonlinear curve fits here.`;
  }
  if (phase === "backward") {
    return `Gradients propagate from the output back into both hidden neurons. The network learns both the hidden feature detectors and the output combiner in one pass.`;
  }
  return `After the update, the hidden and output weights shift together. The fitted curve becomes more nonlinear as these two hidden units specialize.`;
}

function buildNeuralExplanationZh(sample, phase, prediction, loss, hidden1, hidden2, grads, nextParams) {
  if (phase === "forward") {
    return `当前样本会先经过两个隐藏神经元，得到 h1 = ${round(hidden1)}、h2 = ${round(hidden2)}，再组合成输出 y_hat = ${round(prediction)}。`;
  }
  if (phase === "loss") {
    return `然后把预测值和真实值 y = ${round(sample.y)} 比较，得到当前损失 ${round(loss)}，用来衡量这条非线性曲线在该点上的拟合程度。`;
  }
  if (phase === "backward") {
    return `误差会从输出层继续传回两个隐藏神经元，因此网络会同时学习隐藏特征和输出组合方式。`;
  }
  return `参数更新后，隐藏层和输出层会一起变化，拟合曲线也会变得更贴合这组非线性数据。`;
}

function buildSvmExplanation(sample, phase, score, margin, hinge, gradW1, gradW2, gradB, nextWeight1, nextWeight2, nextBias) {
  if (phase === "forward") {
    return `The sample receives a raw SVM score f(x) = w·x + b = ${round(score)} and a signed margin y*f(x) = ${round(margin)}.`;
  }
  if (phase === "loss") {
    return `Hinge loss checks whether the point is outside the margin. Here max(0, 1 - margin) = ${round(hinge)}.`;
  }
  if (phase === "backward") {
    return `If the point violates the margin, the subgradient pushes the separating hyperplane away. dw = [${round(gradW1)}, ${round(gradW2)}], db = ${round(gradB)}.`;
  }
  return `After the update, the separator becomes w = [${round(nextWeight1)}, ${round(nextWeight2)}], b = ${round(nextBias)} and the margin lines move with it.`;
}

function buildSvmExplanationZh(sample, phase, score, margin, hinge, gradW1, gradW2, gradB, nextWeight1, nextWeight2, nextBias) {
  if (phase === "forward") {
    return `当前样本先计算 SVM 打分 f(x) = w·x + b = ${round(score)}，再得到有符号间隔 y*f(x) = ${round(margin)}。`;
  }
  if (phase === "loss") {
    return `铰链损失会检查这个点是否跑到了 margin 内部，这里 max(0, 1 - margin) = ${round(hinge)}。`;
  }
  if (phase === "backward") {
    return `如果样本违反了 margin 约束，次梯度会推动分割超平面远离这个点。当前 dw = [${round(gradW1)}, ${round(gradW2)}]，db = ${round(gradB)}。`;
  }
  return `更新后分割边界变成 w = [${round(nextWeight1)}, ${round(nextWeight2)}]，b = ${round(nextBias)}，两侧的 margin 线也会一起移动。`;
}

function buildPcaExplanation(sample, phase, meanX, meanY, covXX, covXY, covYY, principalX, principalY, projectedX, projectedY, explainedVariance) {
  if (phase === "forward") {
    return `PCA first centers the sample around the dataset mean. The current mean is [${round(meanX)}, ${round(meanY)}].`;
  }
  if (phase === "loss") {
    return `Next it builds the covariance matrix [[${round(covXX)}, ${round(covXY)}], [${round(covXY)}, ${round(covYY)}]] to measure joint variation.`;
  }
  if (phase === "backward") {
    return `The top eigenvector becomes PC1 = [${round(principalX)}, ${round(principalY)}], which captures the dominant direction of the cloud.`;
  }
  return `Finally the sample is projected onto PC1 at [${round(projectedX)}, ${round(projectedY)}]. Explained variance is ${round(explainedVariance)}.`;
}

function buildPcaExplanationZh(sample, phase, meanX, meanY, covXX, covXY, covYY, principalX, principalY, projectedX, projectedY, explainedVariance) {
  if (phase === "forward") {
    return `PCA 会先把样本相对数据集均值做中心化，当前均值是 [${round(meanX)}, ${round(meanY)}]。`;
  }
  if (phase === "loss") {
    return `然后构造协方差矩阵 [[${round(covXX)}, ${round(covXY)}], [${round(covXY)}, ${round(covYY)}]]，用来刻画整体数据云的变化方向。`;
  }
  if (phase === "backward") {
    return `协方差矩阵最大的特征向量就是主成分 PC1 = [${round(principalX)}, ${round(principalY)}]，它代表数据最主要的伸展方向。`;
  }
  return `最后把当前样本投影到 PC1 上，投影点是 [${round(projectedX)}, ${round(projectedY)}]。当前解释方差比例约为 ${round(explainedVariance)}。`;
}

function buildKMeansExplanation(sample, phase, closestCluster, inertia, shiftX, shiftY, nextCentroid) {
  if (phase === "forward") {
    return `The point [${round(sample.x1)}, ${round(sample.x2)}] measures its distance to every centroid and joins cluster ${closestCluster + 1}.`;
  }
  if (phase === "loss") {
    return `K-Means uses squared distance as inertia. This point contributes ${round(inertia)} to the objective.`;
  }
  if (phase === "backward") {
    return `The chosen centroid receives a movement signal of [${round(shiftX)}, ${round(shiftY)}], telling it how to move toward the point.`;
  }
  return `After the update, centroid ${closestCluster + 1} moves to [${round(nextCentroid.x1)}, ${round(nextCentroid.x2)}].`;
}

function buildKMeansExplanationZh(sample, phase, closestCluster, inertia, shiftX, shiftY, nextCentroid) {
  if (phase === "forward") {
    return `当前点 [${round(sample.x1)}, ${round(sample.x2)}] 会先计算到所有质心的距离，然后被分配到第 ${closestCluster + 1} 个簇。`;
  }
  if (phase === "loss") {
    return `K-Means 的目标函数是簇内平方距离。这个点当前贡献的 inertia 是 ${round(inertia)}。`;
  }
  if (phase === "backward") {
    return `被选中的质心会收到一个位移信号 [${round(shiftX)}, ${round(shiftY)}]，告诉它应该朝这个点移动多少。`;
  }
  return `更新后，第 ${closestCluster + 1} 个质心会移动到 [${round(nextCentroid.x1)}, ${round(nextCentroid.x2)}]。`;
}

function buildLinearTrace(sample, phase, params, prediction, error, loss, gradW, gradB, nextWeight, nextBias, learningRate) {
  const currentIndex = getCurrentTraceIndex(phase);

  return [
    {
      title: "Current Parameters",
      titleZh: "当前参数",
      formula: `w = ${round(params.weight)}, b = ${round(params.bias)}, x = ${round(sample.x)}, y = ${round(sample.y)}`,
      formulaZh: `当前参数 w = ${round(params.weight)}，b = ${round(params.bias)}，输入 x = ${round(sample.x)}，目标 y = ${round(sample.y)}`,
      status: getTraceStatus(0, currentIndex),
      spotlight: "parameters",
    },
    {
      title: "Forward Prediction",
      titleZh: "前向预测",
      formula: `y_hat = w * x + b = ${round(params.weight)} * ${round(sample.x)} + ${round(params.bias)} = ${round(prediction)}`,
      formulaZh: `预测值 y_hat = w*x + b = ${round(params.weight)} * ${round(sample.x)} + ${round(params.bias)} = ${round(prediction)}`,
      status: getTraceStatus(1, currentIndex),
      spotlight: "prediction",
    },
    {
      title: "Loss Construction",
      titleZh: "损失构造",
      formula: `error = y_hat - y = ${round(prediction)} - ${round(sample.y)} = ${round(error)};  L = 0.5 * error^2 = ${round(loss)}`,
      formulaZh: `误差 error = y_hat - y = ${round(prediction)} - ${round(sample.y)} = ${round(error)}；损失 L = 0.5 * error^2 = ${round(loss)}`,
      status: getTraceStatus(2, currentIndex),
      spotlight: "loss",
    },
    {
      title: "Backward Gradients",
      titleZh: "反向梯度",
      formula: `dw = error * x = ${round(error)} * ${round(sample.x)} = ${round(gradW)};  db = error = ${round(gradB)}`,
      formulaZh: `dw = error * x = ${round(error)} * ${round(sample.x)} = ${round(gradW)}；db = error = ${round(gradB)}`,
      status: getTraceStatus(3, currentIndex),
      spotlight: "gradient",
    },
    {
      title: "Parameter Update",
      titleZh: "参数更新",
      formula: `w' = w - lr * dw = ${round(params.weight)} - ${round(learningRate)} * ${round(gradW)} = ${round(nextWeight)};  b' = ${round(nextBias)}`,
      formulaZh: `w' = w - lr * dw = ${round(params.weight)} - ${round(learningRate)} * ${round(gradW)} = ${round(nextWeight)}；b' = ${round(nextBias)}`,
      status: getTraceStatus(4, currentIndex),
      spotlight: "update",
    },
  ];
}

function buildLogisticTrace(sample, phase, params, logit, probability, loss, gradW1, gradW2, gradB, nextWeight1, nextWeight2, nextBias, learningRate) {
  const currentIndex = getCurrentTraceIndex(phase);

  return [
    {
      title: "Current Parameters",
      titleZh: "当前参数",
      formula: `w = [${round(params.weight1)}, ${round(params.weight2)}], b = ${round(params.bias)}, x = [${round(sample.x1)}, ${round(sample.x2)}], y = ${sample.label}`,
      formulaZh: `当前参数 w = [${round(params.weight1)}, ${round(params.weight2)}]，b = ${round(params.bias)}，输入 x = [${round(sample.x1)}, ${round(sample.x2)}]，标签 y = ${sample.label}`,
      status: getTraceStatus(0, currentIndex),
      spotlight: "parameters",
    },
    {
      title: "Linear + Sigmoid",
      titleZh: "线性打分与 Sigmoid",
      formula: `z = w1*x1 + w2*x2 + b = ${round(logit)};  p = sigmoid(z) = ${round(probability)}`,
      formulaZh: `z = w1*x1 + w2*x2 + b = ${round(logit)}；p = sigmoid(z) = ${round(probability)}`,
      status: getTraceStatus(1, currentIndex),
      spotlight: "prediction",
    },
    {
      title: "Cross-Entropy Loss",
      titleZh: "交叉熵损失",
      formula: `L = -(y*log(p) + (1-y)*log(1-p)) = ${round(loss)}`,
      formulaZh: `L = -(y*log(p) + (1-y)*log(1-p)) = ${round(loss)}`,
      status: getTraceStatus(2, currentIndex),
      spotlight: "loss",
    },
    {
      title: "Backward Gradients",
      titleZh: "反向梯度",
      formula: `delta = p - y = ${round(probability)} - ${sample.label} = ${round(probability - sample.label)}; dw1 = ${round(gradW1)}, dw2 = ${round(gradW2)}, db = ${round(gradB)}`,
      formulaZh: `delta = p - y = ${round(probability)} - ${sample.label} = ${round(probability - sample.label)}；dw1 = ${round(gradW1)}，dw2 = ${round(gradW2)}，db = ${round(gradB)}`,
      status: getTraceStatus(3, currentIndex),
      spotlight: "gradient",
    },
    {
      title: "Decision Boundary Update",
      titleZh: "决策边界更新",
      formula: `w1' = ${round(nextWeight1)}, w2' = ${round(nextWeight2)}, b' = ${round(nextBias)} with lr = ${round(learningRate)}`,
      formulaZh: `使用学习率 ${round(learningRate)} 更新后，w1' = ${round(nextWeight1)}，w2' = ${round(nextWeight2)}，b' = ${round(nextBias)}`,
      status: getTraceStatus(4, currentIndex),
      spotlight: "update",
    },
  ];
}

function buildNeuralTrace(sample, phase, params, z1, z2, h1, h2, prediction, error, loss, grads, nextParams, learningRate) {
  const currentIndex = getCurrentTraceIndex(phase);

  return [
    {
      title: "Current Parameters",
      titleZh: "当前参数",
      formula: `W1 = [${round(params.inputToHidden1)}, ${round(params.inputToHidden2)}], b1 = [${round(params.hiddenBias1)}, ${round(params.hiddenBias2)}], W2 = [${round(params.hiddenToOutput1)}, ${round(params.hiddenToOutput2)}], b2 = ${round(params.outputBias)}`,
      formulaZh: `当前参数 W1 = [${round(params.inputToHidden1)}, ${round(params.inputToHidden2)}]，b1 = [${round(params.hiddenBias1)}, ${round(params.hiddenBias2)}]，W2 = [${round(params.hiddenToOutput1)}, ${round(params.hiddenToOutput2)}]，b2 = ${round(params.outputBias)}`,
      status: getTraceStatus(0, currentIndex),
      spotlight: "parameters",
    },
    {
      title: "Hidden Activations",
      titleZh: "隐藏层激活",
      formula: `z1 = w11*x + b1 = ${round(z1)}, h1 = tanh(z1) = ${round(h1)};  z2 = ${round(z2)}, h2 = ${round(h2)}`,
      formulaZh: `z1 = w11*x + b1 = ${round(z1)}，h1 = tanh(z1) = ${round(h1)}；z2 = ${round(z2)}，h2 = ${round(h2)}`,
      status: getTraceStatus(1, currentIndex),
      spotlight: "prediction",
    },
    {
      title: "Output and Loss",
      titleZh: "输出与损失",
      formula: `y_hat = v1*h1 + v2*h2 + b2 = ${round(prediction)};  error = ${round(error)};  L = 0.5 * error^2 = ${round(loss)}`,
      formulaZh: `y_hat = v1*h1 + v2*h2 + b2 = ${round(prediction)}；error = ${round(error)}；L = 0.5 * error^2 = ${round(loss)}`,
      status: getTraceStatus(2, currentIndex),
      spotlight: "loss",
    },
    {
      title: "Backpropagation",
      titleZh: "反向传播",
      formula: `dV = [${round(grads.gradHiddenToOutput1)}, ${round(grads.gradHiddenToOutput2)}], dW = [${round(grads.gradInputToHidden1)}, ${round(grads.gradInputToHidden2)}]`,
      formulaZh: `输出层梯度 dV = [${round(grads.gradHiddenToOutput1)}, ${round(grads.gradHiddenToOutput2)}]；隐藏层梯度 dW = [${round(grads.gradInputToHidden1)}, ${round(grads.gradInputToHidden2)}]`,
      status: getTraceStatus(3, currentIndex),
      spotlight: "gradient",
    },
    {
      title: "Network Update",
      titleZh: "网络参数更新",
      formula: `W1' = [${round(nextParams.inputToHidden1)}, ${round(nextParams.inputToHidden2)}], W2' = [${round(nextParams.hiddenToOutput1)}, ${round(nextParams.hiddenToOutput2)}], lr = ${round(learningRate)}`,
      formulaZh: `更新后 W1' = [${round(nextParams.inputToHidden1)}, ${round(nextParams.inputToHidden2)}]，W2' = [${round(nextParams.hiddenToOutput1)}, ${round(nextParams.hiddenToOutput2)}]，学习率 lr = ${round(learningRate)}`,
      status: getTraceStatus(4, currentIndex),
      spotlight: "update",
    },
  ];
}

function buildSvmTrace(
  sample,
  phase,
  params,
  signedLabel,
  score,
  margin,
  hinge,
  objective,
  gradW1,
  gradW2,
  gradB,
  nextWeight1,
  nextWeight2,
  nextBias,
  learningRate
) {
  const currentIndex = getCurrentTraceIndex(phase);

  return [
    {
      title: "Current Hyperplane",
      titleZh: "当前超平面",
      formula: `w = [${round(params.weight1)}, ${round(params.weight2)}], b = ${round(params.bias)}, y = ${signedLabel}`,
      formulaZh: `当前参数 w = [${round(params.weight1)}, ${round(params.weight2)}], b = ${round(params.bias)}, 标签 y = ${signedLabel}`,
      status: getTraceStatus(0, currentIndex),
      spotlight: "parameters",
    },
    {
      title: "Signed Margin",
      titleZh: "有符号间隔",
      formula: `f(x) = w·x + b = ${round(score)};  y*f(x) = ${signedLabel} * ${round(score)} = ${round(margin)}`,
      formulaZh: `f(x) = w·x + b = ${round(score)}；y*f(x) = ${signedLabel} * ${round(score)} = ${round(margin)}`,
      status: getTraceStatus(1, currentIndex),
      spotlight: "prediction",
    },
    {
      title: "Hinge Objective",
      titleZh: "铰链损失",
      formula: `hinge = max(0, 1 - margin) = ${round(hinge)};  J = 0.5*lambda*||w||^2 + hinge = ${round(objective)}`,
      formulaZh: `hinge = max(0, 1 - margin) = ${round(hinge)}；J = 0.5*lambda*||w||^2 + hinge = ${round(objective)}`,
      status: getTraceStatus(2, currentIndex),
      spotlight: "loss",
    },
    {
      title: "Subgradient",
      titleZh: "次梯度",
      formula: `dw = [${round(gradW1)}, ${round(gradW2)}], db = ${round(gradB)}`,
      formulaZh: `次梯度 dw = [${round(gradW1)}, ${round(gradW2)}], db = ${round(gradB)}`,
      status: getTraceStatus(3, currentIndex),
      spotlight: "gradient",
    },
    {
      title: "Margin Update",
      titleZh: "间隔更新",
      formula: `w' = [${round(nextWeight1)}, ${round(nextWeight2)}], b' = ${round(nextBias)} with lr = ${round(learningRate)}`,
      formulaZh: `使用学习率 ${round(learningRate)} 更新后，w' = [${round(nextWeight1)}, ${round(nextWeight2)}], b' = ${round(nextBias)}`,
      status: getTraceStatus(4, currentIndex),
      spotlight: "update",
    },
  ];
}

function buildPcaTrace(
  sample,
  phase,
  meanX,
  meanY,
  centeredX,
  centeredY,
  covXX,
  covXY,
  covYY,
  principalX,
  principalY,
  projectedScalar,
  projectedX,
  projectedY,
  reconstructionError,
  explainedVariance
) {
  const currentIndex = getCurrentTraceIndex(phase);

  return [
    {
      title: "Dataset Mean",
      titleZh: "数据均值",
      formula: `mu = [${round(meanX)}, ${round(meanY)}], x = [${round(sample.x1)}, ${round(sample.x2)}]`,
      formulaZh: `数据均值 mu = [${round(meanX)}, ${round(meanY)}], 当前样本 x = [${round(sample.x1)}, ${round(sample.x2)}]`,
      status: getTraceStatus(0, currentIndex),
      spotlight: "parameters",
    },
    {
      title: "Center Sample",
      titleZh: "样本中心化",
      formula: `x_centered = x - mu = [${round(centeredX)}, ${round(centeredY)}]`,
      formulaZh: `中心化后 x_centered = x - mu = [${round(centeredX)}, ${round(centeredY)}]`,
      status: getTraceStatus(1, currentIndex),
      spotlight: "prediction",
    },
    {
      title: "Covariance Matrix",
      titleZh: "协方差矩阵",
      formula: `Sigma = [[${round(covXX)}, ${round(covXY)}], [${round(covXY)}, ${round(covYY)}]]`,
      formulaZh: `协方差矩阵 Sigma = [[${round(covXX)}, ${round(covXY)}], [${round(covXY)}, ${round(covYY)}]]`,
      status: getTraceStatus(2, currentIndex),
      spotlight: "loss",
    },
    {
      title: "Principal Direction",
      titleZh: "主成分方向",
      formula: `PC1 = [${round(principalX)}, ${round(principalY)}], explained variance = ${round(explainedVariance)}`,
      formulaZh: `主成分 PC1 = [${round(principalX)}, ${round(principalY)}], 解释方差比 = ${round(explainedVariance)}`,
      status: getTraceStatus(3, currentIndex),
      spotlight: "gradient",
    },
    {
      title: "Projection",
      titleZh: "投影结果",
      formula: `z = x_centered·PC1 = ${round(projectedScalar)};  x_proj = [${round(projectedX)}, ${round(projectedY)}], recon error = ${round(reconstructionError)}`,
      formulaZh: `z = x_centered·PC1 = ${round(projectedScalar)}；投影点 x_proj = [${round(projectedX)}, ${round(projectedY)}], 重建误差 = ${round(reconstructionError)}`,
      status: getTraceStatus(4, currentIndex),
      spotlight: "update",
    },
  ];
}

function computePcaGeometry(dataset) {
  const meanX = dataset.reduce((sum, sample) => sum + sample.x1, 0) / dataset.length;
  const meanY = dataset.reduce((sum, sample) => sum + sample.x2, 0) / dataset.length;
  const centered = dataset.map((sample) => ({
    id: sample.id,
    x1: sample.x1 - meanX,
    x2: sample.x2 - meanY,
  }));
  const covXX = centered.reduce((sum, sample) => sum + sample.x1 * sample.x1, 0) / dataset.length;
  const covXY = centered.reduce((sum, sample) => sum + sample.x1 * sample.x2, 0) / dataset.length;
  const covYY = centered.reduce((sum, sample) => sum + sample.x2 * sample.x2, 0) / dataset.length;
  const trace = covXX + covYY;
  const det = covXX * covYY - covXY * covXY;
  const eigenvalue = trace / 2 + Math.sqrt(Math.max(0, (trace * trace) / 4 - det));

  let principalX = covXY;
  let principalY = eigenvalue - covXX;
  if (Math.abs(principalX) < 1e-8 && Math.abs(principalY) < 1e-8) {
    principalX = 1;
    principalY = 0;
  }

  const norm = Math.hypot(principalX, principalY) || 1;
  principalX /= norm;
  principalY /= norm;

  return {
    meanX,
    meanY,
    covXX,
    covXY,
    covYY,
    principalX,
    principalY,
    explainedVariance: eigenvalue / Math.max(trace, 1e-8),
  };
}

function buildLinearSnapshots(dataset, learningRate) {
  let weight = 0.4;
  let bias = 0.2;
  const snapshots = [];

  dataset.forEach((sample, sampleIndex) => {
    const prediction = weight * sample.x + bias;
    const error = prediction - sample.y;
    const loss = 0.5 * error * error;
    const gradW = error * sample.x;
    const gradB = error;
    const nextWeight = weight - learningRate * gradW;
    const nextBias = bias - learningRate * gradB;

    PHASES.forEach((phase) => {
      snapshots.push({
        algorithmId: "linear_regression",
        title: "Linear Regression",
        datasetLabel: "1D regression points",
        stepLabel: `Sample ${sampleIndex + 1} / ${dataset.length}`,
        phase,
        chartType: "linear",
        points: dataset,
        focusSample: sample,
        params: {
          weight: round(phase === "update" ? nextWeight : weight),
          bias: round(phase === "update" ? nextBias : bias),
          gradientWeight: round(gradW),
          gradientBias: round(gradB),
          learningRate: round(learningRate),
        },
        metrics: {
          prediction: round(prediction),
          target: round(sample.y),
          loss: round(loss),
          error: round(error),
        },
        visualGuide: {
          previousModel: {
            weight: round(weight),
            bias: round(bias),
          },
          updatedModel: {
            weight: round(nextWeight),
            bias: round(nextBias),
          },
          predictedY: round(prediction),
        },
        modelFlow: [
          { title: "Input x", detail: `x = ${round(sample.x)}`, active: phase === "forward" },
          { title: "Linear", detail: `y_hat = ${round(prediction)}`, active: phase === "forward" },
          { title: "Loss", detail: `0.5 * error^2 = ${round(loss)}`, active: phase === "loss" },
          { title: "Gradients", detail: `dw = ${round(gradW)}, db = ${round(gradB)}`, active: phase === "backward" },
          { title: "Update", detail: `w -> ${round(nextWeight)}, b -> ${round(nextBias)}`, active: phase === "update" },
        ],
        explanation: buildLinearExplanation(sample, phase, prediction, loss, gradW, gradB, nextWeight, nextBias),
        explanationZh: buildLinearExplanationZh(sample, phase, prediction, loss, gradW, gradB, nextWeight, nextBias),
        calculationTrace: buildLinearTrace(
          sample,
          phase,
          { weight, bias },
          prediction,
          error,
          loss,
          gradW,
          gradB,
          nextWeight,
          nextBias,
          learningRate
        ),
      });
    });

    weight = nextWeight;
    bias = nextBias;
  });

  return snapshots;
}

function buildLogisticSnapshots(dataset, learningRate) {
  let weight1 = 0.35;
  let weight2 = -0.2;
  let bias = 0.15;
  const snapshots = [];

  dataset.forEach((sample, sampleIndex) => {
    const logit = weight1 * sample.x1 + weight2 * sample.x2 + bias;
    const probability = sigmoid(logit);
    const loss = -(sample.label * Math.log(probability + 1e-9) + (1 - sample.label) * Math.log(1 - probability + 1e-9));
    const delta = probability - sample.label;
    const gradW1 = delta * sample.x1;
    const gradW2 = delta * sample.x2;
    const gradB = delta;
    const nextWeight1 = weight1 - learningRate * gradW1;
    const nextWeight2 = weight2 - learningRate * gradW2;
    const nextBias = bias - learningRate * gradB;

    PHASES.forEach((phase) => {
      snapshots.push({
        algorithmId: "logistic_regression",
        title: "Logistic Regression",
        datasetLabel: "2D binary classification",
        stepLabel: `Sample ${sampleIndex + 1} / ${dataset.length}`,
        phase,
        chartType: "classification",
        points: dataset,
        focusSample: sample,
        params: {
          weight1: round(phase === "update" ? nextWeight1 : weight1),
          weight2: round(phase === "update" ? nextWeight2 : weight2),
          bias: round(phase === "update" ? nextBias : bias),
          gradientWeight1: round(gradW1),
          gradientWeight2: round(gradW2),
          gradientBias: round(gradB),
          learningRate: round(learningRate),
        },
        metrics: {
          prediction: round(probability),
          target: sample.label,
          loss: round(loss),
          logit: round(logit),
        },
        visualGuide: {
          previousModel: {
            weight1: round(weight1),
            weight2: round(weight2),
            bias: round(bias),
          },
          updatedModel: {
            weight1: round(nextWeight1),
            weight2: round(nextWeight2),
            bias: round(nextBias),
          },
        },
        modelFlow: [
          { title: "Input vector", detail: `[${round(sample.x1)}, ${round(sample.x2)}]`, active: phase === "forward" },
          { title: "Linear score", detail: `z = ${round(logit)}`, active: phase === "forward" },
          { title: "Sigmoid", detail: `p = ${round(probability)}`, active: phase === "forward" },
          { title: "Cross-entropy", detail: `loss = ${round(loss)}`, active: phase === "loss" },
          { title: "Gradients", detail: `dw1 = ${round(gradW1)}, dw2 = ${round(gradW2)}, db = ${round(gradB)}`, active: phase === "backward" },
          { title: "Update", detail: `w -> [${round(nextWeight1)}, ${round(nextWeight2)}], b -> ${round(nextBias)}`, active: phase === "update" },
        ],
        explanation: buildLogisticExplanation(sample, phase, probability, loss, gradW1, gradW2, gradB, nextWeight1, nextWeight2, nextBias),
        explanationZh: buildLogisticExplanationZh(sample, phase, probability, loss, gradW1, gradW2, gradB, nextWeight1, nextWeight2, nextBias),
        calculationTrace: buildLogisticTrace(
          sample,
          phase,
          { weight1, weight2, bias },
          logit,
          probability,
          loss,
          gradW1,
          gradW2,
          gradB,
          nextWeight1,
          nextWeight2,
          nextBias,
          learningRate
        ),
      });
    });

    weight1 = nextWeight1;
    weight2 = nextWeight2;
    bias = nextBias;
  });

  return snapshots;
}

function buildNeuralSnapshots(dataset, learningRate) {
  let params = {
    inputToHidden1: 0.85,
    inputToHidden2: -1.05,
    hiddenBias1: 0.35,
    hiddenBias2: -0.25,
    hiddenToOutput1: 1.15,
    hiddenToOutput2: -0.95,
    outputBias: 0.12,
  };

  const snapshots = [];

  dataset.forEach((sample, sampleIndex) => {
    const z1 = params.inputToHidden1 * sample.x + params.hiddenBias1;
    const z2 = params.inputToHidden2 * sample.x + params.hiddenBias2;
    const h1 = tanh(z1);
    const h2 = tanh(z2);
    const prediction = params.hiddenToOutput1 * h1 + params.hiddenToOutput2 * h2 + params.outputBias;
    const error = prediction - sample.y;
    const loss = 0.5 * error * error;

    const gradHiddenToOutput1 = error * h1;
    const gradHiddenToOutput2 = error * h2;
    const gradOutputBias = error;

    const gradHidden1 = error * params.hiddenToOutput1 * (1 - h1 * h1);
    const gradHidden2 = error * params.hiddenToOutput2 * (1 - h2 * h2);

    const gradInputToHidden1 = gradHidden1 * sample.x;
    const gradInputToHidden2 = gradHidden2 * sample.x;
    const gradHiddenBias1 = gradHidden1;
    const gradHiddenBias2 = gradHidden2;

    const nextParams = {
      inputToHidden1: params.inputToHidden1 - learningRate * gradInputToHidden1,
      inputToHidden2: params.inputToHidden2 - learningRate * gradInputToHidden2,
      hiddenBias1: params.hiddenBias1 - learningRate * gradHiddenBias1,
      hiddenBias2: params.hiddenBias2 - learningRate * gradHiddenBias2,
      hiddenToOutput1: params.hiddenToOutput1 - learningRate * gradHiddenToOutput1,
      hiddenToOutput2: params.hiddenToOutput2 - learningRate * gradHiddenToOutput2,
      outputBias: params.outputBias - learningRate * gradOutputBias,
    };

    PHASES.forEach((phase) => {
      const visibleParams = phase === "update" ? nextParams : params;
      const roundedParams = {
        inputToHidden1: round(visibleParams.inputToHidden1),
        inputToHidden2: round(visibleParams.inputToHidden2),
        hiddenBias1: round(visibleParams.hiddenBias1),
        hiddenBias2: round(visibleParams.hiddenBias2),
        hiddenToOutput1: round(visibleParams.hiddenToOutput1),
        hiddenToOutput2: round(visibleParams.hiddenToOutput2),
        outputBias: round(visibleParams.outputBias),
        gradInputToHidden1: round(gradInputToHidden1),
        gradInputToHidden2: round(gradInputToHidden2),
        gradHiddenToOutput1: round(gradHiddenToOutput1),
        gradHiddenToOutput2: round(gradHiddenToOutput2),
        learningRate: round(learningRate),
      };

      snapshots.push({
        algorithmId: "two_layer_network",
        title: "Two-Layer Neural Network",
        datasetLabel: "1D nonlinear regression",
        stepLabel: `Sample ${sampleIndex + 1} / ${dataset.length}`,
        phase,
        chartType: "network_regression",
        points: dataset,
        curvePoints: buildCurvePoints(visibleParams),
        focusSample: sample,
        params: roundedParams,
        metrics: {
          prediction: round(prediction),
          target: round(sample.y),
          loss: round(loss),
          hidden1: round(h1),
          hidden2: round(h2),
        },
        visualGuide: {
          previousCurvePoints: buildCurvePoints(params),
          updatedCurvePoints: buildCurvePoints(nextParams),
          predictedY: round(prediction),
        },
        modelFlow: [
          { title: "Input", detail: `x = ${round(sample.x)}`, active: phase === "forward" },
          { title: "Hidden neuron 1", detail: `tanh(z1) = ${round(h1)}`, active: phase === "forward" },
          { title: "Hidden neuron 2", detail: `tanh(z2) = ${round(h2)}`, active: phase === "forward" },
          { title: "Output layer", detail: `y_hat = ${round(prediction)}`, active: phase === "forward" },
          { title: "Loss", detail: `0.5 * error^2 = ${round(loss)}`, active: phase === "loss" },
          {
            title: "Backward pass",
            detail: `dW1 = [${round(gradInputToHidden1)}, ${round(gradInputToHidden2)}], dW2 = [${round(gradHiddenToOutput1)}, ${round(gradHiddenToOutput2)}]`,
            active: phase === "backward",
          },
          {
            title: "Update",
            detail: `curve recomputed with new hidden and output weights`,
            active: phase === "update",
          },
        ],
        explanation: buildNeuralExplanation(
          sample,
          phase,
          prediction,
          loss,
          h1,
          h2,
          {
            gradInputToHidden1,
            gradInputToHidden2,
            gradHiddenToOutput1,
            gradHiddenToOutput2,
          },
          nextParams
        ),
        explanationZh: buildNeuralExplanationZh(
          sample,
          phase,
          prediction,
          loss,
          h1,
          h2,
          {
            gradInputToHidden1,
            gradInputToHidden2,
            gradHiddenToOutput1,
            gradHiddenToOutput2,
          },
          nextParams
        ),
        calculationTrace: buildNeuralTrace(
          sample,
          phase,
          params,
          z1,
          z2,
          h1,
          h2,
          prediction,
          error,
          loss,
          {
            gradInputToHidden1,
            gradInputToHidden2,
            gradHiddenToOutput1,
            gradHiddenToOutput2,
          },
          nextParams,
          learningRate
        ),
      });
    });

    params = nextParams;
  });

  return snapshots;
}

function buildSvmSnapshots(dataset, learningRate) {
  const regularization = 0.08;
  let weight1 = 0.58;
  let weight2 = -0.42;
  let bias = -0.18;
  const snapshots = [];

  dataset.forEach((sample, sampleIndex) => {
    const signedLabel = sample.label === 1 ? 1 : -1;
    const score = weight1 * sample.x1 + weight2 * sample.x2 + bias;
    const margin = signedLabel * score;
    const hinge = Math.max(0, 1 - margin);
    const objective = 0.5 * regularization * (weight1 * weight1 + weight2 * weight2) + hinge;
    const marginViolated = margin < 1;

    const gradW1 = regularization * weight1 + (marginViolated ? -signedLabel * sample.x1 : 0);
    const gradW2 = regularization * weight2 + (marginViolated ? -signedLabel * sample.x2 : 0);
    const gradB = marginViolated ? -signedLabel : 0;

    const nextWeight1 = weight1 - learningRate * gradW1;
    const nextWeight2 = weight2 - learningRate * gradW2;
    const nextBias = bias - learningRate * gradB;

    PHASES.forEach((phase) => {
      const visible = phase === "update"
        ? { weight1: nextWeight1, weight2: nextWeight2, bias: nextBias }
        : { weight1, weight2, bias };

      snapshots.push({
        algorithmId: "linear_svm",
        title: "Linear SVM",
        datasetLabel: "Margin-separated 2D clusters",
        stepLabel: `Sample ${sampleIndex + 1} / ${dataset.length}`,
        phase,
        chartType: "classification",
        points: dataset,
        focusSample: sample,
        params: {
          weight1: round(visible.weight1),
          weight2: round(visible.weight2),
          bias: round(visible.bias),
          gradientWeight1: round(gradW1),
          gradientWeight2: round(gradW2),
          gradientBias: round(gradB),
          margin: round(margin),
          hinge: round(hinge),
          learningRate: round(learningRate),
        },
        metrics: {
          prediction: round(score),
          target: signedLabel,
          loss: round(objective),
        },
        visualGuide: {
          previousModel: { weight1: round(weight1), weight2: round(weight2), bias: round(bias) },
          updatedModel: { weight1: round(nextWeight1), weight2: round(nextWeight2), bias: round(nextBias) },
          marginOffset: 1,
        },
        modelFlow: [
          { title: "Input", detail: `x = [${round(sample.x1)}, ${round(sample.x2)}], y = ${signedLabel}`, active: phase === "forward" },
          { title: "Hyperplane score", detail: `f(x) = ${round(score)}`, active: phase === "forward" },
          { title: "Margin check", detail: `y*f(x) = ${round(margin)}`, active: phase === "loss" },
          { title: "Hinge objective", detail: `J = ${round(objective)}`, active: phase === "loss" },
          { title: "Subgradient", detail: `dw = [${round(gradW1)}, ${round(gradW2)}], db = ${round(gradB)}`, active: phase === "backward" },
          { title: "Separator update", detail: `margin band repositions`, active: phase === "update" },
        ],
        explanation: buildSvmExplanation(
          sample,
          phase,
          score,
          margin,
          hinge,
          gradW1,
          gradW2,
          gradB,
          nextWeight1,
          nextWeight2,
          nextBias
        ),
        explanationZh: buildSvmExplanationZh(
          sample,
          phase,
          score,
          margin,
          hinge,
          gradW1,
          gradW2,
          gradB,
          nextWeight1,
          nextWeight2,
          nextBias
        ),
        calculationTrace: buildSvmTrace(
          sample,
          phase,
          { weight1, weight2, bias },
          signedLabel,
          score,
          margin,
          hinge,
          objective,
          gradW1,
          gradW2,
          gradB,
          nextWeight1,
          nextWeight2,
          nextBias,
          learningRate
        ),
      });
    });

    weight1 = nextWeight1;
    weight2 = nextWeight2;
    bias = nextBias;
  });

  return snapshots;
}

function buildPcaSnapshots(dataset, learningRate) {
  const geometry = computePcaGeometry(dataset);
  const snapshots = [];

  dataset.forEach((sample, sampleIndex) => {
    const centeredX = sample.x1 - geometry.meanX;
    const centeredY = sample.x2 - geometry.meanY;
    const projectedScalar = centeredX * geometry.principalX + centeredY * geometry.principalY;
    const projectedX = geometry.meanX + projectedScalar * geometry.principalX;
    const projectedY = geometry.meanY + projectedScalar * geometry.principalY;
    const reconstructionError = Math.hypot(sample.x1 - projectedX, sample.x2 - projectedY);

    PHASES.forEach((phase) => {
      snapshots.push({
        algorithmId: "pca_projection",
        title: "Principal Component Analysis",
        datasetLabel: "2D cloud with dominant direction",
        stepLabel: `Sample ${sampleIndex + 1} / ${dataset.length}`,
        phase,
        chartType: "pca",
        points: dataset,
        focusSample: sample,
        params: {
          meanX: round(geometry.meanX),
          meanY: round(geometry.meanY),
          covarianceXX: round(geometry.covXX),
          covarianceXY: round(geometry.covXY),
          covarianceYY: round(geometry.covYY),
          principalX: round(geometry.principalX),
          principalY: round(geometry.principalY),
          explainedVariance: round(geometry.explainedVariance),
          learningRate: round(learningRate),
        },
        metrics: {
          prediction: round(projectedScalar),
          target: round(geometry.explainedVariance),
          loss: round(reconstructionError),
        },
        visualGuide: {
          mean: { x1: round(geometry.meanX), x2: round(geometry.meanY) },
          principalVector: { x: round(geometry.principalX), y: round(geometry.principalY) },
          projectedPoint: { x1: round(projectedX), x2: round(projectedY) },
          centeredPoint: { x1: round(centeredX), x2: round(centeredY) },
          explainedVariance: round(geometry.explainedVariance),
        },
        modelFlow: [
          { title: "Input cloud", detail: `${dataset.length} samples in 2D`, active: phase === "forward" },
          { title: "Centering", detail: `mu = [${round(geometry.meanX)}, ${round(geometry.meanY)}]`, active: phase === "forward" },
          { title: "Covariance", detail: `Sigma captures co-variation`, active: phase === "loss" },
          { title: "Eigen decomposition", detail: `PC1 = [${round(geometry.principalX)}, ${round(geometry.principalY)}]`, active: phase === "backward" },
          { title: "Projection", detail: `z = ${round(projectedScalar)}, recon error = ${round(reconstructionError)}`, active: phase === "update" },
        ],
        explanation: buildPcaExplanation(
          sample,
          phase,
          geometry.meanX,
          geometry.meanY,
          geometry.covXX,
          geometry.covXY,
          geometry.covYY,
          geometry.principalX,
          geometry.principalY,
          projectedX,
          projectedY,
          geometry.explainedVariance
        ),
        explanationZh: buildPcaExplanationZh(
          sample,
          phase,
          geometry.meanX,
          geometry.meanY,
          geometry.covXX,
          geometry.covXY,
          geometry.covYY,
          geometry.principalX,
          geometry.principalY,
          projectedX,
          projectedY,
          geometry.explainedVariance
        ),
        calculationTrace: buildPcaTrace(
          sample,
          phase,
          geometry.meanX,
          geometry.meanY,
          centeredX,
          centeredY,
          geometry.covXX,
          geometry.covXY,
          geometry.covYY,
          geometry.principalX,
          geometry.principalY,
          projectedScalar,
          projectedX,
          projectedY,
          reconstructionError,
          geometry.explainedVariance
        ),
      });
    });
  });

  return snapshots;
}

function buildKMeansTrace(sample, phase, centroids, distances, closestCluster, inertia, shiftX, shiftY, nextCentroid, learningRate) {
  const currentIndex = getCurrentTraceIndex(phase);

  return [
    {
      title: "Current Centroids",
      titleZh: "当前质心",
      formula: centroids.map((centroid, index) => `c${index + 1}=[${round(centroid.x1)}, ${round(centroid.x2)}]`).join("; "),
      formulaZh: centroids.map((centroid, index) => `c${index + 1}=[${round(centroid.x1)}, ${round(centroid.x2)}]`).join("；"),
      status: getTraceStatus(0, currentIndex),
      spotlight: "parameters",
    },
    {
      title: "Distance To Centroids",
      titleZh: "到质心的距离",
      formula: distances.map((distance, index) => `d${index + 1}=||x-c${index + 1}||^2=${round(distance)}`).join("; "),
      formulaZh: distances.map((distance, index) => `d${index + 1}=||x-c${index + 1}||^2=${round(distance)}`).join("；"),
      status: getTraceStatus(1, currentIndex),
      spotlight: "prediction",
    },
    {
      title: "Cluster Inertia",
      titleZh: "簇内误差",
      formula: `assign = c${closestCluster + 1}; inertia = ${round(inertia)}`,
      formulaZh: `分配到 c${closestCluster + 1}；当前 inertia = ${round(inertia)}`,
      status: getTraceStatus(2, currentIndex),
      spotlight: "loss",
    },
    {
      title: "Centroid Shift",
      titleZh: "质心位移",
      formula: `delta = lr * (x - c${closestCluster + 1}) = [${round(shiftX)}, ${round(shiftY)}]`,
      formulaZh: `位移 delta = lr * (x - c${closestCluster + 1}) = [${round(shiftX)}, ${round(shiftY)}]`,
      status: getTraceStatus(3, currentIndex),
      spotlight: "gradient",
    },
    {
      title: "Online Update",
      titleZh: "在线更新",
      formula: `c${closestCluster + 1}' = [${round(nextCentroid.x1)}, ${round(nextCentroid.x2)}], lr = ${round(learningRate)}`,
      formulaZh: `更新后 c${closestCluster + 1}' = [${round(nextCentroid.x1)}, ${round(nextCentroid.x2)}], lr = ${round(learningRate)}`,
      status: getTraceStatus(4, currentIndex),
      spotlight: "update",
    },
  ];
}

function assignClusters(dataset, centroids) {
  return dataset.map((sample) => {
    const distances = centroids.map((centroid) => (sample.x1 - centroid.x1) ** 2 + (sample.x2 - centroid.x2) ** 2);
    const cluster = distances.indexOf(Math.min(...distances));
    return { ...sample, cluster, distances: distances.map((value) => round(value)) };
  });
}

function buildKMeansSnapshots(dataset, learningRate) {
  let centroids = [
    { id: "c1", x1: 1.1, x2: 1.1 },
    { id: "c2", x1: 4.8, x2: 1.2 },
    { id: "c3", x1: 2.8, x2: 4.8 },
  ];
  const snapshots = [];

  dataset.forEach((sample, sampleIndex) => {
    const distances = centroids.map((centroid) => (sample.x1 - centroid.x1) ** 2 + (sample.x2 - centroid.x2) ** 2);
    const closestCluster = distances.indexOf(Math.min(...distances));
    const inertia = distances[closestCluster];
    const shiftX = learningRate * (sample.x1 - centroids[closestCluster].x1);
    const shiftY = learningRate * (sample.x2 - centroids[closestCluster].x2);
    const nextCentroids = centroids.map((centroid, index) =>
      index === closestCluster
        ? { ...centroid, x1: centroid.x1 + shiftX, x2: centroid.x2 + shiftY }
        : { ...centroid }
    );
    const assignedPoints = assignClusters(dataset, centroids);
    const updatedPoints = assignClusters(dataset, nextCentroids);
    const nextCentroid = nextCentroids[closestCluster];

    PHASES.forEach((phase) => {
      const visibleCentroids = phase === "update" ? nextCentroids : centroids;
      const visiblePoints = phase === "update" ? updatedPoints : assignedPoints;
      snapshots.push({
        algorithmId: "kmeans_clustering",
        title: "K-Means Clustering",
        datasetLabel: "Online K-Means over 2D points",
        stepLabel: `Sample ${sampleIndex + 1} / ${dataset.length}`,
        phase,
        chartType: "clustering",
        points: visiblePoints,
        focusSample: sample,
        params: {
          centroid1X: round(visibleCentroids[0].x1),
          centroid1Y: round(visibleCentroids[0].x2),
          centroid2X: round(visibleCentroids[1].x1),
          centroid2Y: round(visibleCentroids[1].x2),
          centroid3X: round(visibleCentroids[2].x1),
          centroid3Y: round(visibleCentroids[2].x2),
          assignedCluster: closestCluster + 1,
          shiftX: round(shiftX),
          shiftY: round(shiftY),
          learningRate: round(learningRate),
        },
        metrics: {
          prediction: closestCluster + 1,
          target: round(inertia),
          loss: round(inertia),
        },
        visualGuide: {
          centroids: visibleCentroids.map((centroid) => ({ x1: round(centroid.x1), x2: round(centroid.x2) })),
          previousCentroids: centroids.map((centroid) => ({ x1: round(centroid.x1), x2: round(centroid.x2) })),
          updatedCentroids: nextCentroids.map((centroid) => ({ x1: round(centroid.x1), x2: round(centroid.x2) })),
          assignedCluster: closestCluster,
        },
        modelFlow: [
          { title: "Point lookup", detail: `x = [${round(sample.x1)}, ${round(sample.x2)}]`, active: phase === "forward" },
          { title: "Distance scan", detail: distances.map((distance, index) => `d${index + 1}=${round(distance)}`).join(", "), active: phase === "forward" },
          { title: "Closest centroid", detail: `cluster ${closestCluster + 1}, inertia = ${round(inertia)}`, active: phase === "loss" },
          { title: "Shift signal", detail: `delta = [${round(shiftX)}, ${round(shiftY)}]`, active: phase === "backward" },
          { title: "Centroid update", detail: `c${closestCluster + 1} -> [${round(nextCentroid.x1)}, ${round(nextCentroid.x2)}]`, active: phase === "update" },
        ],
        explanation: buildKMeansExplanation(sample, phase, closestCluster, inertia, shiftX, shiftY, nextCentroid),
        explanationZh: buildKMeansExplanationZh(sample, phase, closestCluster, inertia, shiftX, shiftY, nextCentroid),
        calculationTrace: buildKMeansTrace(sample, phase, centroids, distances, closestCluster, inertia, shiftX, shiftY, nextCentroid, learningRate),
      });
    });

    centroids = nextCentroids;
  });

  return snapshots;
}

export {
  buildLinearSnapshots,
  buildLogisticSnapshots,
  buildNeuralSnapshots,
  buildSvmSnapshots,
  buildPcaSnapshots,
  buildKMeansSnapshots,
};
