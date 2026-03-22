import { renderMathExpression } from "./math-renderer.js";

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function getActiveFlow(snapshot) {
  return snapshot?.modelFlow?.find((node) => node.active) ?? snapshot?.modelFlow?.[0] ?? null;
}

function getChartTypeLabel(chartType) {
  return {
    linear: "线性回归",
    classification: "逻辑回归 / 线性分类",
    network_regression: "两层神经网络",
    cnn: "CNN",
    rnn: "RNN",
    resnet: "ResNet",
    attention: "Transformer Attention",
    pca: "PCA",
    clustering: "K-Means",
    decision_tree: "Decision Tree",
    random_forest: "Random Forest",
    boosting: "Gradient Boosting",
  }[chartType] ?? "当前算法";
}

function getVisualFallback(snapshot, selectedTrace, language) {
  const spotlight = selectedTrace?.spotlight ?? "prediction";
  const activeFlow = getActiveFlow(snapshot);

  if (language === "zh") {
    const visualTarget = {
      parameters: "图里被强调的参数、kernel、hidden state 或 branch",
      prediction: "图中的主输出对象，例如预测点、feature map、probability bar 或 attention 单元格",
      loss: "误差相关对象，例如 loss 连线、概率差距、残差条或 impurity",
      gradient: "真正被学习信号推动的对象，例如 weight、split、attention weight 或 residual branch",
      update: "更新前后两种状态的差异",
    }[spotlight] ?? "当前高亮区域";

    return `先看数据流中的“${activeFlow?.title || "当前步骤"}”，再把视线放到 ${visualTarget}，最后回到公式卡片，对照这一步到底在算什么。`;
  }

  const visualTarget = {
    parameters: "the highlighted parameters, kernels, states, or branches",
    prediction: "the primary output object in the plot",
    loss: "the error-carrying elements",
    gradient: "the objects that learning is actually changing",
    update: "the before/after delta",
  }[spotlight] ?? "the highlighted region";

  return `Start from "${activeFlow?.title || "the current step"}", then inspect ${visualTarget}, and only then map it back to the active formula card.`;
}

function getCommonMistake(snapshot, language) {
  const zh = {
    linear: "常见误区：只盯着公式，不去看拟合线和样本点的相对位置。线什么时候在靠近目标，必须在图上看。",
    classification: "常见误区：把 probability 当成分类边界本身。真正的边界是 score = 0 的那条线。",
    network_regression: "常见误区：把 hidden unit 看成最终输出。真正的输出是所有 hidden unit 组合后的结果。",
    cnn: "常见误区：把 convolution 理解成整张图一次性做矩阵乘法。CNN 每次只看一个 local patch。",
    rnn: "常见误区：把每个 h_t 看成独立预测。h_t 更像逐步滚动的 memory state。",
    resnet: "常见误区：只看到多了一层，而忽略 skip connection。ResNet 的关键是 identity path 让优化更稳。",
    attention: "常见误区：把 attention 当成固定查表。attention weight 是每个 query token 动态算出来的。",
    pca: "常见误区：把 PCA 看成分类器。PCA 只是在找 principal direction，不负责做标签判断。",
    clustering: "常见误区：把 cluster label 当成真实类别。K-Means 的 cluster 只是按距离分组。",
    decision_tree: "常见误区：只记 split 阈值，不看每个 leaf 里样本怎么分布。",
    random_forest: "常见误区：只看最终投票，不看单棵树之间为什么会分歧。",
    boosting: "常见误区：把 Boosting 理解成并行投票。它其实是 stage by stage 地纠错。",
  };

  const en = {
    linear: "Common mistake: reading only the formula and ignoring where the fitted line sits relative to the samples.",
    classification: "Common mistake: treating probability as the boundary itself. The actual separator is where the score becomes zero.",
    network_regression: "Common mistake: thinking a hidden unit is the final output. The real output is the combination of all hidden units.",
    cnn: "Common mistake: viewing convolution as one matrix multiply over the whole image. CNN reads one local patch at a time.",
    rnn: "Common mistake: treating each h_t like an independent prediction instead of rolling memory.",
    resnet: "Common mistake: noticing only one more layer and missing the skip connection.",
    attention: "Common mistake: treating attention like a fixed lookup table instead of dynamic weights per query token.",
    pca: "Common mistake: reading PCA like a classifier. PCA only finds the major direction of variance.",
    clustering: "Common mistake: treating cluster ids as true semantic labels.",
    decision_tree: "Common mistake: memorizing thresholds without checking which samples land in each leaf.",
    random_forest: "Common mistake: looking only at the final vote and ignoring why trees disagree.",
    boosting: "Common mistake: reading boosting as parallel voting instead of sequential correction.",
  };

  return language === "zh" ? zh[snapshot?.chartType] : en[snapshot?.chartType];
}

