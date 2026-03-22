import { getBuiltInDataset } from "./algorithm-catalog.js";
import {
  cloneDataset,
  createClassificationDataset,
  createCnnDataset,
  createDecisionTreeDataset,
  createGradientBoostingDataset,
  createKMeansDataset,
  createNeuralRegressionDataset,
  createPcaDataset,
  createRandomForestDataset,
  createRegressionDataset,
  createResNetDataset,
  createRnnDataset,
  createSvmDataset,
  createTransformerTranslationDataset,
} from "./datasets.js";
import {
  buildLinearSnapshots,
  buildLogisticSnapshots,
  buildNeuralSnapshots,
  buildSvmSnapshots,
  buildPcaSnapshots,
  buildKMeansSnapshots,
} from "./experiment-builders/classic.js";
import {
  buildDecisionTreeSnapshots,
  buildRandomForestSnapshots,
  buildGradientBoostingSnapshots,
} from "./experiment-builders/trees.js";
import {
  buildCnnSnapshots,
  buildRnnSnapshots,
  buildResNetSnapshots,
  buildTransformerSnapshotsV3,
} from "./experiment-builders/neural.js";

export { ALGORITHMS, getDatasetSpec, getDatasetsForAlgorithm, validateDataset } from "./algorithm-catalog.js";

const EXPERIMENT_BUILDERS = {
  linear_regression: {
    createDataset: createRegressionDataset,
    buildSnapshots: buildLinearSnapshots,
  },
  logistic_regression: {
    createDataset: createClassificationDataset,
    buildSnapshots: buildLogisticSnapshots,
  },
  two_layer_network: {
    createDataset: createNeuralRegressionDataset,
    buildSnapshots: buildNeuralSnapshots,
  },
  linear_svm: {
    createDataset: createSvmDataset,
    buildSnapshots: buildSvmSnapshots,
  },
  pca_projection: {
    createDataset: createPcaDataset,
    buildSnapshots: buildPcaSnapshots,
  },
  kmeans_clustering: {
    createDataset: createKMeansDataset,
    buildSnapshots: buildKMeansSnapshots,
  },
  decision_tree: {
    createDataset: createDecisionTreeDataset,
    buildSnapshots: buildDecisionTreeSnapshots,
  },
  random_forest: {
    createDataset: createRandomForestDataset,
    buildSnapshots: buildRandomForestSnapshots,
  },
  gradient_boosting: {
    createDataset: createGradientBoostingDataset,
    buildSnapshots: buildGradientBoostingSnapshots,
  },
  cnn_classifier: {
    createDataset: createCnnDataset,
    buildSnapshots: buildCnnSnapshots,
  },
  rnn_sequence: {
    createDataset: createRnnDataset,
    buildSnapshots: buildRnnSnapshots,
  },
  resnet_block: {
    createDataset: createResNetDataset,
    buildSnapshots: buildResNetSnapshots,
  },
  transformer_attention: {
    createDataset: createTransformerTranslationDataset,
    buildSnapshots: buildTransformerSnapshotsV3,
  },
};

function withDatasetLabel(experiment, datasetLabel) {
  return {
    ...experiment,
    snapshots: experiment.snapshots.map((snapshot) => ({
      ...snapshot,
      datasetLabel: datasetLabel || snapshot.datasetLabel,
    })),
  };
}

export function createExperiment(algorithmId, learningRate, customDataset = null, datasetId = null) {
  const builder = EXPERIMENT_BUILDERS[algorithmId] ?? EXPERIMENT_BUILDERS.linear_regression;
  const dataset = customDataset ? cloneDataset(customDataset) : null;
  const builtIn = dataset ? null : getBuiltInDataset(algorithmId, datasetId);
  const resolvedDataset = dataset ?? builtIn?.dataset ?? builder.createDataset();

  return withDatasetLabel(
    {
      dataset: resolvedDataset,
      snapshots: builder.buildSnapshots(resolvedDataset, learningRate),
    },
    builtIn?.entry?.label
  );
}
