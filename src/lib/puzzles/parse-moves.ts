import type { BoardState, PieceKind, PieceColor, SquareId } from '$lib/logic/types';
import { parseFen, createBoardState } from '$lib/logic/types';
import { parseSan, applyMove } from '$lib/logic/pgn';
import type { Arrow } from '$lib/logic/pgn';
import { isCheckmate } from '$lib/logic/attacks';

export interface SquareHighlight {
  square: SquareId;
  color: string;
}

export interface MoveNode {
  san: string;
  from: SquareId;
  to: SquareId;
  promotion?: PieceKind;
  boardAfter: BoardState;
  color: PieceColor;
  children: MoveNode[];
  arrows?: Arrow[];
  highlights?: SquareHighlight[];
}

export interface MoveTree {
  root: BoardState;
  startColor: PieceColor;
  children: MoveNode[];
  whiteMovesCount: number;
  endsInCheckmate: boolean;
  playerPiece: PieceKind;
  initialArrows?: Arrow[];
  initialHighlights?: SquareHighlight[];
}

const ARROW_COLORS: Record<string, string> = {
  G: "#15803d",
  R: "#dc2626",
  Y: "#ca8a04",
  B: "#2563eb",
};

function parseAnnotations(comment: string): { arrows: Arrow[]; highlights: SquareHighlight[] } {
  const arrows: Arrow[] = [];
  const highlights: SquareHighlight[] = [];

  // [%cal Ge2e4,Rd7d5]
  comment.replace(/\[%cal\s+([^\]]+)\]/g, (_, spec: string) => {
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
  });

  // [%csl Rd3,Gf7]
  comment.replace(/\[%csl\s+([^\]]+)\]/g, (_, spec: string) => {
    for (const entry of spec.split(",")) {
      const e = entry.trim();
      if (e.length >= 3) {
        const colorCode = e[0].toUpperCase();
        const square = e.slice(1, 3) as SquareId;
        highlights.push({ square, color: ARROW_COLORS[colorCode] ?? ARROW_COLORS.G });
      }
    }
    return "";
  });

  return { arrows, highlights };
}

interface Token {
  type: 'move' | 'open' | 'close';
  san?: string;
  arrows?: Arrow[];
  highlights?: SquareHighlight[];
}

function tokenize(pgn: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let lastMoveIndex = -1;

  while (i < pgn.length) {
    const ch = pgn[i];

    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') { i++; continue; }

    if (ch === '(') { tokens.push({ type: 'open' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'close' }); i++; continue; }

    // Move numbers: digits + dots
    if (ch >= '0' && ch <= '9') {
      while (i < pgn.length && (pgn[i] >= '0' && pgn[i] <= '9' || pgn[i] === '.')) i++;
      while (i < pgn.length && pgn[i] === ' ') i++;
      continue;
    }

    // Comments
    if (ch === '{') {
      i++; // skip {
      const start = i;
      while (i < pgn.length && pgn[i] !== '}') i++;
      const comment = pgn.slice(start, i);
      i++; // skip }
      const { arrows, highlights } = parseAnnotations(comment);
      if (arrows.length > 0 || highlights.length > 0) {
        if (lastMoveIndex >= 0) {
          const last = tokens[lastMoveIndex];
          if (arrows.length > 0) last.arrows = [...(last.arrows ?? []), ...arrows];
          if (highlights.length > 0) last.highlights = [...(last.highlights ?? []), ...highlights];
        } else {
          // Pre-move annotations — store as a special initial token
          tokens.push({ type: 'move', san: '__initial__', arrows, highlights });
        }
      }
      continue;
    }

    // NAGs
    if (ch === '!' || ch === '?') {
      while (i < pgn.length && (pgn[i] === '!' || pgn[i] === '?')) i++;
      continue;
    }

    // SAN moves or results
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
      const start = i;
      while (i < pgn.length && pgn[i] !== ' ' && pgn[i] !== '(' && pgn[i] !== ')' && pgn[i] !== '{') i++;
      const token = pgn.slice(start, i);
      if (/^(1-0|0-1|\*)$/.test(token) || token.startsWith('1/2')) continue;
      tokens.push({ type: 'move', san: token });
      lastMoveIndex = tokens.length - 1;
      continue;
    }

    i++;
  }

  return tokens;
}

