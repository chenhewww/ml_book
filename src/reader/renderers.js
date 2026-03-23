import { buildChapterReview } from "../content/schema.js";

function renderParagraphBlock(paragraphs = []) {
  return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("");
}

export function renderOpeningQuestion(page) {
  if (!page.openingQuestion) {
    return "";
  }

  return `
    <section class="book-section opening-question-section primary">
      <div class="book-kicker">起始问题</div>
      <h3>这页先回答什么问题</h3>
      <p class="opening-question-text">${page.openingQuestion}</p>
      ${page.coreIdea ? `<p class="opening-question-answer">${page.coreIdea}</p>` : ""}
    </section>
  `;
}

export function renderCoreContent(page) {
  const paragraphs = page.paragraphs ?? [];
  if (!paragraphs.length) {
    return "";
  }

  return `
    <section class="book-section core-content-section">
      <h3>核心解释</h3>
      ${renderParagraphBlock(paragraphs)}
    </section>
  `;
}

export function renderBookSections(page) {
  const sections = page.sections ?? [];
  if (!sections.length) {
    return "";
  }

  return sections
    .map(
      (section) => `
        <section class="book-section">
          <h3>${section.title}</h3>
          ${renderParagraphBlock(section.paragraphs)}
        </section>
      `
    )
    .join("");
}

export function renderWalkthrough(page) {
  const walkthrough = page.walkthrough ?? [];
  if (!walkthrough.length) {
    return "";
  }

  return `
    <section class="book-section walkthrough-section">
      <div class="section-heading-row">
        <h3>读图顺序</h3>
        <small>按这个顺序看，更容易把图、公式和数据流接起来。</small>
      </div>
      <ol class="book-list walkthrough-list">
        ${walkthrough.map((item) => `<li>${item}</li>`).join("")}
      </ol>
    </section>
  `;
}

export function renderDiagramNotes(page) {
  const diagram = page.diagram;
  if (!diagram?.caption && !diagram?.focus) {
    return "";
  }

  return `
    <section class="book-section diagram-notes-section">
      <div class="section-heading-row">
        <h3>主图说明</h3>
        <small>先把图上的主线读顺，再切去交互图解。</small>
      </div>
      ${diagram.caption ? `<p>${diagram.caption}</p>` : ""}
      ${diagram.focus ? `<p class="diagram-focus-note">当前主线：${diagram.focus}</p>` : ""}
    </section>
  `;
}

