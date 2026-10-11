import type { PieceKind } from "../logic/types";
import type { Puzzle, PuzzleSet } from "./types";
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
  queenF7Puzzles,
  qbBatteryPuzzles,
  lollisMatePuzzles,
  queenKingMatePuzzles,
  smotheredMatePuzzles,
} from "./checkmate";
import { pinPuzzles } from "./pins";
import { mateIn1Puzzles } from "./mate-in-1";
import { mateIn2Puzzles } from "./mate-in-2";
import { forkPuzzles } from "./forks";
import { skewerPuzzles } from "./skewers";
import { removingDefenderPuzzles } from "./removing-defender";
import { discoveredPuzzles } from "./discovered";
import { dangerZonePuzzles } from "./danger-zones";
import { pawnEndingPuzzles } from "./pawn-endings";
import { lucenaPuzzles } from "./lucena";
import { retiPuzzles } from "./reti";
import { pawnRacePuzzles } from "./pawn-races";

const puzzleSets: Record<string, PuzzleSet> = {
  rook: { piece: "R", name: "Rook", puzzles: rookPuzzles },
  bishop: { piece: "B", name: "Bishop", puzzles: bishopPuzzles },
  queen: { piece: "Q", name: "Queen", puzzles: queenPuzzles },
  king: { piece: "K", name: "King", puzzles: [...kingPuzzles, ...castlingPuzzles] },
  knight: { piece: "N", name: "Knight", puzzles: knightPuzzles },
  pawn: { piece: "P", name: "Pawn", puzzles: [...pawnPuzzles, ...enPassantPuzzles] },
  "checkmate-back-rank": { piece: "R", name: "Back Rank Mate", puzzles: backRankMatePuzzles },
  "checkmate-rook-ladder": { piece: "R", name: "Rook Ladder", puzzles: rookLadderPuzzles },
  "checkmate-queen-f7": { piece: "Q", name: "Queen Takes f7", puzzles: queenF7Puzzles },
  "checkmate-qb-battery": { piece: "Q", name: "Queen-Bishop Battery", puzzles: qbBatteryPuzzles },
  "checkmate-lollis": { piece: "Q", name: "Lolli's Mate", puzzles: lollisMatePuzzles },
  "checkmate-queen-king": { piece: "Q", name: "Queen & King Mate", puzzles: queenKingMatePuzzles },
  "checkmate-smothered": { piece: "N", name: "Smothered Mate", puzzles: smotheredMatePuzzles },
  "checkmate-mate-in-1": { piece: "Q", name: "Mate in 1", puzzles: mateIn1Puzzles },
  "checkmate-mate-in-2": { piece: "Q", name: "Mate in 2", puzzles: mateIn2Puzzles },
  "tactics-pins": { piece: "B", name: "Pins", puzzles: pinPuzzles },
  "tactics-forks": { piece: "N", name: "Forks", puzzles: forkPuzzles },
  "tactics-skewers": { piece: "R", name: "Skewers", puzzles: skewerPuzzles },
  "tactics-removing-defender": { piece: "R", name: "Removing the Defender", puzzles: removingDefenderPuzzles },
  "tactics-discovered": { piece: "N", name: "Discovered Attacks", puzzles: discoveredPuzzles },
  "danger-zones": { piece: "N", name: "Danger Zones", puzzles: dangerZonePuzzles },
  "pawn-endings-practice": { piece: "K", name: "Pawn Ending Practice", puzzles: pawnEndingPuzzles },
  "endings-lucena": { piece: "R", name: "Lucena Position", puzzles: lucenaPuzzles },
  "endings-reti": { piece: "K", name: "Réti Study", puzzles: retiPuzzles },
  "endings-pawn-races": { piece: "P", name: "Pawn Races", puzzles: pawnRacePuzzles },
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

export const PIECE_ORDER = ["rook", "bishop", "queen", "king", "knight", "pawn", "checkmate"] as const;

export interface PieceInfo {
  key: string;
  name: string;
  icon: string;
  pieceKind: PieceKind;
  available: boolean;
}

export interface SubcategoryInfo {
  key: string;
  name: string;
  icon: string;
  comingSoon?: boolean;
}

export interface CategoryInfo {
  key: string;
  name: string;
  icon: string;
  subcategories: SubcategoryInfo[];
}

export const PIECES: PieceInfo[] = [
  { key: "rook", name: "Rook", icon: "/pieces/wR.svg", pieceKind: "R", available: true },
  { key: "bishop", name: "Bishop", icon: "/pieces/wB.svg", pieceKind: "B", available: true },
  { key: "queen", name: "Queen", icon: "/pieces/wQ.svg", pieceKind: "Q", available: true },
  { key: "king", name: "King", icon: "/pieces/wK.svg", pieceKind: "K", available: true },
  { key: "knight", name: "Knight", icon: "/pieces/wN.svg", pieceKind: "N", available: true },
  { key: "pawn", name: "Pawn", icon: "/pieces/wP.svg", pieceKind: "P", available: true },
];

export const CATEGORIES: CategoryInfo[] = [
  {
    key: "checkmate",
    name: "Checkmate Patterns",
    icon: "/pieces/wQ.svg",
    subcategories: [
      { key: "checkmate-back-rank", name: "Back Rank Mate", icon: "/pieces/wR.svg" },
      { key: "checkmate-rook-ladder", name: "Rook Ladder", icon: "/pieces/wR.svg" },
      { key: "checkmate-queen-f7", name: "Queen Takes f7", icon: "/pieces/wQ.svg" },
      { key: "checkmate-qb-battery", name: "Queen-Bishop Battery", icon: "/pieces/wQ.svg" },
      { key: "checkmate-lollis", name: "Lolli's Mate", icon: "/pieces/wQ.svg" },
      { key: "checkmate-queen-king", name: "Queen & King", icon: "/pieces/wQ.svg" },
      { key: "checkmate-smothered", name: "Smothered Mate", icon: "/pieces/wN.svg" },
      { key: "checkmate-mate-in-1", name: "Mate in 1", icon: "/pieces/wQ.svg" },
      { key: "checkmate-mate-in-2", name: "Mate in 2", icon: "/pieces/wQ.svg" },
    ],
  },
  {
    key: "tactics",
    name: "Tactics",
    icon: "/pieces/wN.svg",
    subcategories: [
      { key: "tactics-pins", name: "Pins", icon: "/pieces/wB.svg" },
      { key: "tactics-skewers", name: "Skewers", icon: "/pieces/wR.svg" },
      { key: "tactics-forks", name: "Forks", icon: "/pieces/wN.svg" },
      { key: "tactics-removing-defender", name: "Removing the Defender", icon: "/pieces/wR.svg" },
      { key: "tactics-discovered", name: "Discovered Attacks", icon: "/pieces/wN.svg" },
    ],
  },
  {
    key: "endings",
    name: "Endings",
    icon: "/pieces/wK.svg",
    subcategories: [
      { key: "endings-kpk", name: "King + Pawn vs King", icon: "/pieces/wP.svg" },
      { key: "endings-kqk", name: "Queen vs King", icon: "/pieces/wQ.svg" },
      { key: "endings-krrk", name: "Rook Ladder", icon: "/pieces/wR.svg" },
      { key: "endings-krk", name: "Rook vs King", icon: "/pieces/wR.svg" },
    ],
  },
  {
    key: "advanced-endings",
    name: "Advanced Endings",
    icon: "/pieces/wK.svg",
    subcategories: [
      { key: "endings-kbbk", name: "2 Bishops vs King", icon: "/pieces/wB.svg" },
      { key: "endings-kbnk", name: "Bishop + Knight vs King", icon: "/pieces/wN.svg" },
      { key: "endings-lucena", name: "Lucena Position", icon: "/pieces/wR.svg" },
      { key: "endings-philidor", name: "Philidor Position", icon: "/pieces/wR.svg" },
      { key: "endings-reti", name: "Réti Study", icon: "/pieces/wK.svg" },
      { key: "endings-wrong-bishop", name: "Wrong Bishop", icon: "/pieces/wB.svg" },
      { key: "endings-pawn-races", name: "Pawn Races", icon: "/pieces/wP.svg" },
    ],
  },
  {
    key: "blindfold",
    name: "Blindfold",
    icon: "/pieces/wN.svg",
    subcategories: [
      { key: "blindfold-color", name: "Color of Square", icon: "/pieces/wP.svg" },
      { key: "blindfold-diagonals", name: "Same Diagonal?", icon: "/pieces/wB.svg" },
      { key: "blindfold-rankfile", name: "Same Rank or File?", icon: "/pieces/wR.svg" },
      { key: "blindfold-counting", name: "Move Counting", icon: "/pieces/wQ.svg" },
      { key: "blindfold-knight-routes", name: "Knight Routes", icon: "/pieces/wN.svg" },
      { key: "blindfold-bishop-routes", name: "Bishop Routes", icon: "/pieces/wB.svg" },
      { key: "blindfold-reachability", name: "Piece Reachability", icon: "/pieces/wN.svg" },
      { key: "blindfold-neighbors", name: "Neighbor Squares", icon: "/pieces/wK.svg" },
      { key: "blindfold-knightsquares", name: "Knight Squares", icon: "/pieces/wN.svg" },
      { key: "blindfold-changed", name: "What Changed?", icon: "/pieces/wR.svg" },
      { key: "blindfold-landed", name: "Where Did It Land?", icon: "/pieces/wN.svg" },
      { key: "blindfold-flash", name: "Flash Position", icon: "/pieces/wK.svg" },
      { key: "blindfold-piececount", name: "Piece Count", icon: "/pieces/wP.svg" },
      { key: "blindfold-rookmaze", name: "Rook Maze", icon: "/pieces/wR.svg" },
      { key: "blindfold-gauntlet", name: "Knight Gauntlet", icon: "/pieces/wN.svg" },
      { key: "blindfold-guarding", name: "Who's Guarding Whom?", icon: "/pieces/wQ.svg" },
      { key: "blindfold-blindtactics", name: "Blind Tactics", icon: "/pieces/wQ.svg" },
      { key: "blindfold-puzzle", name: "Blindfold Puzzles", icon: "/pieces/wK.svg" },
      { key: "blindfold-mate-kqk", name: "Mate: Q vs K", icon: "/pieces/wQ.svg" },
      { key: "blindfold-mate-krrk", name: "Mate: RR vs K", icon: "/pieces/wR.svg" },
      { key: "blindfold-mate-krk", name: "Mate: R vs K", icon: "/pieces/wR.svg" },
      { key: "blindfold-mate-kbbk", name: "Mate: BB vs K", icon: "/pieces/wB.svg" },
      { key: "blindfold-mate-kbnk", name: "Mate: BN vs K", icon: "/pieces/wN.svg" },
    ],
  },
];

export function getCategory(key: string): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.key === key);
}
