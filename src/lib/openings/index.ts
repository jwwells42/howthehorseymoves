import type { BoardState, PieceColor, PieceKind, SquareId } from "../logic/types";
import { parseFen, createBoardState } from "../logic/types";
import { parseSan, applyMove } from "../logic/pgn";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// === Types ===

export interface OpeningMove {
  san: string;
  from: SquareId;
  to: SquareId;
  promotion?: PieceKind;
  boardAfter: BoardState;
  colorPlayed: PieceColor;
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
  description: string;
  color: PieceColor;
  pgn: string;
}

// === Tokenizer ===

function tokenizeOpeningPgn(pgn: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < pgn.length) {
    const ch = pgn[i];
    if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") { i++; continue; }
    if (ch === "(" || ch === ")") { tokens.push(ch); i++; continue; }
    // PGN headers [Tag "value"] — skip entire line
    if (ch === "[") {
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
    // Comments {text} — skip
    if (ch === "{") {
      while (i < pgn.length && pgn[i] !== "}") i++;
      i++;
      continue;
    }
    // NAGs — skip (! ? !! ?? !? ?! and numeric $1 $2 etc.)
    if (ch === "!" || ch === "?") {
      while (i < pgn.length && (pgn[i] === "!" || pgn[i] === "?")) i++;
      continue;
    }
    if (ch === "$") {
      i++;
      while (i < pgn.length && pgn[i] >= "0" && pgn[i] <= "9") i++;
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

  for (const token of tokens) {
    if (token === "(") {
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
        const moveNum = Math.floor(tokens.slice(0, tokens.indexOf(token)).filter(t => t !== "(" && t !== ")").length / 2) + 1;
        throw new Error(`"${token}" (around move ${moveNum}, ${state.color === "w" ? "White" : "Black"} to play) — no legal piece can make this move`);
      }
      const newBoard = applyMove(state.board, resolved.from, resolved.to, resolved.promotion);

      const node: OpeningMove = {
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

export function findBranchPoint(line1: OpeningLine, line2: OpeningLine): number {
  let i = 0;
  while (i < line1.length && i < line2.length && line1[i].san === line2[i].san) i++;
  return i;
}

// === Data ===

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
];

export function getOpening(id: string): Opening | undefined {
  return OPENINGS.find((o) => o.id === id);
}
