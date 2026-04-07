import type { TacticPuzzle } from "./types";

/**
 * Réti Study — the diagonal king march
 *
 * The key idea: a king moving diagonally can pursue two goals at once
 * (e.g., catch an enemy pawn AND escort its own pawn). The student must
 * find the precise diagonal path.
 *
 * NOTE: positions and PGNs need user verification in-browser.
 */
export const retiPuzzles: TacticPuzzle[] = [
  {
    type: "puzzle",
    id: "reti-01",
    title: "The Classic Réti",
    instruction: "White's king looks too far from both pawns. Find the draw!",
    fen: "7K/8/8/k1P5/8/8/8/7p w - - 0 1",
    pgn: "1. Kg7 h2 2. Kf6 Kb6 3. Ke7",
    starThresholds: { three: 3, two: 4, one: 5 },
  },
  {
    type: "puzzle",
    id: "reti-02",
    title: "Diagonal Pursuit",
    instruction: "White's king must chase two pawns at once. Find the path!",
    fen: "8/8/4k3/8/1p6/8/5PP1/1K6 w - - 0 1",
    pgn: "1. Kc2 b3+ 2. Kc3",
    starThresholds: { three: 2, two: 3, one: 4 },
  },
  {
    type: "puzzle",
    id: "reti-03",
    title: "Two Targets, One King",
    instruction: "White's king heads for both pawns diagonally. Find the winning plan!",
    fen: "8/6k1/8/8/8/p7/1P6/K7 w - - 0 1",
    pgn: "1. Kb1 Kf6 2. Kc2 Ke5 3. Kb3",
    starThresholds: { three: 3, two: 4, one: 5 },
  },
];
