import type { SquareId, PiecePlacement } from '$lib/logic/types';
import type { Arrow } from '$lib/logic/pgn';

// A diagram slide: static board with key-square stars
export interface DiagramStep {
  type: 'diagram';
  id: string;
  title: string;
  instruction: string;
  fen: string;
  keySquares: SquareId[];
  arrows?: Arrow[];
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
  annotatedPgn?: string;
}

// An inline interactive trainer (EndgameShell or DrawTrainer)
export interface TrainerStep {
  type: 'trainer';
  id: string;
  title: string;
  instruction: string;
  trainerType: 'endgame' | 'draw';
  placements: PiecePlacement[];
  storageKey?: string;
  botStrategy?: 'heuristic' | 'bitbase-kpk';
}

export type LessonStep = DiagramStep | QuizStep | TrainerStep;

// NOTE: proof move sequences should be verified by the user in-browser.
// Claude-generated PGNs may contain errors.

/** Get a step by its id (used as URL slug) */
export function getStepById(id: string): LessonStep | undefined {
  return pawnEndingSteps.find(s => s.id === id);
}

/** Get the index of a step by its id */
export function getStepIndex(id: string): number {
  return pawnEndingSteps.findIndex(s => s.id === id);
}

/** localStorage key for per-step stars (quiz steps only) */
export function stepStorageKey(id: string): string {
  return `pawn-endings-${id}-best-stars`;
}

