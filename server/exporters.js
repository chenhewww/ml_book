function buildMermaid(algorithm, learningRate) {
  const flowMap = {
    linear_regression: [
      "Input[x sample]",
      "Linear[y_hat = w*x + b]",
      "Loss[Squared Error]",
      "Gradient[Compute dw, db]",
      "Update[Gradient Descent Step]",
    ],
    logistic_regression: [
      "Input[Feature Vector]",
      "Linear[Logit z]",
      "Sigmoid[Probability p]",
      "Loss[Cross Entropy]",
      "Gradient[Backprop through Sigmoid]",
      "Update[Decision Boundary Shift]",
    ],
    linear_svm: [
      "Input[Feature Vector]",
      "Score[Hyperplane score f(x)]",
      "Margin[Signed margin y*f(x)]",
      "Loss[Hinge objective]",
      "Gradient[Subgradient step]",
      "Update[Shift separator and margins]",
    ],
    decision_tree: [
      "Input[2D labeled points]",
      "Root[Search best root split]",
      "Gain[Measure Gini reduction]",
      "Branch[Split active branch]",
      "Leaf[Majority vote prediction]",
    ],
    random_forest: [
      "Input[2D labeled points]",
      "Bootstrap[Sample rows with replacement]",
      "FeatureSubspace[Sample features per tree]",
      "Trees[Independent shallow trees]",
      "Vote[Aggregate tree predictions]",
      "Output[Forest majority class]",
    ],
    gradient_boosting: [
      "Input[2D labeled points]",
      "Base[Initialize base score]",
      "Residual1[Fit stump to residuals]",
      "Residual2[Fit next stump to remaining error]",
      "Residual3[Fit final stump]",
      "Shrinkage[Add learning-rate-scaled corrections]",
      "Output[Boosted probability]",
    ],
    kmeans_clustering: [
      "Input[2D point]",
      "Distance[Distances to centroids]",
      "Assign[Choose nearest centroid]",
      "Loss[Inertia contribution]",
      "Update[Move centroid online]",
    ],
    two_layer_network: [
      "Input[x sample]",
      "Hidden1[tanh neuron 1]",
      "Hidden2[tanh neuron 2]",
      "Output[Linear combiner]",
      "Loss[Squared Error]",
      "Backward[Backpropagate gradients]",
      "Update[Adjust hidden + output weights]",
    ],
    cnn_classifier: [
      "Input[5x5 image patch]",
      "Conv[Apply vertical and horizontal kernels]",
      "ReLU[Rectify feature maps]",
      "Pool[Take strongest responses]",
      "Softmax[Convert to class probabilities]",
      "Update[Adjust filters]",
    ],
    rnn_sequence: [
      "Input[Sequence values]",
      "Recur[Roll hidden state through time]",
      "Output[Read final hidden state]",
      "Loss[Binary cross entropy]",
      "BPTT[Backprop through time]",
      "Update[Adjust recurrent weights]",
    ],
    resnet_block: [
      "Input[Feature vector]",
      "Branch[Residual transform branch]",
      "Skip[Identity skip connection]",
      "Add[Add skip and branch]",
      "Head[Classify block output]",
      "Update[Adjust residual branch]",
    ],
    pca_projection: [
      "Input[2D point cloud]",
      "Center[Subtract dataset mean]",
      "Covariance[Build Sigma]",
      "Eigen[Find top eigenvector]",
      "Project[Project sample onto PC1]",
    ],
    transformer_attention: [
      "Input[Token embeddings]",
      "Position[Add positional encoding]",
      "Project[Build Q/K/V for Head A + B]",
      "Mask[Apply causal mask]",
      "Softmax[Per-head attention weights]",
      "Merge[Combine head outputs]",
      "Residual1[Add first residual]",
      "LayerNorm1[Normalize first residual]",
      "FFN[Feed forward + GELU]",
      "Residual2[Add second residual]",
      "LayerNorm2[Normalize block output]",
      "Update[Refine both query projections]",
    ],
  };

  const nodes = flowMap[algorithm.id] ?? ["Input[Input]", "Process[Process]", "Output[Output]"];
  const connections = nodes.slice(0, -1).map((node, index) => `${node} --> ${nodes[index + 1]}`);

  return [
    "flowchart LR",
    `  Title["${algorithm.label}<br/>lr=${learningRate}"]`,
    ...connections.map((line) => `  ${line}`),
    `  Title -. guides .-> ${nodes[0].split("[")[0]}`,
  ].join("\n");
}

export { buildMermaid };
