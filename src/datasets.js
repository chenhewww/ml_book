export function cloneDataset(dataset) {
  return dataset.map((sample) => ({ ...sample }));
}

export function createRegressionDataset() {
  return [
    { id: "p1", x: -3.2, y: -5.1 },
    { id: "p2", x: -2.4, y: -3.6 },
    { id: "p3", x: -1.1, y: -1.2 },
    { id: "p4", x: -0.3, y: -0.2 },
    { id: "p5", x: 0.8, y: 2.3 },
    { id: "p6", x: 1.7, y: 2.8 },
    { id: "p7", x: 2.5, y: 4.6 },
    { id: "p8", x: 3.4, y: 6.2 },
    { id: "p9", x: -2.8, y: -4.3 },
    { id: "p10", x: -1.8, y: -2.5 },
    { id: "p11", x: 2.9, y: 5.1 },
    { id: "p12", x: 3.8, y: 6.8 },
  ];
}

export function createRegressionOutlierDataset() {
  return [
    { id: "ro1", x: -3.1, y: -4.7 },
    { id: "ro2", x: -2.2, y: -2.8 },
    { id: "ro3", x: -1.3, y: -1.4 },
    { id: "ro4", x: -0.2, y: 0.1 },
    { id: "ro5", x: 0.9, y: 1.8 },
    { id: "ro6", x: 1.8, y: 3.1 },
    { id: "ro7", x: 2.7, y: 4.4 },
    { id: "ro8", x: 3.2, y: 8.3 },
  ];
}

export function createRegressionSteepDataset() {
  return [
    { id: "rs1", x: -2.9, y: -7.1 },
    { id: "rs2", x: -2.0, y: -4.8 },
    { id: "rs3", x: -1.0, y: -2.1 },
    { id: "rs4", x: -0.1, y: 0.4 },
    { id: "rs5", x: 0.8, y: 2.1 },
    { id: "rs6", x: 1.6, y: 3.7 },
    { id: "rs7", x: 2.5, y: 6.1 },
    { id: "rs8", x: 3.3, y: 7.6 },
  ];
}

export function createClassificationDataset() {
  return [
    { id: "c1", x1: 0.8, x2: 1.2, label: 0 },
    { id: "c2", x1: 1.1, x2: 0.7, label: 0 },
    { id: "c3", x1: 1.6, x2: 1.5, label: 0 },
    { id: "c4", x1: 2.4, x2: 2.2, label: 0 },
    { id: "c5", x1: 3.4, x2: 3.1, label: 1 },
    { id: "c6", x1: 3.8, x2: 3.7, label: 1 },
    { id: "c7", x1: 4.1, x2: 2.9, label: 1 },
    { id: "c8", x1: 4.7, x2: 4.1, label: 1 },
    { id: "c9", x1: 1.9, x2: 1.8, label: 0 },
    { id: "c10", x1: 2.2, x2: 1.6, label: 0 },
    { id: "c11", x1: 4.3, x2: 3.5, label: 1 },
    { id: "c12", x1: 4.8, x2: 3.2, label: 1 },
  ];
}

export function createClassificationOverlapDataset() {
  return [
    { id: "co1", x1: 0.9, x2: 1.5, label: 0 },
    { id: "co2", x1: 1.5, x2: 1.2, label: 0 },
    { id: "co3", x1: 2.1, x2: 2.1, label: 0 },
    { id: "co4", x1: 2.8, x2: 2.5, label: 0 },
    { id: "co5", x1: 2.6, x2: 2.0, label: 1 },
    { id: "co6", x1: 3.2, x2: 2.8, label: 1 },
    { id: "co7", x1: 3.8, x2: 3.4, label: 1 },
    { id: "co8", x1: 4.2, x2: 3.1, label: 1 },
  ];
}

