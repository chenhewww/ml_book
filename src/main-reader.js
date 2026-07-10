import { BOOK_CHAPTERS, getChapterById, getChapterIndex } from "./book-content.js";
import {
  buildChapterSummaryPage as buildSummaryPage,
  renderAppendix as renderReaderAppendix,
  renderBookSections as renderReaderSections,
  renderCallout as renderReaderCallout,
  renderChapterSummaryDetail as renderReaderChapterSummaryDetail,
  renderCoreContent as renderReaderCoreContent,
  renderDiagramNotes as renderReaderDiagramNotes,
  renderMiniQuiz as renderReaderMiniQuiz,
  renderObservationSection as renderReaderObservationSection,
  renderOpeningQuestion as renderReaderOpeningQuestion,
  renderTakeaways as renderReaderTakeaways,
  renderWalkthrough as renderReaderWalkthrough,
} from "./reader/renderers.js";
import {
  renderFormulaCards as renderNotebookFormulaCards,
  renderNotebookBridge,
} from "./notebook/renderers.js";

export function getRenderablePages(chapter) {
  return [...chapter.pages, buildSummaryPage(chapter, getChapterIndex(chapter.id))];
}

export function renderChapterNavigation({ chapterId, pageIndex, chapterListElement, pageListElement }) {
  const pages = getRenderablePages(getChapterById(chapterId));

  chapterListElement.innerHTML = BOOK_CHAPTERS
    .map(
      (chapter) => {
        const isActive = chapter.id === chapterId;
        const chapterPages = isActive ? pages : [];
        return `
          <div class="chapter-nav-group${isActive ? " active" : ""}">
            <button class="chapter-chip${isActive ? " active" : ""}" data-chapter-id="${chapter.id}" type="button" aria-expanded="${isActive}">
              <span>${String(getChapterIndex(chapter.id) + 1).padStart(2, "0")}</span>
              <strong>${chapter.title}</strong>
            </button>
            ${
              isActive
                ? `<div class="page-list">
                    ${chapterPages
                      .map(
                        (page, index) => `
                          <button class="page-chip${index === pageIndex ? " active" : ""}" data-page-index="${index}" type="button">
                            <span>${chapterIndexLabel(chapterId, index)}</span>
                            <strong>${page.title}</strong>
                          </button>
                        `
                      )
                      .join("")}
                  </div>`
                : ""
            }
          </div>
        `;
      }
    )
    .join("");

  pageListElement.innerHTML = "";
  pageListElement.hidden = true;
}

function chapterIndexLabel(chapterId, pageIndex) {
  return `${getChapterIndex(chapterId) + 1}.${pageIndex + 1}`;
}

export function getAdjacentReaderPage(chapterId, pageIndex, offset) {
  const chapterList = BOOK_CHAPTERS;
  let chapterIndex = getChapterIndex(chapterId);
  let nextPageIndex = pageIndex + offset;

  while (chapterIndex >= 0 && chapterIndex < chapterList.length) {
    const chapter = chapterList[chapterIndex];
    const pages = getRenderablePages(chapter);

    if (nextPageIndex < 0) {
      if (chapterIndex === 0) {
        return { chapterId, pageIndex };
      }
      chapterIndex -= 1;
      nextPageIndex = getRenderablePages(chapterList[chapterIndex]).length - 1;
      continue;
    }

    if (nextPageIndex >= pages.length) {
      if (chapterIndex === chapterList.length - 1) {
        return { chapterId, pageIndex };
      }
      chapterIndex += 1;
      nextPageIndex = 0;
      continue;
    }

    return { chapterId: chapter.id, pageIndex: nextPageIndex };
  }

  return { chapterId, pageIndex };
}

