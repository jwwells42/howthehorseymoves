import type { TacticPuzzle, FindMovesPuzzle } from "./types";

export const enPassantPuzzles: (TacticPuzzle | FindMovesPuzzle)[] = [
  {
    type: "puzzle",
    id: "enpassant-01",
    fen: "7k/3p4/8/4P3/8/8/8/K7 b - - 0 1",
    pgn: "1... d5 2. exd6",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "enpassant-02",
    fen: "7k/3p4/8/2P5/8/8/8/K7 b - - 0 1",
    pgn: "1... d5 2. cxd6",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "enpassant-03",
    fen: "7k/5p2/8/3pP3/8/8/8/K7 b - - 0 1",
    pgn: "1... f5 2. exf6",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "enpassant-04",
    fen: "7k/p7/8/1P6/8/8/8/1K6 b - - 0 1",
    pgn: "1... a5 2. bxa6",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "enpassant-05",
    fen: "1k6/7p/8/6P1/8/8/8/K7 b - - 0 1",
    pgn: "1... h5 2. gxh6 Ka8 3. h7 Kb8 4. h8=Q",
    starThresholds: { three: 3, two: 4, one: 5 },
  },
  {
    type: "puzzle",
    id: "enpassant-06",
    fen: "8/2p3k1/8/3P4/2P5/8/8/K7 b - - 0 1",
    pgn: "1... c5 2. dxc6",
    starThresholds: { three: 1, two: 2, one: 3 },
  },
  {
    type: "puzzle",
    id: "enpassant-07",
    fen: "7k/4p3/8/3P4/8/8/8/K7 b - - 0 1",
    pgn: "1... e5 2. d6 Kg8 3. d7 Kh8 4. d8=Q",
    starThresholds: { three: 3, two: 4, one: 5 },
  },
  {
    type: "puzzle",
    id: "enpassant-11",
    fen: "7k/3p4/4P3/8/8/8/8/K7 b - - 0 1",
    pgn: "1... d5 2. e7 Kg8 3. e8=Q",
    starThresholds: { three: 2, two: 3, one: 4 },
  },
  // --- Find All Moves (with en passant) ---
  {
    type: "find-moves",
    id: "enpassant-find",
    playerPiece: "P",
    position: [
      { piece: "P", color: "w", square: "e5" },
      { piece: "P", color: "b", square: "d6" },
      { piece: "P", color: "b", square: "f7" },
    ],
    walls: [],
    opponentMove: { from: "f7", to: "f5" },
    starThresholds: { three: 0, two: 2, one: 4 },
  },
];
