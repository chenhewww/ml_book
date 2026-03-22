import {
  getDefaultTraceIndex as getTeachingDefaultTraceIndex,
  getSelectedTrace as getTeachingSelectedTrace,
  renderTeachingPanel,
} from "./teaching-panel.js";
import { BOOK_CHAPTERS, getChapterById, getChapterIndex } from "./book-content.js";
import { getFormulaSymbol, getFormulaSymbolsForPage } from "./formula-symbols.js";
import { renderPlot } from "./plots/index.js";
import { renderFlow, renderFocusGuide, renderStats, renderTrace } from "./ui/debug-panels.js";
import {
  buildChapterSummaryPage as buildSummaryPage,
  renderBookSections as renderReaderSections,
  renderCallout as renderReaderCallout,
  renderChapterSummaryDetail as renderReaderChapterSummaryDetail,
  renderMiniQuiz as renderReaderMiniQuiz,
  renderObservationSection as renderReaderObservationSection,
  renderPrinciples as renderReaderPrinciples,
  renderTakeaways as renderReaderTakeaways,
} from "./reader/renderers.js";
import {
  renderFormulaCards as renderNotebookFormulaCards,
  renderLiveFormulaBoard as renderNotebookFormulaBoard,
  renderNotebookBridge,
  renderNotebookContext as renderNotebookContextPanel,
} from "./notebook/renderers.js";
import { describeVisualFocus, getStepBoundTrace } from "./notebook/focus.js";

const state = {
  metadata: null,
  chapterId: BOOK_CHAPTERS[0].id,
  pageIndex: 0,
  algorithmId: BOOK_CHAPTERS[0].algorithmId,
  datasetId: null,
  language: "zh",
  learningRate: 0.12,
  trackedSampleId: null,
  customDataset: null,
  customDatasetActive: false,
  customDatasetDirty: false,
  traceCollapsed: false,
  traceFilter: "all",
  teachingTab: "intuition",
  snapshots: [],
  dataset: [],
  currentStep: 0,
  selectedTraceIndex: 0,
  selectedFormulaSymbol: null,
  sidebarCollapsed: window.matchMedia("(max-width: 1180px)").matches,
  autoplayHandle: null,
  loading: false,
};

const dom = {
  pageShell: document.querySelector("#pageShell"),
  sidebarToggleButton: document.querySelector("#sidebarToggleButton"),
  chapterList: document.querySelector("#chapterList"),
  pageList: document.querySelector("#pageList"),
  chapterHero: document.querySelector("#chapterHero"),
  chapterBody: document.querySelector("#chapterBody"),
  readerProgress: document.querySelector("#readerProgress"),
  pagePrevButton: document.querySelector("#pagePrevButton"),
  pageNextButton: document.querySelector("#pageNextButton"),
  storyGrid: document.querySelector("#storyGrid"),
  plotPanel: document.querySelector("#plotPanel"),
  flowPanel: document.querySelector("#flowPanel"),
  tracePanel: document.querySelector("#tracePanel"),
  statsPanel: document.querySelector("#statsPanel"),
  liveFormulaBoard: document.querySelector("#liveFormulaBoard"),
  languageSelect: document.querySelector("#languageSelect"),
  datasetSelect: document.querySelector("#datasetSelect"),
  learningRateInput: document.querySelector("#learningRateInput"),
  learningRateValue: document.querySelector("#learningRateValue"),
  presetButtons: document.querySelector("#presetButtons"),
  sampleSelect: document.querySelector("#sampleSelect"),
  downloadMermaidButton: document.querySelector("#downloadMermaidButton"),
  customDatasetInput: document.querySelector("#customDatasetInput"),
  customDatasetHint: document.querySelector("#customDatasetHint"),
  importDatasetButton: document.querySelector("#importDatasetButton"),
  resetDatasetButton: document.querySelector("#resetDatasetButton"),
  prevButton: document.querySelector("#prevButton"),
  nextButton: document.querySelector("#nextButton"),
  playPauseButton: document.querySelector("#playPauseButton"),
  resetButton: document.querySelector("#resetButton"),
  timelineRange: document.querySelector("#timelineRange"),
  stepCounter: document.querySelector("#stepCounter"),
  plot: document.querySelector("#plot"),
  focusGuide: document.querySelector("#focusGuide"),
  phaseBadge: document.querySelector("#phaseBadge"),
  datasetMeta: document.querySelector("#datasetMeta"),
  flowDiagram: document.querySelector("#flowDiagram"),
  traceList: document.querySelector("#traceList"),
  traceFilterButtons: document.querySelector("#traceFilterButtons"),
  traceToggleButton: document.querySelector("#traceToggleButton"),
  teachingTabs: document.querySelector("#teachingTabs"),
  teachingPanel: document.querySelector("#teachingPanel"),
  statsGrid: document.querySelector("#statsGrid"),
  predictionValue: document.querySelector("#predictionValue"),
  targetValue: document.querySelector("#targetValue"),
  lossValue: document.querySelector("#lossValue"),
  backendStatus: document.querySelector("#backendStatus"),
};

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

