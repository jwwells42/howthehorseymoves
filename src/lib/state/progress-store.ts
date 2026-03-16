import { writable, derived, get } from 'svelte/store';

export interface PuzzleProgress {
  completed: boolean;
  bestStars: number;
  bestMoves: number;
}

interface ProgressState {
  puzzles: Record<string, PuzzleProgress>;
  loaded: boolean;
}

const STORAGE_KEY = 'horsey-progress';

const state = writable<ProgressState>({ puzzles: {}, loaded: false });

export const progressState = { subscribe: state.subscribe };
export const progressLoaded = derived(state, ($s) => $s.loaded);

export function initProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.set({ puzzles: raw ? JSON.parse(raw) : {}, loaded: true });
  } catch {
    state.set({ puzzles: {}, loaded: true });
  }
}

function save(puzzles: Record<string, PuzzleProgress>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzles));
}

export function completePuzzle(puzzleId: string, stars: number, moves: number) {
  state.update((s) => {
    const existing = s.puzzles[puzzleId];
    const best: PuzzleProgress = {
      completed: true,
      bestStars: Math.max(existing?.bestStars ?? 0, stars),
      bestMoves: existing?.bestMoves
        ? Math.min(existing.bestMoves, moves)
        : moves,
    };
    const puzzles = { ...s.puzzles, [puzzleId]: best };
    save(puzzles);
    return { ...s, puzzles };
  });
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
