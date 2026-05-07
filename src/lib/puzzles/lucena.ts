import type { ConversionPuzzle } from "./types";

/**
 * Lucena Position — "building the bridge"
 *
 * The key rook endgame technique: White has K + R + P on the 7th rank,
 * Black has K + R defending. White must shelter the king from rook checks
 * by placing the rook on the 4th rank as a shield, then marching the king
 * forward to promote.
 *
 * NOTE: With bot: "basic", the bot will make reasonable defensive moves
 * but won't play perfectly. The student still needs to execute the bridge
 * technique to promote efficiently.
 */
export const lucenaPuzzles: ConversionPuzzle[] = [
  {
    id: "lucena-01",
    type: "conversion",
    title: "Build the Bridge",
    instruction: "Your pawn is on the 7th rank. Build a bridge with your rook to promote!",
    position: [
      { piece: "K", color: "w", square: "b8" },
      { piece: "R", color: "w", square: "c1" },
      { piece: "P", color: "w", square: "b7" },
      { piece: "K", color: "b", square: "d8" },
      { piece: "R", color: "b", square: "a2" },
    ],
    bot: "basic",
    goal: "promotion",
    hints: [
      "Move your rook to the 4th rank — it will act as a shield later.",
      "Once the rook is on the 4th rank, bring your king out from behind the pawn.",
      "When the enemy rook checks, hide behind your own rook on the 4th rank!",
    ],
    starThresholds: { three: 6, two: 10, one: 16 },
  },
];
