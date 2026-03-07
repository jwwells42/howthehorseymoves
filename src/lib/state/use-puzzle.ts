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

  const handleSquareClick = useCallback(
    (sq: SquareId) => {
      if (isComplete) return;

      // If no piece selected, try to select the player piece
      if (!selectedSquare) {
        const p = board.pieces.get(sq);
        if (p && p.color === "w" && p.piece === puzzle.piece) {
          setSelectedSquare(sq);
        }
        return;
      }

      // Clicking the same square deselects
      if (sq === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      // Check if it's a valid move
      const p = board.pieces.get(selectedSquare);
      if (!p) return;
      const moves = getValidMoves(p.piece, selectedSquare, board, "w");
      if (!moves.includes(sq)) {
        // Try selecting a different player piece
        const target = board.pieces.get(sq);
        if (target && target.color === "w" && target.piece === puzzle.piece) {
          setSelectedSquare(sq);
        } else {
          setSelectedSquare(null);
        }
        return;
      }

      // Execute the move
      const newPieces = new Map(board.pieces);
      const piece = newPieces.get(selectedSquare)!;
      newPieces.delete(selectedSquare);
      newPieces.set(sq, piece);
      setBoard({ pieces: newPieces });
      setSelectedSquare(null);
      const newMoveCount = moveCount + 1;
      setMoveCount(newMoveCount);

      // Check if target reached
      if (puzzle.targets.includes(sq) && !reachedTargets.includes(sq)) {
        const newReached = [...reachedTargets, sq];
        setReachedTargets(newReached);

        if (newReached.length === puzzle.targets.length) {
          setIsComplete(true);
          const finalStars = calculateStars(newMoveCount);
          completePuzzle(puzzle.id, finalStars, newMoveCount);
        }
      }
    },
    [board, selectedSquare, isComplete, moveCount, reachedTargets, puzzle, calculateStars, completePuzzle]
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
    reset,
    showHint,
  };
}
