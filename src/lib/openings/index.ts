import { BoardState, PieceKind, PieceColor, SquareId, parseFen, createBoardState } from "../logic/types";
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
    // Move numbers (digits + dots) — skip
    if (ch >= "0" && ch <= "9") {
      while (i < pgn.length && (pgn[i] >= "0" && pgn[i] <= "9" || pgn[i] === ".")) i++;
      while (i < pgn.length && pgn[i] === " ") i++;
      continue;
    }
    // Comments — skip
    if (ch === "{") {
      while (i < pgn.length && pgn[i] !== "}") i++;
      i++;
      continue;
    }
    // NAGs — skip
    if (ch === "!" || ch === "?") {
      while (i < pgn.length && (pgn[i] === "!" || pgn[i] === "?")) i++;
      continue;
    }
    // SAN move or result
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
      const start = i;
      while (i < pgn.length && pgn[i] !== " " && pgn[i] !== "(" && pgn[i] !== ")" && pgn[i] !== "{") i++;
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
  {
    id: "scholars-mate",
    name: "Scholar's Mate",
    description: "Learn the classic four-move checkmate — and how to respond when black defends.",
    pgn: "1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6 (3...g6 4.Qf3) 4.Qxf7#",
  },
];

export function getOpening(id: string): Opening | undefined {
  return OPENINGS.find((o) => o.id === id);
}
