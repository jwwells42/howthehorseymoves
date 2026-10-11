import type { SquareId, PiecePlacement } from '$lib/logic/types';
import type { Arrow } from '$lib/logic/pgn';
import { MARK } from '$lib/board-marks';

// A diagram slide: static board with key-square stars
export interface DiagramStep {
  type: 'diagram';
  id: string;
  fen: string;
  keySquares: SquareId[];
  arrows?: Arrow[];
}

// A quiz: animate intro, ask question, animate proof
export interface QuizStep {
  type: 'quiz';
  id: string;
  startFen: string;
  introMoves: string[];
  answer: 'white' | 'draw' | 'black';
  proofMoves: string[];
  endState: 'promotion' | 'stalemate';
  annotatedPgn?: string;
}

// An inline interactive trainer (EndgameShell or DrawTrainer)
export interface TrainerStep {
  type: 'trainer';
  id: string;
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
    fen: '8/8/8/P7/8/8/8/K7 w - - 0 1',
    keySquares: [],
    arrows: [
      { from: 'a5' as SquareId, to: 'a8' as SquareId, color: MARK.note },
      { from: 'a8' as SquareId, to: 'd8' as SquareId, color: MARK.note },
      { from: 'd8' as SquareId, to: 'd5' as SquareId, color: MARK.note },
      { from: 'd5' as SquareId, to: 'a5' as SquareId, color: MARK.note },
    ],
  },
  {
    type: 'quiz',
    id: 'pe-square-02',
    startFen: '7k/8/8/P7/8/8/8/K7 w - - 0 1',
    introMoves: ['a6'],
    answer: 'white',
    proofMoves: ['Kg7', 'a7', 'Kf6', 'a8=Q'],
    endState: 'promotion',
  },
  {
    type: 'quiz',
    id: 'pe-square-enters',
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
    fen: '8/8/8/8/4P3/8/8/8 w - - 0 1',
    keySquares: ['d6', 'e6', 'f6'],
  },
  {
    type: 'diagram',
    id: 'pe-keysq-02',
    fen: '8/8/8/8/8/8/4P3/8 w - - 0 1',
    keySquares: ['d4', 'e4', 'f4'],
  },
  {
    type: 'diagram',
    id: 'pe-keysq-crossed',
    fen: '8/8/8/3P4/8/8/8/8 w - - 0 1',
    keySquares: ['c6', 'd6', 'e6', 'c7', 'd7', 'e7'],
  },
  {
    type: 'diagram',
    id: 'pe-keysq-03',
    fen: '8/8/8/8/P7/8/8/8 w - - 0 1',
    keySquares: ['b7', 'b8'],
  },

  // ========================================
  // Section 3: Opposition
  // ========================================
  {
    type: 'quiz',
    id: 'pe-opposition-01',
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
    startFen: '8/4k3/8/3K4/3P4/8/8/8 b - - 0 1',
    introMoves: ['Kd7'],
    answer: 'draw',
    // NOTE: proof moves need user verification in-browser
    proofMoves: ['Ke5', 'Ke7', 'd5', 'Kd7', 'd6', 'Kd8', 'Ke6', 'Ke8', 'd7+', 'Kd8', 'Kd6'],
    endState: 'stalemate',
  },

  // ========================================
  // Section 4: Reserve Tempo
  // ========================================
  {
    type: 'diagram',
    id: 'pe-tempo-01',
    fen: '8/4k3/8/4K3/8/4P3/8/8 w - - 0 1',
    keySquares: [],
    arrows: [
      { from: 'e3' as SquareId, to: 'e4' as SquareId, color: MARK.note },
    ],
  },
  {
    type: 'quiz',
    id: 'pe-tempo-02',
    startFen: '8/4k3/8/4K3/8/4P3/8/8 w - - 0 1',
    introMoves: ['e4'],
    answer: 'white',
    proofMoves: ['Kd7', 'Kf6'],
    endState: 'promotion',
  },

  // ========================================
  // Section 5: Shouldering
  // ========================================
  {
    type: 'diagram',
    id: 'pe-shoulder-01',
    fen: '8/5k2/8/4K3/4P3/8/8/8 w - - 0 1',
    keySquares: [],
    arrows: [
      { from: 'e5' as SquareId, to: 'd6' as SquareId, color: MARK.note },
    ],
  },
  {
    type: 'quiz',
    id: 'pe-shoulder-02',
    startFen: '8/4k3/8/4K3/4P3/8/8/8 b - - 0 1',
    introMoves: ['Kf7', 'Kd6'],
    answer: 'white',
    proofMoves: ['Ke8', 'Ke6'],
    endState: 'promotion',
  },

  // ========================================
  // Section 6: Outside Passed Pawn
  // ========================================
  {
    type: 'quiz',
    id: 'pe-outside-01',
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
    startFen: '8/ppp5/8/PPP5/8/8/8/K5k1 w - - 0 1',
    introMoves: [],
    answer: 'white',
    proofMoves: ['b6', 'axb6', 'c6', 'bxc6', 'a6', 'c5', 'a7', 'c4', 'a8=Q'],
    endState: 'promotion',
    annotatedPgn: '1. b6! axb6 (1... cxb6 2. a6! bxa6 3. c6) 2. c6! bxc6 (2... b5 3. cxb7) 3. a6 c5 4. a7 c4 5. a8=Q',
  },

  // ========================================
  // Section 6: Trebuchet (Mutual Zugzwang)
  // ========================================
  {
    type: 'diagram',
    id: 'pe-trebuchet-01',
    fen: '8/8/3Kp3/4Pk2/8/8/8/8 w - - 0 1',
    keySquares: [],
  },
  {
    type: 'quiz',
    id: 'pe-trebuchet-02',
    startFen: '8/8/3Kp3/4Pk2/8/8/8/8 w - - 0 1',
    introMoves: [],
    answer: 'black',
    proofMoves: ['Ke7', 'Kxe5'],
    endState: 'promotion',
  },

  // ========================================
  // Section 7: Guard the Entry
  // ========================================
  {
    type: 'diagram',
    id: 'pe-guard-01',
    fen: '8/3k4/8/3PK3/8/8/8/8 w - - 0 1',
    keySquares: ['c6', 'd6', 'e6'],
  },
  {
    type: 'quiz',
    id: 'pe-guard-03',
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
    trainerType: 'endgame',
    placements: [
      { piece: 'K', color: 'w', square: 'd6' },
      { piece: 'P', color: 'w', square: 'd4' },
      { piece: 'K', color: 'b', square: 'd8' },
    ],
  },
  {
    type: 'trainer',
    id: 'pe-kpk-convert-2',
    trainerType: 'endgame',
    placements: [
      { piece: 'K', color: 'w', square: 'e3' },
      { piece: 'P', color: 'w', square: 'e2' },
      { piece: 'K', color: 'b', square: 'e7' },
    ],
  },
  {
    type: 'trainer',
    id: 'pe-kpk-convert-3',
    trainerType: 'endgame',
    placements: [
      { piece: 'K', color: 'w', square: 'd1' },
      { piece: 'P', color: 'w', square: 'b4' },
      { piece: 'K', color: 'b', square: 'f8' },
    ],
  },
  {
    type: 'trainer',
    id: 'pe-kpk-defend',
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
