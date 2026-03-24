import {
  PHASES,
  round,
  sigmoid,
  tanh,
  softmax,
  dot,
  mean,
  projectVector,
  getTraceStatus,
  getCurrentTraceIndex,
  binaryCrossEntropy,
  reshapeGrid,
  flattenGrid,
  convolveValid,
  reluGrid,
  maxGrid,
  roundGrid,
  reluVector,
  addVectors,
  buildPositionalEncoding,
  layerNormalize,
  gelu,
} from "./shared.js";

function buildCnnExplanation(sample, phase, probabilities, pooled, predictedClass) {
  if (phase === "forward") {
    return `The 5x5 input patch is scanned by vertical and horizontal kernels. Their strongest responses become the first feature map evidence for this sample.`;
  }
  if (phase === "loss") {
    return `After ReLU and pooling, the CNN logits become [${round(pooled.vertical)}, ${round(pooled.horizontal)}], producing class probabilities [${round(probabilities[0])}, ${round(probabilities[1])}].`;
  }
  if (phase === "backward") {
    return `The loss pushes the kernel that should have fired more strongly to align with the most informative 3x3 patch. This is the core of filter learning.`;
  }
  return `After the update, the filter bank becomes slightly more specialized. The current predicted class is ${predictedClass}.`;
}

function buildCnnExplanationZh(sample, phase, probabilities, pooled, predictedClass) {
  if (phase === "forward") {
    return `这张 5x5 输入小图会同时被纵向和横向卷积核扫描，它们最强的响应会形成第一层特征图证据。`;
  }
  if (phase === "loss") {
    return `经过 ReLU 和池化后，当前 CNN 的 logits 变成 [${round(pooled.vertical)}, ${round(pooled.horizontal)}]，对应类别概率 [${round(probabilities[0])}, ${round(probabilities[1])}]。`;
  }
  if (phase === "backward") {
    return `损失会推动“应该更强响应”的卷积核去贴近最关键的 3x3 图像块，这就是卷积核学习的核心。`;
  }
  return `更新之后，卷积核会更偏向当前类别的局部模式，当前预测类别是 ${predictedClass}。`;
}

function buildCnnTrace(phase, kernelV, kernelH, pooled, probabilities, gradV, gradH, nextKernelV, nextKernelH) {
  const currentIndex = getCurrentTraceIndex(phase);
  return [
    {
      title: "Input + Kernels",
      titleZh: "输入与卷积核",
      formula: `K_v = [${flattenGrid(kernelV).map((value) => round(value)).join(", ")}], K_h = [${flattenGrid(kernelH).map((value) => round(value)).join(", ")}]`,
      formulaZh: `纵向核 = [${flattenGrid(kernelV).map((value) => round(value)).join(", ")}]，横向核 = [${flattenGrid(kernelH).map((value) => round(value)).join(", ")}]`,
      status: getTraceStatus(0, currentIndex),
      spotlight: "parameters",
    },
    {
      title: "Convolution Response",
      titleZh: "卷积响应",
      formula: `pool_v = ${round(pooled.vertical)}, pool_h = ${round(pooled.horizontal)}`,
      formulaZh: `纵向池化 = ${round(pooled.vertical)}，横向池化 = ${round(pooled.horizontal)}`,
      status: getTraceStatus(1, currentIndex),
      spotlight: "prediction",
    },
    {
      title: "Softmax Loss",
      titleZh: "Softmax 损失",
      formula: `p = [${round(probabilities[0])}, ${round(probabilities[1])}]`,
      formulaZh: `概率 p = [${round(probabilities[0])}, ${round(probabilities[1])}]`,
      status: getTraceStatus(2, currentIndex),
      spotlight: "loss",
    },
    {
      title: "Kernel Gradients",
      titleZh: "卷积核梯度",
      formula: `dK_v = [${flattenGrid(gradV).map((value) => round(value)).join(", ")}], dK_h = [${flattenGrid(gradH).map((value) => round(value)).join(", ")}]`,
      formulaZh: `纵向核梯度 = [${flattenGrid(gradV).map((value) => round(value)).join(", ")}]，横向核梯度 = [${flattenGrid(gradH).map((value) => round(value)).join(", ")}]`,
      status: getTraceStatus(3, currentIndex),
      spotlight: "gradient",
    },
    {
      title: "Kernel Update",
      titleZh: "卷积核更新",
      formula: `K'_v = [${flattenGrid(nextKernelV).map((value) => round(value)).join(", ")}], K'_h = [${flattenGrid(nextKernelH).map((value) => round(value)).join(", ")}]`,
      formulaZh: `更新后纵向核 = [${flattenGrid(nextKernelV).map((value) => round(value)).join(", ")}]，更新后横向核 = [${flattenGrid(nextKernelH).map((value) => round(value)).join(", ")}]`,
      status: getTraceStatus(4, currentIndex),
      spotlight: "update",
    },
  ];
}

