import { Puzzle } from "./types";
import type { Arrow } from "../logic/pgn";

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
    arrows: [{ from: "d3", to: "h7", color: "#15803d" }],
    maxMoves: 2,
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
    instruction: "The rook can pin along files and ranks. Pin the bishop to the king!",
    setup: "3qkr2/8/8/8/4b3/8/6PP/R5K1 w - - 0 1",
    targets: ["e1"],
    solution: ["e1"],
    maxMoves: 1,
    hints: [
      "The bishop on e4 and king on e8 are on the same file.",
      "If the rook lands on e1, it attacks up the e-file through the bishop to the king.",
      "Re1 pins the bishop — moving it would expose the king to check!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "tactics-pin-03",
    piece: "R",
    title: "Pin to the Queen",
    instruction: "Pins work against queens too! Pin the knight so it can't move.",
    setup: "3qk3/8/8/8/3n4/4R3/6PP/6K1 w - - 0 1",
    targets: ["d3"],
    solution: ["d3"],
    maxMoves: 1,
    hints: [
      "The knight on d4 and queen on d8 are on the same file.",
      "If the rook moves to d3, it attacks up the d-file through the knight to the queen.",
      "Rd3 pins the knight to the queen — moving it loses the queen!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
];

// === Skewers ===
export const skewerPuzzles: Puzzle[] = [
  {
    id: "tactics-skewer-01",
    piece: "B",
    title: "Skewer the King",
    instruction: "A skewer attacks a valuable piece, forcing it to move and exposing what's behind it!",
    setup: "1r6/5p2/6p1/B3k3/8/8/6PP/6K1 w - - 0 1",
    targets: ["c7"],
    solution: ["c7"],
    maxMoves: 1,
    hints: [
      "The king on e5 and rook on b8 are on the same diagonal.",
      "If the bishop goes to c7, it checks the king through d6.",
      "Bc7+ — the king must move, and then you capture the rook on b8!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "tactics-skewer-02",
    piece: "R",
    title: "Rook Skewer",
    instruction: "Skewer the king through to the queen with the rook!",
    setup: "3q4/5pp1/8/3k4/8/8/6PP/2R3K1 w - - 0 1",
    targets: ["d1"],
    solution: ["d1"],
    maxMoves: 1,
    hints: [
      "The king on d5 and queen on d8 are on the same file.",
      "If the rook goes to d1, it checks the king up the d-file.",
      "Rd1+ — the king must move, and then you take the queen!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "tactics-skewer-03",
    piece: "B",
    title: "Check and Grab",
    instruction: "Check the king — then grab the rook behind it!",
    setup: "8/p6r/8/5k2/8/3B4/6PP/6K1 w - - 0 1",
    targets: ["e4"],
    solution: ["e4"],
    maxMoves: 1,
    hints: [
      "The king on f5 and rook on h7 are on the same diagonal.",
      "Be4+ checks the king — and the rook on h7 is next in line.",
      "After the king moves, the bishop captures the rook!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
];

// === Forks ===
export const forkPuzzles: Puzzle[] = [
  {
    id: "tactics-fork-01",
    piece: "N",
    title: "Royal Fork",
    instruction: "The knight can attack two pieces at once — that's a fork! Fork the king and queen!",
    setup: "r7/2k5/5q2/8/8/2N5/6PP/6K1 w - - 0 1",
    targets: ["d5"],
    solution: ["d5"],
    maxMoves: 1,
    hints: [
      "The king is on c7 and the queen is on f6.",
      "Is there a square where the knight attacks both?",
      "Nd5+ forks the king and queen! The king must move, and you win the queen.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "tactics-fork-02",
    piece: "N",
    title: "Fork the Rook",
    instruction: "Fork the king and rook with the knight!",
    setup: "q7/3k1p2/8/8/6r1/3N4/6PP/6K1 w - - 0 1",
    targets: ["e5"],
    solution: ["e5"],
    maxMoves: 1,
    hints: [
      "The king is on d7 and the rook is on g4.",
      "From d3, the knight can reach e5 — does it attack both?",
      "Ne5+ forks the king and rook!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "tactics-fork-03",
    piece: "N",
    title: "Find the Fork",
    instruction: "Find the knight fork — attack two pieces at once!",
    setup: "r7/1p6/6q1/3k4/8/7N/6PP/6K1 w - - 0 1",
    targets: ["f4"],
    solution: ["f4"],
    maxMoves: 1,
    hints: [
      "The king is on d5 and the queen is on g6.",
      "The knight on h3 can reach f4 — check the attack squares!",
      "Nf4+ forks the king and queen!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
];

// === Removing the Defender ===
export const removingDefenderPuzzles: Puzzle[] = [
  {
    id: "tactics-remove-01",
    piece: "R",
    title: "Remove the Guardian",
    instruction: "The bishop defends the queen. Remove the defender!",
    setup: "4kr2/8/4b3/3q4/8/8/6PP/3QR1K1 w - - 0 1",
    targets: ["e6"],
    solution: ["e6"],
    maxMoves: 1,
    hints: [
      "The black queen on d5 is defended by the bishop on e6.",
      "If you capture the bishop, the queen is left undefended!",
      "Rxe6 — now the queen on d5 is hanging and your queen can take it!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "tactics-remove-02",
    piece: "B",
    title: "Capture the Support",
    instruction: "The pawn defends the rook. Capture it to leave the rook hanging!",
    setup: "4k3/pp6/4p3/3r4/2B5/8/6PP/3Q2K1 w - - 0 1",
    targets: ["e6"],
    solution: ["e6"],
    maxMoves: 1,
    hints: [
      "The black rook on d5 is defended by the pawn on e6.",
      "The bishop on c4 can capture that pawn!",
      "Bxe6 — now the rook on d5 has no defender and your queen can take it!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "tactics-remove-03",
    piece: "R",
    title: "Knock Out the Knight",
    instruction: "The knight is the only defender of the queen. Remove it!",
    setup: "4kr2/p7/8/3q4/8/R3n3/6PP/3Q2K1 w - - 0 1",
    targets: ["e3"],
    solution: ["e3"],
    maxMoves: 1,
    hints: [
      "The black queen on d5 is defended by the knight on e3.",
      "The rook on a3 can capture the knight along the third rank!",
      "Rxe3 — now the queen on d5 is undefended!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
];

// === Discovered Attacks ===
export const discoveredAttackPuzzles: Puzzle[] = [
  {
    id: "tactics-discover-01",
    piece: "N",
    title: "Discover Check",
    instruction: "Move the knight to discover an attack from the bishop — and threaten the queen too!",
    setup: "r2q4/5pkp/8/8/3N4/8/1B4PP/6K1 w - - 0 1",
    targets: ["e6"],
    solution: ["e6"],
    maxMoves: 1,
    hints: [
      "The bishop on b2 is blocked by the knight on d4.",
      "If the knight moves, the bishop's diagonal opens to the king on g7!",
      "Ne6+ discovers check AND attacks the queen on d8!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "tactics-discover-02",
    piece: "B",
    title: "Open the File",
    instruction: "Move the bishop off the e-file to discover check — and win the knight!",
    setup: "2bqk3/p2n1p2/8/8/4B3/8/6PP/4R1K1 w - - 0 1",
    targets: ["c6"],
    solution: ["c6"],
    maxMoves: 1,
    hints: [
      "The bishop on e4 blocks the rook on e1 from checking the king.",
      "Move the bishop somewhere useful — and the rook's check is revealed!",
      "Bc6+ discovers check from the rook, and the bishop attacks the knight on d7!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "tactics-discover-03",
    piece: "N",
    title: "Reveal the Queen",
    instruction: "The knight blocks the queen's diagonal. Move it to discover the attack on the bishop!",
    setup: "3qk3/5pp1/8/8/6b1/5N2/6PP/3Q2K1 w - - 0 1",
    targets: ["e5"],
    solution: ["e5"],
    maxMoves: 1,
    hints: [
      "The queen on d1 would attack the bishop on g4 — but the knight on f3 is in the way.",
      "Move the knight to a strong central square and open the diagonal!",
      "Ne5 — the queen now attacks the bishop on g4!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
];
