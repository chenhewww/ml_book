function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export const NNDL_SOURCE_PDF = "tmp/nndl-book.pdf";
export const NNDL_SOURCE_TITLE = "《神经网络与深度学习》";

export const NNDL_CHAPTER_TARGETS = [
  {
    id: "cnn",
    title: "CNN",
    chapterRange: range(120, 141),
    description: "Focus on the chapter introduction, the dense-to-convolution transition, feature maps / pooling, receptive field, and convolution parameter learning.",
    sections: [
      {
        id: "opening",
        title: "1. 为什么图像不能只靠全连接",
        pages: [120, 126, 127],
        rationale: "Use the chapter introduction plus the '用卷积来代替全连接' section to anchor local connectivity and parameter sharing.",
      },
      {
        id: "convolution",
        title: "2. convolution 到底在算什么",
        pages: [121, 122, 123],
        rationale: "Pull the convolution definition pages so the draft can explain patch, kernel, and response map as one process.",
      },
      {
        id: "padding",
        title: "3. padding 为什么不是随手补零",
        pages: [124],
        rationale: "Reuse the stride and zero-padding variants page for the boundary-preservation explanation.",
      },
      {
        id: "stride",
        title: "4. stride 在决定扫描步长",
        pages: [124],
        rationale: "The same convolution-variants page also grounds the stride sampling story.",
      },
      {
        id: "feature-map",
        title: "5. feature map 和 pooling 在保留什么",
        pages: [127, 128, 129, 130],
        rationale: "Use the convolution-layer and pooling-layer pages to connect detectors, feature maps, and strongest evidence.",
      },
      {
        id: "receptive-field",
        title: "6. receptive field 决定模型到底能看多远",
        pages: [140],
        rationale: "Use the dilated-convolution page because it explicitly discusses increasing receptive field.",
      },
      {
        id: "backprop",
        title: "7. filter 是怎么被学会的",
        pages: [131],
        rationale: "Anchor the learning story in the convolution parameter-learning section.",
      },
      {
        id: "lab",
        title: "8. 动手实验：改一张图，看看 CNN 会怎么看",
        pages: [141],
        rationale: "Point the lab page back to the chapter summary so the experiment stays tied to the canonical concepts.",
      },
    ],
  },
  {
    id: "rnn",
    title: "RNN / LSTM",
    chapterRange: range(144, 164),
    description: "Cover sequence motivation, unrolling, sequence-level outputs, BPTT, long-term dependency issues, and the LSTM gating mechanism.",
    sections: [
      {
        id: "opening",
        title: "1. 为什么序列不能当普通样本看",
        pages: [144, 145],
        rationale: "Use the chapter introduction and the '给网络增加记忆能力' section to motivate sequential state.",
      },
      {
        id: "unroll",
        title: "2. 把 RNN 展开以后，数据流长什么样",
        pages: [146, 147],
        rationale: "Ground the explanation in the simple recurrent network definition and the unrolled-time figure.",
      },
      {
        id: "last-hidden",
        title: "3. 为什么最后一个状态能代表整段序列",
        pages: [149, 150],
        rationale: "Use the sequence-to-class and sequence-to-sequence application pages to explain why h_T often stands in for the whole sequence.",
      },
      {
        id: "bptt",
        title: "4. BPTT 是怎么把误差传回过去的",
        pages: [151, 152, 153],
        rationale: "Use the parameter-learning section and the backward-through-time figure for the time-axis gradient story.",
      },
      {
        id: "gradient-stability",
        title: "5. 为什么 RNN 容易梯度消失或爆炸",
        pages: [154, 156],
        rationale: "Use the long-term dependency discussion plus the gate-network motivation page to connect instability with architectural fixes.",
      },
      {
        id: "lstm-motivation",
        title: "6. LSTM 在补什么，为什么要加门",
        pages: [156, 157],
        rationale: "The gate-network introduction and the first LSTM page directly motivate explicit memory control.",
      },
      {
        id: "lstm-flow",
        title: "7. 一次 LSTM 更新里，门控和状态怎么配合",
        pages: [157, 158],
        rationale: "Use the LSTM unit figure and compact update equations to structure the gate-by-gate walkthrough.",
      },
      {
        id: "lab",
        title: "8. 动手实验：让 RNN 读一段趋势序列",
        pages: [164],
        rationale: "Use the chapter summary to keep the experiment page aligned with sequence memory, BPTT, and gates.",
      },
    ],
  },
  {
    id: "transformer",
    title: "Transformer",
    chapterRange: [209, 210, 211, 212, 213, 214, 215, 393, 394, 395],
    description: "Blend the generic attention chapter with the Transformer seq2seq section so the site can keep a beginner-friendly Q/K/V-to-block progression.",
    sections: [
      {
        id: "opening",
        title: "1. Transformer 在解决什么问题",
        pages: [209, 213, 393],
        rationale: "Use the attention overview, self-attention motivation, and Transformer introduction to explain why relation-based routing replaces sequential bottlenecks.",
      },
      {
        id: "qkv",
        title: "2. query / key / value 是怎么配合的",
        pages: [211, 214, 393],
        rationale: "Combine key-value attention, the explicit QKV construction, and the Transformer self-attention equations.",
      },
      {
        id: "positional-encoding",
        title: "3. positional encoding 为什么是必要的",
        pages: [215, 394],
        rationale: "Use the self-attention position warning and the Transformer positional encoding equations.",
      },
      {
        id: "causal-mask",
        title: "4. causal mask 为什么保证自回归",
        pages: [395],
        rationale: "The masked self-attention decoder page is the cleanest source for the causal-mask explanation.",
      },
      {
        id: "mask-and-heads",
        title: "5. multi-head 为什么不是重复计算",
        pages: [212, 393, 395],
        rationale: "Use the general multi-head attention page, then connect it to Transformer self-attention and decoder masking.",
      },
      {
        id: "block",
        title: "6. 一个 Transformer block 为什么不只有 attention",
        pages: [394, 395],
        rationale: "Use the Add & Norm + FFN equations and the Transformer architecture figure.",
      },
      {
        id: "ffn-stack",
        title: "7. FFN / residual / LayerNorm 为什么必须成组出现",
        pages: [394],
        rationale: "The Transformer layer equations explicitly show the residual / norm / FFN stack.",
      },
      {
        id: "lab",
        title: "8. 动手实验：盯住一个 token，完整走一遍 block",
        pages: [393, 394, 395],
        rationale: "Keep the lab tied to the canonical block path: self-attention, position, masked attention, Add & Norm, and FFN.",
      },
    ],
  },
];

export function formatPageList(pages) {
  if (!Array.isArray(pages) || !pages.length) {
    return "";
  }

  const sorted = [...new Set(pages)].sort((left, right) => left - right);
  const ranges = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (let index = 1; index <= sorted.length; index += 1) {
    const current = sorted[index];
    if (current === previous + 1) {
      previous = current;
      continue;
    }
    ranges.push(start === previous ? `${start}` : `${start}-${previous}`);
    start = current;
    previous = current;
  }

  return ranges.join(", ");
}
