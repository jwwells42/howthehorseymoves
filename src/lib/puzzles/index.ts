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
import {
  backRankMatePuzzles,
  rookLadderPuzzles,
  qbBatteryPuzzles,
  knightF7Puzzles,
  lollisMatePuzzles,
  queenKingMatePuzzles,
  smotheredMatePuzzles,
} from "./checkmate";

const puzzleSets: Record<string, PuzzleSet> = {
  rook: { piece: "R", name: "Rook", puzzles: rookPuzzles },
  bishop: { piece: "B", name: "Bishop", puzzles: bishopPuzzles },
  queen: { piece: "Q", name: "Queen", puzzles: queenPuzzles },
  king: { piece: "K", name: "King", puzzles: kingPuzzles },
  knight: { piece: "N", name: "Knight", puzzles: knightPuzzles },
  pawn: { piece: "P", name: "Pawn", puzzles: pawnPuzzles },
  castling: { piece: "K", name: "Castling", puzzles: castlingPuzzles },
  "en-passant": { piece: "P", name: "En Passant", puzzles: enPassantPuzzles },
  "checkmate-back-rank": { piece: "R", name: "Back Rank Mate", puzzles: backRankMatePuzzles },
  "checkmate-rook-ladder": { piece: "R", name: "Rook Ladder", puzzles: rookLadderPuzzles },
  "checkmate-qb-battery": { piece: "Q", name: "Queen-Bishop Battery", puzzles: qbBatteryPuzzles },
  "checkmate-knight-f7": { piece: "N", name: "Knight on f7", puzzles: knightF7Puzzles },
  "checkmate-lollis": { piece: "Q", name: "Lolli's Mate", puzzles: lollisMatePuzzles },
  "checkmate-queen-king": { piece: "Q", name: "Queen & King Mate", puzzles: queenKingMatePuzzles },
  "checkmate-smothered": { piece: "N", name: "Smothered Mate", puzzles: smotheredMatePuzzles },
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

export interface SubcategoryInfo {
  key: string;
  name: string;
  description: string;
  icon: string;
}

export interface CategoryInfo {
  key: string;
  name: string;
  description: string;
  icon: string;
  subcategories: SubcategoryInfo[];
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
];

export const CATEGORIES: CategoryInfo[] = [
  {
    key: "checkmate",
    name: "Checkmate Patterns",
    description: "Learn classic mating patterns!",
    icon: "/pieces/wQ.svg",
    subcategories: [
      { key: "checkmate-back-rank", name: "Back Rank Mate", description: "Trap the king behind its own pawns.", icon: "/pieces/wR.svg" },
      { key: "checkmate-rook-ladder", name: "Rook Ladder", description: "Two rooks push the king to the edge.", icon: "/pieces/wR.svg" },
      { key: "checkmate-qb-battery", name: "Queen-Bishop Battery", description: "Queen and bishop team up on a diagonal.", icon: "/pieces/wQ.svg" },
      { key: "checkmate-knight-f7", name: "Knight on f7", description: "The knight strikes the weak f7 square.", icon: "/pieces/wN.svg" },
      { key: "checkmate-lollis", name: "Lolli's Mate", description: "Queen slips in behind the pawns for mate.", icon: "/pieces/wQ.svg" },
      { key: "checkmate-queen-king", name: "Queen & King", description: "Use the queen with king support.", icon: "/pieces/wQ.svg" },
      { key: "checkmate-smothered", name: "Smothered Mate", description: "The knight strikes when the king can't move.", icon: "/pieces/wN.svg" },
    ],
  },
];

export function getCategory(key: string): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.key === key);
}
