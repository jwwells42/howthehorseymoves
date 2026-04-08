import type { TacticPuzzle, ConversionPuzzle } from "./types";

// === Back Rank Mates ===
export const backRankMatePuzzles: TacticPuzzle[] = [
  {
    id: "checkmate-br-01",
    type: "puzzle",
    title: "Classic Back Rank",
    instruction: "The king is trapped behind its own pawns. Deliver checkmate!",
    fen: "7k/5ppp/8/8/8/8/R7/6K1 w - - 0 1",
    pgn: "1. Ra8#",
    hints: [
      "The black king is trapped behind its own pawns on the back rank.",
      "Move the rook to the 8th rank!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-br-02",
    type: "puzzle",
    title: "Queen on the Back Rank",
    instruction: "Deliver checkmate with the queen on the back rank!",
    fen: "7k/6pp/8/8/8/8/8/3Q1K2 w - - 0 1",
    pgn: "1. Qd8#",
    hints: [
      "The king is stuck in the corner with pawns blocking escape.",
      "Put the queen on the back rank — d8!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-br-03",
    type: "puzzle",
    title: "Back Rank with Support",
    instruction: "Deliver checkmate! Your king supports the rook.",
    fen: "k7/2K5/8/8/8/8/8/7R w - - 0 1",
    pgn: "1. Ra1#",
    hints: [
      "The white king on c7 controls b7 and b8.",
      "Deliver check on the a-file — the king has no escape.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-br-04",
    type: "puzzle",
    title: "Back Rank from Below",
    instruction: "Deliver checkmate with the rook!",
    fen: "1k6/rpp5/8/8/8/8/8/3R2K1 w - - 0 1",
    pgn: "1. Rd8#",
    hints: [
      "The pawns on a7, b7, c7 block all the king's escape squares.",
      "Move the rook to the 8th rank!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-br-05",
    type: "puzzle",
    title: "Don't Stalemate!",
    instruction: "Checkmate in one — but be careful not to stalemate!",
    fen: "7k/5K2/8/8/8/6Q1/8/8 w - - 0 1",
    pgn: "1. Qg7#",
    hints: [
      "If the king has no legal moves AND isn't in check, it's stalemate — a draw!",
      "Don't play Qg6 — the king has no moves but isn't in check. That's stalemate!",
      "Qg7 is checkmate — the king is in check with no escape.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
];

// === Rook Ladder (multi-move with random bot) ===
export const rookLadderPuzzles: ConversionPuzzle[] = [
  {
    id: "checkmate-rl-01",
    type: "conversion",
    title: "Two-Rook Ladder",
    instruction: "Use your two rooks to push the king to the edge and deliver checkmate!",
    position: [
      { piece: "K", color: "w", square: "a1" },
      { piece: "R", color: "w", square: "a4" },
      { piece: "R", color: "w", square: "b3" },
      { piece: "K", color: "b", square: "e6" },
    ],
    bot: "random",
    goal: "checkmate",
    hints: [
      "Rooks work as a team — one cuts off a rank, the other gives check on the next rank.",
      "Give check with one rook, then use the other to check on the next rank.",
      "Keep alternating rook checks to push the king to the edge!",
    ],
    starThresholds: { three: 4, two: 7, one: 12 },
  },
  {
    id: "checkmate-rl-02",
    type: "conversion",
    title: "Ladder from the Side",
    instruction: "Push the king to the edge with alternating rook checks!",
    position: [
      { piece: "K", color: "w", square: "a1" },
      { piece: "R", color: "w", square: "c1" },
      { piece: "R", color: "w", square: "d2" },
      { piece: "K", color: "b", square: "f5" },
    ],
    bot: "random",
    goal: "checkmate",
    hints: [
      "Cut off the king rank by rank, alternating your rooks.",
      "Give check, then bring the other rook up to the next rank.",
    ],
    starThresholds: { three: 5, two: 8, one: 14 },
  },
  {
    id: "checkmate-rl-03",
    type: "conversion",
    title: "Almost There",
    instruction: "The king is near the edge — finish the ladder!",
    position: [
      { piece: "K", color: "w", square: "a1" },
      { piece: "R", color: "w", square: "a6" },
      { piece: "R", color: "w", square: "b5" },
      { piece: "K", color: "b", square: "d7" },
    ],
    bot: "random",
    goal: "checkmate",
    hints: [
      "The king is already close to the back rank.",
      "Check with one rook, then deliver the final blow with the other!",
    ],
    starThresholds: { three: 3, two: 5, one: 8 },
  },
];

// === Queen Takes f7 ===
export const queenF7Puzzles: TacticPuzzle[] = [
  {
    id: "checkmate-qf-01",
    type: "puzzle",
    title: "The Scholar's Mate",
    instruction: "It's the most famous beginner checkmate. Find Qxf7#!",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K2R w KQkq - 4 4",
    pgn: "1. Qxf7#",
    hints: [
      "The f7 pawn is only defended by the king.",
      "The queen on h5 can take f7 — and the bishop on c4 supports!",
      "Qxf7 is checkmate! The king can't escape.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-qf-02",
    type: "puzzle",
    title: "Battery on f7",
    instruction: "The same pattern as Scholar's Mate — queen takes f7 with bishop support!",
    fen: "3qk3/3p1p2/2n2n2/4p2Q/2B5/8/8/4K3 w - - 0 1",
    pgn: "1. Qxf7#",
    hints: [
      "The f7 pawn is only defended by the king.",
      "The queen on h5 can take f7 diagonally — and the bishop on c4 supports!",
      "Qxf7 is checkmate! The king can't escape.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-qf-03",
    type: "puzzle",
    title: "Knight Guards the Exit",
    instruction: "The knight covers the escape. Find the queen checkmate on f7!",
    fen: "2brk3/5p2/3p4/4N2Q/8/8/6PP/6K1 w - - 0 1",
    pgn: "1. Qxf7#",
    hints: [
      "The knight on e5 covers d7 — the king can't flee that way.",
      "The queen on h5 can reach f7 diagonally.",
      "Qxf7# — the knight supports the queen, and the king has no escape!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
];

// === Queen-Bishop Battery ===
export const qbBatteryPuzzles: TacticPuzzle[] = [
  {
    id: "checkmate-qb-01",
    type: "puzzle",
    title: "Battery on g7",
    instruction: "The queen and bishop share the same diagonal. Deliver checkmate!",
    fen: "5rk1/5ppp/5Q2/8/8/2B5/6PP/6K1 w - - 0 1",
    pgn: "1. Qxg7#",
    hints: [
      "The bishop on c3 and queen on f6 share the a1-h8 diagonal.",
      "When the queen takes g7, the bishop defends it through the now-open diagonal.",
      "Qxg7# — the bishop prevents Kxg7, and the king has nowhere to run!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-qb-02",
    type: "puzzle",
    title: "Queen-Bishop Diagonal",
    instruction: "The queen and bishop line up on a deadly diagonal. Deliver checkmate!",
    fen: "5rk1/5ppp/8/8/8/3Q4/8/1B4K1 w - - 0 1",
    pgn: "1. Qxh7#",
    hints: [
      "The queen and bishop share the same long diagonal.",
      "When the queen moves to h7, the bishop behind it defends through the cleared diagonal.",
      "Qxh7 is checkmate! The pawns and rook trap the king.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-qb-03",
    type: "puzzle",
    title: "Battery Strike",
    instruction: "Find the queen move that delivers checkmate with bishop support!",
    fen: "5rk1/5ppp/8/8/4Q3/8/2B5/6K1 w - - 0 1",
    pgn: "1. Qxh7#",
    hints: [
      "The bishop on c2 and queen share a diagonal aimed at h7.",
      "Take on h7 — when the queen moves, the bishop defends through the diagonal!",
      "Qxh7 is checkmate!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-qb-04",
    type: "puzzle",
    title: "Long Diagonal Mate",
    instruction: "The bishop controls the long diagonal. Find the queen checkmate!",
    fen: "6k1/5ppp/8/8/8/1B6/6PP/Q5K1 w - - 0 1",
    pgn: "1. Qa8#",
    hints: [
      "The bishop on b3 watches the a2-g8 diagonal.",
      "Where can the queen deliver check while the bishop covers escape squares?",
      "Qa8# — the queen checks on the back rank, and the bishop covers f7!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-qb-05",
    type: "puzzle",
    title: "Dark Diagonal Battery",
    instruction: "The bishop lurks on the long diagonal. Where does the queen strike?",
    fen: "5rk1/5ppp/8/8/3Q4/8/1B4PP/6K1 w - - 0 1",
    pgn: "1. Qxg7#",
    hints: [
      "The bishop on b2 controls the long dark diagonal all the way to g7.",
      "The queen on d4 can also reach g7 along that same diagonal.",
      "Qxg7# — the bishop defends the queen, and the king has nowhere to run!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
];

// === Lolli's Mate ===
export const lollisMatePuzzles: TacticPuzzle[] = [
  {
    id: "checkmate-lm-01",
    type: "puzzle",
    title: "Lolli's Mate",
    instruction: "Deliver the classic Lolli's Mate!",
    fen: "6k1/5p1p/5PpQ/8/8/8/8/6K1 w - - 0 1",
    pgn: "1. Qg7#",
    hints: [
      "The pawn on f6 supports g7 — can the queen get there?",
      "Qg7 delivers check, and the pawn on f6 defends the queen!",
      "Qg7 is checkmate! The queen covers f8 and h8, and the pawns block everything else.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-lm-02",
    type: "puzzle",
    title: "Lolli's in a Real Game",
    instruction: "Find the checkmate — the classic pattern is hiding in this position!",
    fen: "r5k1/3p1p1p/2n2PpQ/8/8/8/8/R5K1 w - - 0 1",
    pgn: "1. Qg7#",
    hints: [
      "Ignore the extra pieces — look for the Lolli's Mate pattern!",
      "The key ingredients: queen on h6, pawn on f6, enemy king behind pawns on g8.",
      "Qg7 is checkmate!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-lm-03",
    type: "puzzle",
    title: "Don't Be Tempted!",
    instruction: "There's only one move that's checkmate — don't fall for the traps!",
    fen: "6k1/5p1p/5PpQ/8/2B5/8/8/6K1 w - - 0 1",
    pgn: "1. Qg7#",
    hints: [
      "Bxf7+ and Qxh7+ both look tempting, but neither is checkmate!",
      "After Bxf7+ Kf8, or Qxh7+ Kf8 — the king escapes.",
      "Qg7 is the only checkmate! Stick with the Lolli's pattern.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
];

// === Queen + King Mates ===
export const queenKingMatePuzzles: (TacticPuzzle | ConversionPuzzle)[] = [
  {
    id: "checkmate-qk-01",
    type: "puzzle",
    title: "Cornered King",
    instruction: "Deliver checkmate with the queen — your king helps!",
    fen: "k7/p7/1K6/8/Q7/8/8/1R6 w - - 0 1",
    pgn: "1. Qxa7#",
    hints: [
      "The black king is nearly trapped — the a7 pawn is the key target.",
      "Your king on b6 controls b7. The rook covers the b-file.",
      "Qxa7 is checkmate! The queen takes the pawn and delivers check.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-qk-02",
    type: "puzzle",
    title: "Queen & King Dance",
    instruction: "Find the one square that delivers checkmate!",
    fen: "7k/6pp/6K1/8/4Q3/8/8/8 w - - 0 1",
    pgn: "1. Qe8#",
    hints: [
      "The black king is boxed in by its own pawns.",
      "The white king covers f7 and g7.",
      "Qe8 delivers check along the 8th rank — no escape!",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-qk-03",
    type: "puzzle",
    title: "Stalemate Trap!",
    instruction: "Checkmate in one — don't stalemate!",
    fen: "k7/8/K7/8/1Q6/8/8/8 w - - 0 1",
    pgn: "1. Qb7#",
    hints: [
      "The black king is almost trapped in the corner.",
      "Be careful — some queen moves leave the king with no legal moves but no check (stalemate)!",
      "Qb7 is checkmate — the queen covers all escape squares and delivers check.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-qk-04",
    type: "conversion",
    title: "Queen vs Lone King",
    instruction: "Use your queen and king together to force checkmate!",
    position: [
      { piece: "K", color: "w", square: "d4" },
      { piece: "Q", color: "w", square: "a1" },
      { piece: "K", color: "b", square: "e6" },
    ],
    bot: "random",
    goal: "checkmate",
    hints: [
      "Push the enemy king toward the edge of the board.",
      "Use the queen to cut off ranks or files, then bring your king closer.",
      "The king must help — the queen alone can't force mate without the king nearby!",
    ],
    starThresholds: { three: 10, two: 16, one: 25 },
  },
  {
    id: "checkmate-qk-05",
    type: "conversion",
    title: "Corner the King",
    instruction: "Drive the lone king to the corner and deliver checkmate!",
    position: [
      { piece: "K", color: "w", square: "c3" },
      { piece: "Q", color: "w", square: "d1" },
      { piece: "K", color: "b", square: "e5" },
    ],
    bot: "random",
    goal: "checkmate",
    hints: [
      "Step 1: Use the queen to restrict the king's movement.",
      "Step 2: Bring your own king closer to support the queen.",
      "Step 3: Force the king to the edge, then deliver checkmate!",
    ],
    starThresholds: { three: 10, two: 16, one: 25 },
  },
];

// === Smothered Mate ===
export const smotheredMatePuzzles: TacticPuzzle[] = [
  {
    id: "checkmate-sm-01",
    type: "puzzle",
    title: "Knight Strikes f7",
    instruction: "The f7 pawn is weak! Capture it with the knight for checkmate!",
    fen: "6rk/5p1p/7K/4N3/8/8/8/8 w - - 0 1",
    pgn: "1. Nxf7#",
    hints: [
      "The king on h8 is boxed in by its own rook and pawn.",
      "The knight on e5 can jump to f7 — capturing the pawn and giving check!",
      "Nxf7 is checkmate! The king has nowhere to go.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-sm-02",
    type: "puzzle",
    title: "Central Knight Delivers",
    instruction: "Use the centralized knight to deliver checkmate!",
    fen: "6rk/6pp/3N4/8/8/6K1/8/8 w - - 0 1",
    pgn: "1. Nf7#",
    hints: [
      "The king is completely smothered — rook on g8, pawns on g7 and h7.",
      "The knight on d6 can reach f7 — does that give check?",
      "Nf7 is checkmate! The king has no escape squares.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-sm-03",
    type: "puzzle",
    title: "Knight from the Flank",
    instruction: "The knight is on the edge — but it can still deliver checkmate!",
    fen: "6rk/5p1p/7K/6N1/8/8/8/8 w - - 0 1",
    pgn: "1. Nxf7#",
    hints: [
      "The king is trapped in the corner by its own pieces.",
      "From g5, the knight can jump to f7 — capturing the pawn!",
      "Nxf7 is checkmate! Your king covers g7.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    id: "checkmate-sm-04",
    type: "puzzle",
    title: "Knight Finds the Spot",
    instruction: "Only one knight move gives checkmate. Find it!",
    fen: "5rkr/5ppp/8/3N4/8/8/8/6K1 w - - 0 1",
    pgn: "1. Ne7#",
    hints: [
      "The king is completely surrounded by its own pieces.",
      "The knight on d5 can go to several squares — which one gives check?",
      "Ne7 gives check! And every escape square is blocked by black's own rooks and pawns.",
    ],
    starThresholds: { three: 1, two: 2, one: 3 },
  },
];
