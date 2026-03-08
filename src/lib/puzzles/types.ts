import { PieceKind, PiecePlacement, SquareId } from "../logic/types";

export type PuzzleMode = "reach-target" | "checkmate";

export interface Puzzle {
  id: string;
  piece: PieceKind;
  title: string;
  instruction: string;
  setup: PiecePlacement[];
  targets: SquareId[];
  solution: SquareId[];
  maxMoves?: number;
  hints?: string[];
  starThresholds: { three: number; two: number; one: number };
  enPassantSquare?: SquareId;
  castlingRights?: { K: boolean; Q: boolean; k: boolean; q: boolean };
  mode?: PuzzleMode;
  opponentMoves?: Record<string, SquareId>;
}

export interface PuzzleSet {
  piece: PieceKind;
  name: string;
  puzzles: Puzzle[];
}