function buildCnnSnapshots(dataset, learningRate) {
  let kernelVertical = [
    [1.0, 0.0, -1.0],
    [1.0, 0.0, -1.0],
    [1.0, 0.0, -1.0],
  ];
  let kernelHorizontal = [
    [1.0, 1.0, 1.0],
    [0.0, 0.0, 0.0],
    [-1.0, -1.0, -1.0],
  ];
  const snapshots = [];

  dataset.forEach((sample, sampleIndex) => {
    const image = reshapeGrid(sample.pixels);
    const verticalConv = convolveValid(image, kernelVertical);
    const horizontalConv = convolveValid(image, kernelHorizontal);
    const verticalMap = reluGrid(verticalConv.map);
    const horizontalMap = reluGrid(horizontalConv.map);
    const pooledVertical = maxGrid(verticalMap);
    const pooledHorizontal = maxGrid(horizontalMap);
    const logits = [pooledVertical, pooledHorizontal];
    const probabilities = softmax(logits);
    const target = [sample.label === 0 ? 1 : 0, sample.label === 1 ? 1 : 0];
    const loss = -(target[0] * Math.log(Math.max(probabilities[0], 0.0001)) + target[1] * Math.log(Math.max(probabilities[1], 0.0001)));
    const gradSignal = [probabilities[0] - target[0], probabilities[1] - target[1]];
    const gradVertical = verticalConv.bestPatch.map((row) => row.map((value) => gradSignal[0] * value));
    const gradHorizontal = horizontalConv.bestPatch.map((row) => row.map((value) => gradSignal[1] * value));
    const nextKernelVertical = kernelVertical.map((row, rowIndex) =>
      row.map((value, colIndex) => value - learningRate * gradVertical[rowIndex][colIndex])
    );
    const nextKernelHorizontal = kernelHorizontal.map((row, rowIndex) =>
      row.map((value, colIndex) => value - learningRate * gradHorizontal[rowIndex][colIndex])
    );
    const updatedVerticalConv = convolveValid(image, nextKernelVertical);
    const updatedHorizontalConv = convolveValid(image, nextKernelHorizontal);
    const updatedVertical = reluGrid(updatedVerticalConv.map);
    const updatedHorizontal = reluGrid(updatedHorizontalConv.map);
    const updatedPooled = {
      vertical: maxGrid(updatedVertical),
      horizontal: maxGrid(updatedHorizontal),
    };
    const updatedProbabilities = softmax([updatedPooled.vertical, updatedPooled.horizontal]);
    const predictedClass = probabilities[1] > probabilities[0] ? 1 : 0;

    PHASES.forEach((phase) => {
      snapshots.push({
        algorithmId: "cnn_classifier",
        title: "CNN Filter Demo",
        datasetLabel: "Handcrafted 5x5 glyph patches with >10 samples",
        stepLabel: `Sample ${sampleIndex + 1} / ${dataset.length}`,
        phase,
        chartType: "cnn",
        points: dataset.map((item) => ({ id: item.id, label: item.label })),
        focusSample: sample,
        params: {
          pooledVertical: round(phase === "update" ? updatedPooled.vertical : pooledVertical),
          pooledHorizontal: round(phase === "update" ? updatedPooled.horizontal : pooledHorizontal),
          probClass0: round(phase === "update" ? updatedProbabilities[0] : probabilities[0]),
          probClass1: round(phase === "update" ? updatedProbabilities[1] : probabilities[1]),
          predictedClass: phase === "update" ? (updatedProbabilities[1] > updatedProbabilities[0] ? 1 : 0) : predictedClass,
          learningRate: round(learningRate),
        },
        metrics: {
          prediction: round(phase === "update" ? updatedProbabilities[1] : probabilities[1]),
          target: sample.label,
          loss: round(loss),
        },
        visualGuide: {
          inputGrid: image,
          verticalBestPatch: verticalConv.bestPatch,
          verticalBestPatchPosition: { row: verticalConv.bestRow, column: verticalConv.bestColumn },
          horizontalBestPatch: horizontalConv.bestPatch,
          horizontalBestPatchPosition: { row: horizontalConv.bestRow, column: horizontalConv.bestColumn },
          updatedVerticalBestPatch: updatedVerticalConv.bestPatch,
          updatedVerticalBestPatchPosition: { row: updatedVerticalConv.bestRow, column: updatedVerticalConv.bestColumn },
          updatedHorizontalBestPatch: updatedHorizontalConv.bestPatch,
          updatedHorizontalBestPatchPosition: { row: updatedHorizontalConv.bestRow, column: updatedHorizontalConv.bestColumn },
          kernelVertical: roundGrid(phase === "update" ? nextKernelVertical : kernelVertical),
          kernelHorizontal: roundGrid(phase === "update" ? nextKernelHorizontal : kernelHorizontal),
          previousKernelVertical: roundGrid(kernelVertical),
          previousKernelHorizontal: roundGrid(kernelHorizontal),
          verticalMap: roundGrid(phase === "update" ? updatedVertical : verticalMap),
          horizontalMap: roundGrid(phase === "update" ? updatedHorizontal : horizontalMap),
          pooled: {
            vertical: round(phase === "update" ? updatedPooled.vertical : pooledVertical),
            horizontal: round(phase === "update" ? updatedPooled.horizontal : pooledHorizontal),
          },
          probabilities: phase === "update" ? updatedProbabilities.map((value) => round(value)) : probabilities.map((value) => round(value)),
        },
        modelFlow: [
          { title: "Input patch", detail: `5x5 image for class ${sample.label}`, active: phase === "forward", traceIndex: 0 },
          { title: "Convolution", detail: `vertical=${round(pooledVertical)}, horizontal=${round(pooledHorizontal)}`, active: phase === "forward", traceIndex: 1 },
          { title: "Pooling + softmax", detail: `loss = ${round(loss)}`, active: phase === "loss", traceIndex: 2 },
          { title: "Kernel gradients", detail: `dK via max-activation patch`, active: phase === "backward", traceIndex: 3 },
          { title: "Filter update", detail: `specialize kernels for the target pattern`, active: phase === "update", traceIndex: 4 },
        ],
        explanation: buildCnnExplanation(sample, phase, probabilities, { vertical: pooledVertical, horizontal: pooledHorizontal }, predictedClass),
        explanationZh: buildCnnExplanationZh(sample, phase, probabilities, { vertical: pooledVertical, horizontal: pooledHorizontal }, predictedClass),
        teachingGuide: {
          intuition: `The image is not read pixel-by-pixel as one long vector. The CNN slides two small filters across local regions and asks which pattern fires more strongly.`,
          intuitionZh: `这张图不是被当成一长串像素直接读入，而是先让两个小卷积核在局部区域里滑动，看哪一种局部模式响应更强。`,
          why: `Convolution matters because edges and strokes are local. A shared kernel can reuse the same detector at many positions, which is why CNNs are far more sample-efficient than plain fully connected layers on images.`,
          whyZh: `卷积之所以重要，是因为图像里的边缘和笔画本来就是局部结构。共享卷积核可以在不同位置复用同一个检测器，所以 CNN 在图像上比普通全连接更高效。`,
          visual: `Read the plot from left to right: input patch -> two kernels -> two feature maps -> pooled responses -> class probabilities. If you click a math step, the plot emphasis should move to the matching stage.`,
          visualZh: `读图顺序就是从左到右：输入 patch -> 两个卷积核 -> 两张特征图 -> 池化响应 -> 类别概率。点击 Math 里的某一步时，图上的强调也应该跟着跳到对应位置。`,
          pseudocode: `for each 3x3 patch in image:\n  score_v = sum(patch * kernel_vertical)\n  score_h = sum(patch * kernel_horizontal)\nfeature_v = relu(score_v_map)\nfeature_h = relu(score_h_map)\npooled = [max(feature_v), max(feature_h)]\nprob = softmax(pooled)\nupdate kernels with gradient from target class`,
          pseudocodeZh: `对图像中的每个 3x3 patch:\n  score_v = patch 和纵向卷积核逐元素相乘再求和\n  score_h = patch 和横向卷积核逐元素相乘再求和\nfeature_v = relu(score_v_map)\nfeature_h = relu(score_h_map)\npooled = [max(feature_v), max(feature_h)]\nprob = softmax(pooled)\n根据目标类别的误差更新卷积核`,
          commonMistake: `A common mistake is to think the kernel sees the whole image at once. It never does. The kernel only ever sees one local patch, and the global decision appears after repeating that local comparison everywhere.`,
          commonMistakeZh: `常见误区是以为卷积核一次就“看见整张图”。其实它每次只会看一个局部 patch，整张图的判断是这些局部比较重复很多次之后才形成的。`,
        },
        calculationTrace: buildCnnTrace(phase, kernelVertical, kernelHorizontal, { vertical: pooledVertical, horizontal: pooledHorizontal }, probabilities, gradVertical, gradHorizontal, nextKernelVertical, nextKernelHorizontal),
      });
    });

    kernelVertical = nextKernelVertical;
    kernelHorizontal = nextKernelHorizontal;
  });

  return snapshots;
}

function buildRnnExplanation(sample, phase, hiddenStates, probability, loss) {
  if (phase === "forward") {
    return `The RNN reads the sequence one step at a time and rolls information into a hidden state chain. The last hidden state summarizes the trend of the whole sequence.`;
  }
  if (phase === "loss") {
    return `The final hidden state is turned into probability ${round(probability)}. Comparing it against label ${sample.label} yields a log loss of ${round(loss)}.`;
  }
  if (phase === "backward") {
    return `Backpropagation through time pushes the last hidden state error back into the recurrent weight and the input weight. This is how earlier timesteps still influence learning.`;
  }
  return `After the update, the recurrent transition becomes slightly better at recognizing whether the sequence is trending up or down.`;
}

