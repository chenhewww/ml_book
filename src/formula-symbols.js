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
      aliases: ["p_i", "PE(", "positional", "z_i = x_i + p_i"],
      meaning: "位置编码，给 token 注入顺序坐标。",
      visual: "先看 token embedding，再看它怎样和位置编码相加成输入表示。",
      spotlight: "parameters",
      stageKey: "token-position",
    },
    {
      key: "q_i",
      label: "q_i",
      aliases: ["q_i", "W_Q", "Q"],
      meaning: "query 是当前位置发出的提问，决定这一行要向哪些位置索取信息。",
      visual: "先固定当前 query token，再看它怎样生成一整行注意力打分。",
      spotlight: "prediction",
      stageKey: "qkv-head-scoring",
    },
    {
      key: "k_j",
      label: "k_j",
      aliases: ["k_j", "k_i", "W_K", "K"],
      meaning: "key 是每个位置暴露出来的可匹配索引，决定 query 会不会关注这里。",
      visual: "把它理解成每个 token 举起的一张索引卡，query 会拿它来做匹配。",
      spotlight: "prediction",
      stageKey: "qkv-head-scoring",
    },
    {
      key: "v_j",
      label: "v_j",
      aliases: ["v_j", "v_i", "W_V", "V"],
      meaning: "value 是真正会被加权带回来的内容载体。",
      visual: "先别把注意力停在分数表上，最后真正回到当前 token 的是 value 的加权和。",
      spotlight: "loss",
      stageKey: "masked-attention-mix",
    },
    {
      key: "a_{i,j}",
      label: "a_{i,j}",
      aliases: ["a_{i,j}", "\\alpha_{i,j}", "alpha_{i,j}", "softmax"],
      meaning: "当前位置 i 对位置 j 的注意力权重，是这一行在合法范围内重新分配后的结果。",
      visual: "先盯住当前 query 行，再看哪些位置拿到了最大的权重。",
      spotlight: "loss",
      stageKey: "masked-attention-mix",
    },
    {
      key: "m_{i,j}",
      label: "m_{i,j}",
      aliases: ["m_{i,j}", "mask", "\\tilde{s}_{i,j}"],
      meaning: "causal mask，对未来位置施加不可见约束。",
      visual: "优先看被遮掉的未来格子。它们不是弱相关，而是根本不允许被访问。",
      spotlight: "loss",
      stageKey: "masked-attention-mix",
    },
    {
      key: "o_i",
      label: "o_i",
      aliases: ["o_i", "attn_out", "Attention(Q,K,V)", "O ="],
      meaning: "当前 token 的注意力输出，是所有 value 按权重混合后的上下文向量。",
      visual: "从权重表移到右侧上下文向量，确认真正输出的是混合后的内容。",
      spotlight: "loss",
      stageKey: "masked-attention-mix",
    },
    {
      key: "head_r",
      label: "head_r",
      aliases: ["head_r", "head_1", "head_2", "head", "MultiHead"],
      meaning: "第 r 个注意力头，在自己的投影视角里提取一种关系模式。",
      visual: "对比多个 head 的关注差异，不要只盯单张矩阵。",
      spotlight: "prediction",
      stageKey: "qkv-head-scoring",
    },
    {
      key: "LN",
      label: "LN",
      aliases: ["LN", "LayerNorm", "Add&Norm", "Add\\&Norm"],
      meaning: "LayerNorm 用来重新稳定向量尺度，让残差之后的表示更容易继续向后传。",
      visual: "在注意力输出之后先看 residual，再看 LayerNorm 怎样把尺度重新拉稳。",
      spotlight: "gradient",
      stageKey: "residual-norm-1",
    },
    {
      key: "FFN",
      label: "FFN",
      aliases: ["FFN", "GELU", "W_1", "W_2"],
      meaning: "FFN 会对每个 token 单独做一次非线性改写，再把结果写回 block 输出。",
      visual: "顺着 LN1 继续往右看 FFN、第二次残差和最终输出，不要把它看成独立外挂模块。",
      spotlight: "update",
      stageKey: "ffn-residual-norm-2",
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
  const formulas = page?.formulas ?? [];
  if (!formulas.length) {
    return [];
  }
  const symbolGuides = SYMBOL_GUIDES[algorithmId] ?? [];
  const matched = collectSymbolsFromFormulas(page, symbolGuides);
  return matched.length ? matched : symbolGuides.slice(0, 3);
}

export function getFormulaSymbol(page, algorithmId, symbolKey) {
  return getFormulaSymbolsForPage(page, algorithmId).find((symbol) => symbol.key === symbolKey) ?? null;
}
