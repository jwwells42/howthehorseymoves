// Serialize a BoardState to FEN (parseFen in types.ts is the other way). Used
// by The Probabilitizer's Lichess link and by the engine (src/lib/engine).

import type { BoardState, PieceColor, SquareId } from "$lib/logic/types";
import { FILES, RANKS } from "$lib/logic/types";

const LETTER: Record<string, string> = {
  wK: "K", wQ: "Q", wR: "R", wB: "B", wN: "N", wP: "P",
  bK: "k", bQ: "q", bR: "r", bB: "b", bN: "n", bP: "p",
};

export function boardToFen(board: BoardState, colorToMove: PieceColor, fullMove: number): string {
  const rankStrings: string[] = [];
  for (const rank of RANKS) {
    let row = "";
    let empty = 0;
    for (const file of FILES) {
      const piece = board.pieces.get(`${file}${rank}` as SquareId);
      if (piece) {
        if (empty > 0) { row += empty; empty = 0; }
        row += LETTER[`${piece.color}${piece.piece}`];
      } else {
        empty++;
      }
    }
    if (empty > 0) row += empty;
    rankStrings.push(row);
  }
  const placement = rankStrings.join("/");

  // Only the castling the pieces still allow: a right with its king or rook
  // gone can crash an engine reading the FEN (Stockfish looks for the rook).
  const cr = board.castlingRights;
  const at = (sq: string, code: string) => {
    const p = board.pieces.get(sq as SquareId);
    return !!p && `${p.color}${p.piece}` === code;
  };
  let castling = "";
  if (cr) {
    if (cr.K && at("e1", "wK") && at("h1", "wR")) castling += "K";
    if (cr.Q && at("e1", "wK") && at("a1", "wR")) castling += "Q";
    if (cr.k && at("e8", "bK") && at("h8", "bR")) castling += "k";
    if (cr.q && at("e8", "bK") && at("a8", "bR")) castling += "q";
  }
  if (!castling) castling = "-";

  const enPassant = board.enPassantSquare ?? "-";
  const side = colorToMove;

  return `${placement} ${side} ${castling} ${enPassant} 0 ${fullMove}`;
}
