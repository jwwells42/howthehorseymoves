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

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.25,
  delay = 0,
) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = c.currentTime + delay;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + duration);
}

const SOUNDS = {
  move() {
    tone(800, 0.06, 'triangle', 0.3);
    tone(400, 0.04, 'square', 0.08, 0.01);
  },
  correct() {
    tone(523, 0.12, 'sine', 0.25);
    tone(659, 0.18, 'sine', 0.25, 0.1);
  },
  wrong() {
    tone(180, 0.2, 'square', 0.12);
  },
  stars() {
    tone(523, 0.15, 'sine', 0.25);
    tone(659, 0.15, 'sine', 0.25, 0.12);
    tone(784, 0.25, 'sine', 0.3, 0.24);
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
