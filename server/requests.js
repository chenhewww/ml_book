import { createExperiment, validateDataset } from "../src/algorithms.js";
import { getMetadata } from "./metadata.js";

function parseExperimentRequest(url) {
  const metadata = getMetadata();
  const algorithmId = url.searchParams.get("algorithmId") || metadata.defaults.algorithmId;
  const datasetId = url.searchParams.get("datasetId");
  const learningRate = Number(url.searchParams.get("learningRate") || metadata.defaults.learningRate);
  const algorithm = metadata.algorithms.find((item) => item.id === algorithmId);

  if (!algorithm) {
    return { error: `Unknown algorithmId: ${algorithmId}` };
  }

  if (!Number.isFinite(learningRate) || learningRate <= 0) {
    return { error: "learningRate must be a positive number." };
  }

  if (datasetId && !algorithm.datasets.some((dataset) => dataset.id === datasetId)) {
    return { error: `Unknown datasetId "${datasetId}" for algorithm ${algorithmId}.` };
  }

  return {
    metadata,
    algorithmId,
    datasetId,
    learningRate,
    experiment: createExperiment(algorithmId, learningRate, null, datasetId),
  };
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk.toString("utf-8");
      if (raw.length > 2_000_000) {
        reject(new Error("Request body is too large."));
      }
    });

    request.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Request body must be valid JSON."));
      }
    });

    request.on("error", () => reject(new Error("Failed to read request body.")));
  });
}

function parseCustomExperimentPayload(payload) {
  const metadata = getMetadata();
  const algorithmId = payload.algorithmId || metadata.defaults.algorithmId;
  const learningRate = Number(payload.learningRate || metadata.defaults.learningRate);
  const dataset = payload.dataset;

  if (!metadata.algorithms.some((algorithm) => algorithm.id === algorithmId)) {
    return { error: `Unknown algorithmId: ${algorithmId}` };
  }

  if (!Number.isFinite(learningRate) || learningRate <= 0) {
    return { error: "learningRate must be a positive number." };
  }

  const validation = validateDataset(algorithmId, dataset);
  if (!validation.valid) {
    return { error: validation.error };
  }

  return {
    metadata,
    algorithmId,
    learningRate,
    experiment: createExperiment(algorithmId, learningRate, dataset),
  };
}

export { parseExperimentRequest, readJsonBody, parseCustomExperimentPayload };
