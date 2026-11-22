/**
 * A whole game checked by Stockfish, as Lichess does it: every position of
 * the main line searched to the same budget, and each move judged by how much
 * it dropped the mover's winning chances. Pure, so the server can count the
 * marks from what the browser sends, and src/library.test.ts can test it.
 */

import type { PieceColor } from '$lib/logic/types';
import { parseGamePgn, extractMainLine, type Score } from '$lib/logic/pgn';
import { boardToFen } from '$lib/logic/fen';
import { isCheckmate, isStalemate } from '$lib/logic/attacks';
import { winChance } from './uci';

export type Mark = '?!' | '?' | '??';
export const MARKS: Mark[] = ['?!', '?', '??'];

/** What's saved in horsey_library.analysis */
export interface GameAnalysis {
  /** Stockfish nodes searched per position */
  nodes: number;
  /**
   * One per position of the main line, the start first: evals[i] is the
   * position after i moves, from White's side. `{ mate: 0 }` is a position
   * where the side to move is checkmated.
   */
  evals: Score[];
  /** Stockfish's move in each position, as UCI (null where the game is over) */
  best: (string | null)[];
}

/** A position of a game's main line, as the engine is sent it */
export interface GamePosition {
  fen: string;
  color: PieceColor;
  /** The game is over here: no search, and its eval is known */
  over: Score | null;
}

/** Every position of a game's main line, the start first (games start with White to move) */
export function gamePositions(pgn: string): GamePosition[] {
  const { positions } = extractMainLine(parseGamePgn(pgn));
  return positions.map((board, i) => {
    const color = moverOf(i);
    const over = isCheckmate(color, board) ? { mate: 0 } : isStalemate(color, board) ? { cp: 0 } : null;
    return { fen: boardToFen(board, color, Math.floor(i / 2) + 1), color, over };
  });
}

/** Lichess's thresholds, on its winning-chances scale (−1 to 1) */
const DROPS: [number, Mark][] = [
  [0.3, '??'],
  [0.2, '?'],
  [0.1, '?!'],
];

/**
 * One move, from the evals before and after it (Lichess's Advice.scala).
 * Between two centipawn scores: by the drop in winning chances. Where a mate
 * score is involved: allowing a mate, or letting one slip, is ?? unless the
 * mover was already that far behind (allowing) or is still that far ahead
 * (letting slip). Delivering mate, or a slower mate, isn't marked.
 */
export function judge(before: Score, after: Score, mover: PieceColor): Mark | null {
  const sign = mover === 'w' ? 1 : -1;
  if ('cp' in before && 'cp' in after) {
    const drop = (winChance(before) - winChance(after)) * sign;
    return DROPS.find(([d]) => drop >= d)?.[1] ?? null;
  }
  const mateBefore = 'mate' in before ? before.mate * sign : null; // > 0: the mover mates
  const mateAfter = 'mate' in after && after.mate !== 0 ? after.mate * sign : null;
  const cpBefore = 'cp' in before ? before.cp * sign : 0;
  const cpAfter = 'cp' in after ? after.cp * sign : 0;
  if (mateBefore === null && mateAfter !== null && mateAfter < 0) {
    return cpBefore < -999 ? '?!' : cpBefore < -700 ? '?' : '??';
  }
  if (mateBefore !== null && mateBefore > 0 && 'mate' in after && after.mate === 0) return null;
  if (mateBefore !== null && mateBefore > 0 && (mateAfter === null || mateAfter < 0)) {
    return cpAfter > 999 ? '?!' : cpAfter > 700 ? '?' : '??';
  }
  return null;
}

/** Who moves first; then they take turns */
export function moverOf(ply: number, first: PieceColor = 'w'): PieceColor {
  return (ply % 2 === 0) === (first === 'w') ? 'w' : 'b';
}

/** marks[i] is the mark of move i + 1 (the move from evals[i] to evals[i + 1]) */
export function markMoves(evals: Score[], first: PieceColor = 'w'): (Mark | null)[] {
  return evals.slice(1).map((after, i) => judge(evals[i], after, moverOf(i, first)));
}

/** Kept in the game's summary, so the list can show and sort by them */
export interface MarkCounts {
  /** [White's, Black's] */
  inaccuracies: [number, number];
  mistakes: [number, number];
  blunders: [number, number];
}

export function countMarks(marks: (Mark | null)[], first: PieceColor = 'w'): MarkCounts {
  const counts: MarkCounts = { inaccuracies: [0, 0], mistakes: [0, 0], blunders: [0, 0] };
  const name = { '?!': 'inaccuracies', '?': 'mistakes', '??': 'blunders' } as const;
  marks.forEach((mark, i) => {
    if (mark) counts[name[mark]][moverOf(i, first) === 'w' ? 0 : 1]++;
  });
  return counts;
}

/** Winning chances from White's side (−1 to 1), where `toMove` is to move */
export function whiteChance(score: Score, toMove: PieceColor): number {
  if ('mate' in score && score.mate === 0) return toMove === 'w' ? -1 : 1;
  return winChance(score);
}

function isScore(x: unknown): x is Score {
  if (!x || typeof x !== 'object') return false;
  const keys = Object.keys(x);
  if (keys.length !== 1) return false;
  const n = (x as Record<string, unknown>)[keys[0]];
  return (keys[0] === 'cp' || keys[0] === 'mate') && Number.isInteger(n) && Math.abs(n as number) <= 100_000;
}

/**
 * An analysis sent to the server, checked: one eval and one best move per
 * position of a game of `plies` moves. Anything else is null.
 */
export function readAnalysis(x: unknown, plies: number): GameAnalysis | null {
  if (!x || typeof x !== 'object') return null;
  const { nodes, evals, best } = x as Record<string, unknown>;
  if (!Number.isInteger(nodes) || (nodes as number) < 1 || (nodes as number) > 1e9) return null;
  if (!Array.isArray(evals) || evals.length !== plies + 1 || !evals.every(isScore)) return null;
  if (!Array.isArray(best) || best.length !== plies + 1) return null;
  if (!best.every((m) => m === null || (typeof m === 'string' && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m)))) return null;
  return { nodes: nodes as number, evals: evals as Score[], best: best as (string | null)[] };
}
