import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatPageList,
  NNDL_CHAPTER_TARGETS,
  NNDL_SOURCE_PDF,
  NNDL_SOURCE_TITLE,
} from "./nndl-manifest.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHAPTERS_DIR = path.join(ROOT_DIR, "content", "chapters");
const SOURCE_DIR = path.join(ROOT_DIR, "content", "source", "nndl");
const OUTPUT_DIR = path.join(ROOT_DIR, "content", "drafts", "nndl");

function titleStem(title = "") {
  return title.replace(/^\d+\.\s*/, "").trim();
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
}

function compactText(text = "", maxLength = 180) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "";
  }
  return compact.length > maxLength ? `${compact.slice(0, maxLength - 1).trim()}…` : compact;
}

function parseSourceMarkdown(markdown) {
  const pageMap = new Map();
  const sections = markdown.split(/^## PDF page (\d+)\n\n/gm);

  for (let index = 1; index < sections.length; index += 2) {
    const pageNumber = Number(sections[index]);
    const body = sections[index + 1]?.trim() ?? "";
    if (Number.isFinite(pageNumber) && body) {
      pageMap.set(pageNumber, body);
    }
  }

  return pageMap;
}

function buildOpeningQuestion(page) {
  const stem = titleStem(page.title);
  if (!stem) {
    return "这页最值得先问的问题是什么？";
  }
  return /[？?]$/.test(stem) ? stem : `${stem}？`;
}

function buildWalkthrough(page) {
  const sectionTitles = (Array.isArray(page.sections) ? page.sections : []).map((section) => section.title);
  return uniqueStrings([...(page.observe ?? []), ...sectionTitles]).slice(0, 4);
}

function buildVocabulary(page) {
  const entries = [];
  (page.formulas ?? []).forEach((formula) => {
    if (formula.label) {
      entries.push({ term: formula.label, meaning: formula.explanation ?? "" });
    }
  });
  (page.principles ?? []).forEach((principle) => {
    if (principle.title) {
      entries.push({ term: principle.title, meaning: principle.body ?? "" });
    }
  });

  const seen = new Set();
  return entries.filter((entry) => {
    const key = entry.term.trim();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, 6);
}

function buildMisconceptions(page) {
  const misconceptions = [];
  if (page.callout?.body) {
    misconceptions.push({
      myth: `只要记住「${titleStem(page.title)}」的定义就够了。`,
      correction: page.callout.body,
    });
  }
  if (page.takeaways?.[0]) {
    misconceptions.push({
      myth: "只看最终结果，不需要对照图和公式。",
      correction: page.takeaways[0],
    });
  }
  return misconceptions.slice(0, 2);
}

function buildFigureCaption(page) {
  const focus = page.observe?.[0] ?? page.summary ?? page.experimentPrompt ?? "";
  const stem = titleStem(page.title);
  if (!stem) {
    return focus;
  }
  return focus ? `${stem}：${focus}` : stem;
}

function buildDiagram(page, section) {
  return {
    focus: page.observe?.[0] ?? page.summary ?? "",
    caption: buildFigureCaption(page),
    sourcePages: section.pages,
  };
}

function buildFurtherInspection(page) {
  return uniqueStrings([...(page.observe ?? []), page.experimentPrompt]).slice(0, 5);
}

function buildSourceNotes(target, section, sourcePageMap) {
  return {
    sourcePdf: NNDL_SOURCE_PDF,
    sourceTitle: NNDL_SOURCE_TITLE,
    sourceFile: `content/source/nndl/${target.id}.md`,
    pages: section.pages,
    rationale: section.rationale,
    excerpts: section.pages
      .map((pageNumber) => ({
        page: pageNumber,
        text: compactText(sourcePageMap.get(pageNumber) ?? ""),
      }))
      .filter((entry) => entry.text),
  };
}

function buildDraftPage(target, page, section, sourcePageMap) {
  return {
    ...page,
    readingMode: "book-first",
    openingQuestion: buildOpeningQuestion(page),
    coreIdea: page.summary || page.paragraphs?.[0] || titleStem(page.title),
    figureCaption: buildFigureCaption(page),
    walkthrough: buildWalkthrough(page),
    vocabulary: buildVocabulary(page),
    misconceptions: buildMisconceptions(page),
    diagram: buildDiagram(page, section),
    furtherInspection: buildFurtherInspection(page),
    sourceNotes: buildSourceNotes(target, section, sourcePageMap),
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const target of NNDL_CHAPTER_TARGETS) {
    const chapterPath = path.join(CHAPTERS_DIR, target.id, "chapter.json");
    const sourcePath = path.join(SOURCE_DIR, `${target.id}.md`);
    const chapter = await readJson(chapterPath);
    const sourceMarkdown = await readFile(sourcePath, "utf8");
    const sourcePageMap = parseSourceMarkdown(sourceMarkdown);
    const chapterPagesById = new Map((chapter.pages ?? []).map((page) => [page.id, page]));

    const pages = target.sections.map((section) => {
      const page = chapterPagesById.get(section.id);
      if (!page) {
        throw new Error(`Chapter ${target.id} is missing page ${section.id}`);
      }
      return buildDraftPage(target, page, section, sourcePageMap);
    });

    const draft = {
      ...chapter,
      readingMode: "book-first",
      sourceNotes: {
        sourcePdf: NNDL_SOURCE_PDF,
        sourceTitle: NNDL_SOURCE_TITLE,
        sourceFile: `content/source/nndl/${target.id}.md`,
        chapterPages: target.chapterRange,
        chapterPageList: formatPageList(target.chapterRange),
        sectionMappings: target.sections.map((section) => ({
          id: section.id,
          title: section.title,
          pages: section.pages,
          rationale: section.rationale,
        })),
      },
      pages,
    };

    const outputPath = path.join(OUTPUT_DIR, `${target.id}.json`);
    await writeFile(outputPath, `${JSON.stringify(draft, null, 2)}\n`, "utf8");
    console.log(`Built ${target.id} draft -> ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