function buildGlossaryFallback(snapshot, language) {
  const zhEntries = {
    linear: [
      ["weight w", "控制拟合线 slope 的参数。|w| 越大，线越陡。"],
      ["bias b", "整体平移拟合线的位置，不改变 slope。"],
      ["gradient", "告诉参数应该朝哪个方向更新，Loss 才会下降。"],
    ],
    classification: [
      ["logit z", "sigmoid 之前的原始分数。z = 0 对应 decision boundary。"],
      ["sigmoid", "把原始分数压到 0 到 1 之间，变成 probability。"],
      ["decision boundary", "把 class 0 和 class 1 分开的边界线。"],
    ],
    network_regression: [
      ["hidden unit", "网络里的中间非线性单元，用来构造更复杂的函数形状。"],
      ["activation", "让线性组合变成非线性响应的关键步骤。"],
      ["output curve", "所有 hidden unit 组合后形成的最终曲线。"],
    ],
    cnn: [
      ["patch", "从 image 上切出来的一小块局部窗口。"],
      ["kernel", "重复滑动使用的卷积核，用来检测局部 pattern。"],
      ["feature map", "kernel 扫过整张图后得到的响应图。"],
      ["pooling", "保留最强响应，让后续层聚焦主要 pattern。"],
    ],
    rnn: [
      ["x_t", "第 t 个 timestep 的输入。"],
      ["h_t", "结合当前输入和过去记忆之后得到的 hidden state。"],
      ["recurrent weight", "控制上一时刻状态对下一时刻影响有多大。"],
      ["final state", "压缩整段 sequence 信息的最终状态。"],
    ],
    resnet: [
      ["identity skip", "原始信号直接通过的 shortcut path。"],
      ["residual branch", "只学习修正量 F(x) 的分支。"],
      ["skip add", "把 x 和 F(x) 相加得到新的表示。"],
      ["classifier head", "把最终 feature vector 变成任务输出。"],
    ],
    attention: [
      ["query", "当前 token 发出的“我要关注谁”的查询向量。"],
      ["key", "每个 token 暴露出来供 query 匹配的索引向量。"],
      ["value", "真正会被加权汇总进输出的内容向量。"],
      ["causal mask", "屏蔽未来 token，避免 autoregressive 过程偷看后文。"],
      ["residual + norm", "保留原始信号并稳定数值尺度。"],
      ["FFN", "attention 之后对每个 token 单独施加的非线性变换。"],
    ],
    pca: [
      ["mean center", "先把点云移到均值附近，再分析方差。"],
      ["covariance", "描述不同维度如何一起变化。"],
      ["principal component", "保留最多方差的主方向。"],
    ],
    clustering: [
      ["centroid", "代表一个 cluster 中心位置的点。"],
      ["assignment", "把样本分配给最近 centroid 的过程。"],
      ["inertia", "样本到所属 centroid 的平方距离总和。"],
    ],
    decision_tree: [
      ["split", "根据 threshold 把数据分成左右两支。"],
      ["Gini", "衡量节点里类别是否混杂的指标。"],
      ["leaf vote", "leaf 节点给出的最终类别判断。"],
    ],
    random_forest: [
      ["bagging", "每棵树都在不同 bootstrap sample 上训练。"],
      ["feature subsampling", "每次 split 只看部分特征。"],
      ["majority vote", "最终结果由多棵树投票决定。"],
    ],
    boosting: [
      ["base score", "所有 stage 开始前的初始预测。"],
      ["residual", "前面 stage 还没纠正完的误差。"],
      ["shrinkage", "让每一轮只做小步修正的 learning-rate 机制。"],
    ],
  };

  const enEntries = {
    linear: [
      ["weight w", "Controls the slope of the fitted line."],
      ["bias b", "Shifts the whole line up or down."],
      ["gradient", "Tells us how to nudge parameters to reduce loss."],
    ],
    classification: [
      ["logit z", "The raw score before sigmoid."],
      ["sigmoid", "Compresses the raw score into probability."],
      ["decision boundary", "Separates class 0 from class 1."],
    ],
    network_regression: [
      ["hidden unit", "A nonlinear feature detector inside the network."],
      ["activation", "Introduces nonlinear behavior."],
      ["output curve", "The final prediction after hidden units combine."],
    ],
    cnn: [
      ["patch", "A local window cut from the image."],
      ["kernel", "A reusable filter sliding over many patches."],
      ["feature map", "The response map created by the kernel."],
      ["pooling", "Keeps the strongest response."],
    ],
    rnn: [
      ["x_t", "Input at timestep t."],
      ["h_t", "Hidden state after combining input and memory."],
      ["recurrent weight", "Controls temporal carry-over."],
      ["final state", "Summary state for the sequence."],
    ],
    resnet: [
      ["identity skip", "Shortcut path carrying the input forward."],
      ["residual branch", "Learns the correction term F(x)."],
      ["skip add", "Adds x and F(x)."],
      ["classifier head", "Turns features into task output."],
    ],
    attention: [
      ["query", "Asks which tokens matter now."],
      ["key", "Lets tokens be matched by the query."],
      ["value", "The content that gets mixed into the output."],
      ["causal mask", "Blocks future tokens."],
      ["residual + norm", "Keeps signal while stabilizing scale."],
      ["FFN", "Nonlinear transformation after attention."],
    ],
    pca: [
      ["mean center", "Moves the cloud near the origin."],
      ["covariance", "Measures how dimensions vary together."],
      ["principal component", "Direction with the most variance."],
    ],
    clustering: [
      ["centroid", "Center of a cluster."],
      ["assignment", "Choosing the nearest centroid."],
      ["inertia", "Total squared distance to centroids."],
    ],
    decision_tree: [
      ["split", "Threshold rule that divides the data."],
      ["Gini", "Measures class impurity."],
      ["leaf vote", "Final class chosen at the leaf."],
    ],
    random_forest: [
      ["bagging", "Each tree trains on a bootstrap sample."],
      ["feature subsampling", "Each split sees only part of the feature space."],
      ["majority vote", "Most trees decide the final class."],
    ],
    boosting: [
      ["base score", "Starting prediction before correction."],
      ["residual", "Error left for the next stage."],
      ["shrinkage", "Small update factor per stage."],
    ],
  };

  return {
    summary:
      language === "zh"
        ? "这些术语先理解，再去看图和公式会更顺。"
        : "These are the core terms worth understanding before reading the plot and formulas.",
    items: (language === "zh" ? zhEntries : enEntries)[snapshot?.chartType] ?? [],
  };
}

