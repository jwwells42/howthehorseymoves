import type { SquareId } from '$lib/logic/types';

// A diagram slide: static board with key-square stars
export interface DiagramStep {
  type: 'diagram';
  id: string;
  title: string;
  instruction: string;
  fen: string;
  keySquares: SquareId[];
}

// A quiz: animate intro, ask question, animate proof
export interface QuizStep {
  type: 'quiz';
  id: string;
  title: string;
  instruction: string;
  startFen: string;
  introMoves: string[];
  answer: 'white' | 'draw';
  proofMoves: string[];
  endState: 'promotion' | 'stalemate';
}

export type LessonStep = DiagramStep | QuizStep;

// NOTE: proof move sequences should be verified by the user in-browser.
// Claude-generated PGNs may contain errors.

export const pawnEndingSteps: LessonStep[] = [
  // --- Key squares diagrams ---
  {
    type: 'diagram',
    id: 'pe-keysq-01',
    title: 'Key Squares',
    instruction: 'If White\'s king reaches a starred square, the pawn will promote.',
    fen: '8/8/8/8/4P3/8/8/8 w - - 0 1',
    keySquares: ['d6', 'e6', 'f6'],
  },
  {
    type: 'diagram',
    id: 'pe-keysq-02',
    title: 'Key Squares Move Back',
    instruction: 'Further back pawns have further key squares — always two ranks ahead.',
    fen: '8/8/8/8/8/8/4P3/8 w - - 0 1',
    keySquares: ['d4', 'e4', 'f4'],
  },
  {
    type: 'diagram',
    id: 'pe-keysq-03',
    title: 'Rook Pawn',
    instruction: 'Rook pawns only have one key square. These endings are usually drawn.',
    fen: '8/8/8/8/P7/8/8/8 w - - 0 1',
    keySquares: ['b6'],
  },
  // --- Opposition quizzes ---
  {
    type: 'quiz',
    id: 'pe-opposition-01',
    title: 'King in Front',
    instruction: 'The white king steps to d6. What will be the result?',
    startFen: '3k4/8/8/3PK3/8/8/8/8 w - - 0 1',
    introMoves: ['Kd6'],
    answer: 'white',
    proofMoves: ['Ke8', 'Kc7', 'Ke7', 'd6+', 'Ke8', 'd7+', 'Kf7', 'd8=Q'],
    endState: 'promotion',
  },
  {
    type: 'quiz',
    id: 'pe-opposition-02',
    title: 'Opposition',
    instruction: 'Black takes the opposition with Kd8. What will be the result?',
    startFen: '4k3/8/3K4/3P4/8/8/8/8 b - - 0 1',
    introMoves: ['Kd8'],
    answer: 'draw',
    proofMoves: ['d6', 'Kc8', 'd7', 'Kd8'],
    endState: 'stalemate',
  },
];
