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
  // ========================================
  // Section 1: Key Squares
  // ========================================
  {
    type: 'diagram',
    id: 'pe-keysq-01',
    title: 'Key Squares',
    instruction: 'If White\'s king reaches a starred square (a "key square"), the pawn will promote — no matter what Black does.',
    fen: '8/8/8/8/4P3/8/8/8 w - - 0 1',
    keySquares: ['d6', 'e6', 'f6'],
  },
  {
    type: 'diagram',
    id: 'pe-keysq-02',
    title: 'Key Squares Move Back',
    instruction: 'A pawn further back has key squares further ahead — always two ranks in front of the pawn.',
    fen: '8/8/8/8/8/8/4P3/8 w - - 0 1',
    keySquares: ['d4', 'e4', 'f4'],
  },
  {
    type: 'diagram',
    id: 'pe-keysq-03',
    title: 'Rook Pawn',
    instruction: 'Rook pawns have fewer key squares. These endings are much harder to win.',
    fen: '8/8/8/8/P7/8/8/8 w - - 0 1',
    keySquares: ['b7', 'b8'],
  },

  // ========================================
  // Section 2: Opposition
  // ========================================
  {
    type: 'quiz',
    id: 'pe-opposition-01',
    title: 'King on the Key Square',
    instruction: 'White\'s king reaches d6 — a key square! The pawn will promote. What will be the result?',
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
    instruction: 'Black takes the opposition with Kd8 — blocking the key squares. Opposition stops White from reaching the key squares, so the pawn can\'t promote.',
    startFen: '4k3/8/3K4/3P4/8/8/8/8 b - - 0 1',
    introMoves: ['Kd8'],
    answer: 'draw',
    proofMoves: ['d6', 'Kc8', 'd7', 'Kd8'],
    endState: 'stalemate',
  },

  // ========================================
  // Section 3: Rule of the Square
  // ========================================
  {
    type: 'diagram',
    id: 'pe-square-01',
    title: 'Rule of the Square',
    instruction: 'Can the king catch the pawn? Count the diagonal — if the king can reach this line, it catches the pawn.',
    fen: '8/8/8/P7/8/8/8/K7 w - - 0 1',
    keySquares: ['b6', 'c7', 'd8'],
  },
  {
    type: 'quiz',
    id: 'pe-square-02',
    title: 'Outside the Square',
    instruction: 'White pushes a6. The black king is far away. What will be the result?',
    startFen: '7k/8/8/P7/8/8/8/K7 w - - 0 1',
    introMoves: ['a6'],
    answer: 'white',
    proofMoves: ['Kg7', 'a7', 'Kf6', 'a8=Q'],
    endState: 'promotion',
  },
  {
    type: 'quiz',
    id: 'pe-square-03',
    title: 'Inside the Square',
    instruction: 'White pushes a6. The black king is closer this time. What will be the result?',
    startFen: '3k4/8/8/P7/8/8/8/K7 w - - 0 1',
    introMoves: ['a6'],
    answer: 'draw',
    proofMoves: ['Kc7', 'a7', 'Kb7'],
    endState: 'stalemate',
  },

  // ========================================
  // Section 4: Outside Passed Pawn
  // ========================================
  {
    type: 'quiz',
    id: 'pe-outside-01',
    title: 'Outside Passed Pawn',
    instruction: 'White\'s a-pawn is far from the kingside. It will decoy Black\'s king away. What will be the result?',
    startFen: '8/8/4k3/6p1/P3K1P1/8/8/8 w - - 0 1',
    introMoves: [],
    answer: 'white',
    proofMoves: ['a5', 'Kd6', 'a6', 'Kc6', 'a7', 'Kb7', 'Kf5', 'Kxa7', 'Kxg5'],
    endState: 'promotion',
  },

  // ========================================
  // Section 5: Breakthrough
  // ========================================
  {
    type: 'quiz',
    id: 'pe-breakthrough-01',
    title: 'Breakthrough',
    instruction: 'Three white pawns face three black pawns. Looks equal — but White has a breakthrough sacrifice! What will be the result?',
    startFen: '8/ppp5/8/PPP5/8/8/8/K5k1 w - - 0 1',
    introMoves: [],
    answer: 'white',
    proofMoves: ['b6', 'axb6', 'c6', 'bxc6', 'a6', 'c5', 'a7', 'c4', 'a8=Q'],
    endState: 'promotion',
  },

  // ========================================
  // Section 6: Trebuchet (Mutual Zugzwang)
  // ========================================
  {
    type: 'diagram',
    id: 'pe-trebuchet-01',
    title: 'The Trebuchet',
    instruction: 'Each king blocks the other\'s pawn. Whoever moves first loses — this is called zugzwang!',
    fen: '8/8/8/k7/P7/8/7p/7K w - - 0 1',
    keySquares: [],
  },
  {
    type: 'quiz',
    id: 'pe-trebuchet-02',
    title: 'Trebuchet: Black Moves',
    instruction: 'Black must move the king off a5, releasing the a-pawn. What will be the result?',
    startFen: '8/8/8/k7/P7/8/7p/7K b - - 0 1',
    introMoves: ['Ka6'],
    answer: 'white',
    proofMoves: ['a5', 'Ka7', 'a6', 'Ka8', 'a7', 'Kb7', 'a8=Q+'],
    endState: 'promotion',
  },
];
