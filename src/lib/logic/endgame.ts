/**
 * Endgame mate conversion logic.
 *
 * Handles position generation, move validation, and bot defense
 * for KQK, KRRK, KRK, and KBBK endgames.
 *
 * No bitbase needed — all these positions are theoretical wins.
 * Validation rejects stalemate and hanging pieces.
 * Bot defense maximises king mobility and avoids mate-in-1.
 */

import type { BoardState, SquareId, PiecePlacement, PieceKind } from "./types";
import { createBoardState, squareToCoords } from "./types";
import {
  getAllLegalMoves,
  getLegalMoves,
  isCheckmate,
  isStalemate,
  isInCheck,
} from "./attacks";

/* ── Types ───────────────────────────────────────── */

export type MateEndgameType = "kqk" | "krrk" | "krk" | "kbbk" | "kbnk";

export const ENDGAME_INFO: Record<
  MateEndgameType,
  { name: string; description: string; icon: string }
> = {
  kqk: {
    name: "Queen vs King",
    description: "Deliver checkmate with King + Queen.",
    icon: "/pieces/wQ.svg",
  },
  krrk: {
    name: "Rook Ladder",
    description: "Deliver checkmate with King + 2 Rooks.",
    icon: "/pieces/wR.svg",
  },
  krk: {
    name: "Rook vs King",
    description: "Deliver checkmate with King + Rook.",
    icon: "/pieces/wR.svg",
  },
  kbbk: {
    name: "2 Bishops vs King",
    description: "Deliver checkmate with King + 2 Bishops.",
    icon: "/pieces/wB.svg",
  },
  kbnk: {
    name: "Bishop + Knight vs King",
    description: "Deliver checkmate with King + Bishop + Knight.",
    icon: "/pieces/wN.svg",
  },
};

const PIECE_NAMES: Record<PieceKind, string> = {
  K: "King",
  Q: "Queen",
  R: "Rook",
  B: "Bishop",
  N: "Knight",
  P: "Pawn",
};

export { PIECE_NAMES };

/* ── Square helpers ──────────────────────────────── */

const ALL_SQUARES: SquareId[] = [];
for (const f of "abcdefgh") {
  for (const r of "12345678") {
    ALL_SQUARES.push(`${f}${r}` as SquareId);
  }
}

function randomSquare(): SquareId {
  return ALL_SQUARES[Math.floor(Math.random() * 64)];
}

function kingsAdjacent(a: SquareId, b: SquareId): boolean {
  const [ax, ay] = squareToCoords(a);
  const [bx, by] = squareToCoords(b);
  return Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1;
}

function squareColorParity(sq: SquareId): number {
  const [x, y] = squareToCoords(sq);
  return (x + y) % 2;
}

/* ── Move application ────────────────────────────── */

export function applyEndgameMove(
  board: BoardState,
  from: SquareId,
  to: SquareId,
): BoardState {
  const pieces = new Map(board.pieces);
  const piece = pieces.get(from);
  if (!piece) return board;
  pieces.delete(from);
  pieces.set(to, piece);
  return { pieces };
}

/* ── Position generation ─────────────────────────── */

function pickUnused(used: Set<SquareId>): SquareId | null {
  for (let i = 0; i < 100; i++) {
    const sq = randomSquare();
    if (!used.has(sq)) return sq;
  }
  return null;
}

function pickUnusedWithParity(
  used: Set<SquareId>,
  parity: number,
): SquareId | null {
  for (let i = 0; i < 200; i++) {
    const sq = randomSquare();
    if (!used.has(sq) && squareColorParity(sq) === parity) return sq;
  }
  return null;
}

export function generatePosition(type: MateEndgameType): PiecePlacement[] {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const used = new Set<SquareId>();

    // Black king
    const bk = randomSquare();
    used.add(bk);

    // White king (not adjacent to black king)
    let wk: SquareId | null = null;
    for (let i = 0; i < 100; i++) {
      const sq = randomSquare();
      if (!used.has(sq) && !kingsAdjacent(sq, bk)) {
        wk = sq;
        break;
      }
    }
    if (!wk) continue;
    used.add(wk);

    // White pieces
    const whites: PiecePlacement[] = [];
    let ok = true;

    if (type === "kqk") {
      const q = pickUnused(used);
      if (!q) { ok = false; } else {
        used.add(q);
        whites.push({ piece: "Q", color: "w", square: q });
      }
    } else if (type === "krk") {
      const r = pickUnused(used);
      if (!r) { ok = false; } else {
        used.add(r);
        whites.push({ piece: "R", color: "w", square: r });
      }
    } else if (type === "krrk") {
      const r1 = pickUnused(used);
      if (!r1) { ok = false; } else {
        used.add(r1);
        whites.push({ piece: "R", color: "w", square: r1 });
        const r2 = pickUnused(used);
        if (!r2) { ok = false; } else {
          used.add(r2);
          whites.push({ piece: "R", color: "w", square: r2 });
        }
      }
    } else if (type === "kbbk") {
      const b1 = pickUnused(used);
      if (!b1) { ok = false; } else {
        used.add(b1);
        whites.push({ piece: "B", color: "w", square: b1 });
        // Second bishop must be on opposite color
        const b2 = pickUnusedWithParity(used, 1 - squareColorParity(b1));
        if (!b2) { ok = false; } else {
          used.add(b2);
          whites.push({ piece: "B", color: "w", square: b2 });
        }
      }
    } else if (type === "kbnk") {
      const b = pickUnused(used);
      if (!b) { ok = false; } else {
        used.add(b);
        whites.push({ piece: "B", color: "w", square: b });
        const n = pickUnused(used);
        if (!n) { ok = false; } else {
          used.add(n);
          whites.push({ piece: "N", color: "w", square: n });
        }
      }
    }

    if (!ok) continue;

    const placements: PiecePlacement[] = [
      { piece: "K", color: "w", square: wk },
      ...whites,
      { piece: "K", color: "b", square: bk },
    ];

    const board = createBoardState(placements);

    // Black king must not be in check (it's white's turn)
    if (isInCheck("b", board)) continue;
    // Not already checkmate or stalemate
    if (isCheckmate("b", board)) continue;
    if (isStalemate("b", board)) continue;

    return placements;
  }

  throw new Error(`Failed to generate ${type} position`);
}

