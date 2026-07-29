// Probability math for The Probabilitizer, ported from EikaMikiku's
// Opening-Explorer-Plus (https://github.com/EikaMikiku/Opening-Explorer-Plus).
//
// At each position, a move's conditional probability is its share of the games
// played there. The chance a whole line arises from the start is the product of
// these conditional probabilities — split by mover, because you control your own
// moves and only the opponent's replies are uncertain.

import type { PieceColor } from "$lib/logic/types";
import type { ExplorerData } from "./lichess";

/** Total games across all moves listed at a position. */
function totalGames(data: ExplorerData): number {
  let total = 0;
  for (const m of data.moves) total += m.white + m.draws + m.black;
  return total;
}

/**
 * Conditional probability of the given UCI move at this position:
 * (games with that move) / (games across all listed moves). 0 if unseen or 0/0.
 */
export function moveProbability(data: ExplorerData, uci: string): number {
  const total = totalGames(data);
  if (total === 0) return 0;
  const move = data.moves.find((m) => m.uci === uci);
  if (!move) return 0;
  const games = move.white + move.draws + move.black;
  return games / total;
}

/** Share of games for a single move at this position (for the explorer bars). */
export function movePlayRate(data: ExplorerData, move: ExplorerData["moves"][number]): number {
  const total = totalGames(data);
  if (total === 0) return 0;
  return (move.white + move.draws + move.black) / total;
}

export interface LineMove {
  side: PieceColor;
  prob: number;
  excluded: boolean;
}

export interface LineTotals {
  /** Product of White's move probabilities (chance Black reaches the line). */
  whiteProb: number;
  /** Product of Black's move probabilities (chance White reaches the line). */
  blackProb: number;
  whiteCount: number; // non-excluded White moves
  blackCount: number; // non-excluded Black moves
}

/**
 * Cumulative products of conditional probabilities, split by mover. Excluded
 * moves are treated as forced (probability 1) and left out of the product.
 */
export function lineTotals(moves: LineMove[]): LineTotals {
  let whiteProb = 1;
  let blackProb = 1;
  let whiteCount = 0;
  let blackCount = 0;
  for (const m of moves) {
    if (m.excluded) continue;
    if (m.side === "w") {
      whiteProb *= m.prob;
      whiteCount++;
    } else {
      blackProb *= m.prob;
      blackCount++;
    }
  }
  return { whiteProb, blackProb, whiteCount, blackCount };
}
