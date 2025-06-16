function bitReduceSample(sample: number, bits: number): number {
  const maxInt = (1 << (bits - 1)) - 1;
  return Math.round(sample * maxInt) / maxInt;
}

export function bitReduce(input: Float32Array, bits: number): Float32Array {
  return Float32Array.from(input, (s) => bitReduceSample(s, bits));
}