function buildRnnExplanationZh(sample, phase, hiddenStates, probability, loss) {
  if (phase === "forward") {
    return `RNN 会按时间顺序逐步读取这个序列，并把信息压进隐藏状态链。最后一个隐藏状态就是对整段序列趋势的压缩表示。`;
  }
  if (phase === "loss") {
    return `最后一个隐藏状态被映射成概率 ${round(probability)}，再和标签 ${sample.label} 比较，得到当前对数损失 ${round(loss)}。`;
  }
  if (phase === "backward") {
    return `时间反向传播会把最后时刻的误差信号传回 recurrent weight 和 input weight，所以越早的时间步也会影响训练。`;
  }
  return `更新之后，RNN 的状态转移会更擅长识别这段序列是上升趋势还是下降趋势。`;
}

function buildRnnTrace(sample, phase, hiddenStates, probability, loss, weights, nextWeights) {
  const currentIndex = getCurrentTraceIndex(phase);
  return [
    {
      title: "Sequence Input",
      titleZh: "序列输入",
      formula: `x = [${sample.sequence.map((value) => round(value)).join(", ")}]`,
      formulaZh: `输入序列 = [${sample.sequence.map((value) => round(value)).join(", ")}]`,
      status: getTraceStatus(0, currentIndex),
      spotlight: "parameters",
    },
    {
      title: "Hidden Chain",
      titleZh: "隐藏状态链",
      formula: hiddenStates.map((value, index) => `h${index + 1}=${round(value)}`).join(", "),
      formulaZh: hiddenStates.map((value, index) => `h${index + 1}=${round(value)}`).join("，"),
      status: getTraceStatus(1, currentIndex),
      spotlight: "prediction",
    },
    {
      title: "Output Loss",
      titleZh: "输出损失",
      formula: `p = ${round(probability)}, loss = ${round(loss)}`,
      formulaZh: `概率 p = ${round(probability)}，损失 = ${round(loss)}`,
      status: getTraceStatus(2, currentIndex),
      spotlight: "loss",
    },
    {
      title: "BPTT Signal",
      titleZh: "时间反向传播",
      formula: `w_in = ${round(weights.inputWeight)}, w_rec = ${round(weights.recurrentWeight)}, w_out = ${round(weights.outputWeight)}`,
      formulaZh: `输入权重 = ${round(weights.inputWeight)}，循环权重 = ${round(weights.recurrentWeight)}，输出权重 = ${round(weights.outputWeight)}`,
      status: getTraceStatus(3, currentIndex),
      spotlight: "gradient",
    },
    {
      title: "Weight Update",
      titleZh: "权重更新",
      formula: `w'_in = ${round(nextWeights.inputWeight)}, w'_rec = ${round(nextWeights.recurrentWeight)}, w'_out = ${round(nextWeights.outputWeight)}`,
      formulaZh: `更新后输入权重 = ${round(nextWeights.inputWeight)}，更新后循环权重 = ${round(nextWeights.recurrentWeight)}，更新后输出权重 = ${round(nextWeights.outputWeight)}`,
      status: getTraceStatus(4, currentIndex),
      spotlight: "update",
    },
  ];
}

function runSimpleRnn(sequence, weights) {
  const hiddenStates = [];
  let hidden = 0;
  sequence.forEach((value) => {
    hidden = Math.tanh(weights.inputWeight * value + weights.recurrentWeight * hidden + weights.bias);
    hiddenStates.push(hidden);
  });
  const logit = weights.outputWeight * hidden + weights.outputBias;
  const probability = sigmoid(logit);
  return { hiddenStates, hidden, logit, probability };
}

function buildRnnSnapshots(dataset, learningRate) {
  let weights = {
    inputWeight: 1.05,
    recurrentWeight: 0.72,
    bias: -0.12,
    outputWeight: 1.24,
    outputBias: -0.04,
  };
  const snapshots = [];

  dataset.forEach((sample, sampleIndex) => {
    const result = runSimpleRnn(sample.sequence, weights);
    const loss = binaryCrossEntropy(sample.label, result.probability);
    const dLogit = result.probability - sample.label;
    const lastInput = sample.sequence[sample.sequence.length - 1];
    const lastPrevHidden = result.hiddenStates[result.hiddenStates.length - 2] ?? 0;
    const gradOutputWeight = dLogit * result.hidden;
    const gradOutputBias = dLogit;
    const hiddenGrad = dLogit * weights.outputWeight * (1 - result.hidden * result.hidden);
    const gradInputWeight = hiddenGrad * lastInput;
    const gradRecurrentWeight = hiddenGrad * lastPrevHidden;
    const nextWeights = {
      inputWeight: weights.inputWeight - learningRate * gradInputWeight,
      recurrentWeight: weights.recurrentWeight - learningRate * gradRecurrentWeight,
      bias: weights.bias - learningRate * hiddenGrad,
      outputWeight: weights.outputWeight - learningRate * gradOutputWeight,
      outputBias: weights.outputBias - learningRate * gradOutputBias,
    };
    const updatedResult = runSimpleRnn(sample.sequence, nextWeights);

    PHASES.forEach((phase) => {
      snapshots.push({
        algorithmId: "rnn_sequence",
        title: "RNN Sequence Trend",
        datasetLabel: "12 trend sequences with recurrent state tracking",
        stepLabel: `Sample ${sampleIndex + 1} / ${dataset.length}`,
        phase,
        chartType: "rnn",
        points: dataset.map((item) => ({ id: item.id, label: item.label })),
        focusSample: sample,
        params: {
          inputWeight: round(phase === "update" ? nextWeights.inputWeight : weights.inputWeight),
          recurrentWeight: round(phase === "update" ? nextWeights.recurrentWeight : weights.recurrentWeight),
          outputWeight: round(phase === "update" ? nextWeights.outputWeight : weights.outputWeight),
          finalHidden: round(phase === "update" ? updatedResult.hidden : result.hidden),
          probability: round(phase === "update" ? updatedResult.probability : result.probability),
          learningRate: round(learningRate),
        },
        metrics: {
          prediction: round(phase === "update" ? updatedResult.probability : result.probability),
          target: sample.label,
          loss: round(loss),
        },
        visualGuide: {
          sequence: sample.sequence.map((value) => round(value)),
          hiddenStates: (phase === "update" ? updatedResult.hiddenStates : result.hiddenStates).map((value) => round(value)),
          previousHiddenStates: result.hiddenStates.map((value) => round(value)),
          outputProbability: round(phase === "update" ? updatedResult.probability : result.probability),
          previousProbability: round(result.probability),
        },
        modelFlow: [
          { title: "Input sequence", detail: `${sample.sequence.length} timesteps`, active: phase === "forward", traceIndex: 0 },
          { title: "Recurrent rollup", detail: `h_T = ${round(result.hidden)}`, active: phase === "forward", traceIndex: 1 },
          { title: "Sequence loss", detail: `loss = ${round(loss)}`, active: phase === "loss", traceIndex: 2 },
          { title: "BPTT", detail: `grad_out = ${round(gradOutputWeight)}`, active: phase === "backward", traceIndex: 3 },
          { title: "State update", detail: `w_rec -> ${round(nextWeights.recurrentWeight)}`, active: phase === "update", traceIndex: 4 },
        ],
        explanation: buildRnnExplanation(sample, phase, result.hiddenStates, result.probability, loss),
        explanationZh: buildRnnExplanationZh(sample, phase, result.hiddenStates, result.probability, loss),
        teachingGuide: {
          intuition: `The RNN keeps a rolling memory. Each new value updates the hidden state instead of starting from scratch, so the last hidden state can summarize the whole sequence trend.`,
          intuitionZh: `RNN 的核心是“滚动记忆”。每读入一个新值，它都会更新隐藏状态，而不是重新开始，所以最后一个隐藏状态可以概括整段序列的趋势。`,
          why: `This matters because sequence order changes meaning. The same set of values can imply very different outcomes when arranged in different temporal orders, and the recurrent state is what preserves that order-sensitive context.`,
          whyZh: `这一步重要，是因为序列的顺序本身会改变含义。即使数值集合一样，只要时间顺序不同，结果就可能完全不同，而循环状态正是用来保存这种顺序信息的。`,
          visual: `The top row shows the incoming sequence in time order. The bars below are the hidden states h1...hT. Read them as a memory chain, not as separate outputs.`,
          visualZh: `上面一排是按时间顺序输入的序列，下面的柱子是 h1...hT。它们要被看成一条“记忆链”，而不是一堆彼此独立的小输出。`,
          pseudocode: `h = 0\nfor value in sequence:\n  h = tanh(w_in * value + w_rec * h + b)\nlogit = w_out * h + b_out\nprob = sigmoid(logit)\nloss = BCE(prob, label)\nbackpropagate through time to update w_in, w_rec, w_out`,
          pseudocodeZh: `h = 0\n对序列中的每个值 value:\n  h = tanh(w_in * value + w_rec * h + b)\nlogit = w_out * h + b_out\nprob = sigmoid(logit)\nloss = BCE(prob, label)\n通过时间反向传播更新 w_in、w_rec、w_out`,
          commonMistake: `A common mistake is to read h1, h2, ... as separate predictions. They are intermediate memories. The actual classifier usually uses the last state or an aggregate over all states.`,
          commonMistakeZh: `常见误区是把 h1、h2、... 当成一串独立预测。它们其实只是中间记忆，真正拿去分类的通常是最后状态，或者所有状态的某种聚合。`,
        },
        calculationTrace: buildRnnTrace(sample, phase, result.hiddenStates, result.probability, loss, weights, nextWeights),
      });
    });

    weights = nextWeights;
  });

  return snapshots;
}