export function createClassificationDiagonalDataset() {
  return [
    { id: "cd1", x1: 0.8, x2: 3.8, label: 0 },
    { id: "cd2", x1: 1.2, x2: 3.2, label: 0 },
    { id: "cd3", x1: 1.6, x2: 2.7, label: 0 },
    { id: "cd4", x1: 2.1, x2: 2.2, label: 0 },
    { id: "cd5", x1: 2.7, x2: 1.9, label: 1 },
    { id: "cd6", x1: 3.4, x2: 1.5, label: 1 },
    { id: "cd7", x1: 4.0, x2: 1.1, label: 1 },
    { id: "cd8", x1: 4.4, x2: 0.7, label: 1 },
  ];
}

export function createDecisionTreeDataset() {
  return [
    { id: "dt1", x1: 1.0, x2: 1.1, label: 0 },
    { id: "dt2", x1: 1.5, x2: 2.0, label: 0 },
    { id: "dt3", x1: 2.1, x2: 1.4, label: 0 },
    { id: "dt4", x1: 2.7, x2: 2.4, label: 1 },
    { id: "dt5", x1: 3.2, x2: 1.2, label: 1 },
    { id: "dt6", x1: 3.8, x2: 2.7, label: 1 },
    { id: "dt7", x1: 4.4, x2: 1.8, label: 1 },
    { id: "dt8", x1: 2.4, x2: 3.2, label: 0 },
  ];
}

export function createDecisionTreeOverlapDataset() {
  return [
    { id: "do1", x1: 0.9, x2: 1.4, label: 0 },
    { id: "do2", x1: 1.6, x2: 2.4, label: 0 },
    { id: "do3", x1: 2.2, x2: 1.2, label: 1 },
    { id: "do4", x1: 2.9, x2: 2.0, label: 1 },
    { id: "do5", x1: 3.3, x2: 2.5, label: 1 },
    { id: "do6", x1: 3.9, x2: 1.4, label: 0 },
    { id: "do7", x1: 4.4, x2: 2.2, label: 1 },
    { id: "do8", x1: 2.5, x2: 3.0, label: 0 },
  ];
}

export function createDecisionTreeTriageDataset() {
  return [
    { id: "dg1", x1: 1.0, x2: 3.0, label: 0 },
    { id: "dg2", x1: 1.4, x2: 2.4, label: 0 },
    { id: "dg3", x1: 2.0, x2: 1.2, label: 1 },
    { id: "dg4", x1: 2.8, x2: 3.3, label: 1 },
    { id: "dg5", x1: 3.1, x2: 2.0, label: 0 },
    { id: "dg6", x1: 3.6, x2: 1.3, label: 1 },
    { id: "dg7", x1: 4.1, x2: 2.7, label: 1 },
    { id: "dg8", x1: 2.3, x2: 3.6, label: 0 },
    { id: "dg9", x1: 1.8, x2: 3.3, label: 0 },
    { id: "dg10", x1: 2.6, x2: 1.7, label: 1 },
    { id: "dg11", x1: 3.9, x2: 2.1, label: 1 },
    { id: "dg12", x1: 4.4, x2: 3.0, label: 1 },
  ];
}

export function createRandomForestDataset() {
  return [
    { id: "rf1", x1: 0.9, x2: 1.0, label: 0 },
    { id: "rf2", x1: 1.4, x2: 2.5, label: 0 },
    { id: "rf3", x1: 2.0, x2: 1.4, label: 0 },
    { id: "rf4", x1: 2.4, x2: 3.1, label: 0 },
    { id: "rf5", x1: 2.7, x2: 2.0, label: 1 },
    { id: "rf6", x1: 3.3, x2: 1.3, label: 0 },
    { id: "rf7", x1: 3.6, x2: 2.8, label: 1 },
    { id: "rf8", x1: 4.1, x2: 3.5, label: 1 },
    { id: "rf9", x1: 4.4, x2: 1.9, label: 1 },
    { id: "rf10", x1: 2.2, x2: 3.7, label: 0 },
    { id: "rf11", x1: 1.8, x2: 3.0, label: 0 },
    { id: "rf12", x1: 4.7, x2: 2.6, label: 1 },
  ];
}