function setBackendStatus(message, variant = "") {
  dom.backendStatus.textContent = message;
  dom.backendStatus.className = `status-banner${variant ? ` ${variant}` : ""}`;
}

function renderSidebarState() {
  dom.pageShell.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  dom.sidebarToggleButton.textContent = state.sidebarCollapsed ? "展开目录与实验台" : "收起目录与实验台";
  dom.sidebarToggleButton.setAttribute("aria-expanded", String(!state.sidebarCollapsed));
}

function isTypingTarget(target) {
  if (!target) {
    return false;
  }
  const tagName = target.tagName?.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function getSafeCurrentStep() {
  if (!state.snapshots.length) {
    state.currentStep = 0;
    return 0;
  }
  const nextStep = Number.isFinite(state.currentStep) ? Math.trunc(state.currentStep) : 0;
  state.currentStep = Math.min(Math.max(nextStep, 0), state.snapshots.length - 1);
  return state.currentStep;
}

function getCurrentChapter() {
  return getChapterById(state.chapterId);
}

function getRenderablePages(chapter = getCurrentChapter()) {
  return [...chapter.pages, buildSummaryPage(chapter, getChapterIndex(chapter.id))];
}

function getCurrentRenderablePages() {
  return getRenderablePages(getCurrentChapter());
}

function getCurrentPage() {
  return getCurrentRenderablePages()[state.pageIndex] ?? getCurrentRenderablePages()[0];
}

function clampPageIndex(chapterId, pageIndex) {
  const chapter = getChapterById(chapterId);
  const pages = getRenderablePages(chapter);
  return Math.min(Math.max(pageIndex, 0), Math.max(pages.length - 1, 0));
}

function getCurrentPageSymbols() {
  return getFormulaSymbolsForPage(getCurrentPage(), state.algorithmId);
}

function getSelectedFormulaSymbol() {
  return getFormulaSymbol(getCurrentPage(), state.algorithmId, state.selectedFormulaSymbol);
}

function ensureSelectedFormulaSymbol() {
  const symbols = getCurrentPageSymbols();
  if (!symbols.length) {
    state.selectedFormulaSymbol = null;
    return null;
  }
  if (!symbols.some((symbol) => symbol.key === state.selectedFormulaSymbol)) {
    state.selectedFormulaSymbol = symbols[0].key;
  }
  return getSelectedFormulaSymbol();
}

function getSelectedAlgorithm() {
  return state.metadata?.algorithms.find(({ id }) => id === state.algorithmId) ?? null;
}

function getDefaultTraceIndex(snapshot) {
  return getTeachingDefaultTraceIndex(snapshot);
}

function getSelectedTrace(snapshot) {
  return getTeachingSelectedTrace(snapshot, state.selectedTraceIndex);
}

function getActiveFlowIndex(snapshot) {
  const index = snapshot?.modelFlow?.findIndex((node) => node.active) ?? -1;
  return index === -1 ? 0 : index;
}

function findTraceIndexBySpotlight(snapshot, spotlight) {
  const traces = snapshot?.calculationTrace ?? [];
  const matchIndex = traces.findIndex((trace) => trace.spotlight === spotlight);
  return matchIndex === -1 ? getDefaultTraceIndex(snapshot) : matchIndex;
}

function setSelectedTraceIndex(index, snapshot = state.snapshots[getSafeCurrentStep()] ?? null) {
  if (!snapshot) {
    return;
  }
  const traces = snapshot.calculationTrace ?? [];
  if (!traces.length) {
    state.selectedTraceIndex = 0;
    render();
    return;
  }
  state.selectedTraceIndex = Math.min(Math.max(index, 0), traces.length - 1);
  render();
}

function renderTeaching(snapshot) {
  renderTeachingPanel({
    snapshot,
    language: state.language,
    teachingTab: state.teachingTab,
    selectedTraceIndex: state.selectedTraceIndex,
    tabsRoot: dom.teachingTabs,
    panelRoot: dom.teachingPanel,
  });
}

function populatePresetButtons() {
  dom.presetButtons.innerHTML = state.metadata.presets
    .map(
      ({ id, label, value, description }) => `
        <button
          class="button preset${Math.abs(state.learningRate - value) < 0.001 ? " active" : ""}"
          data-preset-id="${id}"
          data-learning-rate="${value}"
          title="${description}"
          type="button"
        >
          ${label}
        </button>
      `
    )
    .join("");
}

function populateDatasetOptions() {
  const algorithm = getSelectedAlgorithm();
  const options = algorithm?.datasets ?? [];
  dom.datasetSelect.innerHTML = options.map(({ id, label }) => `<option value="${id}">${label}</option>`).join("");
  if (!options.some(({ id }) => id === state.datasetId)) {
    state.datasetId = options[0]?.id ?? null;
  }
  dom.datasetSelect.value = state.datasetId ?? "";
}

function populateCustomDatasetGuide(overwriteInput = false) {
  const algorithm = getSelectedAlgorithm();
  const spec = algorithm?.customDatasetSpec;
  if (!spec) {
    return;
  }

  dom.customDatasetHint.textContent = `格式：${spec.format}。每行一条样本，编辑后点击“导入当前编辑内容”。`;
  dom.customDatasetInput.placeholder = spec.placeholder;

  if (overwriteInput || !dom.customDatasetInput.value.trim()) {
    dom.customDatasetInput.value = spec.placeholder;
    state.customDatasetDirty = false;
  }
}

function populateSampleOptions() {
  dom.sampleSelect.innerHTML = state.dataset
    .map((sample, index) => {
      const label = sample.token
        ? `Token ${index + 1}（${sample.token}）`
        : `样本 ${index + 1}（${sample.id}）`;
      return `<option value="${sample.id}">${label}</option>`;
    })
    .join("");

  if (state.trackedSampleId) {
    dom.sampleSelect.value = state.trackedSampleId;
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "请求失败。" }));
    throw new Error(payload.error || `请求失败：${response.status}`);
  }
  return response.json();
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "请求失败。" }));
    throw new Error(payload.error || `请求失败：${response.status}`);
  }
  return response.text();
}