function buildResNetExplanation(sample, phase, probability, loss) {
  if (phase === "forward") {
    return `The residual block sends the input vector down a transform branch, then adds it back to the skip path. This preserves low-level information while still learning a correction.`;
  }
  if (phase === "loss") {
    return `After the skip-add and ReLU, the classifier predicts probability ${round(probability)} and the loss is ${round(loss)}.`;
  }
  if (phase === "backward") {
    return `The gradient can flow through both the residual branch and the identity path. That is why deep residual networks train more stably than plain stacked layers.`;
  }
  return `After the update, the residual branch changes only the correction term, not the identity itself. The block stays close to the original input while becoming more useful.`;
}

function buildResNetExplanationZh(sample, phase, probability, loss) {
  if (phase === "forward") {
    return `残差块会把输入向量送入变换分支，再和跳连分支相加。这样既保留了底层信息，又能学习一个修正量。`;
  }
  if (phase === "loss") {
    return `经过 skip-add 和 ReLU 后，分类头给出的概率是 ${round(probability)}，当前损失是 ${round(loss)}。`;
  }
  if (phase === "backward") {
    return `梯度既可以走残差分支，也可以直接走 identity 路径，这就是深层 ResNet 比普通深层网络更稳定的关键。`;
  }
  return `更新之后，变化的只是残差修正项，identity 本身仍然保留，所以整个块仍然保持“接近输入、逐步修正”的特性。`;
}

function buildResNetTrace(phase, vectors, probability, loss, scales, nextScales) {
  const currentIndex = getCurrentTraceIndex(phase);
  return [
    {
      title: "Input Vector",
      titleZh: "输入向量",
      formula: `x = [${vectors.input.map((value) => round(value)).join(", ")}]`,
      formulaZh: `输入 x = [${vectors.input.map((value) => round(value)).join(", ")}]`,
      status: getTraceStatus(0, currentIndex),
      spotlight: "parameters",
    },
    {
      title: "Residual Branch",
      titleZh: "残差分支",
      formula: `f(x) = [${vectors.branch2.map((value) => round(value)).join(", ")}]`,
      formulaZh: `残差分支输出 f(x) = [${vectors.branch2.map((value) => round(value)).join(", ")}]`,
      status: getTraceStatus(1, currentIndex),
      spotlight: "prediction",
    },
    {
      title: "Skip Add",
      titleZh: "跳连相加",
      formula: `x + f(x) = [${vectors.added.map((value) => round(value)).join(", ")}], p = ${round(probability)}, loss = ${round(loss)}`,
      formulaZh: `x + f(x) = [${vectors.added.map((value) => round(value)).join(", ")}]，p = ${round(probability)}，loss = ${round(loss)}`,
      status: getTraceStatus(2, currentIndex),
      spotlight: "loss",
    },
    {
      title: "Residual Weights",
      titleZh: "残差权重",
      formula: `s1 = [${scales.scale1.map((value) => round(value)).join(", ")}], s2 = [${scales.scale2.map((value) => round(value)).join(", ")}]`,
      formulaZh: `第一层缩放 = [${scales.scale1.map((value) => round(value)).join(", ")}]，第二层缩放 = [${scales.scale2.map((value) => round(value)).join(", ")}]`,
      status: getTraceStatus(3, currentIndex),
      spotlight: "gradient",
    },
    {
      title: "Updated Block",
      titleZh: "更新后的残差块",
      formula: `s1' = [${nextScales.scale1.map((value) => round(value)).join(", ")}], s2' = [${nextScales.scale2.map((value) => round(value)).join(", ")}]`,
      formulaZh: `更新后第一层缩放 = [${nextScales.scale1.map((value) => round(value)).join(", ")}]，更新后第二层缩放 = [${nextScales.scale2.map((value) => round(value)).join(", ")}]`,
      status: getTraceStatus(4, currentIndex),
      spotlight: "update",
    },
  ];
}

