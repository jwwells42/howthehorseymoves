import type { BoardState, PieceKind, PieceColor, SquareId, PiecePlacement } from '$lib/logic/types';
import { boardToKey } from '$lib/logic/types';
import { getLegalMoves, isInCheck, isCheckmate, isStalemate } from '$lib/logic/attacks';
import { pickBotMove, type BotLevel } from '$lib/logic/bot';
import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';
import { playSound } from '$lib/state/sound';

export interface MoveRecord {
  san: string;
  from: SquareId;
  to: SquareId;
}

type GameResult = 'playing' | 'checkmate-white' | 'checkmate-black' | 'stalemate' | 'threefold' | 'fifty-move' | 'insufficient-material';

const STARTING_POSITION: PiecePlacement[] = [
  // White
  { piece: 'R', color: 'w', square: 'a1' }, { piece: 'N', color: 'w', square: 'b1' },
  { piece: 'B', color: 'w', square: 'c1' }, { piece: 'Q', color: 'w', square: 'd1' },
  { piece: 'K', color: 'w', square: 'e1' }, { piece: 'B', color: 'w', square: 'f1' },
  { piece: 'N', color: 'w', square: 'g1' }, { piece: 'R', color: 'w', square: 'h1' },
  { piece: 'P', color: 'w', square: 'a2' }, { piece: 'P', color: 'w', square: 'b2' },
  { piece: 'P', color: 'w', square: 'c2' }, { piece: 'P', color: 'w', square: 'd2' },
  { piece: 'P', color: 'w', square: 'e2' }, { piece: 'P', color: 'w', square: 'f2' },
  { piece: 'P', color: 'w', square: 'g2' }, { piece: 'P', color: 'w', square: 'h2' },
  // Black
  { piece: 'R', color: 'b', square: 'a8' }, { piece: 'N', color: 'b', square: 'b8' },
  { piece: 'B', color: 'b', square: 'c8' }, { piece: 'Q', color: 'b', square: 'd8' },
  { piece: 'K', color: 'b', square: 'e8' }, { piece: 'B', color: 'b', square: 'f8' },
  { piece: 'N', color: 'b', square: 'g8' }, { piece: 'R', color: 'b', square: 'h8' },
  { piece: 'P', color: 'b', square: 'a7' }, { piece: 'P', color: 'b', square: 'b7' },
  { piece: 'P', color: 'b', square: 'c7' }, { piece: 'P', color: 'b', square: 'd7' },
  { piece: 'P', color: 'b', square: 'e7' }, { piece: 'P', color: 'b', square: 'f7' },
  { piece: 'P', color: 'b', square: 'g7' }, { piece: 'P', color: 'b', square: 'h7' },
];

function buildStartingBoard(): BoardState {
  const pieces = new Map<SquareId, { piece: PieceKind; color: PieceColor }>();
  for (const p of STARTING_POSITION) {
    pieces.set(p.square, { piece: p.piece, color: p.color });
  }
  return { pieces, castlingRights: { K: true, Q: true, k: true, q: true } };
}

/** Promote pawn if it reached the last rank. */
function applyPromotion(pieces: Map<SquareId, { piece: PieceKind; color: PieceColor }>, sq: SquareId, promoteTo: PieceKind = 'Q') {
  const p = pieces.get(sq);
  if (!p || p.piece !== 'P') return;
  const rank = sq[1];
  if ((p.color === 'w' && rank === '8') || (p.color === 'b' && rank === '1')) {
    pieces.set(sq, { piece: promoteTo, color: p.color });
  }
}

/** Check if position has insufficient mating material. */
function isInsufficientMaterial(board: BoardState): boolean {
  const nonKings: { piece: PieceKind; color: PieceColor; square: SquareId }[] = [];
  for (const [sq, p] of board.pieces) {
    if (p.piece !== 'K') nonKings.push({ piece: p.piece, color: p.color, square: sq });
  }
  // K vs K
  if (nonKings.length === 0) return true;
  // K+B vs K or K+N vs K
  if (nonKings.length === 1 && (nonKings[0].piece === 'B' || nonKings[0].piece === 'N')) return true;
  // K+B vs K+B with same-colored bishops (opposite-color bishops can technically mate)
  if (nonKings.length === 2 &&
      nonKings[0].piece === 'B' && nonKings[1].piece === 'B' &&
      nonKings[0].color !== nonKings[1].color) {
    const sqColor = (sq: SquareId) => ((sq.charCodeAt(0) - 97) + parseInt(sq[1])) % 2;
    return sqColor(nonKings[0].square) === sqColor(nonKings[1].square);
  }
  return false;
}

