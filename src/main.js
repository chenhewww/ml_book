import {
  getDefaultTraceIndex as getTeachingDefaultTraceIndex,
  getSelectedTrace as getTeachingSelectedTrace,
  renderTeachingPanel,
} from "./teaching-panel.js";
import { BOOK_CHAPTERS, getChapterById, getChapterIndex } from "./book-content.js";
import {
  applyPagePreset as applyExperimentPagePreset,
  exportMermaid as exportExperimentMermaid,
  fetchJson,
  findStepIndexForPage,
  rebuildExperiment as rebuildExperimentState,
  setStep as setExperimentStep,
  toggleAutoplay as toggleExperimentAutoplay,
} from "./main-experiment.js";
import {
  getAdjacentReaderPage,
  getRenderablePages as getReaderRenderablePages,
  renderChapterNavigation as renderReaderNavigation,
  renderReader as renderReaderPage,
} from "./main-reader.js";
import { getFormulaSymbol, getFormulaSymbolsForPage } from "./formula-symbols.js";
import { renderPlot } from "./plots/index.js";
import { renderFlow, renderFocusGuide, renderStats, renderTrace } from "./ui/debug-panels.js";
import {
  renderLiveFormulaBoard as renderNotebookFormulaBoard,
  renderNotebookContext as renderNotebookContextPanel,
} from "./notebook/renderers.js";
import { describeVisualFocus, getStepBoundTrace } from "./notebook/focus.js";
import {
  parseCustomDataset as parseCustomDatasetInput,
  populateCustomDatasetGuide as populateCustomDatasetEditorGuide,
  syncCustomDatasetEditor as syncCustomDatasetTextarea,
} from "./main-dataset.js";

const NO_SYMBOL_SELECTION = "__none__";

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
  storyGrid: document.querySelector("#storyGrid"),
  readerColumn: document.querySelector(".reader-column"),
  readerProgress: document.querySelector("#readerProgress"),
  pagePrevButton: document.querySelector("#pagePrevButton"),
  pageNextButton: document.querySelector("#pageNextButton"),
  pageTurnerBar: document.querySelector(".page-turner-bar"),
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
  dom.sidebarToggleButton.textContent = state.sidebarCollapsed ? "展开目录" : "收起目录";
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
  return getReaderRenderablePages(chapter);
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

function isTransformerStageSymbolPage(page) {
  return state.algorithmId === "transformer_attention" && ["block", "ffn-stack", "lab"].includes(page?.id);
}