function buildResNetSnapshots(dataset, learningRate) {
  let scale1 = [1.1, 0.9, 1.0, 1.1, 0.95, 1.05];
  let scale2 = [0.4, 0.5, 0.6, 0.6, 0.5, 0.4];
  let classifier = [0.5, 0.45, 0.55, 0.65, 0.6, 0.5];
  let classifierBias = -1.1;
  const snapshots = [];

  dataset.forEach((sample, sampleIndex) => {
    const input = sample.features;
    const branch1 = reluVector(input.map((value, index) => value * scale1[index] - 0.1));
    const branch2 = branch1.map((value, index) => value * scale2[index] - 0.05);
    const added = input.map((value, index) => value + branch2[index]);
    const output = reluVector(added);
    const logit = dot(output, classifier) + classifierBias;
    const probability = sigmoid(logit);
    const loss = binaryCrossEntropy(sample.label, probability);
    const dLogit = probability - sample.label;
    const gradClassifier = output.map((value) => dLogit * value);
    const gradScale2 = branch1.map((value, index) => dLogit * classifier[index] * value);
    const gradScale1 = input.map((value, index) => dLogit * classifier[index] * scale2[index] * value);
    const nextScale1 = scale1.map((value, index) => value - learningRate * gradScale1[index]);
    const nextScale2 = scale2.map((value, index) => value - learningRate * gradScale2[index]);
    const nextClassifier = classifier.map((value, index) => value - learningRate * gradClassifier[index]);
    const nextBias = classifierBias - learningRate * dLogit;

    const updatedBranch1 = reluVector(input.map((value, index) => value * nextScale1[index] - 0.1));
    const updatedBranch2 = updatedBranch1.map((value, index) => value * nextScale2[index] - 0.05);
    const updatedAdded = input.map((value, index) => value + updatedBranch2[index]);
    const updatedOutput = reluVector(updatedAdded);
    const updatedProbability = sigmoid(dot(updatedOutput, nextClassifier) + nextBias);

    PHASES.forEach((phase) => {
      const visibleVectors = phase === "update"
        ? { input, branch1: updatedBranch1, branch2: updatedBranch2, added: updatedAdded, output: updatedOutput }
        : { input, branch1, branch2, added, output };
      snapshots.push({
        algorithmId: "resnet_block",
        title: "ResNet Residual Block",
        datasetLabel: "12 feature vectors through a skip-connected block",
        stepLabel: `Sample ${sampleIndex + 1} / ${dataset.length}`,
        phase,
        chartType: "resnet",
        points: dataset.map((item) => ({ id: item.id, label: item.label })),
        focusSample: sample,
        params: {
          probability: round(phase === "update" ? updatedProbability : probability),
          residualStrength: round(mean(visibleVectors.branch2)),
          skipMean: round(mean(visibleVectors.input)),
          classifierBias: round(phase === "update" ? nextBias : classifierBias),
          learningRate: round(learningRate),
        },
        metrics: {
          prediction: round(phase === "update" ? updatedProbability : probability),
          target: sample.label,
          loss: round(loss),
        },
        visualGuide: {
          inputVector: input.map((value) => round(value)),
          branch1Vector: visibleVectors.branch1.map((value) => round(value)),
          branch2Vector: visibleVectors.branch2.map((value) => round(value)),
          addedVector: visibleVectors.added.map((value) => round(value)),
          outputVector: visibleVectors.output.map((value) => round(value)),
          previousOutputVector: output.map((value) => round(value)),
          classifierVector: (phase === "update" ? nextClassifier : classifier).map((value) => round(value)),
        },
        modelFlow: [
          { title: "Input", detail: `6-d feature vector`, active: phase === "forward", traceIndex: 0 },
          { title: "Residual branch", detail: `two light transforms`, active: phase === "forward", traceIndex: 1 },
          { title: "Skip add", detail: `loss = ${round(loss)}`, active: phase === "loss", traceIndex: 2 },
          { title: "Gradient split", detail: `identity + branch`, active: phase === "backward", traceIndex: 3 },
          { title: "Residual update", detail: `keep skip path intact`, active: phase === "update", traceIndex: 4 },
        ],
        explanation: buildResNetExplanation(sample, phase, probability, loss),
        explanationZh: buildResNetExplanationZh(sample, phase, probability, loss),
        teachingGuide: {
          intuition: `A residual block does not try to relearn the whole representation. It learns a correction f(x), then adds it back to x. The skip path keeps the original signal available at every step.`,
          intuitionZh: `残差块并不是重新学习整套表示，而是学习一个修正项 f(x)，再把它加回原始输入 x。跳连路径保证原始信号始终可用。`,
          why: `This is why deep ResNets optimize well: gradients can move through the identity path even when the residual branch is still weak. In practice that makes very deep networks trainable.`,
          whyZh: `这就是深层 ResNet 更容易优化的原因：哪怕残差分支一开始还很弱，梯度也可以沿着 identity 路径直接传播，所以很深的网络也能训起来。`,
          visual: `Read the bars in order: Input -> Branch 1 -> Branch 2 -> Skip Add -> Output. The key comparison is not Branch 2 alone, but Branch 2 relative to the original Input it gets added back into.`,
          visualZh: `读图顺序是：Input -> Branch 1 -> Branch 2 -> Skip Add -> Output。真正关键的不是单独看 Branch 2，而是看它和原始 Input 重新相加之后发生了什么。`,
          pseudocode: `branch1 = relu(scale1 * x - bias1)\nbranch2 = scale2 * branch1 - bias2\nresidual = x + branch2\noutput = relu(residual)\nprob = sigmoid(classifier · output + bias)\nupdate residual branch and classifier, keep skip path unchanged`,
          pseudocodeZh: `branch1 = relu(scale1 * x - bias1)\nbranch2 = scale2 * branch1 - bias2\nresidual = x + branch2\noutput = relu(residual)\nprob = sigmoid(classifier · output + bias)\n更新残差分支和分类头，跳连路径本身不改`,
          commonMistake: `A common mistake is to say “ResNet just adds outputs together.” The important point is what stays untouched: the identity path. The residual branch only learns the delta.`,
          commonMistakeZh: `常见误区是把 ResNet 简化成“把两个输出加起来”。真正重要的是哪一部分保持不动：identity 路径。残差分支学到的只是修正量。`,
        },
        calculationTrace: buildResNetTrace(phase, { input, branch2, added, output }, probability, loss, { scale1, scale2 }, { scale1: nextScale1, scale2: nextScale2 }),
      });
    });

    scale1 = nextScale1;
    scale2 = nextScale2;
    classifier = nextClassifier;
    classifierBias = nextBias;
  });

  return snapshots;
}

function computeAttentionStateAdvanced(dataset, queryWeights, keyWeights, valueWeights, positionalEncodings, causalMask = true) {
  const embeddings = dataset.map((sample, index) => addVectors(sample.embedding, positionalEncodings[index]));
  const keys = embeddings.map((embedding) => projectVector(embedding, keyWeights));
  const values = embeddings.map((embedding) => projectVector(embedding, valueWeights));
  const scale = Math.sqrt(embeddings[0]?.length ?? 1);

  const rows = embeddings.map((embedding, rowIndex) => {
    const query = projectVector(embedding, queryWeights);
    const baseScores = keys.map((key) => dot(query, key) / scale);
    const mask = baseScores.map((_, columnIndex) => causalMask && columnIndex > rowIndex);
    const maskedScores = baseScores.map((score, columnIndex) => (mask[columnIndex] ? -1e4 : score));
    const weights = softmax(maskedScores);
    const output = values[0].map((_, dimension) =>
      weights.reduce((sum, weight, index) => sum + weight * values[index][dimension], 0)
    );
    return { query, baseScores, scores: maskedScores, weights, output, mask };
  });

  return { embeddings, keys, values, scale, rows };
}

const TRANSFORMER_STAGE_SEQUENCE = [
  {
    key: "token-position",
    title: "Token + Position",
    titleZh: "词向量与位置编码",
    spotlight: "parameters",
  },
  {
    key: "qkv-head-scoring",
    title: "Q / K / V + Head Scores",
    titleZh: "Q / K / V 与多头打分",
    spotlight: "prediction",
  },
  {
    key: "masked-attention-mix",
    title: "Mask + Attention Mix",
    titleZh: "Mask、权重与注意力混合",
    spotlight: "loss",
  },
  {
    key: "residual-norm-1",
    title: "Residual 1 + LayerNorm 1",
    titleZh: "第一次残差与层归一化",
    spotlight: "gradient",
  },
  {
    key: "ffn-residual-norm-2",
    title: "FFN + Residual 2 + LayerNorm 2",
    titleZh: "FFN、第二次残差与层归一化",
    spotlight: "update",
  },
];

