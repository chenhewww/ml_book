import { renderRegressionPlot, renderClassificationPlot, renderPcaPlot, renderClusteringPlot } from "./scatter.js";
import { renderDecisionTreePlot, renderRandomForestPlot, renderBoostingPlot } from "./tree.js";
import { renderCnnPlot, renderRnnPlot, renderResNetPlot, renderAttentionPlot } from "./neural.js";

const PLOT_RENDERERS = {
  classification: renderClassificationPlot,
  decision_tree: renderDecisionTreePlot,
  random_forest: renderRandomForestPlot,
  boosting: renderBoostingPlot,
  cnn: renderCnnPlot,
  rnn: renderRnnPlot,
  resnet: renderResNetPlot,
  clustering: renderClusteringPlot,
  attention: renderAttentionPlot,
  pca: renderPcaPlot,
};

export function renderPlot({ svg, snapshot, getSelectedTrace, round }) {
  const renderer = PLOT_RENDERERS[snapshot.chartType] ?? renderRegressionPlot;
  renderer({ svg, snapshot, getSelectedTrace, round });
}
