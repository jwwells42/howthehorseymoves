import type { ModelGame } from "./types";

export const GAMES: ModelGame[] = [
  {
    id: "opera",
    white: "Paul Morphy",
    black: "Duke Karl / Count Isouard",
    event: "Paris Opera House",
    year: 1858,
    result: "1-0",
    pgn: "1.e4 e5 2.Nf3 d6 3.d4 Bg4 {Pinning the knight — but this bishop will soon be traded away, losing time.} 4.dxe5 Bxf3 5.Qxf3 dxe5 6.Bc4 Nf6 7.Qb3 {[%cal Gb3f7,Gc4f7] Morphy targets f7 — the weakest square in Black's position.} Qe7 8.Nc3 c6 9.Bg5 b5 10.Nxb5! {A brilliant sacrifice — Morphy gives up the knight to rip open the position.} cxb5 11.Bxb5+ Nbd7 12.O-O-O Rd8 13.Rxd7! Rxd7 14.Rd1 {[%cal Gd1d7] Every white piece is active. Black is completely tied down.} Qe6 15.Bxd7+ Nxd7 16.Qb8+!! {[%cal Gd1d8] The queen sacrifice — Black must take, and the rook delivers checkmate.} Nxb8 17.Rd8# 1-0",
    description: "The \"Opera Game\" — Morphy's brilliant attacking masterpiece, demonstrating the power of rapid development and open lines.",
  },
];

export function getGame(id: string): ModelGame | undefined {
  return GAMES.find(g => g.id === id);
}
