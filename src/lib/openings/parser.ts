import type { BoardState, PieceColor, PieceKind, SquareId } from "../logic/types";
import { parseFen, createBoardState, boardToKey } from "../logic/types";
import { parseSan, applyMove, parseArrows } from "../logic/pgn";
import type { Arrow } from "../logic/pgn";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// === Types ===

export interface OpeningMove {
  /** The position it's played in plus the move, hashed: what saved progress is kept under */
  key: string;
  san: string;
  from: SquareId;
  to: SquareId;
  promotion?: PieceKind;
  boardAfter: BoardState;
  colorPlayed: PieceColor;
  nag?: string;
  comment?: string;
  arrows?: Arrow[];
  children: OpeningMove[];
}

export interface OpeningTree {
  startBoard: BoardState;
  children: OpeningMove[];
}

export type OpeningLine = OpeningMove[];

export interface Opening {
  id: string;
  name: string;
  description?: string; // a study's chapters and line count, built from its PGN
  color: PieceColor;
  pgn: string;
  group?: string; // openings sharing a group get their own section on /openings
  defaultOrder?: "depth" | "breadth"; // Learn's order until the student picks one (default "depth": one line at a time)
  chapters?: PgnChapter[]; // from a study: the setup's line picker groups the lines by chapter
}

// === NAG display ===

const TEXT_TO_NAG: Record<string, number> = {
  "!": 1, "?": 2, "!!": 3, "??": 4, "!?": 5, "?!": 6,
};

const NAG_DISPLAY: Record<number, string> = {
  1: "!", 2: "?", 3: "!!", 4: "??", 5: "!?", 6: "?!",
  10: "=", 11: "=", 13: "\u221e", // ∞ unclear
  14: "\u2a72", 15: "\u2a71", // ⩲ ⩱ slight advantage
  16: "\u00b1", 17: "\u2213", // ± ∓ clear advantage
  18: "+-", 19: "-+",         // decisive
  22: "\u2a00",               // ⨀ zugzwang
  146: "N",                   // novelty
};

export function nagToSymbol(n: number): string {
  return NAG_DISPLAY[n] ?? `$${n}`;
}

// === Move keys ===

// Two 32-bit FNV-1a hashes side by side: short, and with a few thousand moves
// in a repertoire, two of them sharing a key won't happen.
function fnv1a(text: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(36);
}

// A move is known by the position it's played in, so two lines that reach the
// same position by different move orders share what was learned there. The
// en passant square counts only when a pawn can take there: 1.e4 e5 2.Nf3 Nc6
// and 1.Nf3 Nc6 2.e4 e5 are the same position.
export function moveKey(board: BoardState, color: PieceColor, from: SquareId, to: SquareId, promotion?: PieceKind): string {
  const ep = board.enPassantSquare;
  const takerRank = color === "w" ? "5" : "4";
  const canTake = ep !== undefined && [-1, 1].some((df) => {
    const p = board.pieces.get(`${String.fromCharCode(ep.charCodeAt(0) + df)}${takerRank}` as SquareId);
    return p?.piece === "P" && p.color === color;
  });
  const position = boardToKey(canTake ? board : { ...board, enPassantSquare: undefined }, color);
  const text = `${position} ${from}${to}${promotion ?? ""}`;
  return fnv1a(text, 2166136261) + fnv1a(text, 3735928559);
}

// === Tokenizer ===

function tokenizeOpeningPgn(pgn: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  let hasMoves = false;
  while (i < pgn.length) {
    const ch = pgn[i];
    if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") { i++; continue; }
    if (ch === "(" || ch === ")") { tokens.push(ch); i++; continue; }
    // PGN headers [Tag "value"] — skip, but emit reset between games
    if (ch === "[") {
      if (hasMoves) {
        tokens.push("|");
        hasMoves = false;
      }
      while (i < pgn.length && pgn[i] !== "]") i++;
      i++;
      continue;
    }
    // Semicolon line comments — skip to end of line
    if (ch === ";") {
      while (i < pgn.length && pgn[i] !== "\n") i++;
      continue;
    }
    // Move numbers (digits + dots) — skip
    if (ch >= "0" && ch <= "9") {
      while (i < pgn.length && (pgn[i] >= "0" && pgn[i] <= "9" || pgn[i] === ".")) i++;
      while (i < pgn.length && pgn[i] === " ") i++;
      continue;
    }
    // Comments {text} — preserve as tokens prefixed with "{"
    if (ch === "{") {
      const start = i + 1;
      while (i < pgn.length && pgn[i] !== "}") i++;
      const raw = pgn.slice(start, i)
        .replace(/\[%csl[^\]]*\]/g, "")
        .replace(/\$(\d+)/g, (_, n) => nagToSymbol(parseInt(n, 10)))
        .trim();
      if (raw) tokens.push("{" + raw);
      i++;
      continue;
    }
    // NAGs — emit as tokens (text form: ! ? !! ?? !? ?!, numeric: $1 $2 etc.)
    if (ch === "!" || ch === "?") {
      const start = i;
      while (i < pgn.length && (pgn[i] === "!" || pgn[i] === "?")) i++;
      const text = pgn.slice(start, i);
      const n = TEXT_TO_NAG[text];
      if (n !== undefined) tokens.push("$" + n);
      continue;
    }
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
      hasMoves = true;
      tokens.push(token);
      continue;
    }
    i++;
  }
  return tokens;
}