export function createRandomForestNoisyDataset() {
  return [
    { id: "rn1", x1: 1.0, x2: 1.3, label: 0 },
    { id: "rn2", x1: 1.6, x2: 2.9, label: 0 },
    { id: "rn3", x1: 2.1, x2: 1.6, label: 1 },
    { id: "rn4", x1: 2.5, x2: 3.0, label: 0 },
    { id: "rn5", x1: 2.9, x2: 2.1, label: 1 },
    { id: "rn6", x1: 3.4, x2: 1.4, label: 0 },
    { id: "rn7", x1: 3.8, x2: 2.7, label: 1 },
    { id: "rn8", x1: 4.2, x2: 3.1, label: 1 },
    { id: "rn9", x1: 4.5, x2: 1.8, label: 1 },
    { id: "rn10", x1: 2.3, x2: 3.5, label: 0 },
  ];
}

export function createRandomForestIslandDataset() {
  return [
    { id: "ri1", x1: 0.8, x2: 1.1, label: 0 },
    { id: "ri2", x1: 1.3, x2: 2.2, label: 0 },
    { id: "ri3", x1: 1.9, x2: 1.5, label: 0 },
    { id: "ri4", x1: 2.4, x2: 3.4, label: 0 },
    { id: "ri5", x1: 2.8, x2: 2.4, label: 1 },
    { id: "ri6", x1: 3.1, x2: 1.1, label: 0 },
    { id: "ri7", x1: 3.5, x2: 2.9, label: 1 },
    { id: "ri8", x1: 3.9, x2: 3.6, label: 1 },
    { id: "ri9", x1: 4.4, x2: 2.0, label: 1 },
    { id: "ri10", x1: 4.8, x2: 3.1, label: 1 },
  ];
}

export function createGradientBoostingDataset() {
  return [
    { id: "gb1", x1: 0.9, x2: 1.0, label: 0 },
    { id: "gb2", x1: 1.3, x2: 2.6, label: 0 },
    { id: "gb3", x1: 1.9, x2: 1.4, label: 0 },
    { id: "gb4", x1: 2.2, x2: 3.3, label: 0 },
    { id: "gb5", x1: 2.7, x2: 2.2, label: 1 },
    { id: "gb6", x1: 3.1, x2: 1.3, label: 0 },
    { id: "gb7", x1: 3.5, x2: 2.7, label: 1 },
    { id: "gb8", x1: 3.9, x2: 3.4, label: 1 },
    { id: "gb9", x1: 4.3, x2: 1.8, label: 1 },
    { id: "gb10", x1: 2.5, x2: 3.8, label: 0 },
    { id: "gb11", x1: 1.7, x2: 3.1, label: 0 },
    { id: "gb12", x1: 4.6, x2: 2.7, label: 1 },
  ];
}

export function createGradientBoostingNoisyDataset() {
  return [
    { id: "gn1", x1: 0.8, x2: 1.1, label: 0 },
    { id: "gn2", x1: 1.4, x2: 2.9, label: 0 },
    { id: "gn3", x1: 2.0, x2: 1.5, label: 1 },
    { id: "gn4", x1: 2.4, x2: 3.2, label: 0 },
    { id: "gn5", x1: 2.8, x2: 2.1, label: 1 },
    { id: "gn6", x1: 3.2, x2: 1.4, label: 0 },
    { id: "gn7", x1: 3.7, x2: 2.9, label: 1 },
    { id: "gn8", x1: 4.1, x2: 3.0, label: 1 },
    { id: "gn9", x1: 4.5, x2: 1.9, label: 1 },
    { id: "gn10", x1: 2.2, x2: 3.6, label: 0 },
  ];
}

export function createGradientBoostingHardCornerDataset() {
  return [
    { id: "gh1", x1: 0.9, x2: 0.9, label: 0 },
    { id: "gh2", x1: 1.4, x2: 2.2, label: 0 },
    { id: "gh3", x1: 2.0, x2: 1.3, label: 0 },
    { id: "gh4", x1: 2.3, x2: 3.5, label: 0 },
    { id: "gh5", x1: 2.9, x2: 2.4, label: 1 },
    { id: "gh6", x1: 3.4, x2: 1.2, label: 0 },
    { id: "gh7", x1: 3.8, x2: 2.9, label: 1 },
    { id: "gh8", x1: 4.2, x2: 3.6, label: 1 },
    { id: "gh9", x1: 4.6, x2: 2.0, label: 1 },
    { id: "gh10", x1: 4.9, x2: 3.1, label: 1 },
  ];
}

