export function monoToStereo(buffer: AudioBuffer): AudioBuffer {
  if (buffer.numberOfChannels > 1) return buffer; // already stereo

  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const mono = buffer.getChannelData(0);

  const stereoBuffer = new AudioContext().createBuffer(2, length, sampleRate);
  stereoBuffer.copyToChannel(mono, 0); // left
  stereoBuffer.copyToChannel(mono, 1); // right

  return stereoBuffer;
}
