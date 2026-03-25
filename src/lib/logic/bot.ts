import type { BoardState, PieceKind, PieceColor, SquareId } from "./types";
import { squareToCoords } from "./types";
import { getAllLegalMoves, isInCheck, isCheckmate, isSquareAttacked } from "./attacks";

/** Piece values for material evaluation. */
const PIECE_VALUES: Record<PieceKind, number> = {
  P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0,
};

/** Small bonus for controlling center squares. */
const CENTER_BONUS: Record<string, number> = {
  d4: 0.3, e4: 0.3, d5: 0.3, e5: 0.3,
  c3: 0.1, d3: 0.1, e3: 0.1, f3: 0.1,
  c6: 0.1, d6: 0.1, e6: 0.1, f6: 0.1,
};

export type BotLevel = "random" | "basic" | "intermediate";

/** Pick a move for the given color. */
export function pickBotMove(
  board: BoardState,
  color: PieceColor,
  level: BotLevel,
): { from: SquareId; to: SquareId } | null {
  const moves = getAllLegalMoves(color, board);
  if (moves.length === 0) return null;

  if (level === "random") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (level === "intermediate") {
    return pickIntermediateMove(board, color, moves);
  }

  // Basic bot: score each move and pick the best (with slight randomness among ties)
  const opponent: PieceColor = color === "w" ? "b" : "w";
  let bestScore = -Infinity;
  let bestMoves: { from: SquareId; to: SquareId }[] = [];

  for (const move of moves) {
    const score = scoreMove(board, move.from, move.to, color, opponent);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

/* ── Intermediate bot: depth-2 minimax with alpha-beta ────── */

/** Piece values in centipawns for static evaluation. */
const PIECE_CP: Record<PieceKind, number> = {
  P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000,
};

/**
 * Piece-square tables (from White's perspective, rank 8 = row 0).
 * Standard simplified tables from the Chess Programming Wiki.
 */
/* eslint-disable */
const PST: Record<PieceKind, number[]> = {
  P: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  N: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  B: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  R: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  Q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  K: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};
/* eslint-enable */

/** Get PST index for a square. White uses normal orientation, Black mirrors vertically. */
function pstIndex(sq: SquareId, color: PieceColor): number {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]);
  return color === "w"
    ? (8 - rank) * 8 + file
    : (rank - 1) * 8 + file;
}

/** Static evaluation from White's perspective (positive = White advantage). */
function evaluatePosition(board: BoardState): number {
  let score = 0;
  for (const [sq, p] of board.pieces) {
    const value = PIECE_CP[p.piece] + PST[p.piece][pstIndex(sq, p.color)];
    score += p.color === "w" ? value : -value;
  }
  return score;
}

/** Apply a move, handling promotion, castling, and en passant. */
function applySimpleMove(board: BoardState, from: SquareId, to: SquareId): BoardState {
  const pieces = new Map(board.pieces);
  const piece = pieces.get(from)!;
  pieces.delete(from);
  pieces.set(to, piece);

  // Pawn promotion (auto-queen)
  if (piece.piece === "P") {
    const toRank = to[1];
    if ((piece.color === "w" && toRank === "8") || (piece.color === "b" && toRank === "1")) {
      pieces.set(to, { piece: "Q", color: piece.color });
    }
    // En passant capture
    if (to === board.enPassantSquare) {
      const epRank = piece.color === "w" ? String(parseInt(to[1]) - 1) : String(parseInt(to[1]) + 1);
      pieces.delete(`${to[0]}${epRank}` as SquareId);
    }
  }

  // Castling: move the rook too
  if (piece.piece === "K") {
    const df = to.charCodeAt(0) - from.charCodeAt(0);
    if (Math.abs(df) === 2) {
      const rank = from[1];
      if (df > 0) {
        pieces.delete(`h${rank}` as SquareId);
        pieces.set(`f${rank}` as SquareId, { piece: "R", color: piece.color });
      } else {
        pieces.delete(`a${rank}` as SquareId);
        pieces.set(`d${rank}` as SquareId, { piece: "R", color: piece.color });
      }
    }
  }

  return { pieces };
}

/**
 * Minimax with alpha-beta pruning.
 * Returns evaluation from White's perspective.
 */
