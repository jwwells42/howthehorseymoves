"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { BoardState, SquareId, createBoardState } from "@/lib/logic/types";
import { getValidMoves } from "@/lib/logic/moves";
import { Puzzle } from "@/lib/puzzles/types";
import { useProgress } from "./progress-context";

export function usePuzzle(puzzle: Puzzle) {
  const { completePuzzle } = useProgress();
  const [board, setBoard] = useState<BoardState>(() => createBoardState(puzzle.setup));
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [reachedTargets, setReachedTargets] = useState<SquareId[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);

  // Find the player piece (white piece matching puzzle.piece)
  const playerSquare = useMemo(() => {
    for (const [sq, p] of board.pieces) {
      if (p.piece === puzzle.piece && p.color === "w") return sq;
    }
    return null;
  }, [board, puzzle.piece]);

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

  // Execute a validated move from `from` to `to`
  const executeMove = useCallback(
    (from: SquareId, to: SquareId) => {
      const newPieces = new Map(board.pieces);
      const piece = newPieces.get(from)!;
      newPieces.delete(from);
      newPieces.set(to, piece);
      setBoard({ pieces: newPieces });
      setSelectedSquare(null);
      const newMoveCount = moveCount + 1;
      setMoveCount(newMoveCount);

      if (puzzle.targets.includes(to) && !reachedTargets.includes(to)) {
        const newReached = [...reachedTargets, to];
        setReachedTargets(newReached);

        if (newReached.length === puzzle.targets.length) {
          setIsComplete(true);
          const finalStars = calculateStars(newMoveCount);
          completePuzzle(puzzle.id, finalStars, newMoveCount);
        }
      }
    },
    [board, moveCount, reachedTargets, puzzle, calculateStars, completePuzzle]
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
    setBoard(createBoardState(puzzle.setup));
    setSelectedSquare(null);
    setMoveCount(0);
    setReachedTargets([]);
    setIsComplete(false);
    setCurrentHintIndex(-1);
  }, [puzzle.setup]);

  // Reset when puzzle changes
  useEffect(() => {
    reset();
  }, [puzzle.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    stars,
    currentHintIndex,
    handleSquareClick,
    handleDrop,
    reset,
    showHint,
  };
}
