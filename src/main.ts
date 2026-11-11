import { bitReduce } from "./bitReduce";
import { downSample } from "./downSample";
import { encodeWAV } from "./encodeWAV";
import { lowPassIIR } from "./lowPassIIR";
import { repitch } from "./repitch";
import { stereoToMono } from "./stereoToMono";
import { upSample } from "./upSample";

interface AudioParam {
  targetSampleRate: number;
  targetBitDepth: number;
  octave: number;
}

const SampleRates = {
  "48kHz": 48000,
  "44.1kHz": 44100,
  "24kHz": 24000,
  "12kHz": 12000,
};

const params: AudioParam[] = [
  {
    targetSampleRate: SampleRates["24kHz"],
    targetBitDepth: 12,
    octave: 0,
  },
  {
    targetSampleRate: SampleRates["24kHz"],
    targetBitDepth: 12,
    octave: 1,
  },
  {
    targetSampleRate: SampleRates["24kHz"],
    targetBitDepth: 12,
    octave: 2,
  },
  {
    targetSampleRate: SampleRates["24kHz"],
    targetBitDepth: 8,
    octave: 0,
  },
  {
    targetSampleRate: SampleRates["24kHz"],
    targetBitDepth: 8,
    octave: 1,
  },
  {
    targetSampleRate: SampleRates["24kHz"],
    targetBitDepth: 8,
    octave: 2,
  },
  {
    targetSampleRate: SampleRates["12kHz"],
    targetBitDepth: 12,
    octave: 0,
  },
  {
    targetSampleRate: SampleRates["12kHz"],
    targetBitDepth: 12,
    octave: 1,
  },
  {
    targetSampleRate: SampleRates["12kHz"],
    targetBitDepth: 12,
    octave: 2,
  },
  {
    targetSampleRate: SampleRates["12kHz"],
    targetBitDepth: 8,
    octave: 0,
  },
  {
    targetSampleRate: SampleRates["12kHz"],
    targetBitDepth: 8,
    octave: 1,
  },
  {
    targetSampleRate: SampleRates["12kHz"],
    targetBitDepth: 8,
    octave: 2,
  },
];

function process(
  audioBuffer: AudioBuffer,
  targetSampleRate = SampleRates["24kHz"],
  targetBitDepth = 12,
  octave = 1
): [Float32Array, number, number] {
  audioBuffer = stereoToMono(audioBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;

  const interleaved = new Float32Array(audioBuffer.length * numberOfChannels);
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      interleaved[i * numberOfChannels + ch] =
        audioBuffer.getChannelData(ch)[i];
    }
  }

  let output = upSample(interleaved, sampleRate, SampleRates["48kHz"]);
  output = repitch(output, 12 * octave);
  output = downSample(output, SampleRates["48kHz"], targetSampleRate);
  output = bitReduce(output, targetBitDepth);
  output = lowPassIIR(output, targetSampleRate, (targetSampleRate * 2) / 3);
  output = repitch(output, -12 * octave);
  output = upSample(output, targetSampleRate, SampleRates["44.1kHz"]);
  // output = lowPassIIR(output, SampleRates["44.1kHz"], targetSampleRate * 2 / 3)

  return [output, SampleRates["44.1kHz"], numberOfChannels];
}


function makeExportFilename(
  originalName: string,
  sampleRate: number,
  bitDepth: number,
  repitchAmount: number
) {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  return `${nameWithoutExt}_${sampleRate}Hz_${bitDepth}bit_${
    repitchAmount > 0 ? repitchAmount : "un"
  }pre-pitched.wav`;
}