function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  const color: PieceColor = maximizing ? "w" : "b";
  const moves = getAllLegalMoves(color, board);

  if (moves.length === 0) {
    if (isInCheck(color, board)) {
      // Checkmate — terrible for the side that's mated
      return maximizing ? -99999 : 99999;
    }
    return 0; // Stalemate
  }

  if (depth === 0) {
    return evaluatePosition(board);
  }

  // Move ordering: captures first for better pruning
  const sorted = [...moves].sort((a, b) => {
    const aC = board.pieces.has(a.to) ? 1 : 0;
    const bC = board.pieces.has(b.to) ? 1 : 0;
    return bC - aC;
  });

  if (maximizing) {
    let best = -Infinity;
    for (const move of sorted) {
      const nb = applySimpleMove(board, move.from, move.to);
      const score = minimax(nb, depth - 1, alpha, beta, false);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of sorted) {
      const nb = applySimpleMove(board, move.from, move.to);
      const score = minimax(nb, depth - 1, alpha, beta, true);
      if (score < best) best = score;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

/** Pick the best move using depth-2 minimax search. */
function pickIntermediateMove(
  board: BoardState,
  color: PieceColor,
  moves: { from: SquareId; to: SquareId }[],
): { from: SquareId; to: SquareId } {
  const maximizing = color === "w";
  let bestScore = maximizing ? -Infinity : Infinity;
  let bestMoves: { from: SquareId; to: SquareId }[] = [];

  // Sort captures first at root too
  const sorted = [...moves].sort((a, b) => {
    const aC = board.pieces.has(a.to) ? 1 : 0;
    const bC = board.pieces.has(b.to) ? 1 : 0;
    return bC - aC;
  });

  for (const move of sorted) {
    const nb = applySimpleMove(board, move.from, move.to);
    const score = minimax(nb, 1, -Infinity, Infinity, !maximizing);

    if (maximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

/* ── Basic bot (one-ply heuristic) ─────────────────────────── */

/** Score a single move. Higher is better for the moving side. */
function scoreMove(
  board: BoardState,
  from: SquareId,
  to: SquareId,
  color: PieceColor,
  opponent: PieceColor,
): number {
  let score = 0;
  const movingPiece = board.pieces.get(from)!;
  const captured = board.pieces.get(to);

  // 1. Capturing: value of captured piece (always good)
  if (captured && captured.color === opponent) {
    score += PIECE_VALUES[captured.piece] * 10;

    // Bonus for capturing with a less valuable piece (good trade)
    score += (PIECE_VALUES[captured.piece] - PIECE_VALUES[movingPiece.piece]) * 2;
  }

  // Simulate the move to check consequences
  const afterPieces = new Map(board.pieces);
  afterPieces.delete(from);
  afterPieces.set(to, movingPiece);
  const afterBoard: BoardState = { pieces: afterPieces };

  // 2. Checkmate? Always play it.
  if (isCheckmate(opponent, afterBoard)) {
    return 1000;
  }

  // 2b. Does this move allow opponent to checkmate us? Avoid it.
  const opponentMoves = getAllLegalMoves(opponent, afterBoard);
  for (const opp of opponentMoves) {
    const oppPieces = new Map(afterPieces);
    const oppPiece = oppPieces.get(opp.from);
    if (!oppPiece) continue;
    oppPieces.delete(opp.from);
    oppPieces.set(opp.to, oppPiece);
    if (isCheckmate(color, { pieces: oppPieces })) {
      score -= 500;
      break;
    }
  }

  // 2c. Does this move give check? (small bonus)
  if (isInCheck(opponent, afterBoard)) {
    score += 3;
  }

  // 3. Is the piece safe on the destination square?
  const wasAttacked = isSquareAttacked(from, opponent, board);
  const isAttackedAfter = isSquareAttacked(to, opponent, afterBoard);

  if (isAttackedAfter) {
    // Moving to an attacked square — penalty based on piece value
    // But only if we're not capturing something worth more
    const captureValue = captured ? PIECE_VALUES[captured.piece] : 0;
    if (captureValue < PIECE_VALUES[movingPiece.piece]) {
      score -= PIECE_VALUES[movingPiece.piece] * 5;
    }
  } else if (wasAttacked) {
    // Escaping from an attacked square — bonus
    score += PIECE_VALUES[movingPiece.piece] * 2;
  }

  // 4. Center control bonus for knights and bishops
  if (movingPiece.piece === "N" || movingPiece.piece === "B") {
    score += CENTER_BONUS[to] ?? 0;
  }

  // 5. Pawn advancement (mild bonus for pushing pawns forward)
  if (movingPiece.piece === "P") {
    const [, rank] = squareToCoords(to);
    const advancement = color === "w" ? (7 - rank) : rank;
    score += advancement * 0.1;

    // Promotion is huge
    if ((color === "w" && rank === 0) || (color === "b" && rank === 7)) {
      score += 80;
    }
  }

  // 6. Castling bonus (king safety)
  if (movingPiece.piece === "K") {
    const [fx] = squareToCoords(from);
    const [tx] = squareToCoords(to);
    if (Math.abs(tx - fx) === 2) {
      score += 4;
    }
  }

  // 7. Small random jitter to avoid always playing the same game
  score += Math.random() * 0.5;

  return score;
}