/** Generate SAN (Standard Algebraic Notation) for a move. */
function toSan(
  boardBefore: BoardState,
  from: SquareId,
  to: SquareId,
  color: PieceColor,
  boardAfter: BoardState,
  promotionPiece?: PieceKind,
): string {
  const piece = boardBefore.pieces.get(from)!;
  const kind = piece.piece;
  const opponent: PieceColor = color === 'w' ? 'b' : 'w';

  // Castling
  if (kind === 'K') {
    const fromFile = from.charCodeAt(0);
    const toFile = to.charCodeAt(0);
    if (toFile - fromFile === 2) {
      const suffix = isCheckmate(opponent, boardAfter) ? '#' : isInCheck(opponent, boardAfter) ? '+' : '';
      return 'O-O' + suffix;
    }
    if (fromFile - toFile === 2) {
      const suffix = isCheckmate(opponent, boardAfter) ? '#' : isInCheck(opponent, boardAfter) ? '+' : '';
      return 'O-O-O' + suffix;
    }
  }

  const isCapture = !!boardBefore.pieces.get(to) || (kind === 'P' && to === boardBefore.enPassantSquare);

  let san = '';

  if (kind === 'P') {
    if (isCapture) san += from[0]; // file of departure for pawn captures
  } else {
    san += kind;
    // Disambiguation: check if another piece of the same type can also reach `to`
    const ambiguous: SquareId[] = [];
    for (const [sq, p] of boardBefore.pieces) {
      if (sq === from || p.piece !== kind || p.color !== color) continue;
      const legal = getLegalMoves(sq, boardBefore, color);
      if (legal.includes(to)) ambiguous.push(sq);
    }
    if (ambiguous.length > 0) {
      const sameFile = ambiguous.some(sq => sq[0] === from[0]);
      const sameRank = ambiguous.some(sq => sq[1] === from[1]);
      if (!sameFile) san += from[0];
      else if (!sameRank) san += from[1];
      else san += from;
    }
  }

  if (isCapture) san += 'x';
  san += to;

  // Promotion
  if (kind === 'P') {
    const rank = to[1];
    if ((color === 'w' && rank === '8') || (color === 'b' && rank === '1')) {
      san += `=${promotionPiece ?? 'Q'}`;
    }
  }

  // Check / checkmate
  if (isCheckmate(opponent, boardAfter)) san += '#';
  else if (isInCheck(opponent, boardAfter)) san += '+';

  return san;
}