function getTransformerStage(index) {
  return TRANSFORMER_STAGE_SEQUENCE[index] ?? TRANSFORMER_STAGE_SEQUENCE[0];
}

function buildTransformerTraceV3(
  sample,
  phase,
  queryWeightsHeadA,
  queryWeightsHeadB,
  positionalEncoding,
  headA,
  headB,
  targetIndex,
  loss,
  gradQueryWeightsA,
  gradQueryWeightsB,
  nextQueryWeightsA,
  nextQueryWeightsB,
  mergedOutput,
  residualOutput,
  normalizedOutput,
  normStats,
  ffnPreActivation,
  ffnGelu,
  ffnOutput,
  residual2Output,
  normalized2Output,
  norm2Stats
) {
  const currentIndex = getCurrentTraceIndex(phase);

  return [
    {
      title: "Token + Position",
      titleZh: "词向量与位置编码",
      formula: `x("${sample.token}") + p = [${sample.embedding.map((value, index) => round(value + positionalEncoding[index])).join(", ")}]`,
      formulaZh: `词向量与位置编码相加后 = [${sample.embedding.map((value, index) => round(value + positionalEncoding[index])).join(", ")}]`,
      status: getTraceStatus(0, currentIndex),
      spotlight: "parameters",
      stageKey: "token-position",
      stageLabel: "Token + position",
      stageLabelZh: "词向量与位置编码",
    },
    {
      title: "Masked Head Scores",
      titleZh: "带 Mask 的多头打分",
      formula: `HeadA = [${headA.baseScores.map((value, index) => headA.mask[index] ? "mask" : round(value)).join(", ")}]; HeadB = [${headB.baseScores.map((value, index) => headB.mask[index] ? "mask" : round(value)).join(", ")}]`,
      formulaZh: `HeadA = [${headA.baseScores.map((value, index) => headA.mask[index] ? "mask" : round(value)).join(", ")}]；HeadB = [${headB.baseScores.map((value, index) => headB.mask[index] ? "mask" : round(value)).join(", ")}]`,
      status: getTraceStatus(1, currentIndex),
      spotlight: "prediction",
      stageKey: "qkv-head-scoring",
      stageLabel: "Q / K / V + head scoring",
      stageLabelZh: "Q / K / V 与多头打分",
    },
    {
      title: "Attention + Residual 1",
      titleZh: "注意力混合与第一次残差",
      formula: `attn_out = [${mergedOutput.map((value) => round(value)).join(", ")}]; res1 = [${residualOutput.map((value) => round(value)).join(", ")}]`,
      formulaZh: `attn\_out = [${mergedOutput.map((value) => round(value)).join(", ")}]；res1 = [${residualOutput.map((value) => round(value)).join(", ")}]`,
      status: getTraceStatus(2, currentIndex),
      spotlight: "loss",
      stageKey: "masked-attention-mix",
      stageLabel: "Mask + attention mix",
      stageLabelZh: "Mask、权重与注意力混合",
    },
    {
      title: "Residual 1 + LayerNorm 1",
      titleZh: "第一次残差与层归一化",
      formula: `ln1 = [${normalizedOutput.map((value) => round(value)).join(", ")}], mean=${round(normStats.mean)}, std=${round(normStats.std)}`,
      formulaZh: `ln1 = [${normalizedOutput.map((value) => round(value)).join(", ")}]，均值=${round(normStats.mean)}，标准差=${round(normStats.std)}`,
      status: getTraceStatus(3, currentIndex),
      spotlight: "gradient",
      stageKey: "residual-norm-1",
      stageLabel: "Residual 1 + LayerNorm 1",
      stageLabelZh: "第一次残差与层归一化",
    },
    {
      title: "FFN + Residual 2 + LayerNorm 2",
      titleZh: "FFN、第二次残差与层归一化",
      formula: `ffn = [${ffnOutput.map((value) => round(value)).join(", ")}]; res2 = [${residual2Output.map((value) => round(value)).join(", ")}]; ln2 = [${normalized2Output.map((value) => round(value)).join(", ")}]`,
      formulaZh: `ffn = [${ffnOutput.map((value) => round(value)).join(", ")}]；res2 = [${residual2Output.map((value) => round(value)).join(", ")}]；ln2 = [${normalized2Output.map((value) => round(value)).join(", ")}]`,
      status: getTraceStatus(4, currentIndex),
      spotlight: "update",
      stageKey: "ffn-residual-norm-2",
      stageLabel: "FFN + residual 2 + LayerNorm 2",
      stageLabelZh: "FFN、第二次残差与层归一化",
    },
  ];
}

function buildTransformerAdvancedExplanation(sample, phase, targetToken, topTokenSummary, targetWeight, loss, outputNorm) {
  if (phase === "forward") {
    return `The token "${sample.token}" first absorbs positional encoding, then each head builds its own masked attention scores.`;
  }
  if (phase === "loss") {
    return `Causal masking blocks future tokens, so the model can only attend leftward. The target token is "${targetToken}" and current mean target attention is ${round(targetWeight)} with loss ${round(loss)}.`;
  }
  if (phase === "backward") {
    return `Both heads now receive gradients, and the feed-forward sublayer applies a nonlinear GELU transform before projecting back. Current top tokens are ${topTokenSummary}.`;
  }
  return `After the update, the block completes ` +
    `attention -> residual/norm -> FFN/GELU -> residual/norm. The attention output norm is ${round(outputNorm)}.`;
}

function buildTransformerAdvancedExplanationZh(sample, phase, targetToken, topTokenSummary, targetWeight, loss, outputNorm) {
  if (phase === "forward") {
    return `词 "${sample.token}" 会先叠加位置编码，然后两个 attention head 分别计算带因果 mask 的注意力分数。`;
  }
  if (phase === "loss") {
    return `因果 mask 会屏蔽未来 token，因此当前词只能向左看。目标 token 是 "${targetToken}"，当前平均目标注意力是 ${round(targetWeight)}，损失为 ${round(loss)}。`;
  }
  if (phase === "backward") {
    return `两个 head 会分别收到梯度，随后前馈网络会经过 GELU 非线性再投影回模型维度。当前权重最高的 token 是 ${topTokenSummary}。`;
  }
  return `更新后，整个 block 会走完 attention -> 残差归一化 -> FFN/GELU -> 再次残差归一化。当前注意力输出向量范数为 ${round(outputNorm)}。`;
}

