export type PieceKind = "R" | "B" | "Q" | "K" | "N" | "P";
export type PieceColor = "w" | "b";

export interface PiecePlacement {
  piece: PieceKind;
  color: PieceColor;
  square: SquareId;
}

export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";
export type Rank = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
export type SquareId = `${File}${Rank}`;

export const FILES: File[] = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const RANKS: Rank[] = ["8", "7", "6", "5", "4", "3", "2", "1"];

export interface BoardState {
  pieces: Map<SquareId, { piece: PieceKind; color: PieceColor }>;
}

export function squareToCoords(sq: SquareId): [number, number] {
  const file = sq.charCodeAt(0) - 97; // a=0
  const rank = 8 - parseInt(sq[1]);   // 8=0, 1=7
  return [file, rank];
}

export function coordsToSquare(file: number, rank: number): SquareId | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${RANKS[rank]}` as SquareId;
}

export function createBoardState(placements: PiecePlacement[]): BoardState {
  const pieces = new Map<SquareId, { piece: PieceKind; color: PieceColor }>();
  for (const p of placements) {
    pieces.set(p.square, { piece: p.piece, color: p.color });
  }
  return { pieces };
}
