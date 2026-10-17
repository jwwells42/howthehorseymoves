import type { PieceColor } from "../logic/types";
import type { Opening } from "./parser";
import { parseOpeningPgn, extractLines, findBranchPoint, splitPgnChapters } from "./parser";
import e4StarterPgn from "./pgn/e4-mainline-starter.pgn?raw";
import d4StarterPgn from "./pgn/d4-mainline-starter.pgn?raw";

// Card text built from the PGN itself, so it stays right when a study is
// re-exported: the moves every line shares (up to 3 moves each) and the line count.
function describe(pgn: string): string {
  try {
    const lines = extractLines(parseOpeningPgn(pgn));
    const shared = Math.min(...lines.map((line) => findBranchPoint(lines[0], line)));
    const moves = lines[0]
      .slice(0, Math.min(shared, 6))
      .map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}.` : "") + m.san)
      .join(" ");
    return `${moves}${shared > 6 ? " …" : ""} · ${lines.length} line${lines.length === 1 ? "" : "s"}`;
  } catch (e) {
    return `⚠ PGN problem: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// === Repertoires from Lichess study exports ===
// Each study is kept as-is in pgn/. To update one, re-export the study and
// overwrite its file. A study is one card at /openings/{id} with every chapter
// together, which opens 3 moves at a time; the chapter names go in its description.
function studyRepertoire(id: string, title: string, color: PieceColor, studyPgn: string): Opening {
  const chapters = splitPgnChapters(studyPgn);
  const pgn = chapters.map((ch) => ch.pgn).join("\n\n");
  return {
    id,
    name: title,
    color,
    group: "Full repertoires",
    defaultOrder: "breadth",
    description: `Chapters: ${chapters.map((ch) => ch.name).join(", ")}. ${describe(pgn)}`,
    pgn,
    chapters,
  };
}

export const OPENINGS: Opening[] = [
  studyRepertoire("e4", "1.e4 Mainline Starter", "w", e4StarterPgn),
  studyRepertoire("d4", "1.d4 Mainline Starter", "w", d4StarterPgn),
  // === White openings ===
  {
    id: "scholars-mate",
    name: "Scholar's Mate",
    color: "w",
    pgn: "1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6 (3...g6 4.Qf3) 4.Qxf7#",
  },
  // === Black openings ===
  {
    id: "c6-qb6-vs-london",
    name: "c6 Qb6 vs London",
    color: "b",
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
