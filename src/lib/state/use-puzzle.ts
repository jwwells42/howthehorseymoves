"use client";

import { useState, useCallback, useMemo } from "react";
import { BoardState, SquareId, createBoardState, squareToCoords, coordsToSquare } from "@/lib/logic/types";
import { getValidMoves } from "@/lib/logic/moves";
import { isCheckmate, isStalemate } from "@/lib/logic/attacks";
import { Puzzle } from "@/lib/puzzles/types";
import { useProgress } from "./progress-context";

export function usePuzzle(puzzle: Puzzle) {
  const { completePuzzle } = useProgress();
  const isCheckmateMode = puzzle.mode === "checkmate";

  const buildBoard = useCallback(() => {
    return createBoardState(puzzle.setup, {
      enPassantSquare: puzzle.enPassantSquare,
      castlingRights: puzzle.castlingRights,
    });
  }, [puzzle.setup, puzzle.enPassantSquare, puzzle.castlingRights]);

  const [board, setBoard] = useState<BoardState>(buildBoard);
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [reachedTargets, setReachedTargets] = useState<SquareId[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [stalemateTrigger, setStalemateTrigger] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);

  const validMoves = useMemo(() => {
    if (!selectedSquare) return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== "w" || p.piece !== puzzle.piece) return [];
    return getValidMoves(p.piece, selectedSquare, board, "w");
  }, [selectedSquare, board, puzzle.piece]);

  const calculateStars = useCallback(
    (moves: number) => {
      const { three, two, one } = puzzle.starThresholds;
      if (moves <= three) return 3;
      if (moves <= two) return 2;
      if (moves <= one) return 1;
      return 1; // always at least 1 star on completion
    },
    [puzzle.starThresholds]
  );

  const stars = useMemo(() => calculateStars(moveCount), [calculateStars, moveCount]);

  // Apply special move side-effects (en passant capture, castling rook)
  const applyMoveEffects = useCallback(
    (pieces: Map<SquareId, { piece: string; color: string }>, from: SquareId, to: SquareId, movedPiece: { piece: string; color: string }) => {
      // En passant: pawn moves diagonally to empty square = captured the pawn behind
      if (movedPiece.piece === "P" && to === board.enPassantSquare) {
        const [, fromY] = squareToCoords(from);
        const [toX] = squareToCoords(to);
        const capturedSq = coordsToSquare(toX, fromY);
        if (capturedSq) pieces.delete(capturedSq);
      }

      // Castling: king moves 2 squares = also move the rook
      if (movedPiece.piece === "K") {
        const [fx] = squareToCoords(from);
        const [tx] = squareToCoords(to);
        if (Math.abs(tx - fx) === 2) {
          // Kingside
          if (tx > fx) {
            const rookFrom = `h${to[1]}` as SquareId;
            const rookTo = `f${to[1]}` as SquareId;
            const rook = pieces.get(rookFrom);
            if (rook) { pieces.delete(rookFrom); pieces.set(rookTo, rook); }
          }
          // Queenside
          else {
            const rookFrom = `a${to[1]}` as SquareId;
            const rookTo = `d${to[1]}` as SquareId;
            const rook = pieces.get(rookFrom);
            if (rook) { pieces.delete(rookFrom); pieces.set(rookTo, rook); }
          }
        }
      }
    },
    [board.enPassantSquare]
  );

  // Execute a validated move from `from` to `to`
  const executeMove = useCallback(
    (from: SquareId, to: SquareId) => {
      const newPieces = new Map(board.pieces);
      const piece = newPieces.get(from)!;
      newPieces.delete(from);
      newPieces.set(to, piece);

      // Apply en passant / castling side-effects
      applyMoveEffects(newPieces as Map<SquareId, { piece: string; color: string }>, from, to, piece as { piece: string; color: string });

      // Clear en passant and castling rights after move (they're one-shot in puzzles)
      const newBoard: BoardState = { pieces: newPieces };
      setBoard(newBoard);
      setSelectedSquare(null);
      const newMoveCount = moveCount + 1;
      setMoveCount(newMoveCount);

      if (isCheckmateMode) {
        // Apply opponent response if defined
        let boardAfterOpponent = newBoard;
        const response = puzzle.opponentMoves?.[to];
        if (response) {
          const oppPieces = new Map(newBoard.pieces);
          // Find which opponent piece should move to the response square
          // The key format is the player's destination; value is "from:to" encoded as just the destination
          // We need to find the opponent piece that can reach the response square
          // For simplicity, find the black king (most common responder in check puzzles)
          for (const [sq, p] of oppPieces) {
            if (p.color === "b" && p.piece === "K") {
              oppPieces.delete(sq);
              oppPieces.set(response, p);
              break;
            }
          }
          boardAfterOpponent = { pieces: oppPieces };
          setBoard(boardAfterOpponent);
        }

        // Check for checkmate / stalemate
        if (isCheckmate("b", boardAfterOpponent)) {
          setIsComplete(true);
          const finalStars = calculateStars(newMoveCount);
          completePuzzle(puzzle.id, finalStars, newMoveCount);
        } else if (isStalemate("b", boardAfterOpponent)) {
          setStalemateTrigger(true);
        }
      } else {
        // Reach-target mode
        if (puzzle.targets.includes(to) && !reachedTargets.includes(to)) {
          const newReached = [...reachedTargets, to];
          setReachedTargets(newReached);

          if (newReached.length === puzzle.targets.length) {
            setIsComplete(true);
            const finalStars = calculateStars(newMoveCount);
            completePuzzle(puzzle.id, finalStars, newMoveCount);
          }
        }
      }
    },
    [board, moveCount, reachedTargets, puzzle, calculateStars, completePuzzle, isCheckmateMode, applyMoveEffects]
  );

  const handleSquareClick = useCallback(
    (sq: SquareId) => {
      if (isComplete) return;

      if (!selectedSquare) {
        const p = board.pieces.get(sq);
        if (p && p.color === "w" && p.piece === puzzle.piece) {
          setSelectedSquare(sq);
        }
        return;
      }

      if (sq === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      const p = board.pieces.get(selectedSquare);
      if (!p) return;
      const moves = getValidMoves(p.piece, selectedSquare, board, "w");
      if (!moves.includes(sq)) {
        const target = board.pieces.get(sq);
        if (target && target.color === "w" && target.piece === puzzle.piece) {
          setSelectedSquare(sq);
        } else {
          setSelectedSquare(null);
        }
        return;
      }

      executeMove(selectedSquare, sq);
    },
    [board, selectedSquare, isComplete, puzzle, executeMove]
  );

  // Drag-and-drop: validate and execute a move from `from` to `to`
  const handleDrop = useCallback(
    (from: SquareId, to: SquareId) => {
      if (isComplete || from === to) return;
      const p = board.pieces.get(from);
      if (!p || p.color !== "w" || p.piece !== puzzle.piece) return;
      const moves = getValidMoves(p.piece, from, board, "w");
      if (!moves.includes(to)) return;
      executeMove(from, to);
    },
    [board, isComplete, puzzle, executeMove]
  );

  const reset = useCallback(() => {
    setBoard(buildBoard());
    setSelectedSquare(null);
    setMoveCount(0);
    setReachedTargets([]);
    setIsComplete(false);
    setStalemateTrigger(false);
    setCurrentHintIndex(-1);
  }, [buildBoard]);

  const showHint = useCallback(() => {
    if (puzzle.hints && currentHintIndex < puzzle.hints.length - 1) {
      setCurrentHintIndex((prev) => prev + 1);
    }
  }, [puzzle.hints, currentHintIndex]);

  return {
    board,
    selectedSquare,
    validMoves,
    reachedTargets,
    moveCount,
    isComplete,
    stalemateTrigger,
    stars,
    currentHintIndex,
    handleSquareClick,
    handleDrop,
    reset,
    showHint,
  };
}
