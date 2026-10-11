import type { PieceKind, PiecePlacement, SquareId } from "../logic/types";
import type { Arrow } from "../logic/pgn";

interface PuzzleBase {
  id: string;
}

export interface RoutePuzzle extends PuzzleBase {
  type: "route";
  playerPiece: PieceKind;
  position: PiecePlacement[];
  walls: SquareId[];
  stars: SquareId[];
  starThresholds: { three: number; two: number; one: number };
  arrows?: Arrow[];
  threats?: true;
}

export interface TacticPuzzle extends PuzzleBase {
  type: "puzzle";
  fen: string;
  pgn: string;
  demo?: true | string;
  starThresholds?: { three: number; two: number; one: number };
}

export interface ConversionPuzzle extends PuzzleBase {
  type: "conversion";
  position: PiecePlacement[];
  bot: "random" | "basic";
  goal: "checkmate" | "promotion";
  starThresholds: { three: number; two: number; one: number };
}

export interface FindMovesPuzzle extends PuzzleBase {
  type: "find-moves";
  playerPiece: PieceKind;
  position: PiecePlacement[];
  walls: SquareId[];
  enPassantSquare?: SquareId;
  /** Black's move, played on the board as the puzzle opens, e.g. the pawn
      jump that makes en passant possible. `position` is before it */
  opponentMove?: { from: SquareId; to: SquareId };
  starThresholds: { three: number; two: number; one: number };
  /** 'demo' = animate moves, 'guided' = glow targets, 'test' = no hints (default) */
  mode?: 'demo' | 'guided' | 'test';
  /** A hand taps two of the squares first, to show what to do */
  showHow?: true;
}

/** First in each piece's set: the piece stands on `square` with its moves
    drawn as arrows, then walks `route`, one square after another. A step that
    isn't one of its moves (a pawn going back) jumps instead of sliding.
    Watching it to the end counts as solved. */
export interface TourPuzzle extends PuzzleBase {
  type: "tour";
  playerPiece: PieceKind;
  square: SquareId;
  route: SquareId[];
}

export type Puzzle = RoutePuzzle | TacticPuzzle | ConversionPuzzle | FindMovesPuzzle | TourPuzzle;

export interface PuzzleSet {
  piece: PieceKind;
  name: string;
  puzzles: Puzzle[];
}
