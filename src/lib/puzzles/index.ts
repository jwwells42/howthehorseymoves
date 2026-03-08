import { PieceKind } from "../logic/types";
import { Puzzle, PuzzleSet } from "./types";
import { rookPuzzles } from "./rook";
import { bishopPuzzles } from "./bishop";
import { queenPuzzles } from "./queen";
import { kingPuzzles } from "./king";
import { knightPuzzles } from "./knight";
import { pawnPuzzles } from "./pawn";
import { castlingPuzzles } from "./castling";
import { enPassantPuzzles } from "./enpassant";
import { checkmatePuzzles } from "./checkmate";

const puzzleSets: Record<string, PuzzleSet> = {
  rook: { piece: "R", name: "Rook", puzzles: rookPuzzles },
  bishop: { piece: "B", name: "Bishop", puzzles: bishopPuzzles },
  queen: { piece: "Q", name: "Queen", puzzles: queenPuzzles },
  king: { piece: "K", name: "King", puzzles: kingPuzzles },
  knight: { piece: "N", name: "Knight", puzzles: knightPuzzles },
  pawn: { piece: "P", name: "Pawn", puzzles: pawnPuzzles },
  castling: { piece: "K", name: "Castling", puzzles: castlingPuzzles },
  "en-passant": { piece: "P", name: "En Passant", puzzles: enPassantPuzzles },
  checkmate: { piece: "Q", name: "Checkmate", puzzles: checkmatePuzzles },
};

export function getPuzzlesForPiece(pieceKey: string): PuzzleSet | undefined {
  return puzzleSets[pieceKey];
}

export function getPuzzle(pieceKey: string, puzzleId: string): Puzzle | undefined {
  return puzzleSets[pieceKey]?.puzzles.find((p) => p.id === puzzleId);
}

export function getAllPieceKeys(): string[] {
  return Object.keys(puzzleSets);
}

export const PIECE_ORDER = ["rook", "bishop", "queen", "king", "knight", "pawn", "castling", "en-passant", "checkmate"] as const;

export interface PieceInfo {
  key: string;
  name: string;
  description: string;
  icon: string;
  pieceKind: PieceKind;
  available: boolean;
}

export const PIECES: PieceInfo[] = [
  { key: "rook", name: "Rook", description: "Moves in straight lines: up, down, left, right.", icon: "/pieces/wR.svg", pieceKind: "R", available: true },
  { key: "bishop", name: "Bishop", description: "Moves diagonally across the board.", icon: "/pieces/wB.svg", pieceKind: "B", available: true },
  { key: "queen", name: "Queen", description: "Moves like a rook and bishop combined.", icon: "/pieces/wQ.svg", pieceKind: "Q", available: true },
  { key: "king", name: "King", description: "Moves one square in any direction.", icon: "/pieces/wK.svg", pieceKind: "K", available: true },
  { key: "knight", name: "Knight", description: "Moves in an L-shape and can jump over pieces.", icon: "/pieces/wN.svg", pieceKind: "N", available: true },
  { key: "pawn", name: "Pawn", description: "Moves forward, captures diagonally.", icon: "/pieces/wP.svg", pieceKind: "P", available: true },
  { key: "castling", name: "Castling", description: "A special king + rook move for safety.", icon: "/pieces/wK.svg", pieceKind: "K", available: true },
  { key: "en-passant", name: "En Passant", description: "A special pawn capture 'in passing'.", icon: "/pieces/wP.svg", pieceKind: "P", available: true },
  { key: "checkmate", name: "Checkmate", description: "Trap the king — deliver the final blow!", icon: "/pieces/wQ.svg", pieceKind: "Q", available: true },
];
