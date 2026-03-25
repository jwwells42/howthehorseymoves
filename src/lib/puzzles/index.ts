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
import { pinPuzzles } from "./tactics";
import { lichessMateIn1Puzzles } from "./lichess-mate1";
import { lichessMateIn2Puzzles } from "./lichess-mate2";
import { lichessForkPuzzles } from "./lichess-forks";
import { lichessSkewerPuzzles } from "./lichess-skewers";
import { lichessRemovingDefenderPuzzles } from "./lichess-removing-defender";
import { lichessDiscoveredPuzzles } from "./lichess-discovered";
import { lichessPinPuzzles } from "./lichess-pins";
import { dangerZonePuzzles } from "./danger-zones";

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
  "checkmate-mate-in-1": { piece: "Q", name: "Mate in 1", puzzles: lichessMateIn1Puzzles },
  "checkmate-mate-in-2": { piece: "Q", name: "Mate in 2", puzzles: lichessMateIn2Puzzles },
  "tactics-pins": { piece: "B", name: "Pins", puzzles: [...pinPuzzles, ...lichessPinPuzzles] },
  "tactics-forks": { piece: "N", name: "Forks", puzzles: lichessForkPuzzles },
  "tactics-skewers": { piece: "R", name: "Skewers", puzzles: lichessSkewerPuzzles },
  "tactics-removing-defender": { piece: "R", name: "Removing the Defender", puzzles: lichessRemovingDefenderPuzzles },
  "tactics-discovered": { piece: "N", name: "Discovered Attacks", puzzles: lichessDiscoveredPuzzles },
  "danger-zones": { piece: "N", name: "Danger Zones", puzzles: dangerZonePuzzles },
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
  comingSoon?: boolean;
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
      { key: "checkmate-queen-f7", name: "Queen Takes f7", description: "The queen strikes the weak f7 square.", icon: "/pieces/wQ.svg" },
      { key: "checkmate-qb-battery", name: "Queen-Bishop Battery", description: "Queen and bishop team up on a diagonal.", icon: "/pieces/wQ.svg" },
      { key: "checkmate-lollis", name: "Lolli's Mate", description: "Queen slips in behind the pawns for mate.", icon: "/pieces/wQ.svg" },
      { key: "checkmate-queen-king", name: "Queen & King", description: "Use the queen with king support.", icon: "/pieces/wQ.svg" },
      { key: "checkmate-smothered", name: "Smothered Mate", description: "The knight strikes when the king can't move.", icon: "/pieces/wN.svg" },
      { key: "checkmate-mate-in-1", name: "Mate in 1", description: "Find the single move that delivers checkmate.", icon: "/pieces/wQ.svg" },
      { key: "checkmate-mate-in-2", name: "Mate in 2", description: "Set up the checkmate in two precise moves.", icon: "/pieces/wQ.svg" },
    ],
  },
  {
    key: "tactics",
    name: "Tactics",
    description: "Spot winning moves and combinations!",
    icon: "/pieces/wN.svg",
    subcategories: [
      { key: "tactics-pins", name: "Pins", description: "Trap a piece on a line — it can't move!", icon: "/pieces/wB.svg" },
      { key: "tactics-skewers", name: "Skewers", description: "Attack through one piece to grab another.", icon: "/pieces/wR.svg" },
      { key: "tactics-forks", name: "Forks", description: "Attack two pieces at once with the knight.", icon: "/pieces/wN.svg" },
      { key: "tactics-removing-defender", name: "Removing the Defender", description: "Capture the piece that guards a target.", icon: "/pieces/wR.svg" },
      { key: "tactics-discovered", name: "Discovered Attacks", description: "Move one piece to unleash another.", icon: "/pieces/wN.svg" },
    ],
  },
  {
    key: "endings",
    name: "Endings",
    description: "Master essential endgame techniques!",
    icon: "/pieces/wK.svg",
    subcategories: [
      { key: "endings-kpk", name: "King + Pawn vs King", description: "Promote the pawn against perfect defense.", icon: "/pieces/wP.svg" },
      { key: "endings-kqk", name: "Queen vs King", description: "Deliver checkmate with King + Queen.", icon: "/pieces/wQ.svg" },
      { key: "endings-krrk", name: "2 Rooks vs King", description: "Deliver checkmate with King + 2 Rooks.", icon: "/pieces/wR.svg" },
      { key: "endings-krk", name: "Rook vs King", description: "Deliver checkmate with King + Rook.", icon: "/pieces/wR.svg" },
    ],
  },
  {
    key: "advanced-endings",
    name: "Advanced Endings",
    description: "Harder endgame techniques and concepts.",
    icon: "/pieces/wK.svg",
    subcategories: [
      { key: "endings-kbbk", name: "2 Bishops vs King", description: "Deliver checkmate with King + 2 Bishops.", icon: "/pieces/wB.svg" },
      { key: "endings-kbnk", name: "Bishop + Knight vs King", description: "Deliver checkmate with King + Bishop + Knight.", icon: "/pieces/wN.svg" },
      { key: "endings-lucena", name: "Lucena Position", description: "Build a bridge to promote your rook pawn.", icon: "/pieces/wR.svg", comingSoon: true },
      { key: "endings-philidor", name: "Philidor Position", description: "Hold the draw with your rook.", icon: "/pieces/wR.svg" },
      { key: "endings-opposition", name: "Opposition", description: "Use your king to control key squares.", icon: "/pieces/wK.svg", comingSoon: true },
      { key: "endings-zugzwang", name: "Zugzwang", description: "Put your opponent in a position where any move loses.", icon: "/pieces/wK.svg", comingSoon: true },
      { key: "endings-reti", name: "Réti Study", description: "The king chases two pawns at once.", icon: "/pieces/wK.svg", comingSoon: true },
      { key: "endings-wrong-bishop", name: "Wrong Bishop", description: "Why a rook pawn + wrong-color bishop is a draw.", icon: "/pieces/wB.svg", comingSoon: true },
      { key: "endings-pawn-races", name: "Pawn Races", description: "Count tempi — who promotes first?", icon: "/pieces/wP.svg", comingSoon: true },
    ],
  },
  {
    key: "blindfold",
    name: "Blindfold",
    description: "Train your mental board vision!",
    icon: "/pieces/wN.svg",
    subcategories: [
      { key: "blindfold-color", name: "Color of Square", description: "Dark or light? Identify the color from the name.", icon: "/pieces/wP.svg" },
      { key: "blindfold-diagonals", name: "Same Diagonal?", description: "Are these two squares on the same diagonal?", icon: "/pieces/wB.svg" },
      { key: "blindfold-rankfile", name: "Same Rank or File?", description: "Do these two squares share a rank or file?", icon: "/pieces/wR.svg" },
      { key: "blindfold-counting", name: "Move Counting", description: "How many squares does this piece control?", icon: "/pieces/wQ.svg" },
      { key: "blindfold-knight-routes", name: "Knight Routes", description: "Find a knight path between two squares — no board!", icon: "/pieces/wN.svg" },
      { key: "blindfold-bishop-routes", name: "Bishop Routes", description: "Find a bishop path — or spot when it's impossible!", icon: "/pieces/wB.svg" },
      { key: "blindfold-reachability", name: "Piece Reachability", description: "Can this piece reach that square? Yes or no!", icon: "/pieces/wN.svg" },
      { key: "blindfold-neighbors", name: "Neighbor Squares", description: "Name all squares adjacent to a given square.", icon: "/pieces/wK.svg" },
      { key: "blindfold-knightsquares", name: "Knight Squares", description: "Name every square a knight can reach from a given square.", icon: "/pieces/wN.svg" },
      { key: "blindfold-relative", name: "Relative Position", description: "Which direction is the second square from the first?", icon: "/pieces/wP.svg" },
      { key: "blindfold-changed", name: "What Changed?", description: "Memorize a position, then spot what moved.", icon: "/pieces/wR.svg" },
      { key: "blindfold-landed", name: "Where Did It Land?", description: "Follow opening moves mentally, then find a piece.", icon: "/pieces/wN.svg" },
      { key: "blindfold-flash", name: "Flash Position", description: "Memorize a position, then place the pieces from memory.", icon: "/pieces/wK.svg" },
      { key: "blindfold-piececount", name: "Piece Count", description: "Flash a position — how many pieces of each type?", icon: "/pieces/wP.svg" },
      { key: "blindfold-rookmaze", name: "Rook Maze", description: "Navigate a rook around obstacles — no board!", icon: "/pieces/wR.svg" },
      { key: "blindfold-gauntlet", name: "Knight Gauntlet", description: "Navigate the knight without stepping on queen-attacked squares!", icon: "/pieces/wN.svg" },
      { key: "blindfold-guarding", name: "Who's Guarding Whom?", description: "Track piece interactions as they move — blindfolded!", icon: "/pieces/wQ.svg" },
      { key: "blindfold-blindtactics", name: "Blind Tactics", description: "See a position, then find checkmate blindfolded!", icon: "/pieces/wQ.svg" },
      { key: "blindfold-puzzle", name: "Blindfold Puzzles", description: "Pieces are invisible — solve from a text description!", icon: "/pieces/wK.svg" },
      { key: "blindfold-mate-kqk", name: "Mate: Q vs K", description: "Deliver checkmate blindfolded with King + Queen.", icon: "/pieces/wQ.svg" },
      { key: "blindfold-mate-krrk", name: "Mate: RR vs K", description: "Deliver checkmate blindfolded with King + 2 Rooks.", icon: "/pieces/wR.svg" },
      { key: "blindfold-mate-krk", name: "Mate: R vs K", description: "Deliver checkmate blindfolded with King + Rook.", icon: "/pieces/wR.svg" },
      { key: "blindfold-mate-kbbk", name: "Mate: BB vs K", description: "Deliver checkmate blindfolded with King + 2 Bishops.", icon: "/pieces/wB.svg" },
      { key: "blindfold-mate-kbnk", name: "Mate: BN vs K", description: "Deliver checkmate blindfolded with King + Bishop + Knight.", icon: "/pieces/wN.svg" },
    ],
  },
];

export function getCategory(key: string): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.key === key);
}
