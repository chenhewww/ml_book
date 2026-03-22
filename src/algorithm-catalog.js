import {
  cloneDataset,
  createClassificationDataset,
  createClassificationDiagonalDataset,
  createClassificationOverlapDataset,
  createCnnDataset,
  createDecisionTreeDataset,
  createDecisionTreeOverlapDataset,
  createDecisionTreeTriageDataset,
  createGradientBoostingDataset,
  createGradientBoostingHardCornerDataset,
  createGradientBoostingNoisyDataset,
  createKMeansDataset,
  createKMeansImbalancedDataset,
  createKMeansStretchedDataset,
  createNeuralDoubleBendDataset,
  createNeuralRegressionDataset,
  createNeuralRippleDataset,
  createPcaDataset,
  createPcaElongatedDataset,
  createPcaTwoGroupDataset,
  createRandomForestDataset,
  createRandomForestIslandDataset,
  createRandomForestNoisyDataset,
  createRegressionDataset,
  createRegressionOutlierDataset,
  createRegressionSteepDataset,
  createResNetDataset,
  createRnnDataset,
  createSvmAsymmetricDataset,
  createSvmDataset,
  createSvmTightMarginDataset,
  createTransformerCoreferenceDataset,
  createTransformerTranslationDataset,
} from "./datasets.js";

export const ALGORITHMS = [
  { id: "linear_regression", label: "Linear Regression" },
  { id: "logistic_regression", label: "Logistic Regression" },
  { id: "two_layer_network", label: "Two-Layer Neural Network" },
  { id: "cnn_classifier", label: "Convolutional Neural Network" },
  { id: "rnn_sequence", label: "Recurrent Neural Network" },
  { id: "resnet_block", label: "ResNet Block" },
  { id: "linear_svm", label: "Linear SVM" },
  { id: "decision_tree", label: "Decision Tree" },
  { id: "random_forest", label: "Random Forest" },
  { id: "gradient_boosting", label: "Gradient Boosting" },
  { id: "kmeans_clustering", label: "K-Means Clustering" },
  { id: "pca_projection", label: "PCA Projection" },
  { id: "transformer_attention", label: "Transformer Attention" },
];

const BUILTIN_DATASETS = {
  linear_regression: [
    { id: "regression_line", label: "Noisy Line", factory: createRegressionDataset },
    { id: "regression_outlier", label: "Line With Outlier", factory: createRegressionOutlierDataset },
    { id: "steep_line", label: "Steep Slope", factory: createRegressionSteepDataset },
  ],
  logistic_regression: [
    { id: "binary_clusters", label: "Binary Clusters", factory: createClassificationDataset },
    { id: "overlap_clusters", label: "Overlap Zone", factory: createClassificationOverlapDataset },
    { id: "diagonal_split", label: "Diagonal Split", factory: createClassificationDiagonalDataset },
  ],
  two_layer_network: [
    { id: "nonlinear_wave", label: "Nonlinear Wave", factory: createNeuralRegressionDataset },
    { id: "double_bend", label: "Double Bend", factory: createNeuralDoubleBendDataset },
    { id: "ripple_curve", label: "Ripple Curve", factory: createNeuralRippleDataset },
  ],
  cnn_classifier: [
    { id: "cnn_glyphs", label: "Glyph Patches", factory: createCnnDataset },
  ],
  rnn_sequence: [
    { id: "rnn_trend", label: "Trend Memory", factory: createRnnDataset },
  ],
  resnet_block: [
    { id: "resnet_vectors", label: "Residual Vectors", factory: createResNetDataset },
  ],
  linear_svm: [
    { id: "margin_clusters", label: "Margin Clusters", factory: createSvmDataset },
    { id: "tight_margin", label: "Tight Margin", factory: createSvmTightMarginDataset },
    { id: "asymmetric_margin", label: "Asymmetric Margin", factory: createSvmAsymmetricDataset },
  ],
  decision_tree: [
    { id: "tree_triage", label: "Triage Path", factory: createDecisionTreeTriageDataset },
    { id: "tree_overlap", label: "Overlap Branch", factory: createDecisionTreeOverlapDataset },
    { id: "tree_baseline", label: "Axis Split", factory: createDecisionTreeDataset },
  ],
  random_forest: [
    { id: "forest_vote", label: "Bagged Vote", factory: createRandomForestDataset },
    { id: "forest_noisy", label: "Noisy Boundary", factory: createRandomForestNoisyDataset },
    { id: "forest_island", label: "Minority Island", factory: createRandomForestIslandDataset },
  ],
  gradient_boosting: [
    { id: "boosting_residual", label: "Residual Chain", factory: createGradientBoostingDataset },
    { id: "boosting_noisy", label: "Noisy Residual", factory: createGradientBoostingNoisyDataset },
    { id: "boosting_corner", label: "Hard Corner", factory: createGradientBoostingHardCornerDataset },
  ],
  kmeans_clustering: [
    { id: "tri_cluster", label: "Tri Cluster", factory: createKMeansDataset },
    { id: "stretched_cluster", label: "Stretched Cluster", factory: createKMeansStretchedDataset },
    { id: "imbalanced_cluster", label: "Imbalanced Cluster", factory: createKMeansImbalancedDataset },
  ],
  pca_projection: [
    { id: "tilted_cloud", label: "Tilted Cloud", factory: createPcaDataset },
    { id: "elongated_cloud", label: "Elongated Cloud", factory: createPcaElongatedDataset },
    { id: "two_group_axis", label: "Two Group Axis", factory: createPcaTwoGroupDataset },
  ],
  transformer_attention: [
    { id: "translation_alignment", label: "Translation Alignment", factory: createTransformerTranslationDataset },
    { id: "coreference_link", label: "Coreference Link", factory: createTransformerCoreferenceDataset },
  ],
};