function downloadTextFile(filename, contents, mimeType) {
  const blob = new Blob([contents], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function setControlsDisabled(disabled) {
  [
    dom.languageSelect,
    dom.datasetSelect,
    dom.learningRateInput,
    dom.sampleSelect,
    dom.downloadMermaidButton,
    dom.customDatasetInput,
    dom.importDatasetButton,
    dom.resetDatasetButton,
    dom.prevButton,
    dom.nextButton,
    dom.playPauseButton,
    dom.resetButton,
    dom.timelineRange,
    dom.pagePrevButton,
    dom.pageNextButton,
  ].forEach((element) => {
    element.disabled = disabled;
  });

  dom.presetButtons.querySelectorAll("button").forEach((button) => {
    button.disabled = disabled;
  });
}

function parseCustomDataset() {
  const algorithm = getSelectedAlgorithm();
  const spec = algorithm?.customDatasetSpec;
  const lines = dom.customDatasetInput.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!spec) {
    throw new Error("当前算法不支持自定义数据。");
  }

  if (lines.length < 3) {
    throw new Error("自定义数据至少需要 3 行。");
  }

  return lines.map((line, index) => {
    const parts = line.split(",").map((value) => value.trim());

    if (
      state.algorithmId === "logistic_regression" ||
      state.algorithmId === "linear_svm" ||
      state.algorithmId === "decision_tree" ||
      state.algorithmId === "random_forest" ||
      state.algorithmId === "gradient_boosting"
    ) {
      if (parts.length !== 3) {
        throw new Error(`第 ${index + 1} 行应为 x1,x2,label。`);
      }
      return { id: `u${index + 1}`, x1: Number(parts[0]), x2: Number(parts[1]), label: Number(parts[2]) };
    }

    if (state.algorithmId === "pca_projection" || state.algorithmId === "kmeans_clustering") {
      if (parts.length !== 2) {
        throw new Error(`第 ${index + 1} 行应为 x1,x2。`);
      }
      return { id: `u${index + 1}`, x1: Number(parts[0]), x2: Number(parts[1]) };
    }

    if (state.algorithmId === "transformer_attention") {
      if (parts.length !== 6) {
        throw new Error(`第 ${index + 1} 行应为 token,e1,e2,e3,e4,targetIndex。`);
      }
      return {
        id: `u${index + 1}`,
        token: parts[0],
        embedding: parts.slice(1, 5).map((value) => Number(value)),
        targetIndex: Number(parts[5]),
      };
    }

    if (state.algorithmId === "cnn_classifier") {
      if (parts.length !== 26) {
        throw new Error(`第 ${index + 1} 行应为 label,p1...p25。`);
      }
      return {
        id: `u${index + 1}`,
        label: Number(parts[0]),
        pixels: parts.slice(1).map((value) => Number(value)),
      };
    }

    if (state.algorithmId === "rnn_sequence") {
      if (parts.length !== 7) {
        throw new Error(`第 ${index + 1} 行应为 label,v1...v6。`);
      }
      return {
        id: `u${index + 1}`,
        label: Number(parts[0]),
        sequence: parts.slice(1).map((value) => Number(value)),
      };
    }

    if (state.algorithmId === "resnet_block") {
      if (parts.length !== 7) {
        throw new Error(`第 ${index + 1} 行应为 label,f1...f6。`);
      }
      return {
        id: `u${index + 1}`,
        label: Number(parts[0]),
        features: parts.slice(1).map((value) => Number(value)),
      };
    }

    if (parts.length !== 2) {
      throw new Error(`第 ${index + 1} 行应为 x,y。`);
    }

    return { id: `u${index + 1}`, x: Number(parts[0]), y: Number(parts[1]) };
  });
}

function serializeDatasetForEditor(algorithmId, dataset) {
  if (!Array.isArray(dataset) || !dataset.length) {
    return "";
  }

  return dataset
    .map((sample) => {
      if (
        algorithmId === "logistic_regression" ||
        algorithmId === "linear_svm" ||
        algorithmId === "decision_tree" ||
        algorithmId === "random_forest" ||
        algorithmId === "gradient_boosting"
      ) {
        return [sample.x1, sample.x2, sample.label].join(",");
      }
      if (algorithmId === "pca_projection" || algorithmId === "kmeans_clustering") {
        return [sample.x1, sample.x2].join(",");
      }
      if (algorithmId === "transformer_attention") {
        return [sample.token, ...(sample.embedding ?? []), sample.targetIndex].join(",");
      }
      if (algorithmId === "cnn_classifier") {
        return [sample.label, ...(sample.pixels ?? [])].join(",");
      }
      if (algorithmId === "rnn_sequence") {
        return [sample.label, ...(sample.sequence ?? [])].join(",");
      }
      if (algorithmId === "resnet_block") {
        return [sample.label, ...(sample.features ?? [])].join(",");
      }
      return [sample.x, sample.y].join(",");
    })
    .join("\n");
}

function syncCustomDatasetEditor({ force = false } = {}) {
  const canOverwrite = force || !state.customDatasetDirty || document.activeElement !== dom.customDatasetInput;
  if (!canOverwrite) {
    return;
  }

  const sourceDataset = state.customDatasetActive ? state.customDataset : state.dataset;
  const serialized = serializeDatasetForEditor(state.algorithmId, sourceDataset);
  if (!serialized) {
    return;
  }

  dom.customDatasetInput.value = serialized;
  state.customDatasetDirty = false;
}

function getInterestingDefaultSampleId(snapshots) {
  if (!snapshots.length) {
    return null;
  }
  const page = getCurrentPage();
  const targetPhase = page.phase ?? "forward";
  const candidates = snapshots.filter((snapshot) => snapshot.phase === targetPhase);
  const ranked = [...candidates].sort((left, right) => right.metrics.loss - left.metrics.loss);
  return ranked[0]?.focusSample?.id ?? candidates[0]?.focusSample?.id ?? snapshots[0].focusSample.id;
}

function findStepIndexForPage(sampleId = null) {
  const page = getCurrentPage();
  const preset = page.liveCellPreset ?? {};
  const targetPhase = preset.phase ?? page.phase ?? "forward";
  const preferredSampleId = sampleId ?? (preset.sampleStrategy === "interesting-default" ? getInterestingDefaultSampleId(state.snapshots) : null);
  const match = state.snapshots.findIndex((snapshot) => {
    if (snapshot.phase !== targetPhase) {
      return false;
    }
    return preferredSampleId ? snapshot.focusSample.id === preferredSampleId : true;
  });
  return match === -1 ? 0 : match;
}

function applyPagePreset() {
  if (!state.snapshots.length) {
    return;
  }

  const page = getCurrentPage();
  const preset = page.liveCellPreset ?? {};
  state.teachingTab = preset.teachingTab ?? page.teachingTab ?? "intuition";
  state.traceFilter = preset.traceFilter ?? (page.phase === "update" ? "all" : "current");

  if (!state.trackedSampleId || !state.dataset.some((sample) => sample.id === state.trackedSampleId)) {
    state.trackedSampleId = preset.sampleStrategy === "interesting-default"
      ? getInterestingDefaultSampleId(state.snapshots)
      : state.dataset[0]?.id ?? null;
  }

  state.currentStep = findStepIndexForPage(state.trackedSampleId);
  const snapshot = state.snapshots[getSafeCurrentStep()];
  state.selectedTraceIndex = getDefaultTraceIndex(snapshot);
  dom.timelineRange.value = String(state.currentStep);
}

async function rebuildExperiment() {
  state.loading = true;
  setControlsDisabled(true);
  setBackendStatus("后端正在生成本章的实验快照...");

  try {
    const experiment = state.customDatasetActive
      ? await fetchJson("/api/experiment/custom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            algorithmId: state.algorithmId,
            learningRate: state.learningRate,
            dataset: state.customDataset,
          }),
        })
      : await fetchJson(
          `/api/experiment?${new URLSearchParams({
            algorithmId: state.algorithmId,
            datasetId: state.datasetId,
            learningRate: String(state.learningRate),
          }).toString()}`
        );

    state.dataset = experiment.dataset;
    state.snapshots = experiment.snapshots;
    if (!state.trackedSampleId || !state.dataset.some((sample) => sample.id === state.trackedSampleId)) {
      state.trackedSampleId = getInterestingDefaultSampleId(state.snapshots);
    }

    populateSampleOptions();
    populatePresetButtons();
    dom.timelineRange.max = String(Math.max(0, state.snapshots.length - 1));
    dom.learningRateValue.textContent = String(round(state.learningRate, 2));
    syncCustomDatasetEditor({ force: !state.customDatasetActive });
    applyPagePreset();
    render();

    setBackendStatus(
      state.customDatasetActive
        ? "已切换到自定义数据，本章动画与推导已重新生成。"
        : "本章已加载完成，可以按页阅读，也可以直接做实验。",
      "ready"
    );
  } catch (error) {
    state.dataset = [];
    state.snapshots = [];
    setBackendStatus(error.message, "error");
    render();
  } finally {
    state.loading = false;
    setControlsDisabled(false);
  }
}