export function createSvmDataset() {
  return [
    { id: "s1", x1: 0.9, x2: 1.1, label: 0 },
    { id: "s2", x1: 1.4, x2: 1.6, label: 0 },
    { id: "s3", x1: 2.0, x2: 1.5, label: 0 },
    { id: "s4", x1: 2.7, x2: 2.5, label: 0 },
    { id: "s5", x1: 3.4, x2: 3.2, label: 1 },
    { id: "s6", x1: 4.0, x2: 3.6, label: 1 },
    { id: "s7", x1: 4.4, x2: 4.2, label: 1 },
    { id: "s8", x1: 5.1, x2: 4.6, label: 1 },
    { id: "s9", x1: 1.8, x2: 2.0, label: 0 },
    { id: "s10", x1: 2.3, x2: 1.9, label: 0 },
    { id: "s11", x1: 4.8, x2: 3.8, label: 1 },
    { id: "s12", x1: 5.4, x2: 4.2, label: 1 },
  ];
}

export function createSvmTightMarginDataset() {
  return [
    { id: "sm1", x1: 1.0, x2: 1.2, label: 0 },
    { id: "sm2", x1: 1.7, x2: 1.8, label: 0 },
    { id: "sm3", x1: 2.2, x2: 2.0, label: 0 },
    { id: "sm4", x1: 2.9, x2: 2.8, label: 0 },
    { id: "sm5", x1: 3.1, x2: 2.9, label: 1 },
    { id: "sm6", x1: 3.6, x2: 3.4, label: 1 },
    { id: "sm7", x1: 4.2, x2: 3.9, label: 1 },
    { id: "sm8", x1: 4.8, x2: 4.3, label: 1 },
  ];
}

export function createSvmAsymmetricDataset() {
  return [
    { id: "sa1", x1: 0.9, x2: 1.4, label: 0 },
    { id: "sa2", x1: 1.6, x2: 1.9, label: 0 },
    { id: "sa3", x1: 2.4, x2: 2.3, label: 0 },
    { id: "sa4", x1: 3.1, x2: 2.6, label: 0 },
    { id: "sa5", x1: 3.5, x2: 3.7, label: 1 },
    { id: "sa6", x1: 4.0, x2: 4.1, label: 1 },
    { id: "sa7", x1: 4.7, x2: 4.4, label: 1 },
    { id: "sa8", x1: 5.4, x2: 4.9, label: 1 },
  ];
}

export function createNeuralRegressionDataset() {
  return [
    { id: "n1", x: -3.2, y: -0.9 },
    { id: "n2", x: -2.4, y: -1.4 },
    { id: "n3", x: -1.6, y: -0.2 },
    { id: "n4", x: -0.8, y: 1.1 },
    { id: "n5", x: 0.1, y: 0.3 },
    { id: "n6", x: 0.9, y: -1.0 },
    { id: "n7", x: 1.7, y: -0.4 },
    { id: "n8", x: 2.5, y: 1.3 },
    { id: "n9", x: 3.3, y: 0.8 },
    { id: "n10", x: -2.9, y: -1.2 },
    { id: "n11", x: -0.2, y: 0.9 },
    { id: "n12", x: 2.9, y: 1.1 },
  ];
}

export function createNeuralDoubleBendDataset() {
  return [
    { id: "nd1", x: -3.1, y: -0.8 },
    { id: "nd2", x: -2.4, y: -1.3 },
    { id: "nd3", x: -1.7, y: -0.7 },
    { id: "nd4", x: -0.9, y: 0.9 },
    { id: "nd5", x: -0.1, y: 1.2 },
    { id: "nd6", x: 0.8, y: -0.4 },
    { id: "nd7", x: 1.6, y: -1.2 },
    { id: "nd8", x: 2.4, y: 0.2 },
    { id: "nd9", x: 3.2, y: 1.5 },
  ];
}

