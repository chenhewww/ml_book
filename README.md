# ML Visual Debugger

An interactive MVP for learning machine learning by stepping through each training phase like a debugger.

## Current MVP

- linear regression snapshots: forward, loss, backward, update
- logistic regression snapshots with a moving decision boundary
- two-layer neural network snapshots with a nonlinear fitted curve
- convolutional neural network snapshots with 5x5 image patches, kernels, feature maps, and pooling
- recurrent neural network snapshots with hidden-state rollup across time
- ResNet block snapshots with residual branch, skip connection, and skip-add output
- linear SVM snapshots with an explicit margin band
- decision tree snapshots with root/branch Gini splits and a highlighted leaf path
- random forest snapshots with bagging, feature subsampling, and majority voting
- gradient boosting snapshots with sequential residual stumps and shrinkage
- K-Means clustering snapshots with centroid assignment and online centroid updates
- PCA projection snapshots with covariance, PC1, and geometric projection
- transformer attention snapshots with positional encoding, causal mask, two attention heads, residual blocks, layer normalization, and FFN + GELU
- multiple built-in demo datasets per algorithm, with primary demos using more than 10 points / tokens
- previous, next, autoplay, reset controls
- debugger panels for parameters, prediction, target, and loss
- local backend API for experiment generation
- learning-rate preset scenarios for demo pacing
- Mermaid and Markdown exports for reporting / CLI Anything pipelines
- custom CSV dataset import for live demos
- Chinese coach mode and speaker-notes export for presentations
- detailed calculation trace panel showing formulas and substituted values
- clickable trace cards that spotlight the related plot elements and parameters
- teaching tabs for intuition, why, visual link, glossary, pseudocode, math, and common mistakes
- phase-aware pseudocode panel that highlights the current algorithm stage before the raw pseudocode block

## Run

1. Run `npm start`
2. Open `http://127.0.0.1:3000`

## Backend API

- `GET /api/metadata`: algorithms, datasets, and default settings
- `GET /api/experiment?algorithmId=linear_regression&learningRate=0.12`: generated snapshots for the selected experiment
- `GET /api/export/mermaid?...`: Mermaid flowchart export
- `GET /api/export/summary?...`: Markdown experiment summary export
- `GET /api/export/speaker-notes?...`: Chinese speaker notes export
- `POST /api/experiment/custom`: run an experiment against pasted CSV data
- `POST /api/export/custom`: export Mermaid or summary for a custom dataset

## Demo story

1. Start with linear regression and click `Next` through one sample.
2. Show how the fitted line changes after the update phase.
3. Switch to logistic regression and show the decision boundary moving.
4. Switch to the two-layer network and show how the fitted curve bends nonlinearly.
5. Switch to the CNN demo and show input patch -> convolution kernels -> feature maps -> pooling -> probability.
6. Switch to the RNN demo and show how hidden state rolls through the whole sequence before making a final decision.
7. Switch to the ResNet demo and explain why `skip + residual` changes optimization behavior.
8. Switch to Linear SVM and explain the separator plus the two margin lines.
9. Switch to Decision Tree and explain how the root split, branch split, and final leaf vote come directly from Gini reduction.
10. Switch to Random Forest and explain why bagging plus feature subsampling makes the final vote more stable than any single tree.
11. Switch to Gradient Boosting and explain how each shallow tree is not voting, but correcting the residual left by previous stages.
12. Switch to PCA and show centering, covariance, PC1, and sample projection onto the dominant axis.
13. Switch to K-Means and show nearest-centroid assignment, inertia, and centroid movement.
14. Switch to Transformer Attention and show positional encoding, the causal mask, the two attention heads, then walk through `attention output -> residual/norm -> FFN/GELU -> residual/norm`.
15. Change the built-in dataset for one algorithm to prove the backend is driving different experiments instead of replaying one fixed demo.
16. Adjust the learning rate to explain stable updates vs overshoot on the trainable models.
17. Export the current run as Mermaid or Markdown and mention that these outputs can flow into CLI Anything.
18. Paste a small custom dataset and rerun the same explanation with your own points.
19. Switch the coach to Chinese and export Speaker Notes as your answer-presentation draft.
20. Use the Calculation Trace panel to explain each formula substitution step by step.
21. Click different trace cards to show how each formula maps back to the curve, feature map, hidden-state chain, residual block, boundary, tree split, forest vote, residual correction chain, centroid movement, projection line, or attention cells.
22. Switch to `Glossary` for CNN or Transformer and show that the page explains the key symbols before you dive into the formulas.
23. Switch to `Pseudo Code` and show the highlighted phase list before reading the raw pseudocode block.

## CLI Anything usage

CLI Anything should stay as an extension layer, not the project itself.

Good add-ons:
- export the current flow into draw.io or Mermaid
- generate an experiment summary PDF through LibreOffice
- materialize a notebook with the current snapshots for teaching
- create polished demo assets through external tools
