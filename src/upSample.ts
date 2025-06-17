export function upSample(
  input: Float32Array,
  inputRate: number,
  outputRate: number
): Float32Array {
  if (inputRate > outputRate) {
    throw new Error("inputRate should be smaller than outputRate");
  }

  const ratio = outputRate / inputRate;
  const output = new Float32Array(Math.floor(input.length * ratio));

  for (let i = 0; i < output.length; i++) {
    const srcIndex = i / ratio;
    const low = Math.floor(srcIndex);
    const high = Math.min(input.length - 1, Math.ceil(srcIndex));
    const t = srcIndex - low;
    output[i] = (1 - t) * input[low] + t * input[high];
  }

  return output;
}
