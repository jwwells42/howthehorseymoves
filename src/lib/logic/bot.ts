import type { BoardState, PieceKind, PieceColor, SquareId } from "./types";
import { squareToCoords } from "./types";
import { getAllLegalMoves, hasLegalMoves, isInCheck, isCheckmate, isSquareAttacked } from "./attacks";
import { bookMove } from "./opening-book";

type Move = { from: SquareId; to: SquareId };

/** Piece values for material evaluation. */
const PIECE_VALUES: Record<PieceKind, number> = {
  P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0,
};

/** Small bonus for controlling center squares. */
const CENTER_BONUS: Record<string, number> = {
  d4: 0.3, e4: 0.3, d5: 0.3, e5: 0.3,
  c3: 0.1, d3: 0.1, e3: 0.1, f3: 0.1,
  c6: 0.1, d6: 0.1, e6: 0.1, f6: 0.1,
};

export type BotLevel =
  | "random"        // 1. The Sloth
  | "greedy"        // 2. The Chick
  | "loose"         // 3. The Frog
  | "careful"       // 4. The Rabbit
  | "basic"         // 5. The Panda
  | "sharp"         // 6. The Monkey
  | "intermediate"  // 7. The Bear
  | "expert";       // 8. The Owl

export interface BotSpec {
  level: BotLevel;
  /** 1-8. Position on the ladder — drives the difficulty pips on the play page. */
  rung: number;
  search: "random" | "greedy" | "heuristic" | "minimax";
  /**
   * Pick at random among all moves scoring within this much of the best,
   * measured in pawns. 0 = always plays its best move. Larger = weaker, but
   * never absurd: a slack bot plays second-best moves, it does not randomly
   * hang its queen.
   *
   * Mind the ceiling on the heuristic bots. `scoreMove` penalizes hanging a
   * piece by `value * 5` while a pawn of material is worth 10, so slack above
   * ~1.4 starts buying knight blunders and above ~2.5 rook blunders. Keep
   * heuristic slack under 1.5. The minimax bots evaluate in real centipawns,
   * so their slack means what it says.
   */
  slack: number;
  /**
   * Minimax bots only: total plies searched, counting the bot's own move.
   * 2 = "my move, your reply". Even depths are safer than odd ones without a
   * quiescence search — an odd depth ends on the bot's own move, so it sees its
   * own capture but not your recapture.
   */
  depth: number;
  /**
   * Heuristic bots only: run the mate-in-1 defense scan. It generates every
   * opponent reply and tests checkmate on each, which costs a heuristic bot
   * roughly 10x (measured: 0.8 ms/move without, 9.2 ms/move with). Leaving it
   * off makes a low rung both weaker and cheaper.
   *
   * The minimax bots leave this off because they get it for free: every leaf
   * checks `hasLegalMoves` first, so a mate delivered at the horizon still
   * scores ±99999 rather than a static evaluation.
   */
  avoidsMateIn1: boolean;
  /** Consult the opening book before searching. */
  usesBook: boolean;
}

/**
 * The bot ladder. Each rung should feel clearly harder than the one below it.
 *
 * Strength comes mostly from `slack`, not from search depth — depth alone only
 * gives two or three usable steps, and deeper search costs Chromebook CPU we
 * don't have. `basic` and `intermediate` are the original two scored bots at
 * full strength (slack 0); the rungs around them are the same engines loosened.
 *
 * To add a rung: add a row here, an entry in `BOT_CHARACTERS` (`characters/bots.ts`),
 * and a sprite in `static/characters/`. No new algorithm required.
 */
