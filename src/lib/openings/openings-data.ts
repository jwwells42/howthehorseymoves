import type { Opening } from "./parser";

export const OPENINGS: Opening[] = [
  // === White openings ===
  {
    id: "scholars-mate",
    name: "Scholar's Mate",
    color: "w",
    description: "Learn the classic four-move checkmate — and how to respond when Black defends.",
    pgn: "1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6 (3...g6 4.Qf3) 4.Qxf7#",
  },
  {
    id: "italian-game",
    name: "Italian Game",
    color: "w",
    description: "Open with Bc4 — the Giuoco Piano and Two Knights Defense.",
    pgn: `1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5
      (3...Nf6 4.Ng5 d5 5.exd5 Na5 6.Bb5+ c6 7.dxc6 bxc6 8.Be2)
      4.c3 Nf6 5.d4 exd4 6.cxd4 Bb4+ 7.Nc3`,
  },
  {
    id: "ruy-lopez",
    name: "Ruy Lopez",
    color: "w",
    description: "The Spanish Game — principled development since the 1500s.",
    pgn: `1.e4 e5 2.Nf3 Nc6 3.Bb5 a6
      (3...Nf6 4.O-O Nxe4 5.d4 Nd6 6.Bxc6 dxc6 7.dxe5 Nf5)
      (3...d6 4.d4 Bd7 5.Nc3 Nf6 6.O-O)
      (3...Bc5 4.c3 Nf6 5.d4 exd4 6.cxd4)
      4.Ba4 Nf6 5.O-O Be7
      (5...Nxe4 6.d4 b5 7.Bb3 d5 8.dxe5)
      6.Re1 b5 7.Bb3 d6 8.c3 O-O`,
  },
  {
    id: "queens-gambit",
    name: "Queen's Gambit",
    color: "w",
    description: "Control the center with d4 and c4 — handle the Accepted and Declined.",
    pgn: `1.d4 d5 2.c4 e6
      (2...dxc4 3.Nf3 Nf6 4.e3 e6 5.Bxc4 c5 6.O-O a6)
      3.Nc3 Nf6 4.Bg5 Be7 5.e3 O-O 6.Nf3 Nbd7`,
  },
  {
    id: "london-system",
    name: "London System",
    color: "w",
    description: "A solid system — develop Bf4, e3, and play against any Black setup.",
    pgn: `1.d4 d5
      (1...Nf6 2.Bf4 g6 3.e3 Bg7 4.Nf3 O-O 5.Be2 d6 6.O-O Nbd7)
      2.Bf4 Nf6 3.e3 e6 4.Nd2 c5 5.c3 Nc6 6.Ngf3 Bd6 7.Bg3`,
  },
  // === Black openings ===
  {
    id: "classical-e5",
    name: "Classical 1...e5",
    color: "b",
    description: "Solid development as Black — plus how to punish Scholar's Mate attempts.",
    pgn: `1.e4 e5 2.Nf3
      (2.Qh5 Nc6 3.Bc4 g6 4.Qf3 Nf6)
      (2.Bc4 Nc6 3.Qh5 g6 4.Qf3 Nf6)
      Nc6 3.Bc4
      (3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6)
      Bc5 4.d3 Nf6 5.O-O d6 6.c3 O-O`,
  },
  {
    id: "french-defense",
    name: "French Defense",
    color: "b",
    description: "Play 1...e6 — a solid wall against e4 with the Advance and Exchange variations.",
    pgn: `1.e4 e6 2.d4 d5 3.e5
      (3.exd5 exd5 4.Nf3 Nf6 5.Bd3 Bd6 6.O-O O-O)
      c5 4.c3 Nc6 5.Nf3 Qb6 6.Be2 cxd4 7.cxd4 Nge7`,
  },
  {
    id: "qgd-black",
    name: "Queen's Gambit Declined",
    color: "b",
    description: "Defend with 2...e6 — the Classical and Exchange variations.",
    pgn: `1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5
      (4.cxd5 exd5 5.Bg5 c6 6.e3 Bf5 7.Nf3 Be7)
      Be7 5.e3 O-O 6.Nf3 Nbd7`,
  },
  {
    id: "c6-qb6-vs-london",
    name: "c6 Qb6 vs London",
    color: "b",
    description: "A sideline against the London for the Caro/Slav player.",
    pgn: `1.d4 c6 2.Bf4
      (2.e4 { Caro })
      (2.c4 d5 { Slav })
      (2.Nf3 Nf6 3.Bf4 Qb6)
      (2.Nc3 d5)
      Qb6 3.b3
      (3.Nf3 Nf6 4.e3 Nd5! 5.Bg3 Qxb2 6.Nbd2 Nc3 7.Qc1 Qxc1+ 8.Rxc1 Nxa2 9.Rb1 Nc3 10.Rb3 Nd5 11.c4 Nf6)
      (3.e3 Qxb2 4.Nd2 Nf6 5.Rb1 Qxa2 6.Bc4
        (6.Ngf3 Qa5)
        (6.Nc4 e5!! { Violently getting the bishop out }
          7.Nxe5
            (7.Bxe5 d5)
            (7.dxe5 Ne4 8.Nf3
              (8.Qc1 b5 9.Nd2 Nxd2 10.Kxd2 Ba3 11.Qd1)
              Nc3 9.Ra1 Qxc4!! 10.Bxc4 Nxd1 11.Rxd1 b5 12.Bd3 a5)
          Qa5+ 8.Qd2 Qxd2+ 9.Kxd2 b5 10.Bd3 d6 11.Nef3 a5)
        Qa5)
      (3.Qc1 Qxd4)
      (3.Bc1 d5 4.Nf3 Bf5 5.e3 e6 6.Bd3 Bxd3 7.Qxd3 Nf6)
      d6 4.e3
      (4.Nf3 { Stops our g5 idea but we can still get that structure }
        h6 5.e3 g5 6.Bg3 Bg7 7.Bd3 Nf6 8.O-O Nh5 9.c4 Nxg3 10.hxg3 Bg4 11.Nc3 c5
        12.Rc1 Nc6 13.d5 Nb4 14.Bb1 { King might be safe in the center or 0-0-0 })
      g5 { ONLY on e3!! } 5.Bg3
      (5.Bxg5 Qa5+)
      Bf5 6.Bd3 Nf6 { We still have Qa5+ so we don't need to give them a tempo }
      7.Nf3
      (7.Bxf5 Qa5+)
      Qa5+ 8.Nbd2
      (8.c3 Bxd3 9.Qxd3 g4 10.Nh4)
      (8.Qd2 Qxd2+ 9.Nbxd2 Bxd3 10.cxd3 h6 11.h4 g4)
      Bxd3 9.cxd3 h5 10.h3 Nbd7 11.O-O`,
  },
  {
    id: "slav-defense",
    name: "Slav Defense",
    color: "b",
    description: "A solid reply to the Queen's Gambit — develop the bishop before locking it in.",
    pgn: `1.d4 c6 2.c4 d5 3.Nc3
      (3.Nf3 Nf6 4.Nc3
        (4.g3 Bf5 5.Bg2 e6)
        dxc4)
      Nf6 4.Nf3 dxc4 5.a4
      (5.e4 b5 6.e5 Nd5 7.a4 e6! 8.axb5 Nxc3 9.bxc3 cxb5 10.Ng5 Bb7 11.Qh5 g6 12.Qg4 Be7 13.Be2 Bd5 14.Bf3 Nc6)
      (5.e3 b5 6.a4 b4! 7.Na2 a5 8.Bxc4 e6 9.O-O Be7 10.b3 O-O)
      Bf5 6.e3 e6 7.Bxc4 Bb4 8.O-O O-O 9.Qe2 Bg6 10.Ne5 Nbd7 11.Nxg6 hxg6 12.Rd1 Qc7`,
  },
];

export function getOpening(id: string): Opening | undefined {
  return OPENINGS.find((o) => o.id === id);
}