export const pawnEndingSteps: LessonStep[] = [
  // ========================================
  // Section 1: Rule of the Square
  // ========================================
  {
    type: 'diagram',
    id: 'pe-square-01',
    title: 'Rule of the Square',
    instruction: 'Draw a square from the pawn to the promotion rank. If the enemy king can step inside this square, it catches the pawn!',
    fen: '8/8/8/P7/8/8/8/K7 w - - 0 1',
    keySquares: [],
    arrows: [
      { from: 'a5' as SquareId, to: 'a8' as SquareId, color: '#facc15' },
      { from: 'a8' as SquareId, to: 'd8' as SquareId, color: '#facc15' },
      { from: 'd8' as SquareId, to: 'd5' as SquareId, color: '#facc15' },
      { from: 'd5' as SquareId, to: 'a5' as SquareId, color: '#facc15' },
    ],
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
    id: 'pe-square-enters',
    title: 'Stepping Into the Square',
    instruction: 'It\'s Black\'s turn. Black plays Kd8.',
    startFen: '4k3/8/8/P7/8/8/8/K7 b - - 0 1',
    introMoves: ['Kd8'],
    answer: 'draw',
    // NOTE: proof moves need user verification in-browser
    proofMoves: ['a6', 'Kc7', 'a7', 'Kb7', 'a8=Q', 'Kxa8'],
    endState: 'stalemate',
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
  // Section 2: Key Squares
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
    title: 'Two Ranks Ahead',
    instruction: 'On your half of the board, key squares are always two ranks in front of the pawn.',
    fen: '8/8/8/8/8/8/4P3/8 w - - 0 1',
    keySquares: ['d4', 'e4', 'f4'],
  },
  {
    type: 'diagram',
    id: 'pe-keysq-crossed',
    title: 'Past the Middle',
    instruction: 'Once the pawn crosses the middle of the board, the key squares expand — now one AND two ranks ahead!',
    fen: '8/8/8/3P4/8/8/8/8 w - - 0 1',
    keySquares: ['c6', 'd6', 'e6', 'c7', 'd7', 'e7'],
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
  // Section 3: Opposition
  // ========================================
  {
    type: 'quiz',
    id: 'pe-opposition-01',
    title: 'Black Must Move',
    instruction: 'White plays Kd5. The kings face each other — and it\'s Black\'s turn. What will be the result?',
    startFen: '8/3k4/8/8/3PK3/8/8/8 w - - 0 1',
    introMoves: ['Kd5'],
    answer: 'white',
    // NOTE: proof moves need user verification in-browser
    proofMoves: ['Ke7', 'Kc6', 'Kd8', 'Kd6', 'Ke8', 'Kc7', 'Kf7', 'd5', 'Ke7', 'd6+', 'Ke8', 'd7+', 'Kf7', 'd8=Q'],
    endState: 'promotion',
  },
  {
    type: 'quiz',
    id: 'pe-opposition-02',
    title: 'White Must Move',
    instruction: 'Black plays Kd7 — the kings face each other and it\'s White\'s turn. What will be the result?',
    startFen: '8/4k3/8/3K4/3P4/8/8/8 b - - 0 1',
    introMoves: ['Kd7'],
    answer: 'draw',
    // NOTE: proof moves need user verification in-browser
    proofMoves: ['Ke5', 'Ke7', 'd5', 'Kd7', 'd6', 'Kd8', 'Ke6', 'Ke8', 'd7+', 'Kd8', 'Kd6'],
    endState: 'stalemate',
  },

  // ========================================
  // Section 4: Outside Passed Pawn
  // ========================================
  {
    type: 'quiz',
    id: 'pe-outside-01',
    title: 'Outside Passed Pawn',
    instruction: 'White has a passed a-pawn far from the other pawns. White to move.',
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
    instruction: 'Three white pawns face three black pawns. White to move.',
    startFen: '8/ppp5/8/PPP5/8/8/8/K5k1 w - - 0 1',
    introMoves: [],
    answer: 'white',
    proofMoves: ['b6', 'axb6', 'c6', 'bxc6', 'a6', 'c5', 'a7', 'c4', 'a8=Q'],
    endState: 'promotion',
    annotatedPgn: '1. b6! {The key sacrifice. White offers the b-pawn to rip open the position.} axb6 (1... cxb6 {If Black captures with the c-pawn instead...} 2. a6! {Now the a-pawn is unstoppable.} bxa6 3. c6 {And the c-pawn queens!}) 2. c6! {A second sacrifice!} bxc6 (2... b5 {Trying to hold...} 3. cxb7 {The c-pawn promotes.}) 3. a6 {Now the a-pawn is free and clear — nothing can stop it.} c5 4. a7 c4 5. a8=Q',
  },

  // ========================================
  // Section 6: Trebuchet (Mutual Zugzwang)
  // ========================================
  {
    type: 'diagram',
    id: 'pe-trebuchet-01',
    title: 'The Trebuchet',
    instruction: 'The squares next to each pawn are "mined" — if your king steps on one, the opponent captures your pawn and promotes! Recognize this pattern from far away.',
    fen: '8/8/3Kp3/4Pk2/8/8/8/8 w - - 0 1',
    keySquares: [],
  },
  {
    type: 'quiz',
    id: 'pe-trebuchet-02',
    title: 'Trebuchet: White Moves',
    instruction: 'It\'s White\'s turn.',
    startFen: '8/8/3Kp3/4Pk2/8/8/8/8 w - - 0 1',
    introMoves: [],
    answer: 'draw',
    // NOTE: proof moves need user verification in-browser
    // White must move king, Black captures e5 and promotes
    proofMoves: ['Ke7', 'Kxe5', 'Kd8', 'Kd6', 'Ke8', 'e5', 'Kf7', 'e4', 'Kf6', 'e3', 'Kf5', 'e2', 'Kf4', 'e1=Q'],
    endState: 'promotion',
  },

  // ========================================
  // Section 7: Guard the Entry
  // ========================================
  {
    type: 'diagram',
    id: 'pe-guard-01',
    title: 'Guard the Entry!',
    instruction: 'The defending king stands directly in front of the pawn, keeping opposition. White\'s king cannot reach any key square!',
    fen: '8/3k4/8/3PK3/8/8/8/8 w - - 0 1',
    keySquares: ['c6', 'd6', 'e6'],
  },
  {
    type: 'quiz',
    id: 'pe-guard-03',
    title: 'Gligoric vs Fischer, 1959',
    instruction: 'Black to move.',
    startFen: '2k5/8/8/8/1PK5/8/8/8 b - - 0 1',
    introMoves: [],
    answer: 'draw',
    proofMoves: ['Kb8', 'Kb5', 'Kb7'],
    endState: 'stalemate',
  },

  // ========================================
  // Section 8: Play It Out (interactive trainers)
  // ========================================
  {
    type: 'trainer',
    id: 'pe-kpk-convert',
    title: 'KPK: Convert',
    instruction: 'Promote the pawn! Every wrong move is a draw.',
    trainerType: 'endgame',
    placements: [
      { piece: 'K', color: 'w', square: 'd6' },
      { piece: 'P', color: 'w', square: 'd4' },
      { piece: 'K', color: 'b', square: 'd8' },
    ],
  },
  {
    type: 'trainer',
    id: 'pe-kpk-defend',
    title: 'KPK: Defend',
    instruction: 'Keep opposition! Block the key squares and force stalemate.',
    trainerType: 'draw',
    placements: [
      { piece: 'K', color: 'w', square: 'd5' },
      { piece: 'P', color: 'w', square: 'd4' },
      { piece: 'K', color: 'b', square: 'd7' },
    ],
    storageKey: 'pawn-endings-kpk-draw-best-stars',
    botStrategy: 'bitbase-kpk',
  },
];
