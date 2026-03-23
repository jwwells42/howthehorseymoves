import type { RoutePuzzle } from "./types";

export const dangerZonePuzzles: RoutePuzzle[] = [
  // --- Rook dodging a bishop ---
  {
    type: "route",
    id: "danger-rook-bishop-01",
    playerPiece: "R",
    title: "Watch the Diagonal",
    instruction: "Reach the star — don't land on a red square!",
    threats: true,
    position: [
      { piece: "R", color: "w", square: "a1" },
      { piece: "B", color: "b", square: "d4" },
    ],
    walls: [],
    stars: ["a8"],
    hints: [
      "The bishop attacks diagonally.",
      "The a-file is safe — go straight up!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  // --- Rook dodging a knight ---
  {
    type: "route",
    id: "danger-rook-knight-01",
    playerPiece: "R",
    title: "Dodge the Knight",
    instruction: "Get the rook to the star — don't land on a red square!",
    threats: true,
    position: [
      { piece: "R", color: "w", square: "a1" },
      { piece: "N", color: "b", square: "d4" },
    ],
    walls: [],
    stars: ["h1"],
    hints: [
      "The knight attacks in L-shapes.",
      "Slide along rank 1 — which squares are safe?",
    ],
    starThresholds: { three: 2, two: 3, one: 4 },
  },
  // --- Bishop dodging a rook ---
  {
    type: "route",
    id: "danger-bishop-rook-01",
    playerPiece: "B",
    title: "Slip Past the Rook",
    instruction: "Move the bishop to the star — don't land on a red square!",
    threats: true,
    position: [
      { piece: "B", color: "w", square: "a1" },
      { piece: "R", color: "b", square: "d4" },
    ],
    walls: [],
    stars: ["h8"],
    hints: [
      "The rook controls rank 4 and the d-file.",
      "You can slide through red squares — just don't stop on one.",
    ],
    starThresholds: { three: 5, two: 6, one: 7 },
  },
  // --- Knight dodging a bishop ---
  {
    type: "route",
    id: "danger-knight-bishop-01",
    playerPiece: "N",
    title: "Hop Around the Bishop",
    instruction: "Jump the knight to the star — don't land on a red square!",
    threats: true,
    position: [
      { piece: "N", color: "w", square: "b1" },
      { piece: "B", color: "b", square: "e4" },
    ],
    walls: [],
    stars: ["g5"],
    hints: [
      "The bishop controls two diagonals from e4.",
      "Plan your L-shaped jumps to land on safe squares.",
    ],
    starThresholds: { three: 5, two: 6, one: 7 },
  },
  // --- Knight dodging a rook ---
  {
    type: "route",
    id: "danger-knight-rook-01",
    playerPiece: "N",
    title: "Avoid the Rook",
    instruction: "Get the knight to the star — don't land on a red square!",
    threats: true,
    position: [
      { piece: "N", color: "w", square: "a1" },
      { piece: "R", color: "b", square: "d4" },
    ],
    walls: [],
    stars: ["f5"],
    hints: [
      "The rook attacks all of rank 4 and all of the d-file.",
      "Each knight jump changes color — plan two hops ahead.",
    ],
    starThresholds: { three: 3, two: 4, one: 5 },
  },
  // --- Rook dodging a pawn ---
  {
    type: "route",
    id: "danger-rook-pawn-01",
    playerPiece: "R",
    title: "Pawn Diagonals",
    instruction: "Reach the star — don't land on a red square!",
    threats: true,
    position: [
      { piece: "R", color: "w", square: "a1" },
      { piece: "P", color: "b", square: "c3" },
      { piece: "P", color: "b", square: "f3" },
    ],
    walls: [],
    stars: ["h8"],
    hints: [
      "Each pawn attacks the two diagonal squares in front of it.",
      "Find a file that avoids both pawns' diagonals.",
    ],
    starThresholds: { three: 2, two: 3, one: 4 },
  },
  // --- Queen dodging a knight (queen is flexible, so it's about the one piece she can't predict) ---
  {
    type: "route",
    id: "danger-queen-knight-01",
    playerPiece: "Q",
    title: "Knight Zone",
    instruction: "Guide the queen to the star — don't land on a red square!",
    threats: true,
    position: [
      { piece: "Q", color: "w", square: "a1" },
      { piece: "N", color: "b", square: "d5" },
    ],
    walls: [],
    stars: ["h8"],
    hints: [
      "The knight attacks 8 squares in L-shapes from d5.",
      "The queen has many paths — find one that avoids the knight's reach.",
    ],
    starThresholds: { three: 2, two: 3, one: 4 },
  },
  // --- Knight dodging two pawns ---
  {
    type: "route",
    id: "danger-knight-pawns-01",
    playerPiece: "N",
    title: "Pawn Gauntlet",
    instruction: "Navigate to the star — don't land on a red square!",
    threats: true,
    position: [
      { piece: "N", color: "w", square: "a1" },
      { piece: "P", color: "b", square: "c4" },
      { piece: "P", color: "b", square: "f4" },
    ],
    walls: [],
    stars: ["h7"],
    hints: [
      "Each pawn threatens two diagonal squares.",
      "The knight can jump past — just don't land on a red square.",
    ],
    starThresholds: { three: 5, two: 6, one: 7 },
  },
  // --- Bishop dodging a knight + wall ---
  {
    type: "route",
    id: "danger-bishop-knight-01",
    playerPiece: "B",
    title: "Tight Squeeze",
    instruction: "Thread the bishop to the star — don't land on a red square!",
    threats: true,
    position: [
      { piece: "B", color: "w", square: "a1" },
      { piece: "N", color: "b", square: "e5" },
    ],
    walls: ["c3"],
    stars: ["h8"],
    hints: [
      "The wall blocks c3 and the knight threatens squares from e5.",
      "Find a diagonal path that avoids both.",
    ],
    starThresholds: { three: 7, two: 8, one: 9 },
  },
  // --- Rook dodging a queen ---
  {
    type: "route",
    id: "danger-rook-queen-01",
    playerPiece: "R",
    title: "Escape the Queen",
    instruction: "Reach the star — don't land on a red square!",
    threats: true,
    position: [
      { piece: "R", color: "w", square: "a1" },
      { piece: "Q", color: "b", square: "d5" },
    ],
    walls: [],
    stars: ["h8"],
    hints: [
      "The queen attacks ranks, files, AND diagonals.",
      "Find the squares she can't reach.",
    ],
    starThresholds: { three: 3, two: 4, one: 5 },
  },
];
