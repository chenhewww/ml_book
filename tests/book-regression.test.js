import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "playwright";
import { createAppServer } from "../server/app.js";
import { HOST } from "../server/config.js";

const VIEWPORT = { width: 1440, height: 1800 };

let browser;
let server;
let baseUrl;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function quoteAttribute(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

async function waitForAppReady(page, { chapterTitle = null, pageTitle = null } = {}) {
  await page.waitForFunction(
    ({ chapterTitle, pageTitle }) => {
      const isReady = document.querySelector("#backendStatus")?.classList.contains("ready");
      const hasNavigation = document.querySelector("#chapterList")?.children.length && document.querySelector("#pageList")?.children.length;
      const hasFocusGuide = (document.querySelector("#focusGuide")?.textContent ?? "").trim().length > 0;
      const hasPlot = document.querySelector("#plot")?.childElementCount > 0;
      if (!isReady || !hasNavigation || !hasFocusGuide || !hasPlot) {
        return false;
      }
      if (chapterTitle && !(document.querySelector("#chapterHero")?.textContent ?? "").includes(chapterTitle)) {
        return false;
      }
      if (pageTitle && !(document.querySelector("#readerProgress")?.textContent ?? "").includes(pageTitle)) {
        return false;
      }
      return true;
    },
    { chapterTitle, pageTitle }
  );
}

async function withBookPage(t, run) {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  t.after(async () => {
    await context.close();
  });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  await run(page);
}

async function openReaderPage(page, chapterTitle, pageTitle) {
  const currentChapter = (await page.locator("#chapterHero").textContent()) ?? "";
  if (!currentChapter.includes(chapterTitle)) {
    await page.locator("#chapterList").getByRole("button", { name: new RegExp(escapeRegex(chapterTitle)) }).click();
    await waitForAppReady(page, { chapterTitle });
  }

  const currentPage = (await page.locator("#readerProgress").textContent()) ?? "";
  if (!currentPage.includes(pageTitle)) {
    await page.waitForFunction(
      (targetTitle) => Array.from(document.querySelectorAll("#pageList button")).some((button) => (button.textContent ?? "").includes(targetTitle)),
      pageTitle
    );
    await page.locator("#pageList").getByRole("button", { name: new RegExp(escapeRegex(pageTitle)) }).click();
  }

  await waitForAppReady(page, { chapterTitle, pageTitle });
}

async function openNotebookPanel(page, target) {
  const selectorMap = {
    flow: "#flowPanel",
    trace: "#tracePanel",
    stats: "#statsPanel",
  };

  await page.locator(`[data-notebook-target=${quoteAttribute(target)}]`).click();

  if (selectorMap[target]) {
    await page.waitForFunction((selector) => document.querySelector(selector)?.open === true, selectorMap[target]);
  }
}

async function assertPanelAnchorVisible(page, selector) {
  await page.waitForFunction((selector) => {
    const target = document.querySelector(selector);
    if (!target) {
      return false;
    }

    const targetRect = target.getBoundingClientRect();
    const barRect = document.querySelector(".page-turner-bar")?.getBoundingClientRect() ?? null;
    const overlap = barRect
      ? Math.min(targetRect.bottom, barRect.bottom) - Math.max(targetRect.top, barRect.top)
      : 0;

    return targetRect.top >= 0 && targetRect.bottom <= window.innerHeight && overlap <= 0;
  }, selector);

  const metrics = await page.evaluate((selector) => {
    const target = document.querySelector(selector);
    const bar = document.querySelector(".page-turner-bar");
    if (!target) {
      return null;
    }

    const targetRect = target.getBoundingClientRect();
    const barRect = bar?.getBoundingClientRect() ?? null;
    return {
      targetTop: targetRect.top,
      targetBottom: targetRect.bottom,
      viewportHeight: window.innerHeight,
      barTop: barRect?.top ?? null,
      barBottom: barRect?.bottom ?? null,
    };
  }, selector);

  assert.ok(metrics, `Missing anchor for ${selector}`);
  assert.ok(metrics.targetTop >= 0, `${selector} should be visible after jump`);
  assert.ok(metrics.targetBottom <= metrics.viewportHeight, `${selector} should fit inside the viewport after jump`);
  if (metrics.barTop !== null && metrics.barBottom !== null) {
    const overlap = Math.min(metrics.targetBottom, metrics.barBottom) - Math.max(metrics.targetTop, metrics.barTop);
    assert.ok(overlap <= 0, `Sticky page turner occludes ${selector}`);
  }
}

async function openCorePanels(page) {
  await openNotebookPanel(page, "flow");
  await page.waitForFunction(() => (document.querySelector("#flowDiagram")?.textContent ?? "").trim().length > 0);
  await assertPanelAnchorVisible(page, "#flowPanel > summary");

  await openNotebookPanel(page, "trace");
  await page.waitForFunction(() => (document.querySelector("#traceList")?.textContent ?? "").trim().length > 0);
  await assertPanelAnchorVisible(page, "#tracePanel > summary");

  await openNotebookPanel(page, "stats");
  await page.waitForFunction(() => (document.querySelector("#statsGrid")?.textContent ?? "").trim().length > 0);
  await assertPanelAnchorVisible(page, "#statsPanel > summary");
}

async function assertNoDocumentOverflow(page) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      clientWidth: doc.clientWidth,
      scrollWidth: doc.scrollWidth,
    };
  });

  assert.ok(
    metrics.scrollWidth <= metrics.clientWidth + 2,
    `Expected no horizontal page overflow, got scrollWidth=${metrics.scrollWidth}, clientWidth=${metrics.clientWidth}`
  );
}

