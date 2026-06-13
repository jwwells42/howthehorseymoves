// Lightweight localStorage prefs for the breathwork trainer.
// Mirrors the simple key-value pattern used elsewhere (e.g. `coord-best`),
// no JSON store machinery needed. All reads are guarded for SSR.

export type BreathMode = 'resonance' | 'sigh';

const KEYS = {
  mode: 'breathwork-last-mode',
  rate: 'breathwork-rate',
  sessionMins: 'breathwork-session-mins',
  sighExhale: 'breathwork-sigh-exhale',
} as const;

function read(key: string): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

function write(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, value);
}

function readNumber(key: string, fallback: number): number {
  const raw = read(key);
  if (raw == null) return fallback;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function loadMode(): BreathMode {
  return read(KEYS.mode) === 'sigh' ? 'sigh' : 'resonance';
}
export function saveMode(mode: BreathMode): void {
  write(KEYS.mode, mode);
}

export function loadRate(fallback = 5.5): number {
  return readNumber(KEYS.rate, fallback);
}
export function saveRate(rate: number): void {
  write(KEYS.rate, String(rate));
}

export function loadSessionMins(fallback = 10): number {
  return readNumber(KEYS.sessionMins, fallback);
}
export function saveSessionMins(mins: number): void {
  write(KEYS.sessionMins, String(mins));
}

export function loadSighExhale(fallback = 6): number {
  return readNumber(KEYS.sighExhale, fallback);
}
export function saveSighExhale(seconds: number): void {
  write(KEYS.sighExhale, String(seconds));
}
