import { PieceKind } from "../logic/types";
import { Puzzle, PuzzleSet } from "./types";
import { rookPuzzles } from "./rook";

const puzzleSets: Record<string, PuzzleSet> = {
  rook: { piece: "R", name: "Rook", puzzles: rookPuzzles },
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

export const PIECE_ORDER = ["rook", "bishop", "queen", "king", "knight", "pawn"] as const;

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
  { key: "bishop", name: "Bishop", description: "Moves diagonally across the board.", icon: "/pieces/wB.svg", pieceKind: "B", available: false },
  { key: "queen", name: "Queen", description: "Moves like a rook and bishop combined.", icon: "/pieces/wQ.svg", pieceKind: "Q", available: false },
  { key: "king", name: "King", description: "Moves one square in any direction.", icon: "/pieces/wK.svg", pieceKind: "K", available: false },
  { key: "knight", name: "Knight", description: "Moves in an L-shape and can jump over pieces.", icon: "/pieces/wN.svg", pieceKind: "N", available: false },
  { key: "pawn", name: "Pawn", description: "Moves forward, captures diagonally.", icon: "/pieces/wP.svg", pieceKind: "P", available: false },
];
