// src/audioReactive.ts
// @ts-nocheck

export type AudioReactiveState = {
  time: number;
  duration: number;
  progress: number;

  level: number;   // overall loudness
  bass: number;    // low freqs
  mids: number;    // mids
  treble: number;  // highs

  onset: boolean;        // "beat-ish" this frame
  onsetStrength: number; // how strong
  timeSinceOnset: number;
  beatIndex: number;
};

export const audioState: AudioReactiveState = {
  time: 0,
  duration: 0,
  progress: 0,

  level: 0,
  bass: 0,
  mids: 0,
  treble: 0,

  onset: false,
  onsetStrength: 0,
  timeSinceOnset: 999,
  beatIndex: 0,
};

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let audioElement: HTMLAudioElement | null = null;
let freqData: Uint8Array | null = null;

let lastBass = 0;
let lastOnsetTime = -999;

// call this once on user click
export async function startAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  if (!audioElement) {
    audioElement = new Audio("/audio/track.mp3");
    audioElement.loop = true;
    audioElement.crossOrigin = "anonymous";
  }

  if (!sourceNode) {
    sourceNode = audioContext.createMediaElementSource(audioElement);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);

    freqData = new Uint8Array(analyser.frequencyBinCount);

    audioElement.addEventListener("loadedmetadata", () => {
      audioState.duration = audioElement.duration || 0;
    });
  }

  await audioContext.resume();
  await audioElement.play();
}

// called each frame from R3F
export function updateAudio(dt: number) {
  if (!audioContext || !analyser || !freqData || !audioElement) return;

  analyser.getByteFrequencyData(freqData);

  const len = freqData.length;
  if (!len) return;

  // simple 3-band split
  const bassEnd = Math.floor(len * 0.15); // ~15% low
  const midEnd = Math.floor(len * 0.5);   // next 35% mids

  let sumAll = 0;
  let sumBass = 0;
  let sumMids = 0;
  let sumTreble = 0;

  for (let i = 0; i < len; i++) {
    const v = freqData[i];
    sumAll += v;
    if (i < bassEnd) sumBass += v;
    else if (i < midEnd) sumMids += v;
    else sumTreble += v;
  }

  const norm = 255 * len;
  const bassNorm = 255 * bassEnd;
  const midsNorm = 255 * (midEnd - bassEnd);
  const trebleNorm = 255 * (len - midEnd);

  // crude normalization
  const levelRaw = sumAll / norm;
  const bassRaw = sumBass / (bassNorm || 1);
  const midsRaw = sumMids / (midsNorm || 1);
  const trebleRaw = sumTreble / (trebleNorm || 1);

  // simple smoothing
  const smooth = (prev: number, curr: number, alpha = 0.8) =>
    prev * alpha + curr * (1 - alpha);

  audioState.level = smooth(audioState.level, levelRaw);
  audioState.bass = smooth(audioState.bass, bassRaw);
  audioState.mids = smooth(audioState.mids, midsRaw);
  audioState.treble = smooth(audioState.treble, trebleRaw);

  // timing
  audioState.time = audioElement.currentTime || 0;
  audioState.progress = audioState.duration
    ? audioState.time / audioState.duration
    : 0;

  // onset detection (super dumb)
  audioState.onset = false;
  audioState.timeSinceOnset += dt;

  const now = audioState.time;
  const bass = audioState.bass;
  const bassChange = bass - lastBass;
  lastBass = bass;

  const THRESHOLD = 0.12;     // tweak
  const MIN_INTERVAL = 0.12;  // seconds

  if (
    bassChange > THRESHOLD &&
    audioState.timeSinceOnset > MIN_INTERVAL
  ) {
    audioState.onset = true;
    audioState.onsetStrength = bassChange;
    audioState.timeSinceOnset = 0;
    audioState.beatIndex += 1;
    lastOnsetTime = now;
  } else {
    audioState.onsetStrength = 0;
  }
}
