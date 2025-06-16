export function repitch(input: Float32Array, semitones: number): Float32Array {
  const ratio = Math.pow(2, semitones / 12);
  const newLength = Math.floor(input.length / ratio);
  const output = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const low = Math.floor(srcIndex);
    const high = Math.min(input.length - 1, Math.ceil(srcIndex));
    const t = srcIndex - low;
    output[i] = (1 - t) * input[low] + t * input[high];
  }

  return output;
}
