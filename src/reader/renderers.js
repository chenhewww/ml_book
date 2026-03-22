import { buildChapterReview } from "../content/schema.js";

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
          ${section.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
        </section>
      `
    )
    .join("");
}

export function renderPrinciples(page) {
  const principles = page.principles ?? [];
  if (!principles.length) {
    return "";
  }

  return `
    <section class="book-section principles-section">
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
    <section class="book-section split">
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
          "再回看你最卡住的那一页，把图、公式、Pseudo Code 和 Focus Guide 对齐一次。",
        ],
      },
    ],
    formulas: [],
    principles: [],
    observe: [
      "先看章节路线，确认自己最容易断掉的是哪一页。",
      "再看核心概念和关键公式，判断哪些已经能脱稿解释。",
      "最后做 mastery check，看看自己能否真正讲清这一章。",
    ],
    experimentPrompt: "回到你最不稳的一页，重新走一遍图、公式和 Trace，再回来做一次本章回顾。",
    takeaways: [
      "先能口头讲清楚这一章的设计动机，再去背公式细节。",
      "把关键公式和图上的高亮区域一一对应起来，避免只会背符号。",
      "如果实验区里某个现象说不清，就回到对应页重新看数据流和 Focus Guide。",
    ],
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
