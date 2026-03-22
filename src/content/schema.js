const DEFAULT_LIVE_CELL_PRESET = {
  phase: "forward",
  teachingTab: "intuition",
  traceFilter: "current",
  sampleStrategy: "interesting-default",
};

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function ensureString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function ensureStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function normalizeFormula(formula) {
  if (!isPlainObject(formula)) {
    return null;
  }
  return {
    label: ensureString(formula.label),
    expression: ensureString(formula.expression),
    explanation: ensureString(formula.explanation),
  };
}

function normalizePrinciple(principle) {
  if (!isPlainObject(principle)) {
    return null;
  }
  return {
    title: ensureString(principle.title),
    body: ensureString(principle.body),
  };
}

function normalizeSection(section) {
  if (!isPlainObject(section)) {
    return null;
  }
  return {
    title: ensureString(section.title),
    paragraphs: ensureStringArray(section.paragraphs),
  };
}

function normalizeCallout(callout) {
  if (!isPlainObject(callout)) {
    return null;
  }
  return {
    title: ensureString(callout.title),
    body: ensureString(callout.body),
  };
}

function normalizeQuiz(quiz, page) {
  if (isPlainObject(quiz)) {
    return {
      question: ensureString(quiz.question),
      cues: ensureStringArray(quiz.cues),
    };
  }

  const cues = [
    ensureString(page.summary),
    ...ensureStringArray(page.takeaways).slice(0, 2),
    ...(Array.isArray(page.formulas)
      ? page.formulas.slice(0, 1).map((formula) => `${ensureString(formula.label)}：${ensureString(formula.explanation)}`)
      : []),
  ].filter(Boolean);

  const question = Array.isArray(page.formulas) && page.formulas.length
    ? `不用看图，试着解释这页里「${ensureString(page.formulas[0].label)}」到底在负责什么。`
    : Array.isArray(page.principles) && page.principles.length
      ? `这页最重要的设计原则是什么，它解决了什么问题？`
      : `如果你要用一句话给别人讲这页，你会怎么说？`;

  return {
    question,
    cues,
  };
}

function normalizeLiveCellPreset(preset, page) {
  return {
    ...DEFAULT_LIVE_CELL_PRESET,
    phase: ensureString(preset?.phase, ensureString(page.phase, DEFAULT_LIVE_CELL_PRESET.phase)),
    teachingTab: ensureString(preset?.teachingTab, ensureString(page.teachingTab, DEFAULT_LIVE_CELL_PRESET.teachingTab)),
    traceFilter: ensureString(
      preset?.traceFilter,
      ensureString(page.phase) === "update" ? "all" : DEFAULT_LIVE_CELL_PRESET.traceFilter
    ),
    sampleStrategy: ensureString(preset?.sampleStrategy, DEFAULT_LIVE_CELL_PRESET.sampleStrategy),
  };
}

function buildChapterReview(chapter) {
  const keyIdeas = [];
  const formulaLabels = [];

  chapter.pages.forEach((page) => {
    (page.principles ?? []).forEach((principle) => {
      if (principle.title && !keyIdeas.includes(principle.title)) {
        keyIdeas.push(principle.title);
      }
    });
    (page.formulas ?? []).forEach((formula) => {
      if (formula.label && !formulaLabels.includes(formula.label)) {
        formulaLabels.push(formula.label);
      }
    });
  });

  const masteryChecks = {
    "linear-regression": [
      "你能否用图像解释一次 forward、loss、gradient、update？",
      "你能否说明 learning rate 过大时为什么会震荡？",
      "你能否把拟合线的变化和参数更新方向对应起来？",
    ],
    cnn: [
      "你能否解释局部性、参数共享、padding、stride 和 receptive field 之间的关系？",
      "你能否说明 1 个 filter 为什么会生成 1 张 feature map？",
      "你能否从 kernel 变化解释 feature map 为什么会跟着变？",
    ],
    rnn: [
      "你能否说明 hidden state 为什么能代表过去，又为什么会有信息瓶颈？",
      "你能否解释 BPTT 和梯度消失 / 爆炸之间的关系？",
      "你能否讲清楚 LSTM 的三个 gate 分别在控制什么？",
    ],
    resnet: [
      "你能否说明残差学习为什么比直接学习完整映射更容易？",
      "你能否解释 1x1 conv 和 bottleneck 在 ResNet 里的角色？",
      "你能否说明深层 ResNet 为什么还能保持可训练？",
    ],
    transformer: [
      "你能否说明 positional encoding、causal mask、multi-head 分别解决什么问题？",
      "你能否把 Q / K / V 的职责讲清楚，而不是只背缩写？",
      "你能否解释一个完整 block 里 attention、FFN、residual、LayerNorm 的分工？",
    ],
  };

  return {
    pageTitles: chapter.pages.map((page) => page.title).filter(Boolean),
    keyIdeas: keyIdeas.slice(0, 8),
    formulaLabels: formulaLabels.slice(0, 8),
    masteryChecks: masteryChecks[chapter.id] ?? [],
  };
}

