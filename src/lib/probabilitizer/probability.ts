// Probability math for The Probabilitizer, ported from EikaMikiku's
// Opening-Explorer-Plus (https://github.com/EikaMikiku/Opening-Explorer-Plus).
//
// At each position, a move's conditional probability is its share of the games
// played there. The chance a whole line arises from the start is the product of
// these conditional probabilities — split by mover, because you control your own
// moves and only the opponent's replies are uncertain.

import type { PieceColor } from "$lib/logic/types";
import type { ExplorerData } from "./lichess";

/**
 * Games that ever reached this position, by ANY move order. The explorer is
 * position-keyed (Zobrist), so this total already includes transpositions —
 * unlike the per-move counts, which are edge counts from this position only.
 */
export function nodeTotal(data: ExplorerData): number {
  return data.white + data.draws + data.black;
}

/**
 * Conditional probability of the given UCI move at this position:
 * (games with that move) / (all games at this position). 0 if unseen or 0/0.
 *
 * The denominator is `nodeTotal`, not the sum of the listed moves, so this is a
 * true conditional probability. Dividing by the listed-move sum would instead
 * condition on "played one of the top 20 moves", inflating every ply — which
 * matters because the product of these is compared against the position's own
 * share of the database.
 */
export function moveProbability(data: ExplorerData, uci: string): number {
  const total = nodeTotal(data);
  if (total === 0) return 0;
  const move = data.moves.find((m) => m.uci === uci);
  if (!move) return 0;
  const games = move.white + move.draws + move.black;
  return games / total;
}

/**
 * Share of games for a single move at this position (for the explorer bars).
 * These sum to slightly under 100%: games that *ended* here, and moves past the
 * top-20 cap, are in the denominator but have no row of their own.
 */
export function movePlayRate(data: ExplorerData, move: ExplorerData["moves"][number]): number {
  const total = nodeTotal(data);
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
  /**
   * Product of BOTH movers' probabilities — the chance a game follows this exact
   * move order from the start, with neither side's moves taken as given. This is
   * the like-for-like counterpart to the position's own share of the database
   * (`nodeTotal(position) / nodeTotal(start)`); the two differ only by the games
   * that reached the same position via a different move order.
   */
  pathProb: number;
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
  return { whiteProb, blackProb, pathProb: whiteProb * blackProb, whiteCount, blackCount };
}
