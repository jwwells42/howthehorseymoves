import { createBoardState, squareToCoords, type PieceKind, type SquareId } from '$lib/logic/types';
import { getValidMoves } from '$lib/logic/moves';
import type { Arrow } from '$lib/logic/pgn';
import { MARK } from '$lib/board-marks';

/*
  Match the Moves: one piece at the top, four boards below, each showing a
  piece's moves as arrows. Tap the board that belongs to the piece.
*/

export const PIECE_KINDS: PieceKind[] = ['R', 'B', 'Q', 'K', 'N', 'P'];

export const PIECE_NAMES: Record<PieceKind, string> = {
  R: 'rook', B: 'bishop', Q: 'queen', K: 'king', N: 'knight', P: 'pawn',
};

export const ROUND_LENGTH = 10;
export const CHOICES = 4;

/** Every board in a question starts here, so only the arrows differ. Centre
    squares, so every piece shows all its moves. */
export const CENTRE_SQUARES: SquareId[] = [
  'c3', 'd3', 'e3', 'f3',
  'c4', 'd4', 'e4', 'f4',
  'c5', 'd5', 'e5', 'f5',
  'c6', 'd6', 'e6', 'f6',
];

export interface Question {
  answer: PieceKind;
  /** Four pieces, the answer among them, in the order the boards are shown. */
  choices: PieceKind[];
  origin: SquareId;
}

/** Arrows for where a piece can go from `origin` on an empty board. A rook,
    bishop or queen gets one arrow per direction, to the edge; a king, knight
    or pawn gets one arrow per move. */
export function moveArrows(piece: PieceKind, origin: SquareId): Arrow[] {
  const board = createBoardState([{ piece, color: 'w', square: origin }]);
  let targets = getValidMoves(piece, origin, board, 'w');

  if (piece === 'R' || piece === 'B' || piece === 'Q') {
    const [ox, oy] = squareToCoords(origin);
    const farthest = new Map<string, { square: SquareId; distance: number }>();
    for (const square of targets) {
      const [x, y] = squareToCoords(square);
      const direction = `${Math.sign(x - ox)},${Math.sign(y - oy)}`;
      const distance = Math.max(Math.abs(x - ox), Math.abs(y - oy));
      if (distance > (farthest.get(direction)?.distance ?? 0)) {
        farthest.set(direction, { square, distance });
      }
    }
    targets = [...farthest.values()].map((f) => f.square);
  }

  return targets.map((to) => ({ from: origin, to, color: MARK.note }));
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** A round of questions. Every piece is the answer at least once, and never
    twice in a row. */
export function makeRound(): Question[] {
  const answers: PieceKind[] = [];
  let pool: PieceKind[] = [];
  while (answers.length < ROUND_LENGTH) {
    if (pool.every((p) => p === answers.at(-1))) pool.push(...shuffle(PIECE_KINDS));
    const next = pool.find((p) => p !== answers.at(-1))!;
    pool.splice(pool.indexOf(next), 1);
    answers.push(next);
  }

  return answers.map((answer) => {
    const others = shuffle(PIECE_KINDS.filter((p) => p !== answer)).slice(0, CHOICES - 1);
    return {
      answer,
      choices: shuffle([answer, ...others]),
      origin: pick(CENTRE_SQUARES),
    };
  });
}

/** Each wrong tap is a mistake. */
export function mistakesToStars(mistakes: number): number {
  if (mistakes === 0) return 3;
  if (mistakes <= 2) return 2;
  return 1;
}