export function createNeuralRippleDataset() {
  return [
    { id: "nr1", x: -3.0, y: -0.2 },
    { id: "nr2", x: -2.2, y: -1.1 },
    { id: "nr3", x: -1.4, y: -0.6 },
    { id: "nr4", x: -0.6, y: 0.8 },
    { id: "nr5", x: 0.2, y: 1.0 },
    { id: "nr6", x: 1.0, y: -0.2 },
    { id: "nr7", x: 1.8, y: -1.1 },
    { id: "nr8", x: 2.6, y: -0.4 },
    { id: "nr9", x: 3.4, y: 0.9 },
  ];
}

export function createPcaDataset() {
  return [
    { id: "pca1", x1: 0.7, x2: 1.1 },
    { id: "pca2", x1: 1.2, x2: 1.6 },
    { id: "pca3", x1: 1.8, x2: 2.1 },
    { id: "pca4", x1: 2.4, x2: 2.8 },
    { id: "pca5", x1: 3.0, x2: 3.2 },
    { id: "pca6", x1: 3.4, x2: 3.8 },
    { id: "pca7", x1: 4.2, x2: 4.4 },
    { id: "pca8", x1: 1.0, x2: 1.4 },
    { id: "pca9", x1: 1.6, x2: 1.9 },
    { id: "pca10", x1: 2.8, x2: 3.1 },
    { id: "pca11", x1: 3.8, x2: 4.0 },
  ];
}

export function createPcaElongatedDataset() {
  return [
    { id: "pce1", x1: 0.8, x2: 2.8 },
    { id: "pce2", x1: 1.3, x2: 3.2 },
    { id: "pce3", x1: 1.8, x2: 3.7 },
    { id: "pce4", x1: 2.4, x2: 4.1 },
    { id: "pce5", x1: 3.1, x2: 4.6 },
    { id: "pce6", x1: 3.7, x2: 5.0 },
    { id: "pce7", x1: 4.4, x2: 5.6 },
  ];
}

export function createPcaTwoGroupDataset() {
  return [
    { id: "pcg1", x1: 0.9, x2: 1.2 },
    { id: "pcg2", x1: 1.4, x2: 1.8 },
    { id: "pcg3", x1: 2.1, x2: 2.3 },
    { id: "pcg4", x1: 2.7, x2: 2.9 },
    { id: "pcg5", x1: 3.6, x2: 3.4 },
    { id: "pcg6", x1: 4.2, x2: 3.9 },
    { id: "pcg7", x1: 4.9, x2: 4.5 },
  ];
}

export function createTransformerTranslationDataset() {
  return [
    { id: "tt1", token: "bonjour", embedding: [1.2, 0.3, 0.2, 0.1], targetIndex: 3 },
    { id: "tt2", token: "means", embedding: [0.4, 1.1, 0.2, 0.5], targetIndex: 0 },
    { id: "tt3", token: "hello", embedding: [1.0, 0.2, 0.3, 0.2], targetIndex: 0 },
    { id: "tt4", token: "to", embedding: [0.2, 0.5, 0.3, 0.2], targetIndex: 3 },
    { id: "tt5", token: "everyone", embedding: [0.9, 0.4, 0.4, 0.2], targetIndex: 2 },
    { id: "tt6", token: "in", embedding: [0.1, 0.3, 0.9, 0.4], targetIndex: 7 },
    { id: "tt7", token: "the", embedding: [0.2, 0.2, 0.8, 0.3], targetIndex: 8 },
    { id: "tt8", token: "meeting", embedding: [0.3, 0.4, 1.0, 0.8], targetIndex: 2 },
    { id: "tt9", token: "today", embedding: [0.1, 0.4, 0.9, 0.7], targetIndex: 7 },
    { id: "tt10", token: "very", embedding: [0.3, 0.7, 0.6, 0.9], targetIndex: 10 },
    { id: "tt11", token: "clearly", embedding: [0.2, 0.6, 0.8, 0.9], targetIndex: 2 },
  ];
}

