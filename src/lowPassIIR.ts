export function lowPassIIR(
  input: Float32Array,
  sampleRate: number,
  cutoffHz: number
): Float32Array {
  const output = new Float32Array(input.length);

  // const rc = 1 / (2 * Math.PI * cutoffHz);
  // const dt = 1 / sampleRate;
  // const alpha = dt / (rc + dt);

  const r = 2 * Math.PI * cutoffHz;
  const alpha = r / (r + sampleRate);

  output[0] = input[0];
  for (let i = 1; i < input.length; i++) {
    output[i] = alpha * input[i] + (1 - alpha) * output[i - 1];
  }

  return output;
}