function ensureSelectedFormulaSymbol() {
  const page = getCurrentPage();
  const symbols = getCurrentPageSymbols();
  if (!symbols.length) {
    state.selectedFormulaSymbol = null;
    return null;
  }
  if (state.selectedFormulaSymbol === NO_SYMBOL_SELECTION) {
    return null;
  }
  if (isTransformerStageSymbolPage(page)) {
    if (state.selectedFormulaSymbol !== null && symbols.some((symbol) => symbol.key === state.selectedFormulaSymbol)) {
      return getSelectedFormulaSymbol();
    }
    state.selectedFormulaSymbol = NO_SYMBOL_SELECTION;
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

function getTraceStageKey(trace) {
  return trace?.stageKey ?? null;
}

function findTraceIndexByStageKey(snapshot, stageKey) {
  const traces = snapshot?.calculationTrace ?? [];
  const matchIndex = traces.findIndex((trace) => getTraceStageKey(trace) === stageKey);
  return matchIndex === -1 ? getDefaultTraceIndex(snapshot) : matchIndex;
}

function getActiveFlowIndex(snapshot) {
  const nodes = snapshot?.modelFlow ?? [];
  const currentTraceIndex = getDefaultTraceIndex(snapshot);
  const currentNode = nodes.find((node, index) => (Number.isInteger(node?.traceIndex) ? node.traceIndex : index) === currentTraceIndex);
  if (currentNode) {
    return currentNode.traceIndex ?? currentTraceIndex;
  }
  const activeNode = nodes.find((node) => node.active);
  if (activeNode) {
    return activeNode.traceIndex ?? nodes.indexOf(activeNode);
  }
  return 0;
}

function findTraceIndexBySpotlight(snapshot, spotlight) {
  const traces = snapshot?.calculationTrace ?? [];
  const matchIndex = traces.findIndex((trace) => trace.spotlight === spotlight);
  return matchIndex === -1 ? getDefaultTraceIndex(snapshot) : matchIndex;
}

function getLinkedTraceIndex(snapshot, selectedTrace, linkedSymbol) {
  const stageKey = linkedSymbol?.stageKey ?? selectedTrace?.stageKey ?? null;
  if (stageKey) {
    return findTraceIndexByStageKey(snapshot, stageKey);
  }
  const spotlight = linkedSymbol?.spotlight ?? selectedTrace?.spotlight ?? null;
  return findTraceIndexBySpotlight(snapshot, spotlight);
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

function renderTeaching(snapshot, selectedTraceIndex = state.selectedTraceIndex) {
  renderTeachingPanel({
    snapshot,
    language: state.language,
    teachingTab: state.teachingTab,
    selectedTraceIndex,
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
  populateCustomDatasetEditorGuide({
    spec: getSelectedAlgorithm()?.customDatasetSpec,
    state,
    hintElement: dom.customDatasetHint,
    inputElement: dom.customDatasetInput,
    overwriteInput,
  });
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

function parseCustomDataset() {
  return parseCustomDatasetInput({
    algorithmId: state.algorithmId,
    spec: getSelectedAlgorithm()?.customDatasetSpec,
    text: dom.customDatasetInput.value,
  });
}

function syncCustomDatasetEditor({ force = false } = {}) {
  syncCustomDatasetTextarea({
    force,
    state,
    inputElement: dom.customDatasetInput,
  });
}

function applyPagePreset() {
  applyExperimentPagePreset({
    state,
    dom,
    page: getCurrentPage(),
    getSafeCurrentStep,
    getDefaultTraceIndex,
  });
}

async function rebuildExperiment() {
  await rebuildExperimentState({
    state,
    dom,
    round,
    render,
    setBackendStatus,
    populateSampleOptions,
    populatePresetButtons,
    syncCustomDatasetEditor,
    getCurrentPage,
    getSafeCurrentStep,
    getDefaultTraceIndex,
  });
}

async function exportMermaid() {
  await exportExperimentMermaid({ state, setBackendStatus });
}

function setStep(nextStep) {
  setExperimentStep({
    nextStep,
    state,
    dom,
    render,
    getDefaultTraceIndex,
  });
}

function toggleAutoplay() {
  toggleExperimentAutoplay({
    state,
    dom,
    setStep: (nextStep) => setStep(nextStep),
  });
}

function renderChapterNavigation() {
  renderReaderNavigation({
    chapterId: state.chapterId,
    pageIndex: state.pageIndex,
    chapterListElement: dom.chapterList,
    pageListElement: dom.pageList,
  });
}


function render() {
  renderSidebarState();
  renderChapterNavigation();
  renderReaderPage({
    dom,
    state,
    chapter: getCurrentChapter(),
    page: getCurrentPage(),
    symbols: getCurrentPageSymbols(),
    selectedSymbol: ensureSelectedFormulaSymbol(),
  });

  const snapshot = state.snapshots[getSafeCurrentStep()] ?? state.snapshots[0] ?? null;
  if (!snapshot) {
    dom.stepCounter.textContent = "0 / 0";
    dom.phaseBadge.textContent = "OFFLINE";
    dom.datasetMeta.textContent = "本章尚未加载";
    dom.focusGuide.innerHTML = "";
    if (dom.liveFormulaBoard) {
      dom.liveFormulaBoard.innerHTML = `
        <div class="live-formula-header">
          <h3>这一页的主公式</h3>
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
  const selectedSymbol = ensureSelectedFormulaSymbol();
  const selectedTrace = getSelectedTrace(snapshot);
  const stepBoundTrace = getStepBoundTrace(snapshot, state.selectedTraceIndex);
  const baseTrace = selectedTrace ?? stepBoundTrace;
  const linkedSymbol = selectedSymbol;
  const linkedTraceIndex = getLinkedTraceIndex(snapshot, baseTrace, linkedSymbol);
  const linkedTrace = snapshot.calculationTrace?.[linkedTraceIndex] ?? baseTrace;
  const focusTrace = linkedTrace ?? selectedTrace;
  const spotlight = linkedSymbol?.spotlight ?? focusTrace?.spotlight ?? "parameters";
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
    const linkedIndex = getLinkedTraceIndex(currentSnapshot, trace, linkedSymbol);
    return currentSnapshot.calculationTrace?.[linkedIndex] ?? trace;
  };

  renderNotebookContextPanel({
    mount: dom.chapterBody.querySelector("#notebookContext"),
    snapshot,
    page: currentPage,
    currentStep: state.currentStep,
    totalSteps: state.snapshots.length,
    selectedTrace: linkedTrace ?? stepBoundTrace,
    linkedSymbol,
  });
  renderNotebookFormulaBoard({
    root: dom.liveFormulaBoard,
    page: currentPage,
    selectedTrace: linkedTrace ?? stepBoundTrace,
    linkedSymbol,
    selectedSymbol,
    symbols,
  });
  renderFocusGuide(dom.focusGuide, snapshot, focusTrace, state.language, linkedSymbol, visualFocus);
  renderFlow(dom.flowDiagram, snapshot, linkedTraceIndex, state.language);
  renderStats(dom.statsGrid, snapshot, spotlight, state.language);
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
  renderTeaching(snapshot, linkedTraceIndex);
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
    const traceIndex = Number(button.dataset.traceIndex ?? button.dataset.flowIndex);
    setSelectedTraceIndex(traceIndex);
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
      const selectedTrace = getSelectedTrace(snapshot);
      setSelectedTraceIndex(getLinkedTraceIndex(snapshot, selectedTrace, linkedSymbol), snapshot);
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

    const isDetailsPanel = panel.tagName?.toLowerCase() === "details";
    if (isDetailsPanel) {
      panel.open = true;
    }
    const scrollTarget = isDetailsPanel ? panel.querySelector("summary") ?? panel : panel;
    const pageTurnerHeight = dom.pageTurnerBar?.offsetHeight ?? 0;
    const top = scrollTarget.getBoundingClientRect().top + window.scrollY - 16;
    window.scrollTo({
      top: Math.max(0, top - pageTurnerHeight),
      behavior: "smooth",
    });
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
    setStep(
      findStepIndexForPage({
        sampleId: state.trackedSampleId,
        page: getCurrentPage(),
        snapshots: state.snapshots,
      })
    );
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
