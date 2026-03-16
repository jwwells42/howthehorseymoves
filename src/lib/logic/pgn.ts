import type { BoardState, PieceKind, PieceColor, SquareId } from "./types";
import { parseFen, createBoardState } from "./types";
import { getLegalMoves } from "./attacks";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export interface Arrow {
  from: SquareId;
  to: SquareId;
  color: string; // hex color
}

export interface GameMove {
  san: string;
  from: SquareId;
  to: SquareId;
  promotion?: PieceKind;
  nag?: string;       // "!", "!!", "?", "??", "!?", "?!"
  comment?: string;   // text annotation
  arrows?: Arrow[];   // arrows to draw on the board
}

export interface ParsedGame {
  positions: BoardState[];
  moves: GameMove[];
}

const ARROW_COLORS: Record<string, string> = {
  G: "#15803d", // green
  R: "#dc2626", // red
  Y: "#ca8a04", // yellow
  B: "#2563eb", // blue
};

interface AnnotatedToken {
  san: string;
  nag?: string;
  comment?: string;
  arrows?: Arrow[];
}

/** Parse [%cal Ge2e4,Rd7d5] arrow directives from a comment string. */
function parseArrows(comment: string): { text: string; arrows: Arrow[] } {
  const arrows: Arrow[] = [];
  const text = comment.replace(/\[%cal\s+([^\]]+)\]/g, (_, spec: string) => {
    for (const entry of spec.split(",")) {
      const e = entry.trim();
      if (e.length >= 5) {
        const colorCode = e[0].toUpperCase();
        const from = e.slice(1, 3) as SquareId;
        const to = e.slice(3, 5) as SquareId;
        arrows.push({ from, to, color: ARROW_COLORS[colorCode] ?? ARROW_COLORS.G });
      }
    }
    return "";
  }).trim();
  return { text, arrows };
}

/** Tokenize PGN into annotated tokens, preserving comments and NAGs. */
function tokenizePgn(pgn: string): AnnotatedToken[] {
  const tokens: AnnotatedToken[] = [];

  // Strip variations (parenthesized)
  let cleaned = pgn.replace(/\([^)]*\)/g, "");

  // Walk through, extracting SAN tokens + trailing NAGs + trailing comments
  const re = /(\{[^}]*\})|([a-hKQRBNO][a-h1-8xO#+=-]*[1-8QRBN]?)([!?]{1,2})?/g;
  let pendingComment: string | undefined;
  let pendingArrows: Arrow[] | undefined;
  let m: RegExpExecArray | null;

  while ((m = re.exec(cleaned)) !== null) {
    // Comment block
    if (m[1]) {
      const raw = m[1].slice(1, -1).trim();
      const { text, arrows } = parseArrows(raw);
      pendingComment = text || undefined;
      pendingArrows = arrows.length > 0 ? arrows : undefined;
      // Attach to the PREVIOUS token (comment follows a move)
      if (tokens.length > 0) {
        const last = tokens[tokens.length - 1];
        if (pendingComment) last.comment = pendingComment;
        if (pendingArrows) last.arrows = pendingArrows;
        pendingComment = undefined;
        pendingArrows = undefined;
      }
      continue;
    }

    // SAN token
    const san = m[2];
    // Skip move numbers, results
    if (/^\d+\./.test(san)) continue;
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(san)) continue;

    const nag = m[3] || undefined;
    tokens.push({ san, nag });
  }

  return tokens;
}