function buildPseudocodeStages(snapshot) {
  const activeIndex = snapshot?.modelFlow?.findIndex((node) => node.active) ?? -1;
  return (snapshot?.modelFlow ?? []).map((node, index) => ({
    label: node.title,
    detail: node.detail,
    status: index < activeIndex ? "done" : index === activeIndex ? "current" : "upcoming",
  }));
}

function buildPseudocode(snapshot) {
  const explicit = snapshot?.teachingGuide?.pseudocode;
  if (explicit) {
    return explicit;
  }
  return (snapshot?.modelFlow ?? [])
    .map((node, index) => `${index + 1}. ${node.title}${node.detail ? `  // ${node.detail}` : ""}`)
    .join("\n");
}

function buildGuide(snapshot, language, selectedTraceIndex) {
  const activeFlow = getActiveFlow(snapshot);
  const selectedTrace = getSelectedTrace(snapshot, selectedTraceIndex);
  const chartLabel = getChartTypeLabel(snapshot?.chartType);

  if (language === "zh") {
    return {
      intuition: `当前在学习 ${chartLabel} 的“${activeFlow?.title || "当前步骤"}”。先把它理解成一个数据流节点，再去看图上的高亮对象。`,
      why: `${chartLabel} 里这一步的意义在于：它决定了下一步是继续前向得到输出，还是把误差信号传回参数。别把它孤立看，必须和前后节点连起来。`,
      visual: getVisualFallback(snapshot, selectedTrace, language),
      pseudocode: buildPseudocode(snapshot),
      pseudocodeStages: buildPseudocodeStages(snapshot),
      glossary: buildGlossaryFallback(snapshot, language),
      commonMistake: getCommonMistake(snapshot, language),
      mathSteps: snapshot?.calculationTrace ?? [],
    };
  }

  return {
    intuition:
      snapshot?.explanation ||
      `This step belongs to ${chartLabel}. Read it as one node in the model flow, not as an isolated formula.`,
    why: `This step matters because it determines what the next stage can do in ${chartLabel}. Follow it through the flow instead of reading it in isolation.`,
    visual: getVisualFallback(snapshot, selectedTrace, language),
    pseudocode: buildPseudocode(snapshot),
    pseudocodeStages: buildPseudocodeStages(snapshot),
    glossary: buildGlossaryFallback(snapshot, language),
    commonMistake: getCommonMistake(snapshot, language),
    mathSteps: snapshot?.calculationTrace ?? [],
  };
}

export function getDefaultTraceIndex(snapshot) {
  const traces = snapshot?.calculationTrace ?? [];
  const currentIndex = traces.findIndex((trace) => trace.status === "current");
  return currentIndex === -1 ? 0 : currentIndex;
}

export function getSelectedTrace(snapshot, selectedTraceIndex) {
  const traces = snapshot?.calculationTrace ?? [];
  return traces[selectedTraceIndex] ?? traces[getDefaultTraceIndex(snapshot)] ?? null;
}

export function renderTeachingPanel({ snapshot, language, teachingTab, selectedTraceIndex, tabsRoot, panelRoot }) {
  const guide = buildGuide(snapshot, language, selectedTraceIndex);
  const pseudocodeStages = (guide.pseudocodeStages ?? [])
    .map(
      (stage, index) => `
        <div class="teaching-phase ${stage.status}">
          <div class="teaching-phase-index">${index + 1}</div>
          <div>
            <strong>${escapeHtml(stage.label || "")}</strong>
            <p>${escapeHtml(stage.detail || "")}</p>
          </div>
        </div>
      `
    )
    .join("");
  const glossaryItems = (guide.glossary?.items ?? [])
    .map(
      ([term, meaning]) => `
        <article class="glossary-card">
          <strong>${escapeHtml(term)}</strong>
          <p>${escapeHtml(meaning)}</p>
        </article>
      `
    )
    .join("");

  tabsRoot.querySelectorAll("[data-teaching-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.teachingTab === teachingTab);
  });

  if (teachingTab === "math") {
    const steps = (guide.mathSteps ?? [])
      .map((step, index) => {
        const title = language === "zh" ? step.titleZh || step.title : step.title;
        const formula = language === "zh" ? step.formulaZh || step.formula : step.formula;
        return `
          <button class="teaching-step ${step.status || ""}${index === selectedTraceIndex ? " active" : ""}" data-teaching-trace-index="${index}" type="button">
            <strong>${escapeHtml(title)}</strong>
            <div class="teaching-math-formula">${renderMathExpression(formula, { displayMode: true })}</div>
          </button>
        `;
      })
      .join("");
    panelRoot.innerHTML = `
      <div class="teaching-section">
        <p class="teaching-summary">${
          language === "zh"
            ? "把公式按步骤串起来看。点击任意公式卡片，图上的高亮会同步切换。"
            : "Read the formulas step by step. Clicking a card also syncs the plot highlight."
        }</p>
        <div class="teaching-math-list">${steps}</div>
      </div>
    `;
    return;
  }

  if (teachingTab === "visual") {
    panelRoot.innerHTML = `
      <div class="teaching-section">
        <p class="teaching-summary">${escapeHtml(guide.visual || "")}</p>
      </div>
    `;
    return;
  }

  if (teachingTab === "glossary") {
    panelRoot.innerHTML = `
      <div class="teaching-section">
        <p class="teaching-summary">${escapeHtml(guide.glossary?.summary || "")}</p>
        <div class="glossary-grid">${glossaryItems}</div>
      </div>
    `;
    return;
  }

  if (teachingTab === "pseudocode") {
    panelRoot.innerHTML = `
      <div class="teaching-section">
        <div class="teaching-phase-list">${pseudocodeStages}</div>
        <p class="teaching-summary">${
          language === "zh"
            ? "先看阶段顺序，再看下面的 Pseudo Code。这样更容易把“数据流走到哪一步”和“代码在算什么”对起来。"
            : "Read the phase order first, then the pseudocode. This makes it easier to align flow and computation."
        }</p>
        <pre class="teaching-code">${escapeHtml(guide.pseudocode || "")}</pre>
      </div>
    `;
    return;
  }

  if (teachingTab === "mistake") {
    panelRoot.innerHTML = `
      <div class="teaching-section">
        <p class="teaching-summary">${escapeHtml(guide.commonMistake || "")}</p>
      </div>
    `;
    return;
  }

  const summary = teachingTab === "why" ? guide.why : guide.intuition;
  panelRoot.innerHTML = `
    <div class="teaching-section">
      <p class="teaching-summary">${escapeHtml(summary || "")}</p>
    </div>
  `;
}