async function exportMermaid() {
  try {
    setBackendStatus("正在生成 Mermaid 导出...");
    const body = state.customDatasetActive
      ? await fetchText("/api/export/custom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "mermaid",
            algorithmId: state.algorithmId,
            learningRate: state.learningRate,
            dataset: state.customDataset,
          }),
        })
      : await fetchText(
          `/api/export/mermaid?${new URLSearchParams({
            algorithmId: state.algorithmId,
            datasetId: state.datasetId,
            learningRate: String(state.learningRate),
          }).toString()}`
        );

    downloadTextFile(`${state.algorithmId}-book-flow.mmd`, body, "text/plain;charset=utf-8");
    setBackendStatus("Mermaid 导出完成。", "ready");
  } catch (error) {
    setBackendStatus(error.message, "error");
  }
}

function setStep(nextStep) {
  if (!state.snapshots.length) {
    return;
  }
  state.currentStep = Math.min(Math.max(nextStep, 0), state.snapshots.length - 1);
  const snapshot = state.snapshots[state.currentStep];
  state.trackedSampleId = snapshot.focusSample.id;
  state.selectedTraceIndex = getDefaultTraceIndex(snapshot);
  dom.timelineRange.value = String(state.currentStep);
  render();
}

function toggleAutoplay() {
  if (state.autoplayHandle) {
    clearInterval(state.autoplayHandle);
    state.autoplayHandle = null;
    dom.playPauseButton.textContent = "自动播放";
    return;
  }

  state.autoplayHandle = window.setInterval(() => {
    if (state.currentStep >= state.snapshots.length - 1) {
      toggleAutoplay();
      return;
    }
    setStep(state.currentStep + 1);
  }, 1100);
  dom.playPauseButton.textContent = "暂停";
}

