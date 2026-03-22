import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BOOK_CHAPTERS } from "../src/book-content.js";
import { normalizeChapters } from "../src/content/schema.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT_DIR, "content", "chapters");

async function main() {
  const chapters = normalizeChapters(BOOK_CHAPTERS);
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const chapter of chapters) {
    const chapterDir = path.join(OUTPUT_DIR, chapter.id);
    await mkdir(chapterDir, { recursive: true });
    await writeFile(path.join(chapterDir, "chapter.json"), `${JSON.stringify(chapter, null, 2)}\n`, "utf8");
  }

  console.log(`Migrated ${chapters.length} chapters into ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
