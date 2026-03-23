export function populateCustomDatasetGuide({ spec, state, hintElement, inputElement, overwriteInput = false }) {
  if (!spec) {
    return;
  }

  hintElement.textContent = `格式：${spec.format}。每行一条样本，编辑后点击“导入当前编辑内容”。`;
  inputElement.placeholder = spec.placeholder;

  if (overwriteInput || !inputElement.value.trim()) {
    inputElement.value = spec.placeholder;
    state.customDatasetDirty = false;
  }
}

export function parseCustomDataset({ algorithmId, spec, text }) {
  const lines = text
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
      algorithmId === "logistic_regression" ||
      algorithmId === "linear_svm" ||
      algorithmId === "decision_tree" ||
      algorithmId === "random_forest" ||
      algorithmId === "gradient_boosting"
    ) {
      if (parts.length !== 3) {
        throw new Error(`第 ${index + 1} 行应为 x1,x2,label。`);
      }
      return { id: `u${index + 1}`, x1: Number(parts[0]), x2: Number(parts[1]), label: Number(parts[2]) };
    }

    if (algorithmId === "pca_projection" || algorithmId === "kmeans_clustering") {
      if (parts.length !== 2) {
        throw new Error(`第 ${index + 1} 行应为 x1,x2。`);
      }
      return { id: `u${index + 1}`, x1: Number(parts[0]), x2: Number(parts[1]) };
    }

    if (algorithmId === "transformer_attention") {
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

    if (algorithmId === "cnn_classifier") {
      if (parts.length !== 26) {
        throw new Error(`第 ${index + 1} 行应为 label,p1...p25。`);
      }
      return {
        id: `u${index + 1}`,
        label: Number(parts[0]),
        pixels: parts.slice(1).map((value) => Number(value)),
      };
    }

    if (algorithmId === "rnn_sequence") {
      if (parts.length !== 7) {
        throw new Error(`第 ${index + 1} 行应为 label,v1...v6。`);
      }
      return {
        id: `u${index + 1}`,
        label: Number(parts[0]),
        sequence: parts.slice(1).map((value) => Number(value)),
      };
    }

    if (algorithmId === "resnet_block") {
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

export function serializeDatasetForEditor(algorithmId, dataset) {
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

export function syncCustomDatasetEditor({ force = false, state, inputElement }) {
  const canOverwrite = force || !state.customDatasetDirty || document.activeElement !== inputElement;
  if (!canOverwrite) {
    return;
  }

  const sourceDataset = state.customDatasetActive ? state.customDataset : state.dataset;
  const serialized = serializeDatasetForEditor(state.algorithmId, sourceDataset);
  if (!serialized) {
    return;
  }

  inputElement.value = serialized;
  state.customDatasetDirty = false;
}
