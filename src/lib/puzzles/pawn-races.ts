import type { TacticPuzzle } from "./types";

/**
 * Pawn Races — counting tempi to promotion
 *
 * The student must evaluate who promotes first and find the winning plan.
 * Key skills: counting squares to promotion, using checks/tempo gains,
 * knowing when to push vs. when to capture.
 *
 * NOTE: positions and PGNs need user verification in-browser.
 */
export const pawnRacePuzzles: TacticPuzzle[] = [
  {
    type: "puzzle",
    id: "pawn-race-01",
    title: "Pawn Race #1",
    instruction: "Both sides have a passed pawn. Who promotes first?",
    fen: "8/p7/8/8/8/8/7P/K5k1 w - - 0 1",
    pgn: "1. h4 a5 2. h5 a4 3. h6 a3 4. h7 a2+ 5. Kb2 a1=Q+ 6. Kxa1 Kf2 7. h8=Q",
    starThresholds: { three: 7, two: 8, one: 9 },
  },
  {
    type: "puzzle",
    id: "pawn-race-02",
    title: "Pawn Race #2",
    instruction: "White's pawn is closer. Push it!",
    fen: "8/1p6/8/8/4P3/8/8/3K2k1 w - - 0 1",
    pgn: "1. e5 b5 2. e6 b4 3. e7 b3 4. e8=Q",
    starThresholds: { three: 4, two: 5, one: 6 },
  },
  {
    type: "puzzle",
    id: "pawn-race-03",
    title: "Pawn Race #3",
    instruction: "Race to promote — but watch out for checks!",
    fen: "8/8/1p6/8/6P1/2k5/8/6K1 w - - 0 1",
    pgn: "1. g5 b4 2. g6 b3 3. g7 b2 4. g8=Q b1=Q 5. Qc8+",
    starThresholds: { three: 5, two: 6, one: 7 },
  },
];