function normalizePage(page, chapterId, pageIndex) {
  if (!isPlainObject(page)) {
    throw new Error(`Chapter ${chapterId} page ${pageIndex + 1} must be an object.`);
  }

  const normalized = {
    id: ensureString(page.id, `page-${pageIndex + 1}`),
    title: ensureString(page.title, `第 ${pageIndex + 1} 页`),
    phase: ensureString(page.phase, DEFAULT_LIVE_CELL_PRESET.phase),
    teachingTab: ensureString(page.teachingTab, DEFAULT_LIVE_CELL_PRESET.teachingTab),
    summary: ensureString(page.summary),
    paragraphs: ensureStringArray(page.paragraphs),
    sections: (Array.isArray(page.sections) ? page.sections : []).map(normalizeSection).filter(Boolean),
    formulas: (Array.isArray(page.formulas) ? page.formulas : []).map(normalizeFormula).filter(Boolean),
    principles: (Array.isArray(page.principles) ? page.principles : []).map(normalizePrinciple).filter(Boolean),
    observe: ensureStringArray(page.observe),
    experimentPrompt: ensureString(page.experimentPrompt),
    takeaways: ensureStringArray(page.takeaways),
    callout: normalizeCallout(page.callout),
    kind: ensureString(page.kind),
    liveCellPreset: normalizeLiveCellPreset(page.liveCellPreset, page),
    quiz: null,
    review: isPlainObject(page.review) ? page.review : null,
  };

  normalized.quiz = normalizeQuiz(page.quiz, normalized);
  return normalized;
}

export function normalizeChapter(chapter, chapterIndex = 0) {
  if (!isPlainObject(chapter)) {
    throw new Error(`Chapter at index ${chapterIndex} must be an object.`);
  }

  const normalized = {
    id: ensureString(chapter.id, `chapter-${chapterIndex + 1}`),
    order: Number.isFinite(chapter.order) ? chapter.order : chapterIndex + 1,
    algorithmId: ensureString(chapter.algorithmId),
    title: ensureString(chapter.title, `第 ${chapterIndex + 1} 章`),
    subtitle: ensureString(chapter.subtitle),
    blurb: ensureString(chapter.blurb),
    summary: ensureString(chapter.summary, ensureString(chapter.blurb)),
    pages: (Array.isArray(chapter.pages) ? chapter.pages : []).map((page, pageIndex) => normalizePage(page, ensureString(chapter.id), pageIndex)),
    review: isPlainObject(chapter.review) ? chapter.review : null,
  };

  if (!normalized.review) {
    normalized.review = buildChapterReview(normalized);
  }

  return normalized;
}

export function validateChapter(chapter) {
  const errors = [];
  if (!chapter.id) {
    errors.push("chapter.id is required");
  }
  if (!chapter.algorithmId) {
    errors.push(`chapter ${chapter.id || "<unknown>"} requires algorithmId`);
  }
  if (!Array.isArray(chapter.pages) || !chapter.pages.length) {
    errors.push(`chapter ${chapter.id || "<unknown>"} requires at least one page`);
  }

  const pageIds = new Set();
  chapter.pages.forEach((page, pageIndex) => {
    if (!page.id) {
      errors.push(`chapter ${chapter.id} page ${pageIndex + 1} requires id`);
    } else if (pageIds.has(page.id)) {
      errors.push(`chapter ${chapter.id} has duplicate page id ${page.id}`);
    } else {
      pageIds.add(page.id);
    }

    ["title", "summary", "experimentPrompt"].forEach((field) => {
      if (typeof page[field] !== "string") {
        errors.push(`chapter ${chapter.id} page ${page.id} requires string field ${field}`);
      }
    });

    ["paragraphs", "sections", "formulas", "principles", "observe"].forEach((field) => {
      if (!Array.isArray(page[field])) {
        errors.push(`chapter ${chapter.id} page ${page.id} requires array field ${field}`);
      }
    });

    if (!isPlainObject(page.liveCellPreset)) {
      errors.push(`chapter ${chapter.id} page ${page.id} requires liveCellPreset object`);
    }
    if (!isPlainObject(page.quiz)) {
      errors.push(`chapter ${chapter.id} page ${page.id} requires quiz object`);
    }
  });

  return errors;
}

export function normalizeChapters(chapters) {
  return chapters.map((chapter, index) => normalizeChapter(chapter, index));
}

export { DEFAULT_LIVE_CELL_PRESET, buildChapterReview };
