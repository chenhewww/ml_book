import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  formatPageList,
  NNDL_CHAPTER_TARGETS,
  NNDL_SOURCE_PDF,
  NNDL_SOURCE_TITLE,
} from "./nndl-manifest.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "content", "source", "nndl");
const PDF_PATH = path.join(ROOT_DIR, NNDL_SOURCE_PDF);

function dedupeNumbers(values) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function normalizePageText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/([\u3400-\u9fff])\s+(?=[\u3400-\u9fff])/g, "$1")
    .replace(/([\u3400-\u9fff])\s+([，。！？；：、）】》」])/g, "$1$2")
    .replace(/([（【《「])\s+([\u3400-\u9fff])/g, "$1$2")
    .replace(/([A-Za-z0-9])\s+([，。！？；：、])/g, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractPageText(pdf, pageNumber) {
  const page = await pdf.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const items = textContent.items.filter((item) => typeof item.str === "string" && item.str.trim());
  const rows = [];

  items.forEach((item) => {
    const y = Number(item.transform?.[5] ?? 0);
    const text = item.str.trim();
    const lastRow = rows.at(-1);
    if (lastRow && Math.abs(lastRow.y - y) < 2) {
      lastRow.parts.push(text);
      return;
    }
    rows.push({ y, parts: [text] });
  });

  const text = rows
    .map((row) => row.parts.join(" ").trim())
    .filter(Boolean)
    .join("\n");

  return normalizePageText(text);
}

function renderSourceMarkdown(target, pageTextMap) {
  const pageList = formatPageList(target.chapterRange);
  const mapping = target.sections
    .map(
      (section) => `### ${section.id} — ${section.title}\n- PDF pages: ${formatPageList(section.pages)}\n- Why this mapping: ${section.rationale}`
    )
    .join("\n\n");

  const extractedPages = dedupeNumbers(target.chapterRange)
    .map((pageNumber) => {
      const text = pageTextMap.get(pageNumber) ?? "";
      return `## PDF page ${pageNumber}\n\n${text}`.trim();
    })
    .join("\n\n");

  return `---
title: ${target.title}
chapterId: ${target.id}
sourcePdf: ${NNDL_SOURCE_PDF}
sourceTitle: ${NNDL_SOURCE_TITLE}
chapterPages: ${pageList}
generatedAt: ${new Date().toISOString()}
---

# ${target.title}

- Source PDF: ${NNDL_SOURCE_PDF}
- Source title: ${NNDL_SOURCE_TITLE}
- Extracted chapter pages: ${pageList}
- Purpose: ${target.description}

## Site page mapping

${mapping}

## Extracted PDF text

${extractedPages}
`;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const pdf = await getDocument(PDF_PATH).promise;

  for (const target of NNDL_CHAPTER_TARGETS) {
    const pageTextMap = new Map();
    for (const pageNumber of dedupeNumbers(target.chapterRange)) {
      pageTextMap.set(pageNumber, await extractPageText(pdf, pageNumber));
    }

    const outputPath = path.join(OUTPUT_DIR, `${target.id}.md`);
    await writeFile(outputPath, `${renderSourceMarkdown(target, pageTextMap)}\n`, "utf8");
    console.log(`Extracted ${target.id} -> ${outputPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
