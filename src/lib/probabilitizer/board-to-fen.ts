// Serialize a BoardState to FEN. The app has parseFen but no serializer; this is
// used only to build the "open in Lichess analysis" link for The Probabilitizer.

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

  const cr = board.castlingRights;
  let castling = "";
  if (cr) {
    if (cr.K) castling += "K";
    if (cr.Q) castling += "Q";
    if (cr.k) castling += "k";
    if (cr.q) castling += "q";
  }
  if (!castling) castling = "-";

  const enPassant = board.enPassantSquare ?? "-";
  const side = colorToMove;

  return `${placement} ${side} ${castling} ${enPassant} 0 ${fullMove}`;
}