export function renderVocabulary(page) {
  const vocabulary = page.vocabulary ?? [];
  if (!vocabulary.length) {
    return "";
  }

  return `
    <section class="book-section vocabulary-section appendix-section">
      <div class="section-heading-row">
        <h3>关键词</h3>
        <small>读到这里卡住时，用它快速对齐术语。</small>
      </div>
      <div class="vocabulary-grid">
        ${vocabulary
          .map(
            (item) => `
              <article class="vocabulary-card">
                <strong>${item.term}</strong>
                <p>${item.meaning}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderMisconceptions(page) {
  const misconceptions = page.misconceptions ?? [];
  if (!misconceptions.length) {
    return "";
  }

  return `
    <section class="book-section misconception-section appendix-section">
      <div class="section-heading-row">
        <h3>常见误区</h3>
        <small>这些误解最容易把图和公式读散。</small>
      </div>
      <div class="misconception-stack">
        ${misconceptions
          .map(
            (item) => `
              <article class="misconception-card">
                <strong>${item.myth}</strong>
                <p>${item.correction}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderPrinciples(page) {
  const principles = page.principles ?? [];
  if (!principles.length) {
    return "";
  }

  return `
    <section class="book-section principles-section appendix-section">
      <h3>设计原则</h3>
      <div class="principle-grid">
        ${principles
          .map(
            (item) => `
              <article class="principle-card">
                <strong>${item.title}</strong>
                <p>${item.body}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderTakeaways(page) {
  const takeaways = page.takeaways ?? [];
  if (!takeaways.length) {
    return "";
  }

  return `
    <section class="book-section takeaway-section">
      <h3>这一页的结论</h3>
      <ul class="book-list">
        ${takeaways.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </section>
  `;
}

export function renderCallout(page) {
  const callout = page.callout;
  if (!callout) {
    return "";
  }

  return `
    <section class="book-callout">
      <strong>${callout.title}</strong>
      <p>${callout.body}</p>
    </section>
  `;
}

export function renderMiniQuiz(page) {
  if (page.kind === "chapter-summary") {
    return "";
  }

  const quiz = page.quiz;
  if (!quiz) {
    return "";
  }

  return `
    <section class="book-section quiz-section">
      <div class="quiz-header">
        <h3>本页小测</h3>
        <small>先自己想，再展开看参考答案</small>
      </div>
      <p class="quiz-question">${quiz.question}</p>
      <details class="quiz-answer">
        <summary>展开参考答案</summary>
        <div class="quiz-answer-body">
          <p>标准答案不必一字不差，但至少应该提到这些点：</p>
          <ul class="book-list">
            ${(quiz.cues ?? []).map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </div>
      </details>
    </section>
  `;
}

export function renderObservationSection(page) {
  const observe = page.observe ?? [];
  const experimentPrompt = page.experimentPrompt ?? "";
  if (!observe.length && !experimentPrompt) {
    return "";
  }

  return `
    <section class="book-section split observation-section">
      <div>
        <h3>这一页应该重点观察什么</h3>
        <ul class="book-list">
          ${observe.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </div>
      <div>
        <h3>动手实验建议</h3>
        <p>${experimentPrompt}</p>
      </div>
    </section>
  `;
}

export function renderFurtherInspection(page) {
  const items = page.furtherInspection ?? [];
  if (!items.length) {
    return "";
  }

  return `
    <section class="book-section further-inspection-section appendix-section">
      <div class="section-heading-row">
        <h3>深入观察</h3>
        <small>准备展开逐步推导、内部状态和教学附录时，再回来看这一组提示。</small>
      </div>
      <ul class="book-list">
        ${items.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </section>
  `;
}

export function renderSourceNotes(page) {
  const sourceNotes = page.sourceNotes;
  if (!sourceNotes?.excerpts?.length) {
    return "";
  }

  return `
    <section class="book-section source-notes-section appendix-section">
      <div class="section-heading-row">
        <h3>来源摘录</h3>
        <small>${sourceNotes.sourceTitle || "参考来源"}${sourceNotes.pages?.length ? ` · PDF 第 ${sourceNotes.pages.join(", ")} 页` : ""}</small>
      </div>
      <div class="source-note-stack">
        ${sourceNotes.excerpts
          .map(
            (excerpt) => `
              <article class="source-note-card">
                <strong>PDF 第 ${excerpt.page} 页</strong>
                <p>${excerpt.text}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function renderAppendix(page) {
  const appendixBody = [
    renderVocabulary(page),
    renderMisconceptions(page),
    renderPrinciples(page),
    renderFurtherInspection(page),
    renderSourceNotes(page),
  ]
    .filter(Boolean)
    .join("");

  if (!appendixBody) {
    return "";
  }

  return `
    <details class="book-appendix">
      <summary>展开深入学习附录</summary>
      <div class="book-appendix-body">
        ${appendixBody}
      </div>
    </details>
  `;
}

export function buildChapterSummaryPage(chapter, chapterIndex) {
  const review = chapter.review ?? buildChapterReview(chapter);

  return {
    id: "chapter-summary",
    kind: "chapter-summary",
    title: "本章总结",
    phase: "update",
    teachingTab: "intuition",
    summary: `现在把第 ${chapterIndex + 1} 章的主线收拢成一页：这章到底解决了什么、哪些公式最值得记，以及你现在应该能解释哪些问题。`,
    paragraphs: [
      `这一页不是新知识，而是把 ${chapter.title} 的阅读路径重新串起来，帮你从“看过动画”过渡到“能自己讲清楚”。`,
      "如果前面的某一页你已经能顺着图、公式和数据流讲明白，那么这一页会帮你把这些局部理解收成一条完整主线。",
    ],
    sections: [
      {
        title: "这一章真正要留下什么",
        paragraphs: [
          chapter.blurb,
          "读完整章之后，你不应该只记住几个术语，而应该能把关键设计动机、核心公式和实验现象连成一条叙事链。",
        ],
      },
      {
        title: "建议这样回看",
        paragraphs: [
          "先扫一遍章节路线，确认每一页在整章里承担什么角色。",
          "再回看你最卡住的那一页，把图、公式、推导步骤和阅读顺序提示对齐一次。",
        ],
      },
    ],
    formulas: [],
    principles: [],
    observe: [
      "先看章节路线，确认自己最容易断掉的是哪一页。",
      "再看核心概念和关键公式，判断哪些已经能脱稿解释。",
      "最后做掌握度检查，看看自己能否真正讲清这一章。",
    ],
    experimentPrompt: "回到你最不稳的一页，重新走一遍图、公式和逐步推导，再回来做一次本章回顾。",
    takeaways: [
      "先能口头讲清楚这一章的设计动机，再去背公式细节。",
      "把关键公式和图上的高亮区域一一对应起来，避免只会背符号。",
      "如果实验区里某个现象说不清，就回到对应页重新看数据流和阅读顺序提示。",
    ],
    readingMode: "book-first",
    openingQuestion: `这章真正解决了什么问题？`,
    coreIdea: `把 ${chapter.title} 的关键设计动机、核心公式和实验现象重新串成一条主线。`,
    figureCaption: "先按章节路线回看，再按卡住的概念重新展开。",
    walkthrough: [
      "先扫章节路线，确认每一页的角色。",
      "再对照核心概念和关键公式。",
      "最后做掌握度检查，检验能否脱稿讲清。",
    ],
    vocabulary: [],
    misconceptions: [],
    diagram: {
      focus: "章节路线、核心概念、关键公式、掌握度检查",
      caption: "这一页把整章压缩成“路线、概念、公式、问题”四条线。",
      sourcePages: [],
    },
    furtherInspection: [
      "先看章节路线，确认哪一页最容易断线。",
      "再回到最卡的一页，把图、公式、逐步推导对齐一次。",
      "最后用掌握度检查检验是否真的理解。",
    ],
    sourceNotes: null,
    liveCellPreset: {
      phase: "update",
      teachingTab: "intuition",
      traceFilter: "all",
      sampleStrategy: "interesting-default",
    },
    quiz: {
      question: "如果要你在五分钟内给别人复盘这一章，你会按什么顺序讲？",
      cues: review.masteryChecks ?? [],
    },
    review,
  };
}

export function renderChapterSummaryDetail(page) {
  if (page.kind !== "chapter-summary" || !page.review) {
    return "";
  }

  const { review } = page;
  return `
    <section class="book-section chapter-review-section">
      <div class="chapter-review-header">
        <h3>本章回顾</h3>
        <small>这一页把整章压缩成“路线、概念、公式、问题”四条线。</small>
      </div>
      <div class="chapter-review-grid">
        <article class="review-card">
          <strong>章节路线</strong>
          <ul class="book-list">
            ${(review.pageTitles ?? []).map((title) => `<li>${title}</li>`).join("")}
          </ul>
        </article>
        <article class="review-card">
          <strong>核心概念</strong>
          <ul class="book-list">
            ${(review.keyIdeas ?? []).map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>
        <article class="review-card">
          <strong>关键公式</strong>
          <ul class="book-list">
            ${(review.formulaLabels ?? []).map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>
      </div>
      <div class="chapter-review-checks">
        <strong>你现在应该能回答的问题</strong>
        <ul class="book-list">
          ${(review.masteryChecks ?? []).map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </div>
    </section>
  `;
}