function formatSampleRate(hz: number) {
  return `${hz / 1000} kHz`;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const DEFAULT_DRAG_TEXT = "or drag & drop it here";

const byId = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const els = {
  inputContainer: byId<HTMLLabelElement>("input-container"),
  fileInput: byId<HTMLInputElement>("fileInput"),
  dragText: document.querySelector(".drag-text") as HTMLSpanElement,
  originalContainer: byId<HTMLElement>("original-container"),
  fileInfo: byId<HTMLParagraphElement>("file-info"),
  originalAudio: byId<HTMLAudioElement>("original-audio"),
  status: byId<HTMLDivElement>("status"),
  statusText: byId<HTMLSpanElement>("status-text"),
  statusProgress: byId<HTMLProgressElement>("status-progress"),
  results: byId<HTMLElement>("results"),
  audioContainer: byId<HTMLDivElement>("audio-container"),
};

let audioCtx: AudioContext;
let objectUrls: string[] = [];
let currentJob = 0;
let dragTextTimer: number | undefined;

function createUrl(blob: Blob) {
  const url = URL.createObjectURL(blob);
  objectUrls.push(url);
  return url;
}

function revokeUrls() {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls = [];
}

function setDragText(text: string, state: "default" | "selected" | "error") {
  clearTimeout(dragTextTimer);
  els.dragText.textContent = text;
  els.inputContainer.dataset.state = state;
}

function showError(message = "Please select an audio file") {
  setDragText(message, "error");
  dragTextTimer = window.setTimeout(
    () => setDragText(DEFAULT_DRAG_TEXT, "default"),
    3000
  );
}

function setStatus(text: string | null, progress = 0) {
  els.status.hidden = text === null;
  els.statusText.textContent = text ?? "";
  els.statusProgress.value = progress;
}

// Let the browser paint between heavy synchronous steps
const yieldToBrowser = () => new Promise<void>((r) => setTimeout(r, 0));

function createCard(name: string, url: string, param: AudioParam) {
  const { targetSampleRate, targetBitDepth, octave } = param;

  const card = document.createElement("article");
  card.className = "card";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = `${formatSampleRate(targetSampleRate)} / ${targetBitDepth}-bit`;

  const tag = document.createElement("span");
  tag.className = "card-tag";
  if (octave > 0) {
    tag.textContent = `+${octave} octave${octave > 1 ? "s" : ""} pre-pitch`;
    tag.classList.add("card-tag-active");
  } else {
    tag.textContent = "no pre-pitch";
  }

  const player = document.createElement("audio");
  player.controls = true;
  player.preload = "metadata";
  player.src = url;

  const download = document.createElement("a");
  download.className = "download-button";
  download.href = url;
  download.download = makeExportFilename(
    name,
    targetSampleRate,
    targetBitDepth,
    octave
  );
  download.textContent = "Download WAV";

  card.append(title, tag, player, download);
  return card;
}

async function loadFile(file: File): Promise<void> {
  // Any in-flight job for a previous file stops at its next checkpoint
  const job = ++currentJob;
  const isStale = () => job !== currentJob;

  setDragText(`${file.name} selected`, "selected");
  revokeUrls();
  els.audioContainer.replaceChildren();
  els.results.hidden = true;
  els.originalContainer.hidden = true;
  els.originalAudio.removeAttribute("src");
  setStatus("Decoding…");

  let decodedData;

  try {
    const arrayBuffer = await file.arrayBuffer();
    if (audioCtx) {
      audioCtx.close();
    }
    audioCtx = new window.AudioContext({ sampleRate: SampleRates["44.1kHz"] });
    decodedData = await audioCtx.decodeAudioData(arrayBuffer);
  } catch {
    if (!isStale()) {
      setStatus(null);
      showError();
    }
    return;
  }
  if (isStale()) return;

  let audioBuffer;

  try {
    const offlineCtx = new OfflineAudioContext(
      decodedData.numberOfChannels,
      decodedData.length,
      decodedData.sampleRate
    );
    const source = offlineCtx.createBufferSource();
    source.buffer = decodedData;

    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = 1;

    source.connect(gainNode).connect(offlineCtx.destination);
    source.start();

    audioBuffer = await offlineCtx.startRendering();
  } catch {
    if (!isStale()) {
      setStatus(null);
      showError("Something went wrong. Please try again");
    }
    return;
  }
  if (isStale()) return;

  {
    // Original Audio
    const { numberOfChannels, sampleRate } = audioBuffer;
    const interleaved = new Float32Array(audioBuffer.length * numberOfChannels);
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let ch = 0; ch < numberOfChannels; ch++) {
        interleaved[i * numberOfChannels + ch] =
          audioBuffer.getChannelData(ch)[i];
      }
    }
    const blob = encodeWAV(interleaved, sampleRate, numberOfChannels);
    els.originalAudio.src = createUrl(blob);
    els.fileInfo.textContent = `${file.name} · ${formatDuration(
      audioBuffer.duration
    )} · ${numberOfChannels === 1 ? "mono" : "stereo"}`;
    els.originalContainer.hidden = false;
  }

  // Processed Audio
  els.results.hidden = false;
  for (const [i, param] of params.entries()) {
    setStatus(`Processing ${i + 1} of ${params.length}…`, i / params.length);
    await yieldToBrowser();
    if (isStale()) return;

    const { targetSampleRate, targetBitDepth, octave } = param;
    const [output, sampleRate, numberOfChannels] = process(
      audioBuffer,
      targetSampleRate,
      targetBitDepth,
      octave
    );
    const url = createUrl(encodeWAV(output, sampleRate, numberOfChannels));
    els.audioContainer.append(createCard(file.name, url, param));
  }
  setStatus(null);
}

function main() {
  const { inputContainer, fileInput } = els;

  // Prevent the browser from opening files dropped anywhere on the page
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    document.body.addEventListener(eventName, (e) => e.preventDefault());
  });

  // Highlight drop area when item is dragged over it
  ["dragenter", "dragover"].forEach((eventName) => {
    inputContainer.addEventListener(eventName, () =>
      inputContainer.classList.add("drag-over")
    );
  });

  ["dragleave", "drop"].forEach((eventName) => {
    inputContainer.addEventListener(eventName, () =>
      inputContainer.classList.remove("drag-over")
    );
  });

  inputContainer.addEventListener("drop", (e: DragEvent) => {
    const audioFile = e.dataTransfer?.files[0];
    if (!audioFile) return;
    if (audioFile.type.startsWith("audio/")) {
      loadFile(audioFile);
    } else {
      showError();
    }
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) loadFile(file);
    // Allow re-selecting the same file
    fileInput.value = "";
  });

  // Only one player at a time, so variants are easy to A/B
  document.addEventListener(
    "play",
    (e) => {
      document.querySelectorAll("audio").forEach((audio) => {
        if (audio !== e.target) audio.pause();
      });
    },
    true
  );
}

main();
