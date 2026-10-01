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
// Started from the WAV generation script (scripts/generate-sounds.js). The
// live sounds have since gained a soft attack, a filtered tap and a limiter,
// which the script doesn't have.

let ctx: AudioContext | null = null;
let output: AudioNode | null = null;

/** Shared AudioContext. Exported so other synth modules (e.g. breathwork drone)
 *  reuse the same context and benefit from the suspended-state resume. */
export function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Every sound goes out through one master volume and a limiter. Sounds often
 *  land together (a move and the stars, a bot's move and its capture), and
 *  without this their peaks add up past full scale and the tops get clipped,
 *  which is heard as a slight crackle. */
const MASTER_VOLUME = 0.8;

function getOutput(): AudioNode {
  const c = getCtx();
  if (!output) {
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -6; // dB below full scale: only loud overlaps are touched
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.15;
    limiter.connect(c.destination);

    const master = c.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(limiter);
    output = master;
  }
  return output;
}

/** A tone that starts from silence gets a few milliseconds to rise. Jumping
 *  straight to full volume makes a click, which reads as harshness. */
const ATTACK = 0.008;

/** Sine tone: a soft rise, then an exponential fade over `duration` seconds
 *  (time constant duration / 8, as in the WAV generator). */
function sine(freq: number, duration: number, volume: number, delay = 0) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  const t0 = c.currentTime + delay;

  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + ATTACK);
  gain.gain.setTargetAtTime(0, t0 + ATTACK, duration / 8);
  osc.connect(gain);
  gain.connect(getOutput());
  osc.start(t0);
  osc.stop(t0 + ATTACK + duration);
}

/** The move "tap": a short burst of noise. Raw noise is mostly hiss, so it is
 *  low-passed to leave a soft, wooden knock. */
function noiseBurst(duration: number, volume: number) {
  const c = getCtx();
  const sr = c.sampleRate;
  const n = Math.floor(sr * duration);
  const buffer = c.createBuffer(1, n, sr);
  const data = buffer.getChannelData(0);
  const rise = 0.002 * sr; // 2 ms, so even the tap has no hard edge
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const env = Math.min(1, i / rise) * Math.exp(-t * 15 / duration);
    data[i] = (Math.random() * 2 - 1) * volume * env;
  }
  const source = c.createBufferSource();
  source.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2400;
  filter.Q.value = 0.7;
  source.connect(filter);
  filter.connect(getOutput());
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
  botCaptures() {
    sine(440, 0.12, 0.3);
    sine(660, 0.15, 0.35, 0.08);
  },
  botCaptured() {
    sine(440, 0.12, 0.3);
    sine(330, 0.15, 0.25, 0.08);
  },
  botReact() {
    sine(600, 0.08, 0.2);
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
