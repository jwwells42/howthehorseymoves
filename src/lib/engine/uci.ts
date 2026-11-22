/**
 * The engine's language (UCI) turned into the app's: scores from White's side,
 * moves as from/to squares and SAN. Pure functions, no worker, so they can be
 * tested on their own. The worker itself is in stockfish.ts.
 */

import type { BoardState, PieceColor, PieceKind, SquareId } from '$lib/logic/types';
import { applyMove, toSan } from '$lib/logic/pgn';

/** A score from White's side: centipawns, or mate in N (N > 0: White mates, N < 0: Black mates). */
export type Score = { cp: number } | { mate: number };

export interface UciMove {
  from: SquareId;
  to: SquareId;
  promotion?: PieceKind;
}

/** One of the engine's best lines, as it last reported it. */
export interface EngineLine {
  /** 1 = the best line, 2 = the second best, … */
  rank: number;
  depth: number;
  score: Score;
  /** The line in UCI (e2e4 e7e5 …) */
  pv: string[];
}

/** "e7e8q" → { from: e7, to: e8, promotion: Q }. Castling is the king's move (e1g1). */
export function readUciMove(uci: string): UciMove | null {
  const m = uci.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);
  if (!m) return null;
  return {
    from: m[1] as SquareId,
    to: m[2] as SquareId,
    promotion: m[3] ? (m[3].toUpperCase() as PieceKind) : undefined,
  };
}

/**
 * An `info` line, or null when it isn't a line worth showing (no score or pv,
 * or only a bound while the engine is still searching).
 * `color` is the side to move: the engine scores from its side, we from White's.
 */
export function readInfo(line: string, color: PieceColor): EngineLine | null {
  if (!line.startsWith('info ') || line.includes(' bound ') || /\b(upper|lower)bound\b/.test(line)) return null;
  const depth = line.match(/\bdepth (\d+)/);
  const rank = line.match(/\bmultipv (\d+)/);
  const score = line.match(/\bscore (cp|mate) (-?\d+)/);
  const pv = line.match(/\bpv (.+)$/);
  if (!depth || !score || !pv) return null;
  const sign = color === 'w' ? 1 : -1;
  const n = parseInt(score[2], 10) * sign;
  return {
    rank: rank ? parseInt(rank[1], 10) : 1,
    depth: parseInt(depth[1], 10),
    score: score[1] === 'cp' ? { cp: n } : { mate: n },
    pv: pv[1].trim().split(/\s+/),
  };
}

/** White's winning chances from -1 (Black wins) to 1 (White wins): Lichess's curve. */
export function winChance(score: Score): number {
  if ('mate' in score) return score.mate > 0 ? 1 : -1;
  const cp = Math.max(-1000, Math.min(1000, score.cp));
  return 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
}

/** +0.3, -1.2, #3, #-3 */
export function formatScore(score: Score): string {
  if ('mate' in score) return `#${score.mate}`;
  const pawns = score.cp / 100;
  return `${pawns > 0 ? '+' : ''}${pawns.toFixed(1)}`;
}

export interface PlayedMove extends UciMove {
  san: string;
  boardAfter: BoardState;
}

/** A UCI line played out from `board`, as far as its moves are legal. */
export function playLine(board: BoardState, color: PieceColor, pv: string[]): PlayedMove[] {
  const moves: PlayedMove[] = [];
  let b = board;
  let c = color;
  for (const uci of pv) {
    const move = readUciMove(uci);
    if (!move) break;
    const piece = b.pieces.get(move.from);
    if (!piece || piece.color !== c) break;
    const boardAfter = applyMove(b, move.from, move.to, move.promotion);
    moves.push({ ...move, san: toSan(b, move.from, move.to, c, boardAfter, move.promotion), boardAfter });
    b = boardAfter;
    c = c === 'w' ? 'b' : 'w';
  }
  return moves;
}