export function createTransformerCoreferenceDataset() {
  return [
    { id: "tc1", token: "Maria", embedding: [1.1, 0.6, 0.2, 0.2], targetIndex: 0 },
    { id: "tc2", token: "said", embedding: [0.2, 1.0, 0.4, 0.3], targetIndex: 0 },
    { id: "tc3", token: "she", embedding: [1.0, 0.5, 0.3, 0.2], targetIndex: 0 },
    { id: "tc4", token: "finished", embedding: [0.3, 0.8, 0.6, 0.5], targetIndex: 2 },
    { id: "tc5", token: "first", embedding: [0.1, 0.4, 0.9, 0.7], targetIndex: 3 },
  ];
}

export function createKMeansDataset() {
  return [
    { id: "km1", x1: 1.0, x2: 1.2 },
    { id: "km2", x1: 1.5, x2: 0.8 },
    { id: "km3", x1: 0.8, x2: 1.7 },
    { id: "km4", x1: 4.4, x2: 1.1 },
    { id: "km5", x1: 4.9, x2: 1.7 },
    { id: "km6", x1: 5.3, x2: 0.9 },
    { id: "km7", x1: 2.9, x2: 4.3 },
    { id: "km8", x1: 3.5, x2: 4.9 },
    { id: "km9", x1: 2.4, x2: 5.1 },
    { id: "km10", x1: 1.8, x2: 1.5 },
    { id: "km11", x1: 4.8, x2: 1.3 },
    { id: "km12", x1: 3.1, x2: 5.4 },
  ];
}

export function createCnnDataset() {
  return [
    { id: "cv1", label: 0, pixels: [0,1,1,1,0, 0,1,0,1,0, 0,1,0,1,0, 0,1,0,1,0, 0,1,1,1,0] },
    { id: "cv2", label: 0, pixels: [0,1,1,0,0, 0,1,0,1,0, 0,1,0,1,0, 0,1,0,1,0, 0,1,1,0,0] },
    { id: "cv3", label: 0, pixels: [0,0,1,1,0, 0,1,0,1,0, 0,1,0,1,0, 0,1,0,1,0, 0,0,1,1,0] },
    { id: "cv4", label: 0, pixels: [0,1,1,1,0, 0,1,0,0,0, 0,1,1,1,0, 0,1,0,0,0, 0,1,1,1,0] },
    { id: "cv5", label: 0, pixels: [0,1,1,1,0, 0,1,0,0,0, 0,1,1,0,0, 0,1,0,0,0, 0,1,0,0,0] },
    { id: "cv6", label: 1, pixels: [0,0,0,0,0, 1,1,1,1,1, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0] },
    { id: "cv7", label: 1, pixels: [1,1,1,1,1, 0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 1,1,1,1,1] },
    { id: "cv8", label: 1, pixels: [0,0,0,0,0, 0,0,1,0,0, 1,1,1,1,1, 0,0,1,0,0, 0,0,0,0,0] },
    { id: "cv9", label: 1, pixels: [1,1,1,1,1, 0,0,0,1,0, 0,0,1,0,0, 0,1,0,0,0, 1,1,1,1,1] },
    { id: "cv10", label: 1, pixels: [1,1,1,1,0, 0,0,0,1,0, 0,0,1,1,0, 0,0,0,1,0, 1,1,1,1,0] },
    { id: "cv11", label: 1, pixels: [0,0,1,0,0, 0,1,1,0,0, 1,1,1,1,1, 0,0,1,1,0, 0,0,1,0,0] },
    { id: "cv12", label: 0, pixels: [0,1,1,1,0, 0,1,0,1,0, 0,1,1,1,0, 0,1,0,1,0, 0,1,1,1,0] },
  ];
}

