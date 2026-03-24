export async function fetchJson(url, options = {}) {
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

function setControlsDisabled(dom, disabled) {
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

function getInterestingDefaultSampleId(snapshots, page) {
  if (!snapshots.length) {
    return null;
  }
  const targetPhase = page.phase ?? "forward";
  const candidates = snapshots.filter((snapshot) => snapshot.phase === targetPhase);
  const ranked = [...candidates].sort((left, right) => right.metrics.loss - left.metrics.loss);
  return ranked[0]?.focusSample?.id ?? candidates[0]?.focusSample?.id ?? snapshots[0].focusSample.id;
}

export function findStepIndexForPage({ sampleId = null, page, snapshots }) {
  const preset = page.liveCellPreset ?? {};
  const targetPhase = preset.phase ?? page.phase ?? "forward";
  const preferredSampleId = sampleId ?? (preset.sampleStrategy === "interesting-default" ? getInterestingDefaultSampleId(snapshots, page) : null);
  const match = snapshots.findIndex((snapshot) => {
    if (snapshot.phase !== targetPhase) {
      return false;
    }
    return preferredSampleId ? snapshot.focusSample.id === preferredSampleId : true;
  });
  return match === -1 ? 0 : match;
}

export function applyPagePreset({ state, dom, page, getSafeCurrentStep, getDefaultTraceIndex }) {
  if (!state.snapshots.length) {
    return;
  }

  const preset = page.liveCellPreset ?? {};
  state.teachingTab = preset.teachingTab ?? page.teachingTab ?? "intuition";
  state.traceFilter = preset.traceFilter ?? (page.phase === "update" ? "all" : "current");

  if (!state.trackedSampleId || !state.dataset.some((sample) => sample.id === state.trackedSampleId)) {
    state.trackedSampleId = preset.sampleStrategy === "interesting-default"
      ? getInterestingDefaultSampleId(state.snapshots, page)
      : state.dataset[0]?.id ?? null;
  }

  state.currentStep = findStepIndexForPage({
    sampleId: state.trackedSampleId,
    page,
    snapshots: state.snapshots,
  });
  const snapshot = state.snapshots[getSafeCurrentStep()];
  state.selectedTraceIndex = getDefaultTraceIndex(snapshot);
  dom.timelineRange.value = String(state.currentStep);
}

export async function rebuildExperiment({
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
}) {
  state.loading = true;
  setControlsDisabled(dom, true);
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
      state.trackedSampleId = getInterestingDefaultSampleId(state.snapshots, getCurrentPage());
    }

    populateSampleOptions();
    populatePresetButtons();
    dom.timelineRange.max = String(Math.max(0, state.snapshots.length - 1));
    dom.learningRateValue.textContent = String(round(state.learningRate, 2));
    syncCustomDatasetEditor({ force: !state.customDatasetActive });
    applyPagePreset({
      state,
      dom,
      page: getCurrentPage(),
      getSafeCurrentStep,
      getDefaultTraceIndex,
    });
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
    setControlsDisabled(dom, false);
  }
}

export async function exportMermaid({ state, setBackendStatus }) {
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

export function setStep({ nextStep, state, dom, render, getDefaultTraceIndex }) {
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

export function toggleAutoplay({ state, dom, setStep }) {
  if (state.autoplayHandle) {
    clearInterval(state.autoplayHandle);
    state.autoplayHandle = null;
    dom.playPauseButton.textContent = "自动播放";
    return;
  }

  state.autoplayHandle = window.setInterval(() => {
    if (state.currentStep >= state.snapshots.length - 1) {
      toggleAutoplay({ state, dom, setStep });
      return;
    }
    setStep(state.currentStep + 1);
  }, 1100);
  dom.playPauseButton.textContent = "暂停";
}
