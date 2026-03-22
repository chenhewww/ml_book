import { BOOK_CHAPTERS as GENERATED_BOOK_CHAPTERS } from "../generated/book-content.generated.js";

export const BOOK_CHAPTERS = GENERATED_BOOK_CHAPTERS;

const CHAPTER_MAP = new Map(BOOK_CHAPTERS.map((chapter) => [chapter.id, chapter]));

export function getChapterById(chapterId) {
  return CHAPTER_MAP.get(chapterId) ?? BOOK_CHAPTERS[0];
}

export function getChapterIndex(chapterId) {
  return BOOK_CHAPTERS.findIndex((chapter) => chapter.id === chapterId);
}

export function getAdjacentPage(chapterId, pageId, offset) {
  const chapterIndex = getChapterIndex(chapterId);
  if (chapterIndex === -1) {
    return null;
  }

  let nextChapterIndex = chapterIndex;
  let nextPageIndex = BOOK_CHAPTERS[chapterIndex].pages.findIndex((page) => page.id === pageId) + offset;

  while (nextChapterIndex >= 0 && nextChapterIndex < BOOK_CHAPTERS.length) {
    const chapter = BOOK_CHAPTERS[nextChapterIndex];
    if (nextPageIndex < 0) {
      nextChapterIndex -= 1;
      if (nextChapterIndex < 0) {
        return null;
      }
      nextPageIndex = BOOK_CHAPTERS[nextChapterIndex].pages.length - 1;
      continue;
    }

    if (nextPageIndex >= chapter.pages.length) {
      nextChapterIndex += 1;
      if (nextChapterIndex >= BOOK_CHAPTERS.length) {
        return null;
      }
      nextPageIndex = 0;
      continue;
    }

    return {
      chapterId: BOOK_CHAPTERS[nextChapterIndex].id,
      pageId: BOOK_CHAPTERS[nextChapterIndex].pages[nextPageIndex].id,
      pageIndex: nextPageIndex,
    };
  }

  return null;
}