export const BOT_SPECS: Record<BotLevel, BotSpec> = {
  random:       { level: "random",        rung: 1, search: "random",     slack: 0,   depth: 0, avoidsMateIn1: false, usesBook: false },
  greedy:       { level: "greedy",        rung: 2, search: "greedy",     slack: 0,   depth: 0, avoidsMateIn1: false, usesBook: false },
  loose:        { level: "loose",         rung: 3, search: "heuristic",  slack: 1.4, depth: 0, avoidsMateIn1: false, usesBook: false },
  careful:      { level: "careful",       rung: 4, search: "heuristic",  slack: 0.6, depth: 0, avoidsMateIn1: true,  usesBook: false },
  basic:        { level: "basic",         rung: 5, search: "heuristic",  slack: 0,   depth: 0, avoidsMateIn1: true,  usesBook: false },
  sharp:        { level: "sharp",         rung: 6, search: "minimax",    slack: 0.7, depth: 2, avoidsMateIn1: false, usesBook: false },
  intermediate: { level: "intermediate",  rung: 7, search: "minimax",    slack: 0,   depth: 2, avoidsMateIn1: false, usesBook: false },
  expert:       { level: "expert",        rung: 8, search: "minimax",    slack: 0,   depth: 3, avoidsMateIn1: false, usesBook: true  },
};

/** The ladder in display order, weakest first. */
export const BOT_LADDER: BotLevel[] = [
  "random", "greedy", "loose", "careful", "basic", "sharp", "intermediate", "expert",
];

/**
 * Slack is declared in pawns, but the two evaluators use different units:
 * `scoreMove` is ~10 points per pawn, `evaluatePosition` is centipawns.
 */
function slackPoints(spec: BotSpec): number {
  return spec.slack * (spec.search === "minimax" ? 100 : 10);
}

/** Pick at random among the moves scoring within `slack` of the best. Scores are mover-relative. */
function pickWithSlack(scored: { move: Move; score: number }[], slack: number): Move {
  let best = -Infinity;
  for (const s of scored) if (s.score > best) best = s.score;

  const pool = scored.filter((s) => s.score >= best - slack);
  return pool[Math.floor(Math.random() * pool.length)].move;
}

/** Pick a move for the given color. */
export function pickBotMove(
  board: BoardState,
  color: PieceColor,
  level: BotLevel,
): Move | null {
  const spec = BOT_SPECS[level];
  const moves = getAllLegalMoves(color, board);
  if (moves.length === 0) return null;

  if (spec.usesBook) {
    const book = bookMove(board, color);
    // Guard against a stale book entry that isn't legal in this position.
    if (book && moves.some((m) => m.from === book.from && m.to === book.to)) return book;
  }

  switch (spec.search) {
    case "random":
      return moves[Math.floor(Math.random() * moves.length)];
    case "greedy":
      return pickGreedyMove(board, color, moves);
    case "minimax":
      return pickMinimaxMove(board, color, moves, spec);
    case "heuristic":
      return pickHeuristicMove(board, color, moves, spec);
  }
}

/* ── Greedy bot: takes the biggest thing it can see ────────── */

/**
 * Plays the most valuable capture available, otherwise a random legal move.
 * It never checks whether the piece it moves is safe, so it walks onto defended
 * squares *systematically* — a pattern a student can learn to exploit, unlike
 * random blundering.
 */
function pickGreedyMove(board: BoardState, color: PieceColor, moves: Move[]): Move {
  const opponent: PieceColor = color === "w" ? "b" : "w";
  const captures: { move: Move; score: number }[] = [];

  for (const move of moves) {
    const target = board.pieces.get(move.to);
    if (target && target.color === opponent) {
      captures.push({ move, score: PIECE_VALUES[target.piece] });
    }
  }

  if (captures.length === 0) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  return pickWithSlack(captures, 0);
}

/* ── Heuristic bot: one-ply scoring ────────────────────────── */

function pickHeuristicMove(
  board: BoardState,
  color: PieceColor,
  moves: Move[],
  spec: BotSpec,
): Move {
  const opponent: PieceColor = color === "w" ? "b" : "w";
  const scored = moves.map((move) => ({
    move,
    score: scoreMove(board, move.from, move.to, color, opponent, spec),
  }));

  return pickWithSlack(scored, slackPoints(spec));
}

/* ── Minimax bots: alpha-beta to spec.depth plies ──────────── */

/** Piece values in centipawns for static evaluation. */
const PIECE_CP: Record<PieceKind, number> = {
  P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000,
};

/**
 * Piece-square tables (from White's perspective, rank 8 = row 0).
 * Standard simplified tables from the Chess Programming Wiki.
 * Laid out 8-per-row to mirror the board — keep the alignment when editing.
 */
