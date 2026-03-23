function getSpotlight(linkedSymbol, trace) {
  return linkedSymbol?.spotlight ?? trace?.spotlight ?? "prediction";
}

export function getStepBoundTrace(snapshot, fallbackIndex = 0) {
  const traces = snapshot?.calculationTrace ?? [];
  return traces.find((trace) => trace.status === "current") ?? traces[fallbackIndex] ?? traces[0] ?? null;
}

export function describeVisualFocus({ snapshot, trace, linkedSymbol, language = "zh" }) {
  const spotlight = getSpotlight(linkedSymbol, trace);
  const token = snapshot?.focusSample?.token;
  const guide = snapshot?.visualGuide ?? {};

  const zh = {
    cnn: {
      parameters: {
        label: "卷积核与局部 patch",
        detail: "先盯住输入 patch 和当前 kernel，理解这一小块局部模式是怎样被卷积核打分的。",
      },
      prediction: {
        label: "特征图与分类概率",
        detail: "先看被点亮的 feature map，再看 pooling / softmax 条形图，确认哪一种模式响应更强。",
      },
      loss: {
        label: "概率与目标类别差距",
        detail: "把视线放到 pooled 响应和最终概率条，理解误差是如何从分类端产生的。",
      },
      gradient: {
        label: "最强激活 patch 的梯度",
        detail: "关注产生最大响应的局部 patch，以及它怎样把误差信号送回 kernel 参数。",
      },
      update: {
        label: "更新前后 kernel 差异",
        detail: "对照更新前后的 kernel 与 feature map，确认模型到底学会了更偏向哪类局部模式。",
      },
    },
    rnn: {
      parameters: {
        label: "隐藏状态链",
        detail: "重点看 h1 到 hT 的滚动变化，它们不是一组独立输出，而是一条连续的记忆链。",
      },
      prediction: {
        label: "最后状态与输出概率",
        detail: "把注意力放在最后一个 hidden state 和右侧概率柱，它们共同代表整段序列的判断结果。",
      },
      loss: {
        label: "序列级输出误差",
        detail: "先看最后状态如何映射成概率，再看它与标签的偏差如何变成损失。",
      },
      gradient: {
        label: "时间反向传播路径",
        detail: "沿着时间轴反向想象误差如何从最后状态一路传回更早的时刻。",
      },
      update: {
        label: "更新前后状态滚动",
        detail: "对比 previousHiddenStates 与当前 hiddenStates，观察循环权重更新后记忆链如何变化。",
      },
    },
    attention: {
      parameters: {
        label: `Token + position${token ? `：${token}` : ""}`,
        detail: "先确认当前 token 的内容向量和位置编码已经叠加，再进入 Q / K / V 的投影与比较。",
      },
      prediction: {
        label: `当前 query 行${token ? `：${token}` : ""}`,
        detail: "先盯住 attention 矩阵中当前 query 所在的一行，再看高亮格子对应的 target token 与右侧上下文向量。",
      },
      loss: {
        label: "mask 与合法注意力范围",
        detail: "先看被遮掉的未来格子，再看剩余可见区域里的权重如何重新归一化。",
      },
      gradient: {
        label: "FFN / 残差 / LayerNorm 路径",
        detail: "把注意力移到 Attn、Res1、LN1、FFN、Res2、LN2 这条连续向量通路，理解误差如何穿过 block。",
      },
      update: {
        label: "block 更新后表示",
        detail: "对比两次 residual + norm 之后的向量，理解一个 block 是怎样把上下文写回 token 表示的。",
      },
    },
    resnet: {
      parameters: {
        label: "输入与残差分支",
        detail: "比较 identity 路径和 residual branch，先分清哪部分是原输入，哪部分是修正量。",
      },
      prediction: {
        label: "skip add 后的输出",
        detail: "重点看 skip add 之后的向量和分类头条形图，理解残差修正如何影响最终输出。",
      },
      loss: {
        label: "分类头与误差",
        detail: "先看残差块输出，再看 classifier 的概率差距如何形成损失。",
      },
      gradient: {
        label: "双路径梯度流",
        detail: "理解误差既能穿过残差分支，也能走 identity shortcut，这正是 ResNet 稳定的原因。",
      },
      update: {
        label: "残差修正项更新",
        detail: "观察 residual branch 的缩放系数如何调整，同时 identity path 仍然保持不变。",
      },
    },
  };

  const en = {
    cnn: {
      parameters: { label: "kernel and patch", detail: "Start with the local patch and current kernel. This is the smallest visual unit the CNN is scoring." },
      prediction: { label: "feature maps and probabilities", detail: "Look at the activated feature map first, then the pooling / softmax bars that turn that response into a class decision." },
      loss: { label: "probability gap", detail: "Read the pooled responses and class bars as the place where the prediction deviates from the target." },
      gradient: { label: "gradient on the best patch", detail: "Watch the strongest activating patch and how its error signal flows back into the kernel." },
      update: { label: "before/after kernels", detail: "Compare the updated kernels and feature maps to see what local pattern the model strengthened." },
    },
    rnn: {
      parameters: { label: "hidden-state chain", detail: "Treat h1...hT as one rolling memory path instead of separate outputs." },
      prediction: { label: "final state and probability", detail: "The last hidden state and the probability bar together explain the sequence-level prediction." },
      loss: { label: "sequence loss", detail: "Read the final probability against the target before moving to gradients." },
      gradient: { label: "BPTT path", detail: "Follow the error backward through time from the last state to earlier timesteps." },
      update: { label: "updated state rollout", detail: "Compare previous and current hidden-state bars to see how the recurrent update changed memory." },
    },
    attention: {
      parameters: { label: `token + position${token ? `: ${token}` : ""}`, detail: "Confirm that content and positional signal are already combined before attention scores are computed." },
      prediction: { label: `active query row${token ? `: ${token}` : ""}`, detail: "Read one query row in the attention matrix, then the highlighted target cell, then the context vectors on the right." },
      loss: { label: "mask-constrained attention", detail: "Look at the masked future cells first, then the legal weights that remain after softmax." },
      gradient: { label: "FFN and residual path", detail: "Follow the continuous Attn -> Res1 -> LN1 -> FFN -> Res2 -> LN2 path rather than reading the matrix alone." },
      update: { label: "updated block representation", detail: "Compare the vectors after the two residual + norm stages to see how the block rewrites the token representation." },
    },
    resnet: {
      parameters: { label: "identity and residual", detail: "Separate what comes from the shortcut path from what is learned by the residual branch." },
      prediction: { label: "skip-add output", detail: "Focus on the vector after skip-add and the classifier bars that consume it." },
      loss: { label: "classifier mismatch", detail: "Read the probability gap after the residual block output reaches the head." },
      gradient: { label: "dual-path gradient flow", detail: "The error can move through both the identity path and the residual branch." },
      update: { label: "updated residual correction", detail: "Inspect how the residual branch changes while the identity path remains intact." },
    },
  };

  const guideMap = language === "zh" ? zh : en;
  const chartGuide = guideMap[snapshot?.chartType] ?? {};
  return {
    spotlight,
    ...(chartGuide[spotlight] ?? {
      label: language === "zh" ? "当前高亮对象" : "Current visual focus",
      detail:
        language === "zh"
          ? "先看当前步骤对应的高亮对象，再回到公式和数据流。"
          : "Inspect the currently highlighted object first, then map it back to flow and formulas.",
    }),
    targetIndex: guide.targetIndex,
    queryIndex: guide.queryIndex,
  };
}
