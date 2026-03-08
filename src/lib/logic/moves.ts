import { BoardState, PieceKind, PieceColor, SquareId, squareToCoords, coordsToSquare } from "./types";
import { isSquareAttacked } from "./attacks";

type Direction = [number, number];

const ROOK_DIRS: Direction[] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const BISHOP_DIRS: Direction[] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const QUEEN_DIRS: Direction[] = [...ROOK_DIRS, ...BISHOP_DIRS];
const KNIGHT_JUMPS: Direction[] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];
const KING_DIRS: Direction[] = QUEEN_DIRS;

function slidingMoves(
  from: SquareId,
  directions: Direction[],
  board: BoardState,
  color: PieceColor,
): SquareId[] {
  const [fx, fy] = squareToCoords(from);
  const moves: SquareId[] = [];
  for (const [dx, dy] of directions) {
    let x = fx + dx;
    let y = fy + dy;
    while (true) {
      const sq = coordsToSquare(x, y);
      if (!sq) break;
      const occupant = board.pieces.get(sq);
      if (occupant) {
        if (occupant.color !== color) moves.push(sq); // capture
        break;
      }
      moves.push(sq);
      x += dx;
      y += dy;
    }
  }
  return moves;
}

function stepMoves(
  from: SquareId,
  offsets: Direction[],
  board: BoardState,
  color: PieceColor,
): SquareId[] {
  const [fx, fy] = squareToCoords(from);
  const moves: SquareId[] = [];
  for (const [dx, dy] of offsets) {
    const sq = coordsToSquare(fx + dx, fy + dy);
    if (!sq) continue;
    const occupant = board.pieces.get(sq);
    if (occupant && occupant.color === color) continue;
    moves.push(sq);
  }
  return moves;
}

function pawnMoves(
  from: SquareId,
  board: BoardState,
  color: PieceColor,
): SquareId[] {
  const [fx, fy] = squareToCoords(from);
  const dir = color === "w" ? -1 : 1;
  const moves: SquareId[] = [];

  // Forward one
  const oneStep = coordsToSquare(fx, fy + dir);
  if (oneStep && !board.pieces.get(oneStep)) {
    moves.push(oneStep);
    // Forward two from starting rank
    const startRank = color === "w" ? 6 : 1;
    if (fy === startRank) {
      const twoStep = coordsToSquare(fx, fy + dir * 2);
      if (twoStep && !board.pieces.get(twoStep)) {
        moves.push(twoStep);
      }
    }
  }

  // Captures (including en passant)
  for (const dx of [-1, 1]) {
    const cap = coordsToSquare(fx + dx, fy + dir);
    if (cap) {
      const occupant = board.pieces.get(cap);
      if (occupant && occupant.color !== color) {
        moves.push(cap);
      } else if (cap === board.enPassantSquare) {
        moves.push(cap);
      }
    }
  }
  return moves;
}

function kingMovesWithCastling(
  from: SquareId,
  board: BoardState,
  color: PieceColor,
): SquareId[] {
  const moves = stepMoves(from, KING_DIRS, board, color);
  const rights = board.castlingRights;
  if (!rights) return moves;

  if (color === "w" && from === "e1") {
    // Kingside
    if (rights.K
      && !board.pieces.get("f1" as SquareId)
      && !board.pieces.get("g1" as SquareId)
      && board.pieces.get("h1" as SquareId)?.piece === "R"
      && board.pieces.get("h1" as SquareId)?.color === "w"
      && !isSquareAttacked("e1" as SquareId, "b", board)
      && !isSquareAttacked("f1" as SquareId, "b", board)
      && !isSquareAttacked("g1" as SquareId, "b", board)
    ) {
      moves.push("g1" as SquareId);
    }
    // Queenside
    if (rights.Q
      && !board.pieces.get("d1" as SquareId)
      && !board.pieces.get("c1" as SquareId)
      && !board.pieces.get("b1" as SquareId)
      && board.pieces.get("a1" as SquareId)?.piece === "R"
      && board.pieces.get("a1" as SquareId)?.color === "w"
      && !isSquareAttacked("e1" as SquareId, "b", board)
      && !isSquareAttacked("d1" as SquareId, "b", board)
      && !isSquareAttacked("c1" as SquareId, "b", board)
    ) {
      moves.push("c1" as SquareId);
    }
  } else if (color === "b" && from === "e8") {
    // Kingside
    if (rights.k
      && !board.pieces.get("f8" as SquareId)
      && !board.pieces.get("g8" as SquareId)
      && board.pieces.get("h8" as SquareId)?.piece === "R"
      && board.pieces.get("h8" as SquareId)?.color === "b"
      && !isSquareAttacked("e8" as SquareId, "w", board)
      && !isSquareAttacked("f8" as SquareId, "w", board)
      && !isSquareAttacked("g8" as SquareId, "w", board)
    ) {
      moves.push("g8" as SquareId);
    }
    // Queenside
    if (rights.q
      && !board.pieces.get("d8" as SquareId)
      && !board.pieces.get("c8" as SquareId)
      && !board.pieces.get("b8" as SquareId)
      && board.pieces.get("a8" as SquareId)?.piece === "R"
      && board.pieces.get("a8" as SquareId)?.color === "b"
      && !isSquareAttacked("e8" as SquareId, "w", board)
      && !isSquareAttacked("d8" as SquareId, "w", board)
      && !isSquareAttacked("c8" as SquareId, "w", board)
    ) {
      moves.push("c8" as SquareId);
    }
  }

  return moves;
}

export function getValidMoves(
  pieceKind: PieceKind,
  from: SquareId,
  board: BoardState,
  color: PieceColor = "w",
): SquareId[] {
  switch (pieceKind) {
    case "R": return slidingMoves(from, ROOK_DIRS, board, color);
    case "B": return slidingMoves(from, BISHOP_DIRS, board, color);
    case "Q": return slidingMoves(from, QUEEN_DIRS, board, color);
    case "K": return kingMovesWithCastling(from, board, color);
    case "N": return stepMoves(from, KNIGHT_JUMPS, board, color);
    case "P": return pawnMoves(from, board, color);
  }
}
