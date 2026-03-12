import { Puzzle } from "./types";

// === Pins ===
export const pinPuzzles: Puzzle[] = [
  {
    id: "tactics-pin-01",
    piece: "B",
    title: "Pin the Knight",
    instruction: "A pin traps a piece on a line — it can't move without exposing the king. Pin the knight, then capture it!",
    setup: "8/7k/8/8/8/3n4/6PP/3B2K1 w - - 0 1",
    targets: ["c2", "d3"],
    solution: ["c2", "d3"],
    opponentResponses: [{ from: "h7", to: "h6" }],
    arrows: [{ from: "c2", to: "h7", color: "#15803d" }],
    hints: [
      "The knight on d3 and king on h7 are on the same diagonal.",
      "If the bishop goes to c2, it pins the knight — moving it exposes the king!",
      "Bc2 pins the knight. After the king moves, capture it with Bxd3!",
    ],
    starThresholds: { three: 2, two: 3, one: 4 },
  },
  {
    id: "tactics-pin-02",
    piece: "R",
    title: "Pin the Bishop",
    instruction: "The rook can pin along files and ranks. Pin the bishop, then take it!",
    setup: "4k3/8/7n/8/4b3/8/6PP/R5K1 w - - 0 1",
    targets: ["e1", "e4"],
    solution: ["e1", "e4"],
    opponentResponses: [{ from: "e8", to: "d7" }],
    arrows: [{ from: "e1", to: "e8", color: "#15803d" }],
    hints: [
      "The bishop on e4 and king on e8 are on the same file.",
      "If the rook goes to e1, the bishop is pinned — it can't move!",
      "Re1 pins the bishop. After the king moves, capture it with Rxe4!",
    ],
    starThresholds: { three: 2, two: 3, one: 4 },
  },
];