/** Parse a SAN move string into from/to squares using the current board state. */
export function parseSan(
  san: string,
  board: BoardState,
  color: PieceColor,
): { from: SquareId; to: SquareId; promotion?: PieceKind } {
  if (san === "O-O" || san === "O-O-O") {
    const rank = color === "w" ? "1" : "8";
    return {
      from: `e${rank}` as SquareId,
      to: (san === "O-O" ? `g${rank}` : `c${rank}`) as SquareId,
    };
  }

  let s = san.replace(/[+#!?]/g, "");

  let promotion: PieceKind | undefined;
  const promoMatch = s.match(/=([QRBN])$/);
  if (promoMatch) {
    promotion = promoMatch[1] as PieceKind;
    s = s.slice(0, -2);
  }

  let pieceType: PieceKind = "P";
  if (s[0] >= "A" && s[0] <= "Z") {
    pieceType = s[0] as PieceKind;
    s = s.slice(1);
  }

  s = s.replace("x", "");

  const to = s.slice(-2) as SquareId;
  const disambig = s.slice(0, -2);

  const candidates: SquareId[] = [];
  for (const [sq, p] of board.pieces) {
    if (p.piece !== pieceType || p.color !== color) continue;
    const moves = getLegalMoves(sq, board, color);
    if (moves.includes(to)) candidates.push(sq);
  }

  let from: SquareId;
  if (candidates.length === 1) {
    from = candidates[0];
  } else {
    const filtered = candidates.filter(sq => {
      for (const ch of disambig) {
        if (ch >= "a" && ch <= "h" && sq[0] !== ch) return false;
        if (ch >= "1" && ch <= "8" && sq[1] !== ch) return false;
      }
      return true;
    });
    from = filtered[0];
  }

  return { from, to, promotion };
}

/** Apply a move to the board, handling captures, castling, en passant, and promotion. */
export function applyMove(
  board: BoardState,
  from: SquareId,
  to: SquareId,
  promotion?: PieceKind,
): BoardState {
  const pieces = new Map(board.pieces);
  const moving = pieces.get(from)!;
  pieces.delete(from);

  // En passant capture — remove the captured pawn
  if (moving.piece === "P" && to === board.enPassantSquare) {
    pieces.delete(`${to[0]}${from[1]}` as SquareId);
  }

  // Castling — move the rook
  if (moving.piece === "K" && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2) {
    const rank = from[1];
    if (to[0] === "g") {
      pieces.delete(`h${rank}` as SquareId);
      pieces.set(`f${rank}` as SquareId, { piece: "R", color: moving.color });
    } else {
      pieces.delete(`a${rank}` as SquareId);
      pieces.set(`d${rank}` as SquareId, { piece: "R", color: moving.color });
    }
  }

  // Place piece (promote if applicable)
  pieces.set(to, promotion ? { piece: promotion, color: moving.color } : moving);

  // Update castling rights
  const cr = board.castlingRights ?? { K: true, Q: true, k: true, q: true };
  const castlingRights = { ...cr };
  if (from === "e1") { castlingRights.K = false; castlingRights.Q = false; }
  if (from === "e8") { castlingRights.k = false; castlingRights.q = false; }
  if (from === "a1" || to === "a1") castlingRights.Q = false;
  if (from === "h1" || to === "h1") castlingRights.K = false;
  if (from === "a8" || to === "a8") castlingRights.q = false;
  if (from === "h8" || to === "h8") castlingRights.k = false;

  // Update en passant square
  let enPassantSquare: SquareId | undefined;
  if (moving.piece === "P" && Math.abs(parseInt(to[1]) - parseInt(from[1])) === 2) {
    const epRank = (parseInt(from[1]) + parseInt(to[1])) / 2;
    enPassantSquare = `${from[0]}${epRank}` as SquareId;
  }

  return { pieces, castlingRights, enPassantSquare };
}

/** Parse a full PGN move text into an array of positions and moves. */
export function parsePgn(pgn: string): ParsedGame {
  const { placements, castlingRights, enPassantSquare } = parseFen(STARTING_FEN);
  let board = createBoardState(placements, { castlingRights, enPassantSquare });

  const positions: BoardState[] = [board];
  const moves: GameMove[] = [];
  const tokens = tokenizePgn(pgn);

  let color: PieceColor = "w";
  for (const token of tokens) {
    const { from, to, promotion } = parseSan(token.san, board, color);
    moves.push({
      san: token.san,
      from, to, promotion,
      nag: token.nag,
      comment: token.comment,
      arrows: token.arrows,
    });
    board = applyMove(board, from, to, promotion);
    positions.push(board);
    color = color === "w" ? "b" : "w";
  }

  return { positions, moves };
}
