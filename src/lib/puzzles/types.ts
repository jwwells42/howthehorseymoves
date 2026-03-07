import { PieceKind, PiecePlacement, SquareId } from "../logic/types";

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
}

export interface PuzzleSet {
  piece: PieceKind;
  name: string;
  puzzles: Puzzle[];
}
