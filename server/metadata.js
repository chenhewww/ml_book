import { ALGORITHMS, getDatasetSpec, getDatasetsForAlgorithm } from "../src/algorithms.js";
import { LEARNING_RATE_PRESETS } from "./config.js";

function getMetadata() {
  return {
    algorithms: ALGORITHMS.map((algorithm) => ({
      ...algorithm,
      datasets: getDatasetsForAlgorithm(algorithm.id),
      customDatasetSpec: getDatasetSpec(algorithm.id),
    })),
    presets: LEARNING_RATE_PRESETS,
    defaults: {
      algorithmId: ALGORITHMS[0].id,
      learningRate: 0.12,
    },
  };
}

export { getMetadata };
