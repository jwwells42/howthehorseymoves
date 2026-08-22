/**
 * Bot ladder harness — the tool for answering "is this bot actually stronger?"
 * and "how long does it take to move?" with numbers instead of intuition.
 *
 * Run it after touching ANY knob in BOT_SPECS (slack, depth, avoidsMateIn1, the
 * opening book, a new rung). The whole point of the ladder is that each step is
 * felt, and self-play is the only way to know before a student finds out.
 *
 *   ./node_modules/.bin/rolldown scripts/bot-ladder-match.ts --format esm --file /tmp/m.mjs
 *   node /tmp/m.mjs           # both reports
 *   node /tmp/m.mjs bench     # timings only (fast)
 *   node /tmp/m.mjs match 24  # ladder match, 24 games per pair (slow — minutes)
 *
 * (rolldown ships with vite; plain `node --experimental-strip-types` can't
 * resolve this project's extensionless relative imports.)
 *
 * Reading the output:
 *   - Every rung should beat the one below it comfortably. A pair below ~60%
 *     means those two rungs feel the same to a student — retune or merge them.
 *   - A LOW rung hanging a queen means slack is scaled too high. Remember
 *     scoreMove penalizes hanging by value*5 while material is value*10, so
 *     heuristic slack above ~1.4 buys knight blunders.
 *   - Timings are dev-desktop; a classroom Chromebook is several times slower.
 */
import { pickBotMove, BOT_LADDER, BOT_SPECS, type BotLevel } from "../src/lib/logic/bot";
import { parseFen, createBoardState, type BoardState } from "../src/lib/logic/types";
import { applyMove } from "../src/lib/logic/pgn";
import { getAllLegalMoves, isInCheck } from "../src/lib/logic/attacks";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const { placements, castlingRights, enPassantSquare } = parseFen(START);
const fresh = (): BoardState => createBoardState(placements, { castlingRights, enPassantSquare });

/* ── Timing: fixed positions, so runs are comparable ──────── */

const BENCH_POSITIONS = [
  "rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 4 4",
  "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R b KQkq - 0 5",
  "r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 b - - 6 7",
  "r2q1rk1/1b1nbppp/p2ppn2/1p6/3NPP2/1BN1B3/PPP3PP/R2Q1RK1 b - - 2 12",
  "r4rk1/pp1bqppp/2n1pn2/3p4/3P4/2NBPN2/PPQ2PPP/R4RK1 b - - 4 12",
  "2r3k1/1p3ppp/p3p3/3pP3/3P4/2P2N2/PP3PPP/2R3K1 b - - 0 20",
  "8/5ppp/4p3/3pP3/3P4/2P5/PP3PPP/6K1 b - - 0 30",
];

function bench() {
  const boards = BENCH_POSITIONS.map((fen) => {
    const p = parseFen(fen);
    return createBoardState(p.placements, {
      castlingRights: p.castlingRights,
      enPassantSquare: p.enPassantSquare,
    });
  });

  console.log("\nTime per move (ms), by position, opening → endgame:\n");
  for (const level of BOT_LADDER) {
    for (const b of boards) pickBotMove(b, "b", level); // warm up

    const per = boards.map((b) => {
      const t0 = performance.now();
      for (let r = 0; r < 8; r++) pickBotMove(b, "b", level);
      return (performance.now() - t0) / 8;
    });
    const avg = per.reduce((a, x) => a + x, 0) / per.length;
    console.log(
      `  ${level.padEnd(13)} avg ${avg.toFixed(1).padStart(7)}   ` +
        `[${per.map((p) => p.toFixed(0).padStart(4)).join(" ")}]`,
    );
  }
}

/* ── Match: does each rung actually beat the one below it? ── */

function playGame(white: BotLevel, black: BotLevel): "w" | "b" | "draw" {
  let board = fresh();
  let color: "w" | "b" = "w";

  for (let ply = 0; ply < 300; ply++) {
    const legal = getAllLegalMoves(color, board);
    if (legal.length === 0) {
      return isInCheck(color, board) ? (color === "w" ? "b" : "w") : "draw";
    }

    const move = pickBotMove(board, color, color === "w" ? white : black);
    if (!move) return "draw";

    const piece = board.pieces.get(move.from)!;
    const promo =
      piece.piece === "P" && (move.to[1] === "8" || move.to[1] === "1") ? "Q" : undefined;
    board = applyMove(board, move.from, move.to, promo);
    color = color === "w" ? "b" : "w";
  }
  return "draw"; // move cap — common between the two weakest rungs, which can't mate
}

function match(games: number) {
  console.log(
    `\nAdjacent-rung match, ${games} games each ` +
      `(stronger plays Black, so the opening book applies):\n`,
  );

  for (let i = 0; i < BOT_LADDER.length - 1; i++) {
    const weak = BOT_LADDER[i];
    const strong = BOT_LADDER[i + 1];

    let won = 0, lost = 0, drew = 0;
    for (let g = 0; g < games; g++) {
      const r = playGame(weak, strong);
      if (r === "b") won++;
      else if (r === "w") lost++;
      else drew++;
    }

    const pct = ((won + drew / 2) / games) * 100;
    console.log(
      `  ${String(BOT_SPECS[strong].rung).padStart(2)}. ${strong.padEnd(13)}` +
        ` vs ${weak.padEnd(13)} ${pct.toFixed(0).padStart(3)}%  ` +
        `(+${won} =${drew} -${lost})  ${"█".repeat(Math.round(pct / 5))}`,
    );
  }
}

const mode = process.argv[2] ?? "all";
if (mode === "bench" || mode === "all") bench();
if (mode === "match" || mode === "all") match(Number(process.argv[3]) || 16);
