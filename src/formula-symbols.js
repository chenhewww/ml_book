const SYMBOL_GUIDES = {
  cnn_classifier: [
    {
      key: "x_{i,j}",
      label: "x_{i,j}",
      aliases: ["x_{i,j}", "x_{k,l}", "x_{i+a, j+b}", "x"],
      meaning: "输入图像在某个空间位置上的像素或通道值。",
      visual: "先看 Input Patch 里的局部像素块，卷积核就是在这些局部值上滑动打分。",
      spotlight: "prediction",
    },
    {
      key: "V_{a,b}",
      label: "V_{a,b}",
      aliases: ["V_{a,b}", "V", "K"],
      meaning: "卷积核参数，决定当前 filter 想探测哪种局部模式。",
      visual: "重点看 Kernel 区域。它像一个局部模式探测器，会把像素块映射成 feature response。",
      spotlight: "update",
    },
    {
      key: "h_{i,j}",
      label: "h_{i,j}",
      aliases: ["h_{i,j}", "h"],
      meaning: "卷积输出或 feature map 上某个位置的响应值。",
      visual: "回到 Feature Map，看哪个位置被点亮，说明 kernel 在那里检测到了目标模式。",
      spotlight: "prediction",
    },
  ],
  rnn_sequence: [
    {
      key: "x_t",
      label: "x_t",
      aliases: ["x_t", "x"],
      meaning: "第 t 个时间步读入的当前输入。",
      visual: "先看时间轴上的当前输入点，它决定这一刻往状态里写入什么新信息。",
      spotlight: "prediction",
    },
    {
      key: "h_t",
      label: "h_t",
      aliases: ["h_t", "h_{t-1}", "h_T", "h"],
      meaning: "RNN 的隐藏状态，是滚动更新的序列摘要。",
      visual: "重点看 hidden state 链，不要只盯最后输出；它是整条序列滚动积累的信息。",
      spotlight: "parameters",
    },
    {
      key: "c_t",
      label: "c_t",
      aliases: ["c_t", "c_{t-1}", "\\tilde{c}_t"],
      meaning: "LSTM 的 cell state，承担更稳定的长期记忆通路。",
      visual: "把它理解成贯穿时间的长期记忆主线，先看门控，再看记忆如何保留或写入。",
      spotlight: "update",
    },
    {
      key: "f_t / i_t / o_t",
      label: "f_t / i_t / o_t",
      aliases: ["f_t", "i_t", "o_t"],
      meaning: "LSTM 的遗忘门、输入门、输出门，分别控制保留、写入和暴露多少记忆。",
      visual: "看门控更新时，重点理解哪一扇门在决定“保留多少”“写入多少”“输出多少”。",
      spotlight: "update",
    },
  ],
  transformer_attention: [
    {
      key: "p_i",
      label: "p_i",
      aliases: ["p_i", "PE(", "positional"],
      meaning: "位置编码，给 token 注入顺序坐标。",
      visual: "先看 token 在序列中的位置，再看输入表示如何把内容和顺序叠加到一起。",
      spotlight: "parameters",
    },
    {
      key: "q_i / k_j / v_j",
      label: "q_i / k_j / v_j",
      aliases: ["q_i", "k_j", "v_j", "W_Q", "W_K", "W_V", "Q", "K", "V"],
      meaning: "query 负责发问，key 负责被匹配，value 负责提供真正被聚合的内容。",
      visual: "先盯住一个 query token，再看它如何在 attention matrix 中对不同 key 分配权重，最后怎样加权 value。",
      spotlight: "prediction",
    },
    {
      key: "m_{i,j}",
      label: "m_{i,j}",
      aliases: ["m_{i,j}", "mask"],
      meaning: "causal mask，对未来位置施加不可见约束。",
      visual: "优先看被遮掉的未来格子。它们不是弱相关，而是根本不允许被访问。",
      spotlight: "loss",
    },
    {
      key: "head_r",
      label: "head_r",
      aliases: ["head_r", "head_1", "head_2", "head"],
      meaning: "第 r 个注意力头，在自己的投影视角里提取一种关系模式。",
      visual: "对比多个 Head 的关注差异，不要只盯单张矩阵。",
      spotlight: "prediction",
    },
    {
      key: "LN / FFN",
      label: "LN / FFN",
      aliases: ["LN", "LayerNorm", "FFN", "Add&Norm", "Add\\&Norm"],
      meaning: "LayerNorm 稳定数值尺度，FFN 负责逐 token 非线性变换。",
      visual: "在 block 后半段依次看 residual、LayerNorm 和 FFN，它们共同把上下文转成新的 token 表示。",
      spotlight: "update",
    },
  ],
};

function collectSymbolsFromFormulas(page, symbolGuides) {
  const formulas = page.formulas ?? [];
  return symbolGuides.filter((symbol) =>
    formulas.some((formula) => {
      const target = `${formula.label} ${formula.expression} ${formula.explanation}`;
      return symbol.aliases.some((alias) => target.includes(alias));
    })
  );
}

export function getFormulaSymbolsForPage(page, algorithmId) {
  const symbolGuides = SYMBOL_GUIDES[algorithmId] ?? [];
  const matched = collectSymbolsFromFormulas(page, symbolGuides);
  return matched.length ? matched : symbolGuides.slice(0, 3);
}

export function getFormulaSymbol(page, algorithmId, symbolKey) {
  return getFormulaSymbolsForPage(page, algorithmId).find((symbol) => symbol.key === symbolKey) ?? null;
}
