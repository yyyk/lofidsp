function lowPassFilter(input: Float32Array, alpha: number): Float32Array {
  const output = new Float32Array(input.length);
  output[0] = input[0];
  for (let i = 1; i < input.length; i++) {
    output[i] = alpha * input[i] + (1 - alpha) * output[i - 1];
  }
  return output;
}

export function downSample(
  input: Float32Array,
  inputRate: number,
  outputRate: number,
  clean = false
): Float32Array {
  if (inputRate < outputRate) {
    throw new Error("inputRate should be larger than outputRate");
  }

  const ratio = inputRate / outputRate;
  const source = clean ? lowPassFilter(input, 0.1) : input;
  const output = new Float32Array(Math.floor(source.length / ratio));

  for (let i = 0; i < output.length; i++) {
    output[i] = source[Math.floor(i * ratio)];
  }

  return output;
}
