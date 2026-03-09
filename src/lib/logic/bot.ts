import { BoardState, PieceKind, PieceColor, SquareId, squareToCoords } from "./types";
import { getAllLegalMoves, isInCheck, isSquareAttacked } from "./attacks";

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

export type BotLevel = "random" | "basic";

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

  // 2. Does this move give check? (small bonus)
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