function buildTransformerSnapshotsV3(dataset, learningRate) {
  let queryWeightsHeadA = [1.1, 0.85, 1.2, 0.95];
  let queryWeightsHeadB = [0.8, 1.15, 0.9, 1.1];
  const keyWeightsHeadA = [0.9, 1.05, 0.8, 1.1];
  const keyWeightsHeadB = [1.05, 0.8, 1.0, 0.9];
  const valueWeightsHeadA = [1.0, 0.9, 1.1, 0.85];
  const valueWeightsHeadB = [0.85, 1.1, 0.9, 1.0];
  const positionalEncodings = buildPositionalEncoding(dataset.length, 4);
  const snapshots = [];

  dataset.forEach((sample, sampleIndex) => {
    const tokenPlusPosition = addVectors(sample.embedding, positionalEncodings[sampleIndex]);
    const ffnWeights1 = [1.25, -0.75, 0.9, 0.6];
    const ffnBias1 = [0.08, -0.04, 0.03, 0.02];
    const ffnWeights2 = [0.7, 1.1, -0.8, 0.95];
    const ffnBias2 = [0.03, 0.02, -0.01, 0.04];
    const stateHeadA = computeAttentionStateAdvanced(dataset, queryWeightsHeadA, keyWeightsHeadA, valueWeightsHeadA, positionalEncodings, true);
    const stateHeadB = computeAttentionStateAdvanced(dataset, queryWeightsHeadB, keyWeightsHeadB, valueWeightsHeadB, positionalEncodings, true);
    const rowHeadA = stateHeadA.rows[sampleIndex];
    const rowHeadB = stateHeadB.rows[sampleIndex];
    const targetIndex = sample.targetIndex;
    const targetWeightA = rowHeadA.weights[targetIndex];
    const targetWeightB = rowHeadB.weights[targetIndex];
    const topIndexA = rowHeadA.weights.indexOf(Math.max(...rowHeadA.weights));
    const topIndexB = rowHeadB.weights.indexOf(Math.max(...rowHeadB.weights));
    const lossA = -Math.log(targetWeightA + 1e-9);
    const lossB = -Math.log(targetWeightB + 1e-9);
    const loss = (lossA + lossB) / 2;
    const gradScoresA = rowHeadA.weights.map((weight, index) => weight - (index === targetIndex ? 1 : 0));
    const gradScoresB = rowHeadB.weights.map((weight, index) => weight - (index === targetIndex ? 1 : 0));
    const gradQueryA = stateHeadA.keys[0].map((_, dimension) =>
      gradScoresA.reduce((sum, grad, index) => sum + grad * stateHeadA.keys[index][dimension], 0) / stateHeadA.scale
    );
    const gradQueryB = stateHeadB.keys[0].map((_, dimension) =>
      gradScoresB.reduce((sum, grad, index) => sum + grad * stateHeadB.keys[index][dimension], 0) / stateHeadB.scale
    );
    const gradQueryWeightsA = stateHeadA.embeddings[sampleIndex].map((value, index) => gradQueryA[index] * value);
    const gradQueryWeightsB = stateHeadB.embeddings[sampleIndex].map((value, index) => gradQueryB[index] * value);
    const nextQueryWeightsA = queryWeightsHeadA.map((value, index) => value - learningRate * gradQueryWeightsA[index]);
    const nextQueryWeightsB = queryWeightsHeadB.map((value, index) => value - learningRate * gradQueryWeightsB[index]);
    const updatedStateHeadA = computeAttentionStateAdvanced(dataset, nextQueryWeightsA, keyWeightsHeadA, valueWeightsHeadA, positionalEncodings, true);
    const updatedStateHeadB = computeAttentionStateAdvanced(dataset, nextQueryWeightsB, keyWeightsHeadB, valueWeightsHeadB, positionalEncodings, true);
    const updatedRowA = updatedStateHeadA.rows[sampleIndex];
    const updatedRowB = updatedStateHeadB.rows[sampleIndex];
    const mergedOutput = updatedRowA.output.map((value, index) => (value + updatedRowB.output[index]) / 2);
    const residualOutput = mergedOutput.map((value, index) => value + tokenPlusPosition[index]);
    const normalizedResidual = layerNormalize(residualOutput);
    const ffnPreActivation = normalizedResidual.normalized.map((value, index) => value * ffnWeights1[index] + ffnBias1[index]);
    const ffnGelu = ffnPreActivation.map((value) => gelu(value));
    const ffnOutput = ffnGelu.map((value, index) => value * ffnWeights2[index] + ffnBias2[index]);
    const residual2Output = normalizedResidual.normalized.map((value, index) => value + ffnOutput[index]);
    const normalizedResidual2 = layerNormalize(residual2Output);
    const outputNorm = Math.hypot(...mergedOutput);

    PHASES.forEach((phase) => {
      const visibleStateHeadA = phase === "update" ? updatedStateHeadA : stateHeadA;
      const visibleStateHeadB = phase === "update" ? updatedStateHeadB : stateHeadB;
      const visibleRowA = phase === "update" ? updatedRowA : rowHeadA;
      const visibleRowB = phase === "update" ? updatedRowB : rowHeadB;
      const visibleWeightsA = phase === "update" ? nextQueryWeightsA : queryWeightsHeadA;
      const visibleWeightsB = phase === "update" ? nextQueryWeightsB : queryWeightsHeadB;
      const visibleMergedOutput = visibleRowA.output.map((value, index) => (value + visibleRowB.output[index]) / 2);
      const visibleResidual = visibleMergedOutput.map((value, index) => value + tokenPlusPosition[index]);
      const visibleNorm = layerNormalize(visibleResidual);
      const visibleFfnPre = visibleNorm.normalized.map((value, index) => value * ffnWeights1[index] + ffnBias1[index]);
      const visibleGelu = visibleFfnPre.map((value) => gelu(value));
      const visibleFfnOutput = visibleGelu.map((value, index) => value * ffnWeights2[index] + ffnBias2[index]);
      const visibleResidual2 = visibleNorm.normalized.map((value, index) => value + visibleFfnOutput[index]);
      const visibleNorm2 = layerNormalize(visibleResidual2);
      const visibleTargetWeight = (visibleRowA.weights[targetIndex] + visibleRowB.weights[targetIndex]) / 2;

      snapshots.push({
        algorithmId: "transformer_attention",
        title: "Transformer Attention",
        datasetLabel: "Masked two-head self-attention with positional encoding",
        stepLabel: `Query token ${sampleIndex + 1} / ${dataset.length}`,
        phase,
        chartType: "attention",
        points: dataset,
        focusSample: sample,
        params: {
          headAQuery1: round(visibleWeightsA[0]),
          headAQuery2: round(visibleWeightsA[1]),
          headAQuery3: round(visibleWeightsA[2]),
          headAQuery4: round(visibleWeightsA[3]),
          headBQuery1: round(visibleWeightsB[0]),
          headBQuery2: round(visibleWeightsB[1]),
          headBQuery3: round(visibleWeightsB[2]),
          headBQuery4: round(visibleWeightsB[3]),
          gradientHeadA1: round(gradQueryWeightsA[0]),
          gradientHeadA2: round(gradQueryWeightsA[1]),
          gradientHeadA3: round(gradQueryWeightsA[2]),
          gradientHeadA4: round(gradQueryWeightsA[3]),
          gradientHeadB1: round(gradQueryWeightsB[0]),
          gradientHeadB2: round(gradQueryWeightsB[1]),
          gradientHeadB3: round(gradQueryWeightsB[2]),
          gradientHeadB4: round(gradQueryWeightsB[3]),
          targetIndex,
          topIndexA,
          topIndexB,
          learningRate: round(learningRate),
        },
        metrics: {
          prediction: round(visibleTargetWeight),
          target: round(visibleTargetWeight),
          loss: round(
            phase === "update"
              ? (-Math.log(updatedRowA.weights[targetIndex] + 1e-9) - Math.log(updatedRowB.weights[targetIndex] + 1e-9)) / 2
              : loss
          ),
        },
        visualGuide: {
          stageKey: getTransformerStage(getCurrentTraceIndex(phase)).key,
          stageLabel: getTransformerStage(getCurrentTraceIndex(phase)).title,
          stageLabelZh: getTransformerStage(getCurrentTraceIndex(phase)).titleZh,
          tokens: dataset.map((token) => token.token),
          positionalEncodings: positionalEncodings.map((encoding) => encoding.map((value) => round(value))),
          tokenPlusPosition: tokenPlusPosition.map((value) => round(value)),
          heads: [
            {
              name: "Head A",
              attentionMatrix: visibleStateHeadA.rows.map((currentRow) => currentRow.weights.map((value) => round(value))),
              previousAttentionMatrix: stateHeadA.rows.map((currentRow) => currentRow.weights.map((value) => round(value))),
              updatedAttentionMatrix: updatedStateHeadA.rows.map((currentRow) => currentRow.weights.map((value) => round(value))),
              maskMatrix: visibleStateHeadA.rows.map((currentRow) => currentRow.mask),
              topIndex: topIndexA,
            },
            {
              name: "Head B",
              attentionMatrix: visibleStateHeadB.rows.map((currentRow) => currentRow.weights.map((value) => round(value))),
              previousAttentionMatrix: stateHeadB.rows.map((currentRow) => currentRow.weights.map((value) => round(value))),
              updatedAttentionMatrix: updatedStateHeadB.rows.map((currentRow) => currentRow.weights.map((value) => round(value))),
              maskMatrix: visibleStateHeadB.rows.map((currentRow) => currentRow.mask),
              topIndex: topIndexB,
            },
          ],
          queryIndex: sampleIndex,
          targetIndex,
          outputVector: visibleMergedOutput.map((value) => round(value)),
          residualVector: visibleResidual.map((value) => round(value)),
          normalizedVector: visibleNorm.normalized.map((value) => round(value)),
          ffnPreActivation: visibleFfnPre.map((value) => round(value)),
          ffnGelu: visibleGelu.map((value) => round(value)),
          ffnOutput: visibleFfnOutput.map((value) => round(value)),
          residual2Vector: visibleResidual2.map((value) => round(value)),
          normalized2Vector: visibleNorm2.normalized.map((value) => round(value)),
          normStats: {
            mean: round(visibleNorm.mean),
            variance: round(visibleNorm.variance),
            std: round(visibleNorm.std),
          },
          norm2Stats: {
            mean: round(visibleNorm2.mean),
            variance: round(visibleNorm2.variance),
            std: round(visibleNorm2.std),
          },
        },
        modelFlow: TRANSFORMER_STAGE_SEQUENCE.map((stage, index) => {
          const details = [
            `x+p=[${tokenPlusPosition.map((value) => round(value)).join(", ")}]`,
            `query row ${sampleIndex + 1} · heads compare visible tokens`,
            `attn=[${visibleMergedOutput.map((value) => round(value)).join(", ")}] · res1=[${visibleResidual.map((value) => round(value)).join(", ")}]`,
            `ln1=[${visibleNorm.normalized.map((value) => round(value)).join(", ")}] · std=${round(visibleNorm.std)}`,
            `ffn=[${visibleFfnOutput.map((value) => round(value)).join(", ")}] · ln2=[${visibleNorm2.normalized.map((value) => round(value)).join(", ")}]`,
          ];
          return {
            title: stage.title,
            titleZh: stage.titleZh,
            detail: details[index],
            active: getCurrentTraceIndex(phase) === index,
            traceIndex: index,
            stageKey: stage.key,
            stageLabel: stage.title,
            stageLabelZh: stage.titleZh,
          };
        }),
        explanation: buildTransformerAdvancedExplanation(
          sample,
          phase,
          dataset[targetIndex].token,
          `${dataset[topIndexA].token} / ${dataset[topIndexB].token}`,
          (targetWeightA + targetWeightB) / 2,
          loss,
          outputNorm
        ),
        explanationZh: buildTransformerAdvancedExplanationZh(
          sample,
          phase,
          dataset[targetIndex].token,
          `${dataset[topIndexA].token} / ${dataset[topIndexB].token}`,
          (targetWeightA + targetWeightB) / 2,
          loss,
          outputNorm
        ),
        teachingGuide: {
          intuition: `Transformer attention first compares the current token with every earlier token, then mixes those earlier token values into a new context vector. Residual connections and layer normalization keep that context stable as it passes into the FFN.`,
          intuitionZh: `Transformer 会先把当前 token 和所有可见的历史 token 做比较，再把这些历史 token 的 value 加权混合成新的上下文向量。残差连接和层归一化会让这个上下文在进入 FFN 前保持稳定。`,
          why: `The key idea is that the model is not memorizing one fixed left-to-right summary like an RNN. Instead it can dynamically choose which earlier token matters most at this step, then refine the result with residual and feed-forward layers.`,
          whyZh: `关键点在于它不像 RNN 那样只维护一个固定的从左到右摘要，而是能在每一步动态选择“此刻最相关的历史 token”，再通过残差和前馈层进一步修正表示。`,
          visual: `Start from the active query row in the attention matrix. Then move rightward to the context bars, then to Residual/LayerNorm, then to FFN, then to the second residual block. This is one continuous data path, not separate widgets.`,
          visualZh: `先看 attention 矩阵里当前 query 所在的那一行，再顺着右边的上下文条形图看过去：Residual/LayerNorm -> FFN -> 第二次 Residual。这是一条连续的数据路径，不是几个彼此独立的小组件。`,
          pseudocode: `x = token_embedding + positional_encoding\nfor each head:\n  q, k, v = project(x)\n  scores = (q · k^T) / sqrt(d)\n  scores = apply_causal_mask(scores)\n  weights = softmax(scores)\n  head_output = weights · v\nmerged = average(head_outputs)\nres1 = layer_norm(x + merged)\nffn = linear(gelu(linear(res1)))\nout = layer_norm(res1 + ffn)`,
          pseudocodeZh: `x = 词向量 + 位置编码\n对每个 attention head:\n  q, k, v = 对 x 做线性投影\n  scores = (q · k^T) / sqrt(d)\n  scores = 加上 causal mask\n  weights = softmax(scores)\n  head_output = weights · v\nmerged = 多头输出聚合\nres1 = layer_norm(x + merged)\nffn = linear(gelu(linear(res1)))\nout = layer_norm(res1 + ffn)`,
          commonMistake: `A common mistake is to think the matrix itself is the output. It is not. The matrix only gives the weights. The actual output comes after those weights mix the value vectors, then pass through residual and FFN layers.`,
          commonMistakeZh: `常见误区是把 attention 矩阵本身当成输出。其实它只是“权重表”，真正的输出是在这些权重去加权混合 value 向量之后，再经过残差和 FFN 才形成的。`,
        },
        calculationTrace: buildTransformerTraceV3(
          sample,
          phase,
          queryWeightsHeadA,
          queryWeightsHeadB,
          positionalEncodings[sampleIndex],
          rowHeadA,
          rowHeadB,
          targetIndex,
          loss,
          gradQueryWeightsA,
          gradQueryWeightsB,
          nextQueryWeightsA,
          nextQueryWeightsB,
          visibleMergedOutput,
          visibleResidual,
          visibleNorm.normalized,
          visibleNorm,
          visibleFfnPre,
          visibleGelu,
          visibleFfnOutput,
          visibleResidual2,
          visibleNorm2.normalized,
          visibleNorm2
        ),
      });
    });

    queryWeightsHeadA = nextQueryWeightsA;
    queryWeightsHeadB = nextQueryWeightsB;
  });

  return snapshots;
}

export {
  buildCnnSnapshots,
  buildRnnSnapshots,
  buildResNetSnapshots,
  buildTransformerSnapshotsV3,
};