export function createRnnDataset() {
  return [
    { id: "rv1", label: 1, sequence: [0.1, 0.2, 0.3, 0.5, 0.7, 0.9] },
    { id: "rv2", label: 1, sequence: [0.0, 0.1, 0.2, 0.4, 0.6, 0.8] },
    { id: "rv3", label: 0, sequence: [0.9, 0.7, 0.5, 0.4, 0.3, 0.1] },
    { id: "rv4", label: 0, sequence: [0.8, 0.8, 0.6, 0.4, 0.2, 0.1] },
    { id: "rv5", label: 1, sequence: [0.2, 0.1, 0.3, 0.4, 0.6, 0.7] },
    { id: "rv6", label: 0, sequence: [0.7, 0.6, 0.4, 0.3, 0.2, 0.2] },
    { id: "rv7", label: 1, sequence: [0.1, 0.3, 0.2, 0.5, 0.7, 0.8] },
    { id: "rv8", label: 0, sequence: [0.8, 0.5, 0.6, 0.4, 0.3, 0.1] },
    { id: "rv9", label: 1, sequence: [0.2, 0.2, 0.4, 0.6, 0.7, 0.9] },
    { id: "rv10", label: 0, sequence: [0.9, 0.8, 0.7, 0.5, 0.4, 0.3] },
    { id: "rv11", label: 1, sequence: [0.1, 0.2, 0.4, 0.5, 0.8, 0.9] },
    { id: "rv12", label: 0, sequence: [0.7, 0.5, 0.4, 0.3, 0.2, 0.0] },
  ];
}

export function createResNetDataset() {
  return [
    { id: "rsn1", label: 0, features: [0.9, 0.8, 0.2, 0.1, 0.1, 0.0] },
    { id: "rsn2", label: 0, features: [0.8, 0.7, 0.3, 0.2, 0.1, 0.0] },
    { id: "rsn3", label: 0, features: [0.7, 0.6, 0.2, 0.3, 0.2, 0.1] },
    { id: "rsn4", label: 1, features: [0.2, 0.3, 0.8, 0.9, 0.7, 0.6] },
    { id: "rsn5", label: 1, features: [0.1, 0.2, 0.7, 0.8, 0.9, 0.7] },
    { id: "rsn6", label: 1, features: [0.3, 0.2, 0.8, 0.7, 0.8, 0.9] },
    { id: "rsn7", label: 0, features: [0.8, 0.9, 0.3, 0.2, 0.2, 0.1] },
    { id: "rsn8", label: 1, features: [0.2, 0.4, 0.9, 0.8, 0.8, 0.7] },
    { id: "rsn9", label: 0, features: [0.9, 0.7, 0.4, 0.2, 0.1, 0.2] },
    { id: "rsn10", label: 1, features: [0.3, 0.3, 0.7, 0.9, 0.8, 0.8] },
    { id: "rsn11", label: 0, features: [0.7, 0.8, 0.3, 0.1, 0.2, 0.2] },
    { id: "rsn12", label: 1, features: [0.2, 0.3, 0.8, 0.9, 0.9, 0.6] },
  ];
}

export function createKMeansStretchedDataset() {
  return [
    { id: "ks1", x1: 0.9, x2: 1.1 },
    { id: "ks2", x1: 1.8, x2: 1.3 },
    { id: "ks3", x1: 2.5, x2: 1.0 },
    { id: "ks4", x1: 4.6, x2: 1.6 },
    { id: "ks5", x1: 5.5, x2: 2.0 },
    { id: "ks6", x1: 6.3, x2: 1.5 },
    { id: "ks7", x1: 2.0, x2: 4.1 },
    { id: "ks8", x1: 2.8, x2: 4.8 },
    { id: "ks9", x1: 3.8, x2: 5.4 },
  ];
}

export function createKMeansImbalancedDataset() {
  return [
    { id: "ki1", x1: 0.8, x2: 1.0 },
    { id: "ki2", x1: 1.2, x2: 1.5 },
    { id: "ki3", x1: 1.6, x2: 1.2 },
    { id: "ki4", x1: 1.9, x2: 1.7 },
    { id: "ki5", x1: 4.7, x2: 1.0 },
    { id: "ki6", x1: 5.2, x2: 1.4 },
    { id: "ki7", x1: 3.0, x2: 4.7 },
    { id: "ki8", x1: 3.3, x2: 5.4 },
    { id: "ki9", x1: 2.7, x2: 4.2 },
  ];
}
