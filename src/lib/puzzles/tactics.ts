import type { TacticPuzzle } from "./types";

// === Pins ===
export const pinPuzzles: TacticPuzzle[] = [
  {
    id: "tactics-pin-01",
    type: "puzzle",
    title: "Pin the Knight",
    instruction: "A pin traps a piece on a line — it can't move without exposing the king. Pin the knight, then capture it!",
    fen: "8/7k/8/8/8/3n4/6PP/3B2K1 w - - 0 1",
    pgn: "1. Bc2 {[%cal Gc2h7]} Kh6 2. Bxd3",
    hints: [
      "The knight on d3 and king on h7 are on the same diagonal.",
      "If the bishop goes to c2, it pins the knight — moving it exposes the king!",
      "Bc2 pins the knight. After the king moves, capture it with Bxd3!",
    ],
    starThresholds: { three: 2, two: 3, one: 4 },
  },
  {
    id: "tactics-pin-02",
    type: "puzzle",
    title: "Pin the Bishop",
    instruction: "The rook can pin along files and ranks. Pin the bishop, then take it!",
    fen: "4k3/8/7n/8/4b3/8/6PP/R5K1 w - - 0 1",
    pgn: "1. Re1 {[%cal Ge1e8]} Kd7 2. Rxe4",
    hints: [
      "The bishop on e4 and king on e8 are on the same file.",
      "If the rook goes to e1, the bishop is pinned — it can't move!",
      "Re1 pins the bishop. After the king moves, capture it with Rxe4!",
    ],
    starThresholds: { three: 2, two: 3, one: 4 },
  },
  {
    id: "tactics-pin-03",
    type: "puzzle",
    title: "Exploit the Pin #1",
    instruction: "The knight is pinned and can't recapture. Take what it was guarding!",
    fen: "4k3/p4p2/2np4/1B2r2Q/8/8/6PP/6K1 w - - 0 1",
    pgn: "{[%cal Gb5e8]} 1. Qxe5",
    hints: [
      "The bishop on b5 pins the knight on c6 to the king.",
      "The rook on e5 looks defended by the knight — but the knight can't move!",
      "Qxe5 wins the rook for free.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "tactics-pin-04",
    type: "puzzle",
    title: "Exploit the Pin #2",
    instruction: "The pinned knight can't defend its neighbor. Win the free piece!",
    fen: "4k3/p4p2/2n5/1B6/3b4/8/6PP/3R2K1 w - - 0 1",
    pgn: "{[%cal Gb5e8]} 1. Rxd4",
    hints: [
      "The bishop on b5 pins the knight on c6 to the king.",
      "The bishop on d4 looks defended by the knight — but the knight is pinned!",
      "Rxd4 wins the bishop. The knight can't take back.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
];