export function renderReader({ dom, state, chapter, page, symbols, selectedSymbol }) {
  const pages = getRenderablePages(chapter);
  const chapterIndex = getChapterIndex(chapter.id);
  document.title = `${page.title} — Animated ML Book`;

  dom.chapterHero.innerHTML = `
    <div class="chapter-breadcrumb">
      <span>第 ${chapterIndex + 1} 章</span>
      <span aria-hidden="true">/</span>
      <span>${chapter.title}</span>
    </div>
    <h1>${page.title}</h1>
    <p class="chapter-lead">${page.summary || page.coreIdea || chapter.blurb}</p>
  `;

  dom.readerProgress.innerHTML = `
    <span class="sr-only">${page.title}</span>
    <span>第 ${state.pageIndex + 1} / ${pages.length} 节</span>
    <div class="reader-progress-bar">
      <span style="width:${((state.pageIndex + 1) / pages.length) * 100}%"></span>
    </div>
  `;

  dom.chapterBody.innerHTML = `
    ${renderReaderOpeningQuestion(page)}
    ${renderReaderCoreContent(page)}
    ${renderReaderSections(page)}
    ${renderNotebookFormulaCards({ page, selectedSymbol, symbols })}
    ${renderReaderDiagramNotes(page)}
    ${renderNotebookBridge(page)}
    ${renderReaderWalkthrough(page)}
    ${renderReaderTakeaways(page)}
    ${renderReaderCallout(page)}
    ${renderReaderMiniQuiz(page)}
    ${renderReaderObservationSection(page)}
    ${renderReaderAppendix(page)}
    ${renderReaderChapterSummaryDetail(page)}
  `;

  const sectionHeadings = [...dom.chapterBody.querySelectorAll(":scope > section > h3")];
  const usedIds = new Set();
  const tocItems = sectionHeadings.slice(0, 8).map((heading, index) => {
    const baseId = `${page.id}-section-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    heading.id = id;
    return { id, label: heading.textContent.trim() };
  });
  if (dom.sectionToc) {
    dom.sectionToc.innerHTML = tocItems.length
      ? tocItems.map((item) => `<a href="#${item.id}">${item.label}</a>`).join("")
      : `<span>本页为交互式总结</span>`;
  }

  const notebookMount = dom.chapterBody.querySelector("#notebookMount");
  if (dom.storyGrid) {
    dom.storyGrid.classList.remove("notebook-embedded");
    dom.storyGrid.classList.add("story-grid-detached");
  }
  if (notebookMount && dom.storyGrid) {
    dom.storyGrid.classList.add("notebook-embedded");
    dom.storyGrid.classList.remove("story-grid-detached");
    notebookMount.replaceChildren(dom.storyGrid);
  } else if (!notebookMount && dom.storyGrid && dom.pageShell) {
    dom.pageShell.appendChild(dom.storyGrid);
  }

  const previousLocation = getAdjacentReaderPage(state.chapterId, state.pageIndex, -1);
  const nextLocation = getAdjacentReaderPage(state.chapterId, state.pageIndex, 1);
  const isFirst = previousLocation.chapterId === state.chapterId && previousLocation.pageIndex === state.pageIndex;
  const isLast = nextLocation.chapterId === state.chapterId && nextLocation.pageIndex === state.pageIndex;

  const previousPage = getRenderablePages(getChapterById(previousLocation.chapterId))[previousLocation.pageIndex];
  const nextPage = getRenderablePages(getChapterById(nextLocation.chapterId))[nextLocation.pageIndex];
  if (dom.previousPageLabel) {
    dom.previousPageLabel.textContent = isFirst ? "已经是第一节" : previousPage?.title ?? "上一节";
  }
  if (dom.nextPageLabel) {
    dom.nextPageLabel.textContent = isLast ? "已经是最后一节" : nextPage?.title ?? "下一节";
  }

  dom.pagePrevButton.disabled = state.loading || isFirst;
  dom.pageNextButton.disabled = state.loading || isLast;
  dom.pageTurnerBar?.classList.toggle("is-disabled", state.loading || (isFirst && isLast));
}
