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

// ── Audio file playback ──────────────────────────

export type SoundName = 'move' | 'correct' | 'wrong' | 'stars';

export function playSound(name: SoundName) {
  if (currentMuted) return;
  try {
    const audio = new Audio(`/sounds/${name}.wav`);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {
    // Audio not available
  }
}
