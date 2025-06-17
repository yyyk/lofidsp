export function downSample(
  input: Float32Array,
  inputRate: number,
  outputRate: number
): Float32Array {
  if (inputRate < outputRate) {
    throw new Error("inputRate should be larger than outputRate");
  }

  const ratio = inputRate / outputRate;
  const output = new Float32Array(Math.floor(input.length / ratio));

  for (let i = 0; i < output.length; i++) {
    output[i] = input[Math.floor(i * ratio)];
  }

  return output;
}
