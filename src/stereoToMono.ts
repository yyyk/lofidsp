export function stereoToMono(buffer: AudioBuffer): AudioBuffer {
  if (buffer.numberOfChannels < 2) return buffer; // already mono

  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const mono = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    mono[i] = (left[i] + right[i]) / 2;
  }

  const monoBuffer = new AudioContext().createBuffer(1, length, sampleRate);
  monoBuffer.copyToChannel(mono, 0);
  return monoBuffer;
}
