"use client";

import { useState, useCallback, useMemo } from "react";
import { BoardState, PieceKind, PieceColor, SquareId, PiecePlacement } from "@/lib/logic/types";
import { getLegalMoves, isInCheck, isCheckmate, isStalemate } from "@/lib/logic/attacks";
import { pickBotMove, BotLevel } from "@/lib/logic/bot";
import type { SlideAnimation } from "./use-puzzle";

type GameResult = "playing" | "checkmate-white" | "checkmate-black" | "stalemate";

const STARTING_POSITION: PiecePlacement[] = [
  // White
  { piece: "R", color: "w", square: "a1" }, { piece: "N", color: "w", square: "b1" },
  { piece: "B", color: "w", square: "c1" }, { piece: "Q", color: "w", square: "d1" },
  { piece: "K", color: "w", square: "e1" }, { piece: "B", color: "w", square: "f1" },
  { piece: "N", color: "w", square: "g1" }, { piece: "R", color: "w", square: "h1" },
  { piece: "P", color: "w", square: "a2" }, { piece: "P", color: "w", square: "b2" },
  { piece: "P", color: "w", square: "c2" }, { piece: "P", color: "w", square: "d2" },
  { piece: "P", color: "w", square: "e2" }, { piece: "P", color: "w", square: "f2" },
  { piece: "P", color: "w", square: "g2" }, { piece: "P", color: "w", square: "h2" },
  // Black
  { piece: "R", color: "b", square: "a8" }, { piece: "N", color: "b", square: "b8" },
  { piece: "B", color: "b", square: "c8" }, { piece: "Q", color: "b", square: "d8" },
  { piece: "K", color: "b", square: "e8" }, { piece: "B", color: "b", square: "f8" },
  { piece: "N", color: "b", square: "g8" }, { piece: "R", color: "b", square: "h8" },
  { piece: "P", color: "b", square: "a7" }, { piece: "P", color: "b", square: "b7" },
  { piece: "P", color: "b", square: "c7" }, { piece: "P", color: "b", square: "d7" },
  { piece: "P", color: "b", square: "e7" }, { piece: "P", color: "b", square: "f7" },
  { piece: "P", color: "b", square: "g7" }, { piece: "P", color: "b", square: "h7" },
];

function buildStartingBoard(): BoardState {
  const pieces = new Map<SquareId, { piece: PieceKind; color: PieceColor }>();
  for (const p of STARTING_POSITION) {
    pieces.set(p.square, { piece: p.piece, color: p.color });
  }
  return { pieces, castlingRights: { K: true, Q: true, k: true, q: true } };
}

/** Auto-promote pawn to queen if it reaches the last rank. */
function applyPromotion(pieces: Map<SquareId, { piece: PieceKind; color: PieceColor }>, sq: SquareId) {
  const p = pieces.get(sq);
  if (!p || p.piece !== "P") return;
  const rank = sq[1];
  if ((p.color === "w" && rank === "8") || (p.color === "b" && rank === "1")) {
    pieces.set(sq, { piece: "Q", color: p.color });
  }
}

