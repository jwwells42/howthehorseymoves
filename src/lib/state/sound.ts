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

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    if (ctx.state !== 'running') return null;
    return ctx;
  } catch {
    return null;
  }
}

let warmedUp = false;
function warmUp() {
  if (warmedUp) return;
  warmedUp = true;
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* ignore */ }
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', warmUp, { once: true });
  document.addEventListener('keydown', warmUp, { once: true });
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.5,
  delay = 0,
) {
  const c = getCtx();
  if (!c) return;
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
    tone(600, 0.08, 'triangle', 0.5);
    tone(300, 0.05, 'square', 0.15, 0.01);
  },
  correct() {
    tone(523, 0.15, 'sine', 0.4);
    tone(659, 0.2, 'sine', 0.4, 0.12);
  },
  wrong() {
    tone(180, 0.25, 'square', 0.2);
  },
  stars() {
    tone(523, 0.2, 'sine', 0.4);
    tone(659, 0.2, 'sine', 0.4, 0.15);
    tone(784, 0.3, 'sine', 0.5, 0.3);
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
