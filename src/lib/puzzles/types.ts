import { PieceKind, PiecePlacement, SquareId } from "../logic/types";
import type { Arrow } from "../logic/pgn";

export type PuzzleMode = "reach-target" | "checkmate" | "checkmate-bot";

export interface OpponentResponse {
  from: SquareId;
  to: SquareId;
}

export interface Puzzle {
  id: string;
  piece: PieceKind;
  title: string;
  instruction: string;
  /** Board setup — either piece placements array or a FEN string. */
  setup: PiecePlacement[] | string;
  targets: SquareId[];
  solution: SquareId[];
  hints?: string[];
  starThresholds: { three: number; two: number; one: number };
  enPassantSquare?: SquareId;
  castlingRights?: { K: boolean; Q: boolean; k: boolean; q: boolean };
  mode?: PuzzleMode;
  /** Opponent responses between player moves. Length = solution.length - 1. */
  opponentResponses?: OpponentResponse[];
  /** Reject any move that doesn't match the next solution step (red flash). */
  strictSolution?: boolean;
  /** Arrows drawn on the board to highlight tactical relationships. */
  arrows?: Arrow[];
}

export interface PuzzleSet {
  piece: PieceKind;
  name: string;
  puzzles: Puzzle[];
}
