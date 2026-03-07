"use client";

import { createContext, useCallback, useContext, useEffect, useReducer } from "react";

interface PuzzleProgress {
  completed: boolean;
  bestStars: number;
  bestMoves: number;
}

interface ProgressState {
  puzzles: Record<string, PuzzleProgress>;
  loaded: boolean;
}

type ProgressAction =
  | { type: "LOAD"; data: Record<string, PuzzleProgress> }
  | { type: "COMPLETE_PUZZLE"; puzzleId: string; stars: number; moves: number };

function progressReducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case "LOAD":
      return { puzzles: action.data, loaded: true };
    case "COMPLETE_PUZZLE": {
      const existing = state.puzzles[action.puzzleId];
      const best: PuzzleProgress = {
        completed: true,
        bestStars: Math.max(existing?.bestStars ?? 0, action.stars),
        bestMoves: existing?.bestMoves
          ? Math.min(existing.bestMoves, action.moves)
          : action.moves,
      };
      return {
        ...state,
        puzzles: { ...state.puzzles, [action.puzzleId]: best },
      };
    }
  }
}

interface ProgressContextValue {
  state: ProgressState;
  completePuzzle: (puzzleId: string, stars: number, moves: number) => void;
  isPuzzleUnlocked: (puzzleId: string, allPuzzleIds: string[]) => boolean;
  getPuzzleProgress: (puzzleId: string) => PuzzleProgress | undefined;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

const STORAGE_KEY = "horsey-progress";

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(progressReducer, { puzzles: {}, loaded: false });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      dispatch({ type: "LOAD", data: raw ? JSON.parse(raw) : {} });
    } catch {
      dispatch({ type: "LOAD", data: {} });
    }
  }, []);

  useEffect(() => {
    if (state.loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.puzzles));
    }
  }, [state.puzzles, state.loaded]);

  const completePuzzle = useCallback((puzzleId: string, stars: number, moves: number) => {
    dispatch({ type: "COMPLETE_PUZZLE", puzzleId, stars, moves });
  }, []);

  const isPuzzleUnlocked = useCallback(
    (puzzleId: string, allPuzzleIds: string[]) => {
      const idx = allPuzzleIds.indexOf(puzzleId);
      if (idx <= 0) return true; // first puzzle always unlocked
      const prevId = allPuzzleIds[idx - 1];
      return state.puzzles[prevId]?.completed ?? false;
    },
    [state.puzzles]
  );

  const getPuzzleProgress = useCallback(
    (puzzleId: string) => state.puzzles[puzzleId],
    [state.puzzles]
  );

  return (
    <ProgressContext.Provider value={{ state, completePuzzle, isPuzzleUnlocked, getPuzzleProgress }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
