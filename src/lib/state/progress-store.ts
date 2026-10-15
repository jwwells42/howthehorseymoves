import { writable, derived, get } from 'svelte/store';
import { noteChange } from '$lib/state/storage';

export interface PuzzleProgress {
  completed: boolean;
  bestStars: number;
  bestMoves: number;
}

interface ProgressState {
  puzzles: Record<string, PuzzleProgress>;
  loaded: boolean;
}

export const STORAGE_KEY = 'horsey-progress';

const state = writable<ProgressState>({ puzzles: {}, loaded: false });

export const progressState = { subscribe: state.subscribe };
export const progressLoaded = derived(state, ($s) => $s.loaded);

function readStored(): Record<string, PuzzleProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

let listening = false;

export function initProgress() {
  reloadProgress();
  if (listening) return;
  listening = true;
  // Another tab saved: show its progress here too
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY || e.key === null) reloadProgress();
  });
}

/** Read progress again from localStorage, e.g. after another tab or sync wrote it. */
export function reloadProgress() {
  state.set({ puzzles: readStored(), loaded: true });
}

export function completePuzzle(puzzleId: string, stars: number, moves: number) {
  // Start from what is saved, not from this tab's copy: a tab left open since
  // yesterday would otherwise save its old copy over everything done since,
  // in another tab or on another device.
  const puzzles = readStored();
  const existing = puzzles[puzzleId];
  puzzles[puzzleId] = {
    completed: true,
    bestStars: Math.max(existing?.bestStars ?? 0, stars),
    bestMoves: existing?.bestMoves
      ? Math.min(existing.bestMoves, moves)
      : moves,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
  } catch {}
  state.set({ puzzles, loaded: true });
  noteChange();
}

export function isPuzzleUnlocked(puzzleId: string, allPuzzleIds: string[]): boolean {
  const s = get(state);
  const idx = allPuzzleIds.indexOf(puzzleId);
  if (idx <= 0) return true;
  const prevId = allPuzzleIds[idx - 1];
  return s.puzzles[prevId]?.completed ?? false;
}

export function getPuzzleProgress(puzzleId: string): PuzzleProgress | undefined {
  return get(state).puzzles[puzzleId];
}
