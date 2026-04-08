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
export function parseArrows(comment: string): { text: string; arrows: Arrow[] } {
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

/** Map numeric NAG ($1–$146) to display symbol. */
const NAG_DISPLAY: Record<number, string> = {
  1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!",
  10: "=", 11: "=", 13: "\u221e",
  14: "\u2a72", 15: "\u2a71",
  16: "\u00b1", 17: "\u2213",
  18: "+-", 19: "-+",
  22: "\u2a00", 146: "N",
};

function numericNagToSymbol(n: number): string {
  return NAG_DISPLAY[n] ?? `$${n}`;
}

/** Tokenize PGN into annotated tokens, preserving comments and NAGs. */
function tokenizePgn(pgn: string): AnnotatedToken[] {
  const tokens: AnnotatedToken[] = [];

  // Strip variations (parenthesized)
  let cleaned = pgn.replace(/\([^)]*\)/g, "");

  // Walk through, extracting SAN tokens + trailing NAGs + trailing comments + numeric NAGs
  const re = /(\{[^}]*\})|(\$\d+)|([a-hKQRBNO][a-h1-8xO#+=-]*[1-8QRBN]?)([!?]{1,2})?/g;
  let pendingComment: string | undefined;
  let pendingArrows: Arrow[] | undefined;
  let m: RegExpExecArray | null;

  while ((m = re.exec(cleaned)) !== null) {
    // Comment block
    if (m[1]) {
      const raw = m[1].slice(1, -1)
        .replace(/\$(\d+)/g, (_, n) => numericNagToSymbol(parseInt(n, 10)))
        .trim();
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

    // Numeric NAG ($1, $14, etc.) — attach to previous token
    if (m[2]) {
      const n = parseInt(m[2].slice(1), 10);
      if (tokens.length > 0) {
        tokens[tokens.length - 1].nag = numericNagToSymbol(n);
      }
      continue;
    }

    // SAN token
    const san = m[3];
    // Skip move numbers, results
    if (/^\d+\./.test(san)) continue;
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(san)) continue;

    const nag = m[4] || undefined;
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

// === Tree-based PGN parsing (supports variations) ===

export interface GameNode {
  san: string;
  from: SquareId;
  to: SquareId;
  promotion?: PieceKind;
  boardAfter: BoardState;
  colorPlayed: PieceColor;
  nag?: string;
  comment?: string;
  arrows?: Arrow[];
  children: GameNode[]; // [0] = main line continuation, [1+] = variations
}

export interface GameTree {
  startBoard: BoardState;
  comment?: string; // comment before first move
  children: GameNode[]; // [0] = first main line move
}

/** Tokenize PGN preserving comments (with [%cal] arrows), NAGs, and variation parens. */
function tokenizeGamePgn(pgn: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < pgn.length) {
    const ch = pgn[i];
    if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") { i++; continue; }
    if (ch === "(" || ch === ")") { tokens.push(ch); i++; continue; }
    // PGN headers [Tag "value"] — skip
    if (ch === "[" && (i === 0 || pgn[i - 1] !== "%")) {
      while (i < pgn.length && pgn[i] !== "]") i++;
      i++;
      continue;
    }
    // Semicolon line comments — skip
    if (ch === ";") {
      while (i < pgn.length && pgn[i] !== "\n") i++;
      continue;
    }
    // Move numbers — skip
    if (ch >= "0" && ch <= "9") {
      while (i < pgn.length && (pgn[i] >= "0" && pgn[i] <= "9" || pgn[i] === ".")) i++;
      while (i < pgn.length && pgn[i] === " ") i++;
      continue;
    }
    // Comments {text} — preserve [%cal] arrows, inline NAGs
    if (ch === "{") {
      const start = i + 1;
      while (i < pgn.length && pgn[i] !== "}") i++;
      const raw = pgn.slice(start, i)
        .replace(/\$(\d+)/g, (_, n) => numericNagToSymbol(parseInt(n, 10)))
        .trim();
      if (raw) tokens.push("{" + raw);
      i++;
      continue;
    }
    // NAGs — text form
    if (ch === "!" || ch === "?") {
      const start = i;
      while (i < pgn.length && (pgn[i] === "!" || pgn[i] === "?")) i++;
      const text = pgn.slice(start, i);
      const NAG_MAP: Record<string, number> = { "!": 1, "?": 2, "!!": 3, "??": 4, "!?": 5, "?!": 6 };
      const n = NAG_MAP[text];
      if (n !== undefined) tokens.push("$" + n);
      continue;
    }
    // NAGs — numeric form
    if (ch === "$") {
      const start = i;
      i++;
      while (i < pgn.length && pgn[i] >= "0" && pgn[i] <= "9") i++;
      tokens.push(pgn.slice(start, i));
      continue;
    }
    // SAN move or result
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
      const start = i;
      while (i < pgn.length && pgn[i] !== " " && pgn[i] !== "\n" && pgn[i] !== "\r" && pgn[i] !== "(" && pgn[i] !== ")" && pgn[i] !== "{" && pgn[i] !== "!" && pgn[i] !== "?" && pgn[i] !== "$") i++;
      const token = pgn.slice(start, i);
      if (/^(1-0|0-1|\*)$/.test(token)) continue;
      if (token.startsWith("1/2")) continue;
      tokens.push(token);
      continue;
    }
    i++;
  }
  return tokens;
}

/** Parse PGN into a GameTree with full variation support. */
export function parseGamePgn(pgn: string, fen?: string): GameTree {
  const startFen = fen ?? STARTING_FEN;
  const { placements, castlingRights, enPassantSquare } = parseFen(startFen);
  const startBoard = createBoardState(placements, { castlingRights, enPassantSquare });
  const tree: GameTree = { startBoard, children: [] };
  const tokens = tokenizeGamePgn(pgn);

  interface ParseState {
    parentNode: GameNode | null;
    board: BoardState;
    color: PieceColor;
  }

  let state: ParseState = { parentNode: null, board: startBoard, color: "w" };
  let lastMoveParent: ParseState = { ...state };
  const stack: { savedState: ParseState; savedLMP: ParseState }[] = [];

  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti];
    if (token.startsWith("$")) {
      const n = parseInt(token.slice(1), 10);
      if (state.parentNode) {
        state.parentNode.nag = numericNagToSymbol(n);
      }
    } else if (token.startsWith("{")) {
      const raw = token.slice(1);
      const { text, arrows } = parseArrows(raw);
      if (state.parentNode) {
        if (text) state.parentNode.comment = text;
        if (arrows.length > 0) state.parentNode.arrows = arrows;
      } else {
        // Comment before first move
        if (text) tree.comment = text;
      }
    } else if (token === "(") {
      stack.push({ savedState: { ...state }, savedLMP: { ...lastMoveParent } });
      state = { ...lastMoveParent };
    } else if (token === ")") {
      const saved = stack.pop()!;
      state = saved.savedState;
      lastMoveParent = saved.savedLMP;
    } else {
      lastMoveParent = { ...state };
      const resolved = parseSan(token, state.board, state.color);
      const newBoard = applyMove(state.board, resolved.from, resolved.to, resolved.promotion);

      const node: GameNode = {
        san: token,
        from: resolved.from,
        to: resolved.to,
        promotion: resolved.promotion,
        boardAfter: newBoard,
        colorPlayed: state.color,
        children: [],
      };

      if (state.parentNode === null) {
        tree.children.push(node);
      } else {
        state.parentNode.children.push(node);
      }

      state = {
        parentNode: node,
        board: newBoard,
        color: state.color === "w" ? "b" : "w",
      };
    }
  }

  return tree;
}

/** Walk the main line (children[0] at each level), return flat positions + moves. */
export function extractMainLine(tree: GameTree): ParsedGame {
  const positions: BoardState[] = [tree.startBoard];
  const moves: GameMove[] = [];
  let node: GameNode | undefined = tree.children[0];
  while (node) {
    moves.push({
      san: node.san,
      from: node.from,
      to: node.to,
      promotion: node.promotion,
      nag: node.nag,
      comment: node.comment,
      arrows: node.arrows,
    });
    positions.push(node.boardAfter);
    node = node.children[0];
  }
  return { positions, moves };
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