function getBuiltInDatasetEntries(algorithmId) {
  return BUILTIN_DATASETS[algorithmId] ?? [];
}

export function getBuiltInDataset(algorithmId, datasetId) {
  const entries = getBuiltInDatasetEntries(algorithmId);
  const selected = entries.find((entry) => entry.id === datasetId) ?? entries[0];
  return selected ? { entry: selected, dataset: cloneDataset(selected.factory()) } : null;
}

export function getDatasetSpec(algorithmId) {
  if (algorithmId === "cnn_classifier") {
    return {
      format: "label,p1,p2,...,p25",
      placeholder: "1,0,0,1,0,0,1,1,0,0,1,1,1,1,1,0,0,1,1,0,0,0,1,0,0,0",
      fields: ["label", "p1...p25"],
    };
  }

  if (algorithmId === "rnn_sequence") {
    return {
      format: "label,v1,v2,v3,v4,v5,v6",
      placeholder: "1,0.1,0.2,0.4,0.6,0.8,0.9",
      fields: ["label", "v1", "v2", "v3", "v4", "v5", "v6"],
    };
  }

  if (algorithmId === "resnet_block") {
    return {
      format: "label,f1,f2,f3,f4,f5,f6",
      placeholder: "1,0.2,0.3,0.8,0.9,0.8,0.7",
      fields: ["label", "f1", "f2", "f3", "f4", "f5", "f6"],
    };
  }

  if (
    algorithmId === "logistic_regression" ||
    algorithmId === "linear_svm" ||
    algorithmId === "decision_tree" ||
    algorithmId === "random_forest" ||
    algorithmId === "gradient_boosting"
  ) {
    return {
      format: "x1,x2,label",
      placeholder: "0.8,1.2,0\n1.4,1.0,0\n3.6,3.4,1\n4.2,3.9,1",
      fields: ["x1", "x2", "label"],
    };
  }

  if (algorithmId === "pca_projection") {
    return {
      format: "x1,x2",
      placeholder: "0.7,1.1\n1.8,2.1\n2.7,2.9\n4.1,4.2",
      fields: ["x1", "x2"],
    };
  }

  if (algorithmId === "kmeans_clustering") {
    return {
      format: "x1,x2",
      placeholder: "1.0,1.2\n4.9,1.5\n3.2,4.8\n2.8,5.1",
      fields: ["x1", "x2"],
    };
  }

  if (algorithmId === "transformer_attention") {
    return {
      format: "token,e1,e2,e3,e4,targetIndex",
      placeholder: "bonjour,1.2,0.3,0.2,0.1,2\nmeans,0.4,1.1,0.2,0.5,0\nhello,1.0,0.2,0.3,0.2,0",
      fields: ["token", "e1", "e2", "e3", "e4", "targetIndex"],
    };
  }

  return {
    format: "x,y",
    placeholder: "-2.5,-1.2\n-1.0,0.2\n0.7,1.1\n2.3,0.4",
    fields: ["x", "y"],
  };
}