export function createGameState(botLevel: BotLevel = 'random') {
  const startBoard = buildStartingBoard();
  let board = $state<BoardState>(startBoard);
  let selectedSquare = $state<SquareId | null>(null);
  let result = $state<GameResult>('playing');
  let inCheck = $state(false);
  let botSlide = $state<SlideAnimation | null>(null);
  let waitingForBot = $state(false);
  let moveHistory = $state<MoveRecord[]>([]);
  let positions = $state<BoardState[]>([startBoard]);
  let positionCounts = $state<Map<string, number>>(new Map([[boardToKey(startBoard, 'w'), 1]]));
  let halfmoveClock = $state(0);
  let pendingPromotion = $state<{ from: SquareId; to: SquareId } | null>(null);

  let validMoves = $derived.by(() => {
    if (!selectedSquare) return [];
    return getLegalMoves(selectedSquare, board, 'w');
  });

  function checkGameOver(boardState: BoardState, colorToMove: PieceColor): GameResult {
    if (isCheckmate(colorToMove, boardState)) {
      return colorToMove === 'w' ? 'checkmate-black' : 'checkmate-white';
    }
    if (isStalemate(colorToMove, boardState)) {
      return 'stalemate';
    }
    const key = boardToKey(boardState, colorToMove);
    const count = positionCounts.get(key) ?? 0;
    positionCounts.set(key, count + 1);
    if (count + 1 >= 3) {
      return 'threefold';
    }
    if (halfmoveClock >= 100) {
      return 'fifty-move';
    }
    if (isInsufficientMaterial(boardState)) {
      return 'insufficient-material';
    }
    return 'playing';
  }

  function makeBotMove(currentBoard: BoardState) {
    waitingForBot = true;

    setTimeout(() => {
      const move = pickBotMove(currentBoard, 'b', botLevel);
      if (!move) return;

      const newPieces = new Map(currentBoard.pieces);
      const piece = newPieces.get(move.from)!;
      const botCapture = !!currentBoard.pieces.get(move.to) || (piece.piece === 'P' && move.to === currentBoard.enPassantSquare);
      newPieces.delete(move.from);
      newPieces.set(move.to, piece);
      applyPromotion(newPieces, move.to);

      // Handle bot en passant capture
      if (piece.piece === 'P' && move.to === currentBoard.enPassantSquare) {
        const direction = piece.color === 'w' ? 1 : -1;
        const capturedRank = String(parseInt(move.to[1]) - direction);
        const capturedSq = `${move.to[0]}${capturedRank}` as SquareId;
        newPieces.delete(capturedSq);
      }

      // Handle bot castling rook movement
      if (piece.piece === 'K') {
        const fromFile = move.from.charCodeAt(0);
        const toFile = move.to.charCodeAt(0);
        if (Math.abs(toFile - fromFile) === 2) {
          const rank = move.to[1];
          if (toFile > fromFile) {
            const rook = newPieces.get(`h${rank}` as SquareId);
            if (rook) { newPieces.delete(`h${rank}` as SquareId); newPieces.set(`f${rank}` as SquareId, rook); }
          } else {
            const rook = newPieces.get(`a${rank}` as SquareId);
            if (rook) { newPieces.delete(`a${rank}` as SquareId); newPieces.set(`d${rank}` as SquareId, rook); }
          }
        }
      }

      // Compute en passant square for bot's pawn push
      let enPassantSquare: SquareId | undefined;
      if (piece.piece === 'P') {
        const fromRank = parseInt(move.from[1]);
        const toRank = parseInt(move.to[1]);
        if (Math.abs(toRank - fromRank) === 2) {
          const epRank = String((fromRank + toRank) / 2);
          enPassantSquare = `${move.from[0]}${epRank}` as SquareId;
        }
      }

      // Update castling rights for bot move
      const rights = currentBoard.castlingRights ? { ...currentBoard.castlingRights } : undefined;
      if (rights) {
        if (piece.piece === 'K') {
          rights.k = false; rights.q = false;
        }
        if (piece.piece === 'R') {
          if (move.from === 'a8') rights.q = false;
          if (move.from === 'h8') rights.k = false;
        }
        if (move.to === 'a1') rights.Q = false;
        if (move.to === 'h1') rights.K = false;
      }

      botSlide = {
        piece: piece.piece,
        color: piece.color,
        from: move.from,
        to: move.to,
      };

      // Update halfmove clock
      if (piece.piece === 'P' || botCapture) {
        halfmoveClock = 0;
      } else {
        halfmoveClock = halfmoveClock + 1;
      }

      const newBoard: BoardState = { pieces: newPieces, castlingRights: rights, enPassantSquare };
      const san = toSan(currentBoard, move.from, move.to, 'b', newBoard);
      moveHistory = [...moveHistory, { san, from: move.from, to: move.to }];
      positions = [...positions, newBoard];
      board = newBoard;
      playSound('move');

      const gameResult = checkGameOver(newBoard, 'w');
      if (gameResult !== 'playing') {
        result = gameResult;
        if (gameResult === 'checkmate-white') playSound('stars');
      }
      inCheck = gameResult === 'playing' && isInCheck('w', newBoard);

      setTimeout(() => {
        botSlide = null;
        waitingForBot = false;
      }, 500);
    }, 400);
  }

  function executeMove(from: SquareId, to: SquareId, promotionPiece?: PieceKind) {
    const piece = board.pieces.get(from)!;

    // Detect promotion — ask user for piece choice
    if (piece.piece === 'P' && !promotionPiece) {
      const rank = to[1];
      if ((piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1')) {
        pendingPromotion = { from, to };
        selectedSquare = null;
        return;
      }
    }

    const isCapture = !!board.pieces.get(to) || (piece.piece === 'P' && to === board.enPassantSquare);

    const newPieces = new Map(board.pieces);
    newPieces.delete(from);
    if (promotionPiece) {
      newPieces.set(to, { piece: promotionPiece, color: piece.color });
    } else {
      newPieces.set(to, piece);
    }

    // Handle castling rook movement
    if (piece.piece === 'K') {
      const fromFile = from.charCodeAt(0);
      const toFile = to.charCodeAt(0);
      if (Math.abs(toFile - fromFile) === 2) {
        const rank = to[1];
        if (toFile > fromFile) {
          const rook = newPieces.get(`h${rank}` as SquareId);
          if (rook) { newPieces.delete(`h${rank}` as SquareId); newPieces.set(`f${rank}` as SquareId, rook); }
        } else {
          const rook = newPieces.get(`a${rank}` as SquareId);
          if (rook) { newPieces.delete(`a${rank}` as SquareId); newPieces.set(`d${rank}` as SquareId, rook); }
        }
      }
    }

    // Handle en passant capture
    if (piece.piece === 'P' && to === board.enPassantSquare) {
      const direction = piece.color === 'w' ? 1 : -1;
      const capturedRank = String(parseInt(to[1]) - direction);
      const capturedSq = `${to[0]}${capturedRank}` as SquareId;
      newPieces.delete(capturedSq);
    }

    // Compute en passant square for next move
    let enPassantSquare: SquareId | undefined;
    if (piece.piece === 'P') {
      const fromRank = parseInt(from[1]);
      const toRank = parseInt(to[1]);
      if (Math.abs(toRank - fromRank) === 2) {
        const epRank = String((fromRank + toRank) / 2);
        enPassantSquare = `${from[0]}${epRank}` as SquareId;
      }
    }

    // Update castling rights
    const rights = board.castlingRights ? { ...board.castlingRights } : undefined;
    if (rights) {
      if (piece.piece === 'K') {
        if (piece.color === 'w') { rights.K = false; rights.Q = false; }
        else { rights.k = false; rights.q = false; }
      }
      if (from === 'a1' || to === 'a1') rights.Q = false;
      if (from === 'h1' || to === 'h1') rights.K = false;
      if (from === 'a8' || to === 'a8') rights.q = false;
      if (from === 'h8' || to === 'h8') rights.k = false;
    }

    // Update halfmove clock
    if (piece.piece === 'P' || isCapture) {
      halfmoveClock = 0;
    } else {
      halfmoveClock = halfmoveClock + 1;
    }

    const newBoard: BoardState = { pieces: newPieces, castlingRights: rights, enPassantSquare };
    const san = toSan(board, from, to, 'w', newBoard, promotionPiece);
    moveHistory = [...moveHistory, { san, from, to }];
    positions = [...positions, newBoard];
    board = newBoard;
    selectedSquare = null;
    playSound('move');

    const gameResult = checkGameOver(newBoard, 'b');
    if (gameResult !== 'playing') {
      result = gameResult;
      inCheck = false;
      if (gameResult === 'checkmate-white') playSound('stars');
      return;
    }

    inCheck = false;
    makeBotMove(newBoard);
  }

  function completePromotion(promoteTo: PieceKind) {
    if (!pendingPromotion) return;
    const { from, to } = pendingPromotion;
    pendingPromotion = null;
    executeMove(from, to, promoteTo);
  }

  function handleSquareClick(sq: SquareId) {
    if (result !== 'playing' || waitingForBot || pendingPromotion) return;

    if (!selectedSquare) {
      const p = board.pieces.get(sq);
      if (p && p.color === 'w') {
        selectedSquare = sq;
      }
      return;
    }

    if (sq === selectedSquare) {
      selectedSquare = null;
      return;
    }

    const target = board.pieces.get(sq);
    if (target && target.color === 'w') {
      selectedSquare = sq;
      return;
    }

    const legal = getLegalMoves(selectedSquare, board, 'w');
    if (!legal.includes(sq)) {
      selectedSquare = null;
      return;
    }

    executeMove(selectedSquare, sq);
  }

  function handleDrop(from: SquareId, to: SquareId) {
    if (result !== 'playing' || waitingForBot || pendingPromotion || from === to) return;
    const p = board.pieces.get(from);
    if (!p || p.color !== 'w') return;
    const legal = getLegalMoves(from, board, 'w');
    if (!legal.includes(to)) return;
    executeMove(from, to);
  }

  function newGame() {
    const fresh = buildStartingBoard();
    board = fresh;
    selectedSquare = null;
    result = 'playing';
    inCheck = false;
    botSlide = null;
    waitingForBot = false;
    moveHistory = [];
    positions = [fresh];
    positionCounts = new Map([[boardToKey(fresh, 'w'), 1]]);
    halfmoveClock = 0;
    pendingPromotion = null;
  }

  return {
    get board() { return board; },
    get selectedSquare() { return selectedSquare; },
    get validMoves() { return validMoves; },
    get result() { return result; },
    get inCheck() { return inCheck; },
    get botSlide() { return botSlide; },
    get waitingForBot() { return waitingForBot; },
    get moveHistory() { return moveHistory; },
    get positions() { return positions; },
    get pendingPromotion() { return pendingPromotion; },
    handleSquareClick,
    handleDrop,
    completePromotion,
    newGame,
  };
}
