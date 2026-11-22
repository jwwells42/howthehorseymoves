/**
 * Runs Stockfish over every position of a game (see review.ts), in the
 * browser. The library's game page checks one game; the library page checks
 * many at once, one Engine (one worker) each.
 */

import type { Score } from '$lib/logic/pgn';
import type { Engine } from './stockfish';
import type { GameAnalysis, GamePosition } from './review';

/**
 * Nodes per position. Measured 2026-11-21 on the dev desktop (see CLAUDE.md,
 * Games library): set from how often the marks agree with a much deeper search.
 */
export const CHECK_NODES = 100_000;

/** The analysis, or null if `stopped()` turned true (or a search came back empty) */
export async function checkGame(
  engine: Engine,
  positions: GamePosition[],
  onProgress?: (done: number) => void,
  stopped: () => boolean = () => false,
): Promise<GameAnalysis | null> {
  const evals: Score[] = [];
  const best: (string | null)[] = [];
  for (const [i, position] of positions.entries()) {
    if (stopped()) return null;
    if (position.over) {
      evals.push(position.over);
      best.push(null);
    } else {
      const result = await engine.analyse(position.fen, position.color, { nodes: CHECK_NODES });
      const line = result.lines[0];
      if (stopped() || !line) return null;
      evals.push(line.score);
      best.push(result.bestmove);
    }
    onProgress?.(i + 1);
  }
  return { nodes: CHECK_NODES, evals, best };
}
