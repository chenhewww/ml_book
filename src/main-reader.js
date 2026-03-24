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
      (chapter) => `
        <button class="chapter-chip${chapter.id === chapterId ? " active" : ""}" data-chapter-id="${chapter.id}" type="button">
          <strong>${chapter.title}</strong>
          <small>${chapter.subtitle}</small>
        </button>
      `
    )
    .join("");

  pageListElement.innerHTML = pages
    .map(
      (page, index) => `
        <button class="page-chip${index === pageIndex ? " active" : ""}" data-page-index="${index}" type="button">
          <span>${index + 1}</span>
          <strong>${page.title}</strong>
        </button>
      `
    )
    .join("");
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

  dom.chapterHero.innerHTML = `
    <p class="chapter-kicker">第 ${chapterIndex + 1} 章</p>
    <h2>${chapter.title}</h2>
    <p class="chapter-subtitle">${chapter.subtitle}</p>
    <p class="chapter-blurb">${chapter.blurb}</p>
  `;

  dom.readerProgress.innerHTML = `
    <div class="reader-progress-copy">
      <strong>当前页：${page.title}</strong>
      <span>第 ${state.pageIndex + 1} / ${pages.length} 页</span>
    </div>
    <div class="reader-progress-bar">
      <span style="width:${((state.pageIndex + 1) / pages.length) * 100}%"></span>
    </div>
  `;

  dom.chapterBody.innerHTML = `
    ${renderReaderOpeningQuestion(page)}
    ${renderReaderCoreContent(page)}
    ${renderReaderDiagramNotes(page)}
    ${renderNotebookBridge(page)}
    ${renderReaderWalkthrough(page)}
    ${renderReaderSections(page)}
    ${renderNotebookFormulaCards({ page, selectedSymbol, symbols })}
    ${renderReaderTakeaways(page)}
    ${renderReaderCallout(page)}
    ${renderReaderMiniQuiz(page)}
    ${renderReaderObservationSection(page)}
    ${renderReaderAppendix(page)}
    ${renderReaderChapterSummaryDetail(page)}
  `;

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

  dom.pagePrevButton.disabled = state.loading || isFirst;
  dom.pageNextButton.disabled = state.loading || isLast;
  dom.pageTurnerBar?.classList.toggle("is-disabled", state.loading || (isFirst && isLast));
}
