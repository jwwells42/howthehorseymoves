import { writable } from 'svelte/store';

const STORAGE_KEY = 'horsey-muted';

export const soundMuted = writable(false);

let currentMuted = false;
soundMuted.subscribe((v) => {
  currentMuted = v;
});

export function initSound() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'true') soundMuted.set(true);
}

export function toggleMuted(): void {
  soundMuted.update((v) => {
    const next = !v;
    localStorage.setItem(STORAGE_KEY, String(next));
    return next;
  });
}

// ── Web Audio synthesis ──────────────────────────
// Matches the WAV generation script (scripts/generate-sounds.js)
// that produced the sounds used during WAV playback.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Sine tone with exponential decay envelope matching the WAV generator. */
function sine(freq: number, duration: number, volume: number, delay = 0) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  const sr = c.sampleRate;
  const n = Math.floor(sr * duration);
  const t0 = c.currentTime + delay;

  // Replicate: env = exp(-t * 8 / duration) per sample
  // Web Audio doesn't have a per-sample exp envelope, but
  // setValueCurveAtTime lets us supply an exact envelope.
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    curve[i] = volume * Math.exp(-t * 8 / duration);
  }

  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueCurveAtTime(curve, t0, duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration);
}

/** Noise burst with exponential decay (for the move "tap" sound). */
function noiseBurst(duration: number, volume: number) {
  const c = getCtx();
  const sr = c.sampleRate;
  const n = Math.floor(sr * duration);
  const buffer = c.createBuffer(1, n, sr);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 15 / duration);
    data[i] = (Math.random() * 2 - 1) * volume * env;
  }
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.connect(c.destination);
  source.start(c.currentTime);
}

const SOUNDS = {
  move() {
    noiseBurst(0.06, 0.4);
    sine(800, 0.05, 0.3);
    sine(400, 0.04, 0.15);
  },
  correct() {
    sine(523, 0.15, 0.45);
    sine(659, 0.2, 0.45, 0.1);
  },
  wrong() {
    sine(180, 0.25, 0.35);
    sine(220, 0.2, 0.15);
  },
  stars() {
    sine(523, 0.2, 0.4);
    sine(659, 0.2, 0.4, 0.15);
    sine(784, 0.35, 0.5, 0.3);
  },
};

export type SoundName = keyof typeof SOUNDS;

export function playSound(name: SoundName) {
  if (currentMuted) return;
  try {
    SOUNDS[name]();
  } catch {
    // AudioContext not available
  }
}