export function getDatasetsForAlgorithm(algorithmId) {
  return getBuiltInDatasetEntries(algorithmId).map(({ id, label }) => ({ id, label }));
}

export function validateDataset(algorithmId, dataset) {
  if (!Array.isArray(dataset) || dataset.length < 3) {
    return { valid: false, error: "Custom dataset must contain at least 3 rows." };
  }

  if (algorithmId === "cnn_classifier") {
    const valid = dataset.every((sample) =>
      (sample.label === 0 || sample.label === 1) &&
      Array.isArray(sample.pixels) &&
      sample.pixels.length === 25 &&
      sample.pixels.every((value) => Number.isFinite(value))
    );
    if (!valid) {
      return { valid: false, error: "Each CNN row must provide label,p1...p25 with numeric pixels." };
    }
    return { valid: true };
  }

  if (algorithmId === "rnn_sequence") {
    const valid = dataset.every((sample) =>
      (sample.label === 0 || sample.label === 1) &&
      Array.isArray(sample.sequence) &&
      sample.sequence.length === 6 &&
      sample.sequence.every((value) => Number.isFinite(value))
    );
    if (!valid) {
      return { valid: false, error: "Each RNN row must provide label,v1...v6 with numeric sequence values." };
    }
    return { valid: true };
  }

  if (algorithmId === "resnet_block") {
    const valid = dataset.every((sample) =>
      (sample.label === 0 || sample.label === 1) &&
      Array.isArray(sample.features) &&
      sample.features.length === 6 &&
      sample.features.every((value) => Number.isFinite(value))
    );
    if (!valid) {
      return { valid: false, error: "Each ResNet row must provide label,f1...f6 with numeric feature values." };
    }
    return { valid: true };
  }

  if (
    algorithmId === "logistic_regression" ||
    algorithmId === "linear_svm" ||
    algorithmId === "decision_tree" ||
    algorithmId === "random_forest" ||
    algorithmId === "gradient_boosting"
  ) {
    const valid = dataset.every((sample) =>
      Number.isFinite(sample.x1) &&
      Number.isFinite(sample.x2) &&
      (sample.label === 0 || sample.label === 1)
    );

    if (!valid) {
      return {
        valid: false,
        error: `Each ${
          algorithmId === "decision_tree"
            ? "Decision Tree"
            : algorithmId === "random_forest"
              ? "Random Forest"
              : algorithmId === "gradient_boosting"
                ? "Gradient Boosting"
                : "logistic regression"
        } row must provide numeric x1,x2 and label 0 or 1.`,
      };
    }

    return { valid: true };
  }

  if (algorithmId === "pca_projection" || algorithmId === "kmeans_clustering") {
    const valid = dataset.every((sample) => Number.isFinite(sample.x1) && Number.isFinite(sample.x2));
    if (!valid) {
      return { valid: false, error: `Each ${algorithmId === "pca_projection" ? "PCA" : "K-Means"} row must provide numeric x1,x2 values.` };
    }

    return { valid: true };
  }

  if (algorithmId === "transformer_attention") {
    const valid = dataset.every((sample) =>
      typeof sample.token === "string" &&
      sample.token.length > 0 &&
      Array.isArray(sample.embedding) &&
      sample.embedding.length === 4 &&
      sample.embedding.every((value) => Number.isFinite(value)) &&
      Number.isInteger(sample.targetIndex) &&
      sample.targetIndex >= 0 &&
      sample.targetIndex < dataset.length
    );
    if (!valid) {
      return { valid: false, error: "Each transformer row must provide token,e1,e2,e3,e4,targetIndex with a valid target index." };
    }

    return { valid: true };
  }

  const valid = dataset.every((sample) => Number.isFinite(sample.x) && Number.isFinite(sample.y));
  if (!valid) {
    return { valid: false, error: "Each regression row must provide numeric x,y values." };
  }

  return { valid: true };
}
