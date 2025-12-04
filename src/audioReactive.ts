// src/audioReactive.ts
// @ts-nocheck

export type AudioReactiveState = {
  time: number;
  duration: number;
  progress: number;

  level: number; // overall loudness
  bass: number; // low freqs
  mids: number; // mids
  treble: number; // highs

  onset: boolean; // "beat-ish" this frame
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

let audioElement: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let freqData: Uint8Array | null = null;

let lastBass = 0;
let lastOnsetTime = -999;
let hasTriedAutoplay = false;
let hasUnlockedAudio = false;

// --- math helpers ---
type BandSnapshot = {
  levelRaw: number;
  bassRaw: number;
  midsRaw: number;
  trebleRaw: number;
};

const smooth = (prev: number, curr: number, alpha = 0.8) =>
  prev * alpha + curr * (1 - alpha);

function computeBands(data: Uint8Array): BandSnapshot {
  const len = data.length;
  if (!len) return { levelRaw: 0, bassRaw: 0, midsRaw: 0, trebleRaw: 0 };

  const bassEnd = Math.floor(len * 0.15); // ~15% low
  const midEnd = Math.floor(len * 0.5); // next 35% mids

  let sumAll = 0;
  let sumBass = 0;
  let sumMids = 0;
  let sumTreble = 0;

  for (let i = 0; i < len; i++) {
    const v = data[i];
    sumAll += v;
    if (i < bassEnd) sumBass += v;
    else if (i < midEnd) sumMids += v;
    else sumTreble += v;
  }

  const norm = 255 * len;
  const bassNorm = 255 * bassEnd;
  const midsNorm = 255 * (midEnd - bassEnd);
  const trebleNorm = 255 * (len - midEnd);

  return {
    levelRaw: sumAll / norm,
    bassRaw: sumBass / (bassNorm || 1),
    midsRaw: sumMids / (midsNorm || 1),
    trebleRaw: sumTreble / (trebleNorm || 1),
  };
}

// --- autoplay / unlock helpers ---
export function initAudioAutoplay() {
  if (!audioElement) {
    audioElement = new Audio("/audio/track.mp3");
    audioElement.loop = true;
    audioElement.crossOrigin = "anonymous";
    audioElement.preload = "auto";
    audioElement.addEventListener("loadedmetadata", () => {
      audioState.duration = audioElement?.duration || 0;
    });
  }

  if (hasTriedAutoplay || !audioElement) return;
  hasTriedAutoplay = true;

  audioElement.muted = true;
  audioElement.volume = 0;
  audioElement.play().catch(() => {
    // autoplay blocked; will unlock on gesture
  });
}

export function unlockAudioFromGesture() {
  if (hasUnlockedAudio) return;
  hasUnlockedAudio = true;

  if (!audioElement) {
    audioElement = new Audio("/audio/track.mp3");
    audioElement.loop = true;
    audioElement.crossOrigin = "anonymous";
    audioElement.preload = "auto";
  }

  if (!audioContext) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AC();
  }

  // play a 1-sample silent buffer to unlock audio on Safari/iOS
  if (audioContext && audioContext.state !== "running") {
    const buffer = audioContext.createBuffer(1, 1, audioContext.sampleRate);
    const dummy = audioContext.createBufferSource();
    dummy.buffer = buffer;
    dummy.connect(audioContext.destination);
    dummy.start(0);
    audioContext.resume().catch(() => {});
  }

  if (audioContext && !analyser) {
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
  }

  if (audioContext && audioElement && !sourceNode) {
    sourceNode = audioContext.createMediaElementSource(audioElement);
    sourceNode.connect(analyser!);
    analyser!.connect(audioContext.destination);
  }

  if (analyser && !freqData) {
    freqData = new Uint8Array(analyser.frequencyBinCount);
  }

  if (audioElement) {
    audioElement.muted = false;
    audioElement.volume = 1;
    if (audioElement.paused) {
      audioElement.play().catch(() => {});
    }
  }
}

// compatibility wrappers (kept for existing imports)
export async function startAudio(options?: { muted?: boolean }) {
  initAudioAutoplay();
  if (options?.muted) return;
  unlockAudioFromGesture();
}

export async function unmuteAudio() {
  unlockAudioFromGesture();
}

// --- iframe API functions ---
function notifyParent(message: object) {
  if (window.parent !== window) {
    window.parent.postMessage(message, "*");
  }
}

export function setAudioUrl(url: string) {
  // Reset audio state for new track
  hasTriedAutoplay = false;
  hasUnlockedAudio = false;

  // Disconnect old source if exists
  if (sourceNode) {
    sourceNode.disconnect();
    sourceNode = null;
  }

  if (!audioElement) {
    audioElement = new Audio();
    audioElement.loop = true;
    audioElement.crossOrigin = "anonymous";
    audioElement.preload = "auto";
    audioElement.addEventListener("loadedmetadata", () => {
      audioState.duration = audioElement?.duration || 0;
    });
  }

  audioElement.src = url;
  audioElement.load();
  notifyParent({ type: "audioUrlSet" });
}

export function stopAudio() {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
  }
  notifyParent({ type: "audioStopped" });
}

export function setVolume(volume: number) {
  if (audioElement) {
    audioElement.volume = Math.max(0, Math.min(1, volume));
  }
  notifyParent({ type: "volumeSet", volume });
}

export function getStatus() {
  const status = {
    type: "status",
    playing: audioElement ? !audioElement.paused : false,
    currentTime: audioElement?.currentTime || 0,
    duration: audioState.duration,
    volume: audioElement?.volume || 1,
  };
  notifyParent(status);
  return status;
}

export function notifyReady() {
  notifyParent({ type: "ready" });
}

export function handleIframeMessage(data: any) {
  if (!data || typeof data !== "object") return;

  switch (data.type) {
    case "setAudioUrl":
      if (data.url) setAudioUrl(data.url);
      break;
    case "startAudio":
      unlockAudioFromGesture();
      notifyParent({ type: "audioStarted" });
      break;
    case "stopAudio":
      stopAudio();
      break;
    case "setVolume":
      if (typeof data.volume === "number") setVolume(data.volume);
      break;
    case "getStatus":
      getStatus();
      break;
  }
}

// called each frame from R3F
export function updateAudio(dt: number) {
  if (!audioElement) return;

  // timing always available
  audioState.time = audioElement.currentTime || 0;
  audioState.duration = audioElement.duration || audioState.duration;
  audioState.progress = audioState.duration
    ? audioState.time / audioState.duration
    : 0;

  if (!audioContext || !analyser || !freqData) return;

  analyser.getByteFrequencyData(freqData);

  const bands = computeBands(freqData);

  audioState.level = smooth(audioState.level, bands.levelRaw);
  audioState.bass = smooth(audioState.bass, bands.bassRaw);
  audioState.mids = smooth(audioState.mids, bands.midsRaw);
  audioState.treble = smooth(audioState.treble, bands.trebleRaw);

  // onset detection (unchanged)
  audioState.onset = false;
  audioState.timeSinceOnset += dt;

  const bass = audioState.bass;
  const bassChange = bass - lastBass;
  lastBass = bass;

  const THRESHOLD = 0.12; // tweak
  const MIN_INTERVAL = 0.12; // seconds

  if (bassChange > THRESHOLD && audioState.timeSinceOnset > MIN_INTERVAL) {
    audioState.onset = true;
    audioState.onsetStrength = bassChange;
    audioState.timeSinceOnset = 0;
    audioState.beatIndex += 1;
    lastOnsetTime = audioState.time;
  } else {
    audioState.onsetStrength = 0;
  }
}