export function useGame(botLevel: BotLevel = "random") {
  const [board, setBoard] = useState<BoardState>(buildStartingBoard);
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const [result, setResult] = useState<GameResult>("playing");
  const [inCheck, setInCheck] = useState(false);
  const [botSlide, setBotSlide] = useState<SlideAnimation | null>(null);
  const [waitingForBot, setWaitingForBot] = useState(false);

  const validMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return getLegalMoves(selectedSquare, board, "w");
  }, [selectedSquare, board]);

  const checkGameOver = useCallback((boardState: BoardState, colorToMove: PieceColor): GameResult => {
    if (isCheckmate(colorToMove, boardState)) {
      return colorToMove === "w" ? "checkmate-black" : "checkmate-white";
    }
    if (isStalemate(colorToMove, boardState)) {
      return "stalemate";
    }
    return "playing";
  }, []);

  const makeBotMove = useCallback((currentBoard: BoardState) => {
    setWaitingForBot(true);

    setTimeout(() => {
      const move = pickBotMove(currentBoard, "b", botLevel);
      if (!move) return; // already handled by checkGameOver
      const newPieces = new Map(currentBoard.pieces);
      const piece = newPieces.get(move.from)!;
      newPieces.delete(move.from);
      newPieces.set(move.to, piece);
      applyPromotion(newPieces, move.to);

      // Set up slide animation
      setBotSlide({
        piece: piece.piece,
        color: piece.color,
        from: move.from,
        to: move.to,
      });

      const newBoard: BoardState = { pieces: newPieces, castlingRights: currentBoard.castlingRights };
      setBoard(newBoard);

      // Check game state after bot move
      const gameResult = checkGameOver(newBoard, "w");
      if (gameResult !== "playing") {
        setResult(gameResult);
      }
      setInCheck(gameResult === "playing" && isInCheck("w", newBoard));

      // Clear animation
      setTimeout(() => {
        setBotSlide(null);
        setWaitingForBot(false);
      }, 500);
    }, 400);
  }, [checkGameOver, botLevel]);

  const executeMove = useCallback(
    (from: SquareId, to: SquareId) => {
      const newPieces = new Map(board.pieces);
      const piece = newPieces.get(from)!;
      newPieces.delete(from);
      newPieces.set(to, piece);
      applyPromotion(newPieces, to);

      // Handle castling rook movement
      if (piece.piece === "K") {
        const fromFile = from.charCodeAt(0);
        const toFile = to.charCodeAt(0);
        if (Math.abs(toFile - fromFile) === 2) {
          const rank = to[1];
          if (toFile > fromFile) {
            // Kingside
            const rook = newPieces.get(`h${rank}` as SquareId);
            if (rook) { newPieces.delete(`h${rank}` as SquareId); newPieces.set(`f${rank}` as SquareId, rook); }
          } else {
            // Queenside
            const rook = newPieces.get(`a${rank}` as SquareId);
            if (rook) { newPieces.delete(`a${rank}` as SquareId); newPieces.set(`d${rank}` as SquareId, rook); }
          }
        }
      }

      // Update castling rights
      const rights = board.castlingRights ? { ...board.castlingRights } : undefined;
      if (rights) {
        if (piece.piece === "K") {
          rights.K = false; rights.Q = false;
        }
        if (from === "a1" || to === "a1") rights.Q = false;
        if (from === "h1" || to === "h1") rights.K = false;
        if (from === "a8" || to === "a8") rights.q = false;
        if (from === "h8" || to === "h8") rights.k = false;
      }

      const newBoard: BoardState = { pieces: newPieces, castlingRights: rights };
      setBoard(newBoard);
      setSelectedSquare(null);

      // Check if game is over after player move
      const gameResult = checkGameOver(newBoard, "b");
      if (gameResult !== "playing") {
        setResult(gameResult);
        setInCheck(false);
        return;
      }

      setInCheck(false);
      makeBotMove(newBoard);
    },
    [board, checkGameOver, makeBotMove]
  );

  const handleSquareClick = useCallback(
    (sq: SquareId) => {
      if (result !== "playing" || waitingForBot) return;

      if (!selectedSquare) {
        const p = board.pieces.get(sq);
        if (p && p.color === "w") {
          setSelectedSquare(sq);
        }
        return;
      }

      if (sq === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      // Check if clicking another own piece
      const target = board.pieces.get(sq);
      if (target && target.color === "w") {
        setSelectedSquare(sq);
        return;
      }

      // Try to move
      const legal = getLegalMoves(selectedSquare, board, "w");
      if (!legal.includes(sq)) {
        setSelectedSquare(null);
        return;
      }

      executeMove(selectedSquare, sq);
    },
    [board, selectedSquare, result, waitingForBot, executeMove]
  );

  const handleDrop = useCallback(
    (from: SquareId, to: SquareId) => {
      if (result !== "playing" || waitingForBot || from === to) return;
      const p = board.pieces.get(from);
      if (!p || p.color !== "w") return;
      const legal = getLegalMoves(from, board, "w");
      if (!legal.includes(to)) return;
      executeMove(from, to);
    },
    [board, result, waitingForBot, executeMove]
  );

  const newGame = useCallback(() => {
    setBoard(buildStartingBoard());
    setSelectedSquare(null);
    setResult("playing");
    setInCheck(false);
    setBotSlide(null);
    setWaitingForBot(false);
  }, []);

  return {
    board,
    selectedSquare,
    validMoves,
    result,
    inCheck,
    botSlide,
    waitingForBot,
    handleSquareClick,
    handleDrop,
    newGame,
  };
}