async function assertNoKeyOverlap(page, selectors) {
  const rects = await page.evaluate((selectors) => {
    return selectors
      .map((selector) => {
        const element = document.querySelector(selector);
        if (!element) {
          return null;
        }
        const rect = element.getBoundingClientRect();
        return {
          selector,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter(Boolean);
  }, selectors);

  const overlaps = [];
  for (let index = 0; index < rects.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < rects.length; otherIndex += 1) {
      const left = Math.max(rects[index].left, rects[otherIndex].left);
      const right = Math.min(rects[index].right, rects[otherIndex].right);
      const top = Math.max(rects[index].top, rects[otherIndex].top);
      const bottom = Math.min(rects[index].bottom, rects[otherIndex].bottom);
      if (right - left > 4 && bottom - top > 4) {
        overlaps.push([rects[index].selector, rects[otherIndex].selector]);
      }
    }
  }

  assert.deepEqual(overlaps, [], `Expected key surfaces not to overlap, found ${JSON.stringify(overlaps)}`);
}

async function setTraceFilter(page, value) {
  await page.locator(`#traceFilterButtons [data-trace-filter=${quoteAttribute(value)}]`).click();
  await page.waitForFunction((value) => document.querySelector("#traceFilterButtons .active")?.dataset.traceFilter === value, value);
}

async function assertActiveTraceIndex(page, traceIndex) {
  await page.waitForFunction(
    (traceIndex) => document.querySelector("#traceList .trace-card.active")?.dataset.traceIndex === String(traceIndex),
    traceIndex
  );
}

async function clickFlowNode(page, traceIndex) {
  await page.locator(`#flowDiagram [data-trace-index=${quoteAttribute(traceIndex)}]`).click();
  await assertActiveTraceIndex(page, traceIndex);
}

async function clickSymbolChip(page, symbolKey) {
  await page.locator(`[data-symbol-key=${quoteAttribute(symbolKey)}]`).click();
  await page.waitForFunction(
    (symbolKey) => document.querySelector(`[data-symbol-key=${CSS.escape(symbolKey)}].active`) !== null,
    symbolKey
  );
}

async function assertFocusGuideContains(page, text) {
  await page.waitForFunction((text) => (document.querySelector("#focusGuide")?.textContent ?? "").includes(text), text);
}

test.before(async () => {
  server = createAppServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, HOST, resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object" && "port" in address, "Server should expose a port");
  baseUrl = `http://${HOST}:${address.port}`;
  browser = await chromium.launch();
});

test.after(async () => {
  await browser?.close();
  await new Promise((resolve, reject) => {
    server?.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
});

test("linear opening page keeps the book shell stable", async (t) => {
  await withBookPage(t, async (page) => {
    await openReaderPage(page, "第 1 章 线性回归", "1. 为什么从一条线开始");
    await openCorePanels(page);
    await page.locator("#plotPanel").scrollIntoViewIfNeeded();
    await assertNoDocumentOverflow(page);
    await assertNoKeyOverlap(page, ["#focusGuide", "#plot", "#liveFormulaBoard", "#flowPanel", "#tracePanel", "#statsPanel"]);
  });
});

test("cnn convolution page keeps flow, trace, and symbol focus aligned", async (t) => {
  await withBookPage(t, async (page) => {
    await openReaderPage(page, "第 2 章 CNN", "2. convolution 到底在算什么");
    await openCorePanels(page);
    await setTraceFilter(page, "all");
    await clickFlowNode(page, 3);
    await clickSymbolChip(page, "V_{a,b}");
    await assertFocusGuideContains(page, "更新前后 kernel 差异");
    await assertFocusGuideContains(page, "V_{a,b}");
    await assertNoDocumentOverflow(page);
  });
});

test("rnn LSTM flow page keeps gated-memory focus readable", async (t) => {
  await withBookPage(t, async (page) => {
    await openReaderPage(page, "第 3 章 RNN", "7. 一次 LSTM 更新里，门控和状态怎么配合");
    await openCorePanels(page);
    await clickSymbolChip(page, "c_t");
    await assertFocusGuideContains(page, "更新前后状态滚动");
    await assertFocusGuideContains(page, "c_t");
    await assertNoDocumentOverflow(page);
  });
});

test("resnet gradient page keeps flow selection synced to the trace", async (t) => {
  await withBookPage(t, async (page) => {
    await openReaderPage(page, "第 4 章 ResNet", "4. 残差块里的梯度在往哪里走");
    await openCorePanels(page);
    await setTraceFilter(page, "all");
    await clickFlowNode(page, 4);
    await assertNoDocumentOverflow(page);
  });
});

test("transformer qkv page survives long attention formulas without overflow", async (t) => {
  await withBookPage(t, async (page) => {
    await openReaderPage(page, "第 5 章 Transformer", "2. query / key / value 是怎么配合的");
    await openCorePanels(page);
    await clickSymbolChip(page, "q_i");
    await assertFocusGuideContains(page, "Q / K / V 与当前 query 行");
    await assertFocusGuideContains(page, "q_i");
    await assertNoDocumentOverflow(page);
  });
});

test("transformer block page keeps block focus and layout stable", async (t) => {
  await withBookPage(t, async (page) => {
    await openReaderPage(page, "第 5 章 Transformer", "6. 一个 Transformer block 为什么不只有 attention");
    await openCorePanels(page);
    await setTraceFilter(page, "all");
    await clickFlowNode(page, 4);
    await clickSymbolChip(page, "LN");
    await assertFocusGuideContains(page, "第一次残差与 LayerNorm");
    await assertFocusGuideContains(page, "LN");
    await assertNoDocumentOverflow(page);
  });
});

test("transformer lab page keeps stage-linked flow, focus, and formula aligned", async (t) => {
  await withBookPage(t, async (page) => {
    await openReaderPage(page, "第 5 章 Transformer", "8. 动手实验：盯住一个 token，完整走一遍 block");
    await openCorePanels(page);
    await setTraceFilter(page, "all");
    await clickFlowNode(page, 2);
    await assertFocusGuideContains(page, "Mask、权重与注意力输出");
    await page.waitForFunction(
      () => (document.querySelector("#liveFormulaBoard")?.textContent ?? "").includes("注意力混合与第一次残差")
        && (document.querySelector("#liveFormulaBoard")?.textContent ?? "").includes("attn")
    );
    await assertNoDocumentOverflow(page);
    await assertNoKeyOverlap(page, ["#focusGuide", "#plot", "#liveFormulaBoard", "#flowPanel", "#tracePanel", "#statsPanel"]);
  });
});

test("transformer lab page keeps the next-step button stable while stepping", async (t) => {
  await withBookPage(t, async (page) => {
    await openReaderPage(page, "第 5 章 Transformer", "8. 动手实验：盯住一个 token，完整走一遍 block");
    await page.locator(".story-controls-summary").click();
    await page.waitForFunction(() => document.querySelector("#nextButton") !== null);
    await page.evaluate(() => {
      const button = document.querySelector("#nextButton");
      const top = button.getBoundingClientRect().top + window.scrollY - window.innerHeight + 80;
      window.scrollTo({ top: Math.max(0, top) });
    });
    await page.waitForTimeout(200);

    const positions = [];
    for (let index = 0; index < 4; index += 1) {
      const position = await page.evaluate(() => {
        const button = document.querySelector("#nextButton").getBoundingClientRect();
        const bar = document.querySelector(".page-turner-bar")?.getBoundingClientRect() ?? null;
        return {
          top: button.top,
          bottom: button.bottom,
          left: button.left,
          width: button.width,
          height: button.height,
          scrollY: window.scrollY,
          barTop: bar?.top ?? null,
          barBottom: bar?.bottom ?? null,
        };
      });
      positions.push(position);
      if (position.barTop !== null && position.barBottom !== null) {
        const overlap = Math.min(position.bottom, position.barBottom) - Math.max(position.top, position.barTop);
        assert.ok(overlap <= 0, `Sticky page turner occludes #nextButton at step ${index + 1}`);
      }
      await page.mouse.click(position.left + position.width / 2, position.top + position.height / 2);
      await page.waitForTimeout(120);
    }

    const topDrift = Math.max(...positions.map((position) => position.top)) - Math.min(...positions.map((position) => position.top));
    const scrollDrift = Math.max(...positions.map((position) => position.scrollY)) - Math.min(...positions.map((position) => position.scrollY));
    assert.ok(topDrift <= 24, `Expected next-step button top drift <= 24px, got ${topDrift}`);
    assert.ok(scrollDrift <= 4, `Expected no page scroll drift while stepping, got ${scrollDrift}`);
  });
});