const PST: Record<PieceKind, number[]> = {
  P: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  N: [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  B: [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  R: [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
  ],
  Q: [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  K: [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

/** Get PST index for a square. White uses normal orientation, Black mirrors vertically. */
function pstIndex(sq: SquareId, color: PieceColor): number {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]);
  return color === "w"
    ? (8 - rank) * 8 + file
    : (rank - 1) * 8 + file;
}

/** Static evaluation from White's perspective (positive = White advantage). */
function evaluatePosition(board: BoardState): number {
  let score = 0;
  for (const [sq, p] of board.pieces) {
    const value = PIECE_CP[p.piece] + PST[p.piece][pstIndex(sq, p.color)];
    score += p.color === "w" ? value : -value;
  }
  return score;
}

/** Apply a move, handling promotion, castling, and en passant. */
function applySimpleMove(board: BoardState, from: SquareId, to: SquareId): BoardState {
  const pieces = new Map(board.pieces);
  const piece = pieces.get(from)!;
  pieces.delete(from);
  pieces.set(to, piece);

  // Pawn promotion (auto-queen)
  if (piece.piece === "P") {
    const toRank = to[1];
    if ((piece.color === "w" && toRank === "8") || (piece.color === "b" && toRank === "1")) {
      pieces.set(to, { piece: "Q", color: piece.color });
    }
    // En passant capture
    if (to === board.enPassantSquare) {
      const epRank = piece.color === "w" ? String(parseInt(to[1]) - 1) : String(parseInt(to[1]) + 1);
      pieces.delete(`${to[0]}${epRank}` as SquareId);
    }
  }

  // Castling: move the rook too
  if (piece.piece === "K") {
    const df = to.charCodeAt(0) - from.charCodeAt(0);
    if (Math.abs(df) === 2) {
      const rank = from[1];
      if (df > 0) {
        pieces.delete(`h${rank}` as SquareId);
        pieces.set(`f${rank}` as SquareId, { piece: "R", color: piece.color });
      } else {
        pieces.delete(`a${rank}` as SquareId);
        pieces.set(`d${rank}` as SquareId, { piece: "R", color: piece.color });
      }
    }
  }

  return { pieces };
}

/**
 * Minimax with alpha-beta pruning.
 * Returns evaluation from White's perspective.
 */
function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  const color: PieceColor = maximizing ? "w" : "b";

  // Leaf. Handle this before generating moves: a leaf only needs to know
  // whether the position is terminal, and `hasLegalMoves` early-exits on the
  // first legal move it finds, where `getAllLegalMoves` would legality-check
  // all ~35. Leaves are the overwhelming majority of nodes, so this is where
  // nearly all of the search cost lives.
  if (depth === 0) {
    if (!hasLegalMoves(color, board)) {
      return isInCheck(color, board) ? (maximizing ? -99999 : 99999) : 0;
    }
    return evaluatePosition(board);
  }

  const moves = getAllLegalMoves(color, board);

  if (moves.length === 0) {
    if (isInCheck(color, board)) {
      // Checkmate — terrible for the side that's mated
      return maximizing ? -99999 : 99999;
    }
    return 0; // Stalemate
  }

  // Move ordering: captures first for better pruning
  const sorted = [...moves].sort((a, b) => {
    const aC = board.pieces.has(a.to) ? 1 : 0;
    const bC = board.pieces.has(b.to) ? 1 : 0;
    return bC - aC;
  });

  if (maximizing) {
    let best = -Infinity;
    for (const move of sorted) {
      const nb = applySimpleMove(board, move.from, move.to);
      const score = minimax(nb, depth - 1, alpha, beta, false);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of sorted) {
      const nb = applySimpleMove(board, move.from, move.to);
      const score = minimax(nb, depth - 1, alpha, beta, true);
      if (score < best) best = score;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

/** Pick a move using minimax search to `spec.depth` plies, loosened by `spec.slack`. */
function pickMinimaxMove(
  board: BoardState,
  color: PieceColor,
  moves: Move[],
  spec: BotSpec,
): Move {
  const maximizing = color === "w";

  // Sort captures first at root too
  const sorted = [...moves].sort((a, b) => {
    const aC = board.pieces.has(a.to) ? 1 : 0;
    const bC = board.pieces.has(b.to) ? 1 : 0;
    return bC - aC;
  });

  // `minimax` returns a White-positive score. Flip it for Black so that
  // "higher is better for the mover" holds and slack works the same either way.
  const scored = sorted.map((move) => {
    const nb = applySimpleMove(board, move.from, move.to);
    const score = minimax(nb, spec.depth - 1, -Infinity, Infinity, !maximizing);
    return { move, score: maximizing ? score : -score };
  });

  return pickWithSlack(scored, slackPoints(spec));
}

/* ── One-ply move scoring (used by the heuristic bots) ─────── */

/** Score a single move. Higher is better for the moving side. */
function scoreMove(
  board: BoardState,
  from: SquareId,
  to: SquareId,
  color: PieceColor,
  opponent: PieceColor,
  spec: BotSpec,
): number {
  let score = 0;
  const movingPiece = board.pieces.get(from)!;
  const captured = board.pieces.get(to);

  // 1. Capturing: value of captured piece (always good)
  if (captured && captured.color === opponent) {
    score += PIECE_VALUES[captured.piece] * 10;

    // Bonus for capturing with a less valuable piece (good trade)
    score += (PIECE_VALUES[captured.piece] - PIECE_VALUES[movingPiece.piece]) * 2;
  }

  // Simulate the move to check consequences
  const afterPieces = new Map(board.pieces);
  afterPieces.delete(from);
  afterPieces.set(to, movingPiece);
  const afterBoard: BoardState = { pieces: afterPieces };

  // 2. Checkmate? Always play it.
  if (isCheckmate(opponent, afterBoard)) {
    return 1000;
  }

  // 2b. Does this move allow opponent to checkmate us? Avoid it.
  // By far the most expensive term here — ~35 full move generations per move
  // scored — so only the rungs that need it pay for it.
  if (spec.avoidsMateIn1) {
    const opponentMoves = getAllLegalMoves(opponent, afterBoard);
    for (const opp of opponentMoves) {
      const oppPieces = new Map(afterPieces);
      const oppPiece = oppPieces.get(opp.from);
      if (!oppPiece) continue;
      oppPieces.delete(opp.from);
      oppPieces.set(opp.to, oppPiece);
      if (isCheckmate(color, { pieces: oppPieces })) {
        score -= 500;
        break;
      }
    }
  }

  // 2c. Does this move give check? (small bonus)
  if (isInCheck(opponent, afterBoard)) {
    score += 3;
  }

  // 3. Is the piece safe on the destination square?
  const wasAttacked = isSquareAttacked(from, opponent, board);
  const isAttackedAfter = isSquareAttacked(to, opponent, afterBoard);

  if (isAttackedAfter) {
    // Moving to an attacked square — penalty based on piece value
    // But only if we're not capturing something worth more
    const captureValue = captured ? PIECE_VALUES[captured.piece] : 0;
    if (captureValue < PIECE_VALUES[movingPiece.piece]) {
      score -= PIECE_VALUES[movingPiece.piece] * 5;
    }
  } else if (wasAttacked) {
    // Escaping from an attacked square — bonus
    score += PIECE_VALUES[movingPiece.piece] * 2;
  }

  // 4. Center control bonus for knights and bishops
  if (movingPiece.piece === "N" || movingPiece.piece === "B") {
    score += CENTER_BONUS[to] ?? 0;
  }

  // 5. Pawn advancement (mild bonus for pushing pawns forward)
  if (movingPiece.piece === "P") {
    const [, rank] = squareToCoords(to);
    const advancement = color === "w" ? (7 - rank) : rank;
    score += advancement * 0.1;

    // Promotion is huge
    if ((color === "w" && rank === 0) || (color === "b" && rank === 7)) {
      score += 80;
    }
  }

  // 6. Castling bonus (king safety)
  if (movingPiece.piece === "K") {
    const [fx] = squareToCoords(from);
    const [tx] = squareToCoords(to);
    if (Math.abs(tx - fx) === 2) {
      score += 4;
    }
  }

  // 7. Small random jitter to avoid always playing the same game
  score += Math.random() * 0.5;

  return score;
}
