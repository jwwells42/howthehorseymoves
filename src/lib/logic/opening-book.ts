import type { BoardState, PieceColor, SquareId } from "./types";
import { parseFen, createBoardState, boardToKey } from "./types";
import { parseSan, applyMove } from "./pgn";

/**
 * A tiny opening book for the strongest bot.
 *
 * Without one, a depth-2 search opens with moves like 1...a6 / 2...Nh6 and is
 * strategically lost by move eight against a student who knows any opening at all.
 * A book fixes that for zero search cost.
 *
 * The bot always plays Black (see `use-game.svelte.ts`), so only Black replies are
 * stored. Lines are written as plain PGN and parsed once on first use — the same
 * lazy-generation pattern as `kpk-bitbase.ts`. Positions are keyed with
 * `boardToKey()`, which folds in castling rights, the en passant square, and the
 * side to move, so the book handles transpositions for free.
 *
 * To extend: add a line below. White moves steer which positions get covered;
 * only the Black moves are ever played from the book.
 */
const BOOK_LINES = [
  // ── 1.e4 e5 ────────────────────────────────────────────────
  "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7",   // Spanish
  "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4",   // Italian
  "1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4 Nf6",            // Scotch
  "1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. Bb5 Bb4",             // Four Knights
  "1. e4 e5 2. Nc3 Nf6 3. Bc4 Nxe4",                        // Vienna
  "1. e4 e5 2. Bc4 Nf6 3. Nf3 Nc6",
  "1. e4 e5 2. f4 exf4 3. Nf3 g5",                          // King's Gambit
  "1. e4 e5 2. d4 exd4 3. Qxd4 Nc6",                        // Centre Game

  // Scholar's Mate — the line students try first, and its refutation
  "1. e4 e5 2. Bc4 Nc6 3. Qh5 Qe7 4. Nf3 Nf6",
  "1. e4 e5 2. Qh5 Nc6 3. Bc4 g6 4. Qf3 Nf6",
  "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Na5",   // Two Knights

  // ── 1.d4 ───────────────────────────────────────────────────
  "1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7",                // QGD
  "1. d4 d5 2. Nf3 Nf6 3. Bf4 e6 4. e3 Bd6",                // London
  "1. d4 d5 2. e3 Nf6 3. Nf3 e6",
  "1. d4 Nf6 2. c4 e6 3. Nc3 Bb4",                          // Nimzo
  "1. d4 d5 2. Bf4 Nf6 3. e3 e6",

  // ── Other first moves ──────────────────────────────────────
  "1. Nf3 d5 2. d4 Nf6 3. c4 e6",
  "1. c4 e5 2. Nc3 Nf6 3. Nf3 Nc6",
  "1. f4 d5 2. Nf3 Nf6 3. e3 g6",
  "1. b3 e5 2. Bb2 Nc6 3. e3 Nf6",
  "1. g3 d5 2. Bg2 Nf6 3. Nf3 e6",
  "1. Nc3 d5 2. e4 d4 3. Nce2 e5",
];

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** position key → the Black replies seen in the book from that position. */
let book: Map<string, { from: SquareId; to: SquareId }[]> | null = null;

/** Parse BOOK_LINES into the position map. Runs once, on the first book lookup. */
function buildBook(): Map<string, { from: SquareId; to: SquareId }[]> {
  const map = new Map<string, { from: SquareId; to: SquareId }[]>();

  const { placements, castlingRights, enPassantSquare } = parseFen(STARTING_FEN);

  for (const line of BOOK_LINES) {
    let board = createBoardState(placements, { castlingRights, enPassantSquare });
    let color: PieceColor = "w";

    const sans = line
      .split(/\s+/)
      .filter((t) => t && !/^\d+\.+$/.test(t))
      .map((t) => t.replace(/^\d+\.+/, ""))
      .filter(Boolean);

    for (const san of sans) {
      const move = parseSan(san, board, color);

      // Only Black's moves go in the book — White is the student.
      if (color === "b") {
        const key = boardToKey(board, "b");
        const replies = map.get(key);
        if (!replies) {
          map.set(key, [{ from: move.from, to: move.to }]);
        } else if (!replies.some((r) => r.from === move.from && r.to === move.to)) {
          replies.push({ from: move.from, to: move.to });
        }
      }

      board = applyMove(board, move.from, move.to, move.promotion);
      color = color === "w" ? "b" : "w";
    }
  }

  return map;
}

/**
 * Look up a book reply for this position.
 * Returns null when out of book, which drops the caller into normal search.
 */
export function bookMove(
  board: BoardState,
  color: PieceColor,
): { from: SquareId; to: SquareId } | null {
  if (color !== "b") return null; // book only covers Black

  book ??= buildBook();

  const replies = book.get(boardToKey(board, color));
  if (!replies || replies.length === 0) return null;

  return replies[Math.floor(Math.random() * replies.length)];
}
