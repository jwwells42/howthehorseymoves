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
    stars: ["f7"],
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
      { piece: "N", color: "b", square: "e6" },
    ],
    walls: ["c3"],
    stars: ["h8"],
    starThresholds: { three: 5, two: 6, one: 7 },
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
    starThresholds: { three: 3, two: 4, one: 5 },
  },
];
