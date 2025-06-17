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

function processAudio(
  name: string,
  audioBuffer: AudioBuffer,
  param: AudioParam
) {
  const { targetSampleRate, targetBitDepth, octave } = param;
  const [output, sampleRate, numberOfChannels] = process(
    audioBuffer,
    targetSampleRate,
    targetBitDepth,
    octave
  );
  const blob = encodeWAV(output, sampleRate, numberOfChannels);
  const url = URL.createObjectURL(blob);
  const handle = `${targetSampleRate}_${targetBitDepth}_${octave}`;
  // Sub Container
  let section = document.getElementById(`section_${handle}`) as HTMLDivElement;
  if (!section) {
    section = document.createElement("div");
    section.id = `section_${handle}`;
    document.getElementById("audio-container")?.appendChild(section);
  }
  // Title Text
  let title = document.getElementById(
    `title_${handle}`
  ) as HTMLParagraphElement;
  if (!title) {
    title = document.createElement("p");
    title.id = `title_${handle}`;
    section.appendChild(title);
  }
  title.innerHTML = `${targetSampleRate}Hz / ${targetBitDepth}bit${
    octave > 0
      ? `<br/><span class="small-text">${octave} octave${
          octave > 1 ? "s" : ""
        } pre-pitched<span>`
      : ""
  }`;
  // Audio Player
  let player = document.getElementById(`audio_${handle}`) as HTMLAudioElement;
  if (!player) {
    player = document.createElement("audio");
    player.id = `audio_${handle}`;
    player.controls = true;
    section.appendChild(player);
  }
  player.src = url;
  // Download Button
  let button = document.getElementById(`button_${handle}`) as HTMLButtonElement;
  if (button) {
    section.removeChild(button);
  }
  button = document.createElement("button");
  button.id = `button_${handle}`;
  button.innerText = "download";
  button.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = makeExportFilename(
      name,
      targetSampleRate,
      targetBitDepth,
      octave
    );
    a.click();
  });
  section.appendChild(button);
}

let audioCtx: AudioContext;

async function onFileChange(e: any): Promise<void> {
  const file = e.target.files[0];
  if (!file) return;

  const inputContainer = document.getElementById(
    "input-container"
  ) as HTMLDivElement;
  const dragText = inputContainer.querySelector(
    ".drag-text"
  ) as HTMLParagraphElement;
  dragText.textContent = `✅ ${file.name} selected`;
  dragText.style.color = "var(--mpc-red)";
  const originalAudio = document.getElementById(
    "original-audio"
  ) as HTMLAudioElement;
  if (originalAudio) {
    inputContainer.removeChild(originalAudio);
  }

  const audioContainer = document.getElementById(
    "audio-container"
  ) as HTMLDivElement;
  audioContainer.innerHTML = "";

  // console.log(file);
  let decodedData;

  try {
    const arrayBuffer = await file.arrayBuffer();
    if (audioCtx) {
      audioCtx.close();
      // console.log("close audio context");
    }
    audioCtx = new window.AudioContext({ sampleRate: SampleRates["44.1kHz"] });
    decodedData = await audioCtx.decodeAudioData(arrayBuffer);
  } catch {
    handleDropError();
    return;
  }

  // console.log(decodedData)
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
    // TODO: handle error
    return;
  }

  {
    const { numberOfChannels, sampleRate } = audioBuffer;
    const interleaved = new Float32Array(audioBuffer.length * numberOfChannels);
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let ch = 0; ch < numberOfChannels; ch++) {
        interleaved[i * numberOfChannels + ch] =
          audioBuffer.getChannelData(ch)[i];
      }
    }
    const blob = encodeWAV(interleaved, sampleRate, numberOfChannels);
    const url = URL.createObjectURL(blob);
    let player = document.getElementById("original-audio") as HTMLAudioElement;
    if (!player) {
      player = document.createElement("audio");
      player.id = "original-audio";
      player.controls = true;
      inputContainer.appendChild(player);
    }
    player.src = url;
  }

  params.forEach((param) => processAudio(file.name, audioBuffer, param));
}

function handleDropError() {
  const inputContainer = document.getElementById(
    "input-container"
  ) as HTMLDivElement;
  // Show error for non-audio files
  const dragText = inputContainer.querySelector(
    ".drag-text"
  ) as HTMLParagraphElement;
  dragText.textContent = "❌ Please select an audio file";
  dragText.style.color = "var(--text-error)";

  // Reset text after 3 seconds
  setTimeout(() => {
    dragText.textContent = "📁 Select an audio file or drag & drop here";
    dragText.style.color = "var(--text-secondary)";
  }, 3000);
}

function main() {
  // Drag and Drop functionality
  const inputContainer = document.getElementById(
    "input-container"
  ) as HTMLDivElement;
  const fileInput = document.getElementById("fileInput") as HTMLInputElement;

  // Prevent default drag behaviors
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    inputContainer.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  // Highlight drop area when item is dragged over it
  ["dragenter", "dragover"].forEach((eventName) => {
    inputContainer.addEventListener(eventName, highlight, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    inputContainer.addEventListener(eventName, unhighlight, false);
  });

  // Handle dropped files
  inputContainer.addEventListener("drop", handleDrop, false);

  // Make the entire container clickable
  // inputContainer.addEventListener("click", () => {
  //   fileInput.click();
  // });

  function preventDefaults(e: Event) {
    e.preventDefault();
    e.stopPropagation();
  }

  function highlight() {
    inputContainer.classList.add("drag-over");
  }

  function unhighlight() {
    inputContainer.classList.remove("drag-over");
  }

  function handleDrop(e: DragEvent) {
    const dt = e.dataTransfer;
    if (!dt) {
      return;
    }
    const files = dt.files;

    if (files.length > 0) {
      const audioFile = files[0];
      // Check if it's an audio file
      if (audioFile.type.startsWith("audio/")) {
        // Create a new FileList and assign it to the input
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(audioFile);
        fileInput.files = dataTransfer.files;

        // Trigger change event
        const event = new Event("change", { bubbles: true });
        fileInput.dispatchEvent(event);

        // Update the text to show file name
        const dragText = inputContainer.querySelector(
          ".drag-text"
        ) as HTMLParagraphElement;
        dragText.textContent = `✅ ${audioFile.name} selected`;
        dragText.style.color = "var(--mpc-red)";
      } else {
        handleDropError();
      }
    }
  }

  fileInput.addEventListener("change", onFileChange);
}

main();
