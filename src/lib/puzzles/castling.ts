import type { TacticPuzzle } from "./types";

export const castlingPuzzles: TacticPuzzle[] = [
  {
    type: "puzzle",
    id: "castling-01",
    fen: "8/8/8/8/8/8/8/4K2R w K - 0 1",
    pgn: "{[%cal Ge1g1]} 1. O-O",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "castling-02",
    fen: "8/8/8/8/8/8/8/R3K3 w Q - 0 1",
    pgn: "{[%cal Ge1c1]} 1. O-O-O",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "castling-03",
    fen: "8/8/8/8/8/8/8/R3K2R w KQ - 0 1",
    pgn: "1. O-O",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "castling-04",
    fen: "8/8/8/8/8/8/8/RN2K2R w KQ - 0 1",
    pgn: "1. O-O",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "castling-05",
    fen: "5r2/8/8/8/8/8/8/R3K2R w KQ - 0 1",
    pgn: "1. O-O-O",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "castling-06",
    fen: "4r3/8/8/8/8/8/3P1P2/3RK2R w K - 0 1",
    pgn: "1. Kf1",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "castling-07",
    fen: "3q4/8/8/8/8/8/5PPP/4K2R w K - 0 1",
    pgn: "1. O-O",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "castling-08",
    fen: "8/8/b7/8/8/8/3P3P/3RK2R w K - 0 1",
    pgn: "1. Kf2",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "castling-09",
    fen: "3r4/8/8/8/8/8/8/R3K2R w KQ - 0 1",
    pgn: "1. O-O",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "castling-10",
    fen: "8/8/8/8/8/8/PPP5/R3K2R w Q - 0 1",
    pgn: "1. O-O-O",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
];
