import { BoardState, PieceColor, SquareId, squareToCoords, coordsToSquare } from "./types";
import { getValidMoves } from "./moves";

type Direction = [number, number];

const ROOK_DIRS: Direction[] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const BISHOP_DIRS: Direction[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const KNIGHT_JUMPS: Direction[] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

/**
 * Check if a square is attacked by any piece of the given color.
 */
export function isSquareAttacked(
  square: SquareId,
  byColor: PieceColor,
  board: BoardState,
): boolean {
  const [tx, ty] = squareToCoords(square);

  // Check sliding attacks (rook/queen along ranks/files)
  for (const [dx, dy] of ROOK_DIRS) {
    let x = tx + dx;
    let y = ty + dy;
    while (true) {
      const sq = coordsToSquare(x, y);
      if (!sq) break;
      const occupant = board.pieces.get(sq);
      if (occupant) {
        if (occupant.color === byColor && (occupant.piece === "R" || occupant.piece === "Q")) {
          return true;
        }
        break;
      }
      x += dx;
      y += dy;
    }
  }

  // Check sliding attacks (bishop/queen along diagonals)
  for (const [dx, dy] of BISHOP_DIRS) {
    let x = tx + dx;
    let y = ty + dy;
    while (true) {
      const sq = coordsToSquare(x, y);
      if (!sq) break;
      const occupant = board.pieces.get(sq);
      if (occupant) {
        if (occupant.color === byColor && (occupant.piece === "B" || occupant.piece === "Q")) {
          return true;
        }
        break;
      }
      x += dx;
      y += dy;
    }
  }

  // Check knight attacks
  for (const [dx, dy] of KNIGHT_JUMPS) {
    const sq = coordsToSquare(tx + dx, ty + dy);
    if (sq) {
      const occupant = board.pieces.get(sq);
      if (occupant && occupant.color === byColor && occupant.piece === "N") {
        return true;
      }
    }
  }

  // Check king attacks (adjacent squares)
  for (const dx of [-1, 0, 1]) {
    for (const dy of [-1, 0, 1]) {
      if (dx === 0 && dy === 0) continue;
      const sq = coordsToSquare(tx + dx, ty + dy);
      if (sq) {
        const occupant = board.pieces.get(sq);
        if (occupant && occupant.color === byColor && occupant.piece === "K") {
          return true;
        }
      }
    }
  }

  // Check pawn attacks
  const pawnDir = byColor === "w" ? 1 : -1; // pawns attack in opposite direction of movement
  for (const dx of [-1, 1]) {
    const sq = coordsToSquare(tx + dx, ty + pawnDir);
    if (sq) {
      const occupant = board.pieces.get(sq);
      if (occupant && occupant.color === byColor && occupant.piece === "P") {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if the given color's king is in check.
 */
export function isInCheck(color: PieceColor, board: BoardState): boolean {
  const opponent = color === "w" ? "b" : "w";
  for (const [sq, p] of board.pieces) {
    if (p.piece === "K" && p.color === color) {
      return isSquareAttacked(sq, opponent, board);
    }
  }
  return false;
}

/** Simulate a move and return the resulting board (minimal — no castling/en-passant side effects). */
function simulateMove(board: BoardState, from: SquareId, to: SquareId): BoardState {
  const pieces = new Map(board.pieces);
  const piece = pieces.get(from)!;
  pieces.delete(from);
  pieces.set(to, piece);
  return { pieces };
}

/** Does the given color have at least one legal move (one that doesn't leave own king in check)? */
export function hasLegalMoves(color: PieceColor, board: BoardState): boolean {
  for (const [sq, p] of board.pieces) {
    if (p.color !== color) continue;
    const moves = getValidMoves(p.piece, sq, board, color);
    for (const to of moves) {
      const after = simulateMove(board, sq, to);
      if (!isInCheck(color, after)) return true;
    }
  }
  return false;
}

/** Get all legal moves for a specific piece (filters out moves that leave own king in check). */
export function getLegalMoves(from: SquareId, board: BoardState, color: PieceColor): SquareId[] {
  const piece = board.pieces.get(from);
  if (!piece || piece.color !== color) return [];
  const pseudo = getValidMoves(piece.piece, from, board, color);
  return pseudo.filter((to) => {
    const after = simulateMove(board, from, to);
    return !isInCheck(color, after);
  });
}

/** Get all legal moves for a color as {from, to} pairs. */
export function getAllLegalMoves(color: PieceColor, board: BoardState): { from: SquareId; to: SquareId }[] {
  const result: { from: SquareId; to: SquareId }[] = [];
  for (const [sq, p] of board.pieces) {
    if (p.color !== color) continue;
    const legal = getLegalMoves(sq, board, color);
    for (const to of legal) {
      result.push({ from: sq, to });
    }
  }
  return result;
}

export function isCheckmate(color: PieceColor, board: BoardState): boolean {
  return isInCheck(color, board) && !hasLegalMoves(color, board);
}

export function isStalemate(color: PieceColor, board: BoardState): boolean {
  return !isInCheck(color, board) && !hasLegalMoves(color, board);
}