function renderChapterNavigation() {
  const pages = getCurrentRenderablePages();
  dom.chapterList.innerHTML = BOOK_CHAPTERS
    .map(
      (chapter) => `
        <button class="chapter-chip${chapter.id === state.chapterId ? " active" : ""}" data-chapter-id="${chapter.id}" type="button">
          <strong>${chapter.title}</strong>
          <small>${chapter.subtitle}</small>
        </button>
      `
    )
    .join("");

  dom.pageList.innerHTML = pages
    .map(
      (page, index) => `
        <button class="page-chip${index === state.pageIndex ? " active" : ""}" data-page-index="${index}" type="button">
          <span>${index + 1}</span>
          <strong>${page.title}</strong>
        </button>
      `
    )
    .join("");
}


function getAdjacentReaderPage(chapterId, pageIndex, offset) {
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

function renderReader() {
  const chapter = getCurrentChapter();
  const pages = getRenderablePages(chapter);
  const page = getCurrentPage();
  const chapterIndex = getChapterIndex(chapter.id);
  const symbols = getCurrentPageSymbols();
  const selectedSymbol = ensureSelectedFormulaSymbol();

  dom.chapterHero.innerHTML = `
    <p class="chapter-kicker">Chapter ${chapterIndex + 1}</p>
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
    <section class="book-section primary">
      <h3>本页主题</h3>
      <p>${page.summary}</p>
    </section>
    <section class="book-section">
      <h3>正文</h3>
      ${page.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
    </section>
    ${renderNotebookBridge(page)}
    ${renderReaderSections(page)}
    ${renderReaderPrinciples(page)}
    ${renderNotebookFormulaCards({ page, selectedSymbol, symbols })}
    ${renderReaderTakeaways(page)}
    ${renderReaderCallout(page)}
    ${renderReaderMiniQuiz(page)}
    ${renderReaderObservationSection(page)}
    ${renderReaderChapterSummaryDetail(page)}
  `;

  const notebookMount = dom.chapterBody.querySelector("#notebookMount");
  if (dom.storyGrid) {
    dom.storyGrid.classList.remove("notebook-embedded");
  }
  if (notebookMount && dom.storyGrid) {
    dom.storyGrid.classList.add("notebook-embedded");
    notebookMount.replaceChildren(dom.storyGrid);
  }

  const previousLocation = getAdjacentReaderPage(state.chapterId, state.pageIndex, -1);
  const nextLocation = getAdjacentReaderPage(state.chapterId, state.pageIndex, 1);
  const isFirst = previousLocation.chapterId === state.chapterId && previousLocation.pageIndex === state.pageIndex;
  const isLast = nextLocation.chapterId === state.chapterId && nextLocation.pageIndex === state.pageIndex;

  dom.pagePrevButton.disabled = state.loading || isFirst;
  dom.pageNextButton.disabled = state.loading || isLast;
}

function render() {
  renderSidebarState();
  renderChapterNavigation();
  renderReader();

  const snapshot = state.snapshots[getSafeCurrentStep()] ?? state.snapshots[0] ?? null;
  if (!snapshot) {
    dom.stepCounter.textContent = "0 / 0";
    dom.phaseBadge.textContent = "OFFLINE";
    dom.datasetMeta.textContent = "本章尚未加载";
    dom.focusGuide.innerHTML = "";
    if (dom.liveFormulaBoard) {
      dom.liveFormulaBoard.innerHTML = `
        <div class="live-formula-header">
          <h3>公式同步板</h3>
          <small>等待当前页的实验快照加载完成</small>
        </div>
      `;
    }
    dom.teachingPanel.innerHTML = `<div class="teaching-section"><p class="teaching-summary">请先启动本地服务，再加载本章的实验快照。</p></div>`;
    dom.statsGrid.innerHTML = "";
    dom.predictionValue.textContent = "--";
    dom.targetValue.textContent = "--";
    dom.lossValue.textContent = "--";
    dom.plot.innerHTML = "";
    dom.flowDiagram.innerHTML = "";
    dom.traceList.innerHTML = "";
    return;
  }

  const currentPage = getCurrentPage();
  const symbols = getCurrentPageSymbols();
  const selectedSymbol = getSelectedFormulaSymbol();
  const stepBoundTrace = getStepBoundTrace(snapshot, state.selectedTraceIndex);
  const selectedTrace = getSelectedTrace(snapshot);
  const linkedSymbol = selectedSymbol;
  const focusTrace = linkedSymbol?.spotlight
    ? { ...(selectedTrace ?? stepBoundTrace ?? {}), spotlight: linkedSymbol.spotlight }
    : selectedTrace;
  const spotlight = linkedSymbol?.spotlight ?? selectedTrace?.spotlight ?? "parameters";
  const visualFocus = describeVisualFocus({
    snapshot,
    trace: focusTrace ?? stepBoundTrace,
    linkedSymbol,
    language: state.language,
  });

  state.trackedSampleId = snapshot.focusSample.id;
  dom.sampleSelect.value = state.trackedSampleId;
  dom.stepCounter.textContent = `${state.currentStep + 1} / ${state.snapshots.length}`;
  dom.phaseBadge.textContent = snapshot.phase.toUpperCase();
  dom.datasetMeta.textContent = `${snapshot.datasetLabel} · ${snapshot.stepLabel}`;
  dom.predictionValue.textContent = String(snapshot.metrics.prediction);
  dom.targetValue.textContent = String(snapshot.metrics.target);
  dom.lossValue.textContent = String(snapshot.metrics.loss);

  const getRenderTrace = (currentSnapshot) => {
    const trace = getSelectedTrace(currentSnapshot);
    return linkedSymbol?.spotlight ? { ...trace, spotlight: linkedSymbol.spotlight } : trace;
  };

  renderNotebookContextPanel({
    mount: dom.chapterBody.querySelector("#notebookContext"),
    snapshot,
    page: currentPage,
    currentStep: state.currentStep,
    totalSteps: state.snapshots.length,
    selectedTrace: stepBoundTrace,
    linkedSymbol,
  });
  renderNotebookFormulaBoard({
    root: dom.liveFormulaBoard,
    page: currentPage,
    selectedTrace: stepBoundTrace,
    linkedSymbol,
    selectedSymbol,
    symbols,
  });
  renderFocusGuide(dom.focusGuide, snapshot, focusTrace, state.language, linkedSymbol, visualFocus);
  renderFlow(dom.flowDiagram, snapshot, state.selectedTraceIndex);
  renderStats(dom.statsGrid, snapshot, spotlight);
  renderTrace({
    traceList: dom.traceList,
    traceFilterButtons: dom.traceFilterButtons,
    traceToggleButton: dom.traceToggleButton,
    language: state.language,
    traceCollapsed: state.traceCollapsed,
    traceFilter: state.traceFilter,
    selectedTraceIndex: state.selectedTraceIndex,
    snapshot,
  });
  renderTeaching(snapshot);
  renderPlot({ svg: dom.plot, snapshot, getSelectedTrace: getRenderTrace, round });
}

async function selectChapter(chapterId, pageIndex = 0) {
  const chapter = getChapterById(chapterId);
  const algorithmChanged = chapter.algorithmId !== state.algorithmId;
  state.chapterId = chapter.id;
  state.pageIndex = clampPageIndex(chapter.id, pageIndex);

  if (algorithmChanged) {
    if (state.autoplayHandle) {
      toggleAutoplay();
    }
    state.algorithmId = chapter.algorithmId;
    state.datasetId = null;
    state.trackedSampleId = null;
    state.customDataset = null;
    state.customDatasetActive = false;
    state.customDatasetDirty = false;
    state.snapshots = [];
    state.dataset = [];
    state.currentStep = 0;
    populateDatasetOptions();
    populateCustomDatasetGuide(true);
    render();
    await rebuildExperiment();
    return;
  }

  applyPagePreset();
  render();
}

async function goToAdjacentPage(offset) {
  const nextLocation = getAdjacentReaderPage(state.chapterId, state.pageIndex, offset);
  await selectChapter(nextLocation.chapterId, nextLocation.pageIndex);
}

function bindEvents() {
  dom.sidebarToggleButton.addEventListener("click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    renderSidebarState();
  });

  dom.chapterList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-chapter-id]");
    if (button) {
      await selectChapter(button.dataset.chapterId, 0);
    }
  });

  dom.pageList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-page-index]");
    if (button) {
      await selectChapter(state.chapterId, Number(button.dataset.pageIndex));
    }
  });

  dom.chapterBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-symbol-key]");
    if (!button) {
      return;
    }
    state.selectedFormulaSymbol = button.dataset.symbolKey;
    render();
  });

  dom.flowDiagram.addEventListener("click", (event) => {
    const button = event.target.closest("[data-flow-index]");
    if (!button) {
      return;
    }
    setSelectedTraceIndex(Number(button.dataset.flowIndex));
  });

  dom.focusGuide.addEventListener("click", (event) => {
    const button = event.target.closest("[data-guide-role]");
    if (!button) {
      return;
    }
    const snapshot = state.snapshots[getSafeCurrentStep()] ?? null;
    if (!snapshot) {
      return;
    }

    if (button.dataset.guideRole === "flow") {
      setSelectedTraceIndex(getActiveFlowIndex(snapshot), snapshot);
      return;
    }

    if (button.dataset.guideRole === "visual") {
      const linkedSymbol = getSelectedFormulaSymbol();
      const spotlight = linkedSymbol?.spotlight ?? getSelectedTrace(snapshot)?.spotlight ?? "prediction";
      setSelectedTraceIndex(findTraceIndexBySpotlight(snapshot, spotlight), snapshot);
      return;
    }

    state.traceCollapsed = false;
    state.traceFilter = "all";
    render();
  });

  dom.pagePrevButton.addEventListener("click", async () => {
    await goToAdjacentPage(-1);
  });

  dom.pageNextButton.addEventListener("click", async () => {
    await goToAdjacentPage(1);
  });

  dom.chapterBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-notebook-target]");
    if (!button) {
      return;
    }

    const panels = {
      plot: dom.plotPanel,
      flow: dom.flowPanel,
      trace: dom.tracePanel,
      stats: dom.statsPanel,
    };
    const panel = panels[button.dataset.notebookTarget];
    if (!panel) {
      return;
    }

    if (panel.tagName?.toLowerCase() === "details") {
      panel.open = true;
    }
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  dom.languageSelect.addEventListener("change", (event) => {
    state.language = event.target.value;
    render();
  });

  dom.datasetSelect.addEventListener("change", async (event) => {
    state.datasetId = event.target.value;
    state.customDatasetActive = false;
    state.customDataset = null;
    state.customDatasetDirty = false;
    await rebuildExperiment();
  });

  dom.learningRateInput.addEventListener("input", async (event) => {
    state.learningRate = Number(event.target.value);
    await rebuildExperiment();
  });

  dom.presetButtons.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-learning-rate]");
    if (button) {
      state.learningRate = Number(button.dataset.learningRate);
      dom.learningRateInput.value = String(state.learningRate);
      await rebuildExperiment();
    }
  });

  dom.sampleSelect.addEventListener("change", (event) => {
    state.trackedSampleId = event.target.value;
    setStep(findStepIndexForPage(state.trackedSampleId));
  });

  dom.traceList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-trace-index]");
    if (card) {
      state.selectedTraceIndex = Number(card.dataset.traceIndex);
      render();
    }
  });

  dom.traceToggleButton.addEventListener("click", () => {
    state.traceCollapsed = !state.traceCollapsed;
    render();
  });

  dom.traceFilterButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trace-filter]");
    if (button) {
      state.traceFilter = button.dataset.traceFilter;
      if (state.traceFilter === "current") {
        state.selectedTraceIndex = getDefaultTraceIndex(state.snapshots[getSafeCurrentStep()]);
      }
      render();
    }
  });

  dom.teachingTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-teaching-tab]");
    if (button) {
      state.teachingTab = button.dataset.teachingTab;
      render();
    }
  });

  dom.teachingPanel.addEventListener("click", (event) => {
    const button = event.target.closest("[data-teaching-trace-index]");
    if (button) {
      state.selectedTraceIndex = Number(button.dataset.teachingTraceIndex);
      render();
    }
  });

  dom.customDatasetInput.addEventListener("input", () => {
    state.customDatasetDirty = true;
  });

  dom.importDatasetButton.addEventListener("click", async () => {
    try {
      state.customDataset = parseCustomDataset();
      state.customDatasetActive = true;
      state.customDatasetDirty = false;
      await rebuildExperiment();
    } catch (error) {
      setBackendStatus(error.message, "error");
    }
  });

  dom.resetDatasetButton.addEventListener("click", async () => {
    state.customDataset = null;
    state.customDatasetActive = false;
    state.customDatasetDirty = false;
    await rebuildExperiment();
  });

  dom.prevButton.addEventListener("click", () => setStep(state.currentStep - 1));
  dom.nextButton.addEventListener("click", () => setStep(state.currentStep + 1));
  dom.timelineRange.addEventListener("input", (event) => setStep(Number(event.target.value)));
  dom.playPauseButton.addEventListener("click", toggleAutoplay);
  dom.resetButton.addEventListener("click", () => {
    if (state.autoplayHandle) {
      toggleAutoplay();
    }
    applyPagePreset();
    render();
  });
  dom.downloadMermaidButton.addEventListener("click", exportMermaid);

  document.addEventListener("keydown", async (event) => {
    if (isTypingTarget(event.target)) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setStep(state.currentStep + 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setStep(state.currentStep - 1);
      return;
    }

    if (event.key === " ") {
      event.preventDefault();
      toggleAutoplay();
      return;
    }

    if (event.key === "PageDown") {
      event.preventDefault();
      await goToAdjacentPage(1);
      return;
    }

    if (event.key === "PageUp") {
      event.preventDefault();
      await goToAdjacentPage(-1);
    }
  });
}

async function bootstrap() {
  try {
    state.metadata = await fetchJson("/api/metadata");
    state.algorithmId = getCurrentChapter().algorithmId;
    state.learningRate = state.metadata.defaults.learningRate;
    dom.languageSelect.value = state.language;
    dom.learningRateInput.value = String(state.learningRate);
    populatePresetButtons();
    populateDatasetOptions();
    populateCustomDatasetGuide(true);
    await rebuildExperiment();
    syncCustomDatasetEditor({ force: true });
    setBackendStatus("会动的书已加载完成。先读正文，再操作图形。", "ready");
  } catch (error) {
    setBackendStatus(error.message, "error");
    render();
  }
}

function init() {
  bindEvents();
  bootstrap();
}

init();