/* ── Move validation ─────────────────────────────── */

export interface MoveResult {
  valid: boolean;
  checkmate?: boolean;
  reason?: string;
}

export function validateEndgameMove(
  board: BoardState,
  from: SquareId,
  to: SquareId,
): MoveResult {
  const newBoard = applyEndgameMove(board, from, to);

  // Checkmate? Win!
  if (isCheckmate("b", newBoard)) {
    return { valid: true, checkmate: true };
  }

  // Stalemate? Bad.
  if (isStalemate("b", newBoard)) {
    return { valid: false, reason: "That's stalemate!" };
  }

  // Any white piece hanging? (black can capture it legally)
  const blackMoves = getAllLegalMoves("b", newBoard);
  for (const m of blackMoves) {
    const target = newBoard.pieces.get(m.to);
    if (target && target.color === "w" && target.piece !== "K") {
      return {
        valid: false,
        reason: `Your ${PIECE_NAMES[target.piece]} is hanging!`,
      };
    }
  }

  return { valid: true };
}

/* ── Bot defense ─────────────────────────────────── */

export function pickDefenseMove(
  board: BoardState,
): { from: SquareId; to: SquareId } | null {
  const moves = getAllLegalMoves("b", board);
  if (moves.length === 0) return null;

  let bestScore = -Infinity;
  let bestMoves: { from: SquareId; to: SquareId }[] = [];

  for (const move of moves) {
    const newBoard = applyEndgameMove(board, move.from, move.to);
    let score = 0;

    // Capture a piece? Huge bonus
    const captured = board.pieces.get(move.to);
    if (captured && captured.color === "w" && captured.piece !== "K") {
      score += 1000;
    }

    // Center proximity (closer to center = better defense)
    const [x, y] = squareToCoords(move.to);
    const centerDist = Math.max(Math.abs(x - 3.5), Math.abs(y - 3.5));
    score += (4 - centerDist) * 10;

    // King mobility after the move
    const futureMoves = getAllLegalMoves("b", newBoard);
    score += futureMoves.length * 5;

    // Avoid positions where white can mate-in-1
    const whiteMoves = getAllLegalMoves("w", newBoard);
    let allowsMate = false;
    for (const wm of whiteMoves) {
      const afterWhite = applyEndgameMove(newBoard, wm.from, wm.to);
      if (isCheckmate("b", afterWhite)) {
        allowsMate = true;
        break;
      }
    }
    if (allowsMate) score -= 500;

    // Random jitter for variety
    score += Math.random() * 3;

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (Math.abs(score - bestScore) < 0.01) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

/* ── Notation helpers (for blindfold display) ────── */

export function formatPosition(board: BoardState): { white: string; black: string } {
  const whiteP: string[] = [];
  const blackP: string[] = [];
  const order: PieceKind[] = ["K", "Q", "R", "B", "N", "P"];
  const entries = [...board.pieces.entries()];
  entries.sort((a, b) => order.indexOf(a[1].piece) - order.indexOf(b[1].piece));
  for (const [sq, piece] of entries) {
    const label = `${piece.piece}${sq}`;
    if (piece.color === "w") whiteP.push(label);
    else blackP.push(label);
  }
  return { white: whiteP.join(", "), black: blackP.join(", ") };
}

export function formatMoveNotation(
  board: BoardState,
  from: SquareId,
  to: SquareId,
  resultBoard: BoardState,
  targetColor: "w" | "b",
): string {
  const piece = board.pieces.get(from);
  if (!piece) return `${from}-${to}`;

  // Disambiguation: check if another piece of same type can reach same square
  let disambig = "";
  for (const [sq, p] of board.pieces) {
    if (sq !== from && p.color === piece.color && p.piece === piece.piece) {
      const legal = getLegalMoves(sq, board, piece.color);
      if (legal.includes(to)) {
        // Need disambiguation — use file if sufficient, else rank
        const sameFile = sq[0] === from[0];
        if (!sameFile) disambig = from[0];
        else disambig = from[1];
        break;
      }
    }
  }

  const captures = board.pieces.has(to) ? "x" : "";
  let suffix = "";
  if (isCheckmate(targetColor, resultBoard)) suffix = "#";
  else if (isInCheck(targetColor, resultBoard)) suffix = "+";
  return `${piece.piece}${disambig}${captures}${to}${suffix}`;
}