// === Parser ===

interface ParseState {
  parentNode: OpeningMove | null;
  board: BoardState;
  color: PieceColor;
}

export function parseOpeningPgn(pgn: string): OpeningTree {
  const { placements, castlingRights, enPassantSquare } = parseFen(STARTING_FEN);
  const startBoard = createBoardState(placements, { castlingRights, enPassantSquare });
  const tree: OpeningTree = { startBoard, children: [] };
  const tokens = tokenizeOpeningPgn(pgn);

  let state: ParseState = { parentNode: null, board: startBoard, color: "w" };
  let lastMoveParent: ParseState = { ...state };
  const stack: { savedState: ParseState; savedLMP: ParseState }[] = [];

  for (let ti = 0; ti < tokens.length; ti++) {
    const token = tokens[ti];
    if (token === "|") {
      state = { parentNode: null, board: startBoard, color: "w" };
      lastMoveParent = { ...state };
      stack.length = 0;
    } else if (token.startsWith("$")) {
      const n = parseInt(token.slice(1), 10);
      if (state.parentNode) {
        state.parentNode.nag = nagToSymbol(n);
      }
    } else if (token.startsWith("{")) {
      if (state.parentNode) {
        const { text, arrows } = parseArrows(token.slice(1));
        if (text) state.parentNode.comment = text;
        if (arrows.length > 0) state.parentNode.arrows = arrows;
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
      if (!resolved.from) {
        const nearby = tokens.slice(Math.max(0, ti - 4), ti + 3).filter(t => !t.startsWith("{")).join(" ");
        throw new Error(`"${token}" (token ${ti + 1}/${tokens.length}, ${state.color === "w" ? "White" : "Black"} to play) — no legal piece found. Context: ...${nearby}...`);
      }
      const newBoard = applyMove(state.board, resolved.from, resolved.to, resolved.promotion);

      const node: OpeningMove = {
        key: moveKey(state.board, state.color, resolved.from, resolved.to, resolved.promotion),
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

// === Line extraction ===

export function extractLines(tree: OpeningTree): OpeningLine[] {
  const lines: OpeningLine[] = [];
  function dfs(node: OpeningMove, path: OpeningMove[]) {
    const currentPath = [...path, node];
    if (node.children.length === 0) {
      lines.push(currentPath);
    } else {
      for (const child of node.children) {
        dfs(child, currentPath);
      }
    }
  }
  for (const root of tree.children) {
    dfs(root, []);
  }
  return lines;
}

// === Multi-chapter PGNs (e.g. a Lichess study export) ===

export interface PgnChapter {
  name: string;
  pgn: string;
}

// Split a multi-game PGN into chapters. A header line that comes after some
// movetext starts the next chapter. The name is [ChapterName] (Lichess studies)
// or else [Event]. Chapters with no moves (like Lichess's intro chapter) are dropped.
export function splitPgnChapters(pgn: string): PgnChapter[] {
  const chunks: string[][] = [[]];
  let hasMoves = false;
  for (const line of pgn.split("\n")) {
    const isHeader = /^\s*\[\w+ "/.test(line);
    if (isHeader && hasMoves) {
      chunks.push([]);
      hasMoves = false;
    }
    if (!isHeader && line.trim()) hasMoves = true;
    chunks[chunks.length - 1].push(line);
  }
  const chapters: PgnChapter[] = [];
  for (const chunk of chunks) {
    const text = chunk.join("\n").trim();
    const movetext = text.replace(/^\s*\[\w+ ".*$/gm, "").replace(/\{[^}]*\}/g, "");
    if (!/[a-zA-Z]/.test(movetext)) continue;
    const name = text.match(/\[ChapterName "([^"]*)"\]/)?.[1] ?? text.match(/\[Event "([^"]*)"\]/)?.[1] ?? "Chapter";
    chapters.push({ name, pgn: text });
  }
  return chapters;
}

/** A line's moves as text: how a line is known across a re-export of its PGN. */
export function lineId(line: OpeningLine): string {
  return line.map((m) => m.san).join(" ");
}

export function findBranchPoint(line1: OpeningLine, line2: OpeningLine): number {
  let i = 0;
  while (i < line1.length && i < line2.length && line1[i].san === line2[i].san) i++;
  return i;
}