export function parsePuzzleMoves(pgn: string, fen: string): MoveTree {
  const { placements, castlingRights, enPassantSquare } = parseFen(fen);
  const root = createBoardState(placements, { castlingRights, enPassantSquare });

  const fenParts = fen.trim().split(/\s+/);
  const startColor: PieceColor = fenParts.length > 1 && fenParts[1] === 'b' ? 'b' : 'w';

  const tokens = tokenize(pgn);
  const tree: MoveTree = {
    root,
    startColor,
    children: [],
    whiteMovesCount: 0,
    endsInCheckmate: false,
    playerPiece: 'P',
  };

  interface ParseState {
    parentChildren: MoveNode[];
    board: BoardState;
    color: PieceColor;
  }

  let state: ParseState = { parentChildren: tree.children, board: root, color: startColor };
  let lastMoveState: ParseState = { ...state };
  const stack: { savedState: ParseState; savedLMS: ParseState }[] = [];

  let isFirstPlayerMove = true;
  let mainLineWhiteMoves = 0;
  let depth = 0;

  // Determine which color the student plays (first non-auto color in main line)
  // If starts with black move, student plays white (auto-plays black first)
  const studentColor: PieceColor = 'w';

  for (const token of tokens) {
    if (token.type === 'open') {
      stack.push({
        savedState: { parentChildren: state.parentChildren, board: state.board, color: state.color },
        savedLMS: { parentChildren: lastMoveState.parentChildren, board: lastMoveState.board, color: lastMoveState.color },
      });
      state = { parentChildren: lastMoveState.parentChildren, board: lastMoveState.board, color: lastMoveState.color };
      depth++;
    } else if (token.type === 'close') {
      const saved = stack.pop()!;
      state = saved.savedState;
      lastMoveState = saved.savedLMS;
      depth--;
    } else if (token.san) {
      // Handle pre-move annotations
      if (token.san === '__initial__') {
        if (token.arrows) tree.initialArrows = token.arrows;
        if (token.highlights) tree.initialHighlights = token.highlights;
        continue;
      }

      lastMoveState = { parentChildren: state.parentChildren, board: state.board, color: state.color };

      const resolved = parseSan(token.san, state.board, state.color);
      const newBoard = applyMove(state.board, resolved.from, resolved.to, resolved.promotion);

      const node: MoveNode = {
        san: token.san,
        from: resolved.from,
        to: resolved.to,
        promotion: resolved.promotion,
        boardAfter: newBoard,
        color: state.color,
        children: [],
      };
      if (token.arrows) node.arrows = token.arrows;
      if (token.highlights) node.highlights = token.highlights;

      state.parentChildren.push(node);

      // Track player piece from first student move
      if (isFirstPlayerMove && state.color === studentColor) {
        const piece = state.board.pieces.get(resolved.from);
        if (piece) tree.playerPiece = piece.piece;
        isFirstPlayerMove = false;
      }

      // Count white moves in main line
      if (depth === 0 && state.color === 'w') {
        mainLineWhiteMoves++;
      }

      state = {
        parentChildren: node.children,
        board: newBoard,
        color: state.color === 'w' ? 'b' : 'w',
      };
    }
  }

  tree.whiteMovesCount = mainLineWhiteMoves;

  // Check if main line ends in checkmate
  let current = tree.children;
  while (current.length > 0) {
    const node = current[0];
    if (node.children.length === 0) {
      const checkedColor: PieceColor = node.color === 'w' ? 'b' : 'w';
      tree.endsInCheckmate = isCheckmate(checkedColor, node.boardAfter);
      break;
    }
    current = node.children;
  }

  return tree;
}
