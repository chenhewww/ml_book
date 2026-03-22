export const PHASES = ["forward", "loss", "backward", "update"];

export function round(value, digits = 4) {
  const normalized = Number.isFinite(value) ? value : 0;
  return Number(normalized.toFixed(digits));
}

export function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

export function tanh(value) {
  return Math.tanh(value);
}

export function getTraceStatus(stepIndex, currentIndex) {
  if (stepIndex < currentIndex) {
    return "done";
  }
  if (stepIndex === currentIndex) {
    return "current";
  }
  return "upcoming";
}

export function getCurrentTraceIndex(phase) {
  return {
    forward: 1,
    loss: 2,
    backward: 3,
    update: 4,
  }[phase] ?? 0;
}

export function softmax(values) {
  const max = Math.max(...values);
  const shifted = values.map((value) => Math.exp(value - max));
  const total = shifted.reduce((sum, value) => sum + value, 0);
  return shifted.map((value) => round(value / total, 4));
}

export function dot(left, right) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

export function projectVector(vector, weights) {
  return weights.map((row) => round(dot(vector, row), 4));
}

export function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

export function binaryCrossEntropy(label, probability) {
  const clipped = Math.min(0.9999, Math.max(0.0001, probability));
  return round(-(label * Math.log(clipped) + (1 - label) * Math.log(1 - clipped)), 4);
}

export function reshapeGrid(flat, size = 5) {
  return Array.from({ length: size }, (_, rowIndex) =>
    flat.slice(rowIndex * size, rowIndex * size + size)
  );
}

export function flattenGrid(grid) {
  return grid.flat();
}

export function convolveValid(image, kernel) {
  const output = [];
  let bestValue = -Infinity;
  let bestPatch = [];
  for (let row = 0; row <= image.length - kernel.length; row += 1) {
    const nextRow = [];
    for (let column = 0; column <= image[0].length - kernel[0].length; column += 1) {
      let sum = 0;
      const patch = [];
      for (let kernelRow = 0; kernelRow < kernel.length; kernelRow += 1) {
        const patchRow = [];
        for (let kernelColumn = 0; kernelColumn < kernel[0].length; kernelColumn += 1) {
          const pixel = image[row + kernelRow][column + kernelColumn];
          patchRow.push(pixel);
          sum += pixel * kernel[kernelRow][kernelColumn];
        }
        patch.push(patchRow);
      }
      if (sum > bestValue) {
        bestValue = sum;
        bestPatch = patch;
      }
      nextRow.push(round(sum, 3));
    }
    output.push(nextRow);
  }
  return {
    map: output,
    bestPatch,
  };
}

export function reluGrid(grid) {
  return grid.map((row) => row.map((value) => round(Math.max(0, value), 3)));
}

export function maxGrid(grid) {
  return Math.max(...grid.flat());
}

export function roundGrid(grid, digits = 3) {
  return grid.map((row) => row.map((value) => round(value, digits)));
}

export function reluVector(vector) {
  return vector.map((value) => round(Math.max(0, value), 4));
}

export function addVectors(left, right) {
  return left.map((value, index) => round(value + right[index], 4));
}

export function buildPositionalEncoding(length, dimension = 4) {
  return Array.from({ length }, (_, position) =>
    Array.from({ length: dimension }, (_, index) => {
      const angle = position / Math.pow(10000, (2 * Math.floor(index / 2)) / dimension);
      return round(index % 2 === 0 ? Math.sin(angle) : Math.cos(angle), 4);
    })
  );
}

export function layerNormalize(vector) {
  const vectorMean = mean(vector);
  const variance = mean(vector.map((value) => (value - vectorMean) ** 2));
  const std = Math.sqrt(variance + 1e-5);
  return {
    normalized: vector.map((value) => round((value - vectorMean) / std, 4)),
    mean: round(vectorMean, 4),
    variance: round(variance, 4),
    std: round(std, 4),
  };
}

export function gelu(value) {
  return round(0.5 * value * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (value + 0.044715 * value ** 3))), 4);
}
