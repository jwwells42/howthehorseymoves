"use client";

import { useState, useCallback, useMemo } from "react";
import Board from "@/components/board/Board";
import PuzzleControls from "./PuzzleControls";
import StarRating from "./StarRating";
import SuccessOverlay from "./SuccessOverlay";
import { usePuzzle } from "@/lib/state/use-puzzle";
import { Puzzle } from "@/lib/puzzles/types";
import { SquareId } from "@/lib/logic/types";
import { getValidMoves } from "@/lib/logic/moves";

interface PuzzleShellProps {
  puzzle: Puzzle;
  onNext?: () => void;
}

export default function PuzzleShell({ puzzle, onNext }: PuzzleShellProps) {
  const {
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
  } = usePuzzle(puzzle);

  const [dragFrom, setDragFrom] = useState<SquareId | null>(null);

  const dragValidMoves = useMemo(() => {
    if (!dragFrom) return [];
    const p = board.pieces.get(dragFrom);
    if (!p || p.color !== "w" || p.piece !== puzzle.piece) return [];
    return getValidMoves(p.piece, dragFrom, board, "w");
  }, [dragFrom, board, puzzle.piece]);

  const onDragStart = useCallback((sq: SquareId) => {
    setDragFrom(sq);
  }, []);

  const onDragEnd = useCallback(() => {
    setDragFrom(null);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4 max-w-2xl mx-auto">
      {/* Instruction */}
      <div className="text-center">
        <h2 className="text-xl font-bold mb-1">{puzzle.title}</h2>
        <p className="text-gray-600 dark:text-gray-300">{puzzle.instruction}</p>
      </div>

      {/* Move counter */}
      <div className="text-sm text-gray-500">
        Moves: {moveCount}
        {puzzle.maxMoves && ` / ${puzzle.maxMoves}`}
      </div>

      {/* Board */}
      <div className="relative w-full flex justify-center">
        <Board
          board={board}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          targets={puzzle.targets}
          reachedTargets={reachedTargets}
          dragValidMoves={dragValidMoves}
          draggablePiece={puzzle.piece}
          onSquareClick={handleSquareClick}
          onDrop={handleDrop}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
        {isComplete && (
          <SuccessOverlay stars={stars} onNext={onNext} onRetry={reset} />
        )}
      </div>

      {/* Stalemate warning */}
      {stalemateTrigger && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3 text-red-800 dark:text-red-200 text-sm text-center">
          <strong>Stalemate!</strong> The opponent has no legal moves but isn&apos;t in check. That&apos;s a draw, not a win.
          <button onClick={reset} className="ml-2 underline font-medium">Try again</button>
        </div>
      )}

      {/* Hint display */}
      {currentHintIndex >= 0 && puzzle.hints && puzzle.hints[currentHintIndex] && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-2 text-amber-800 dark:text-amber-200 text-sm">
          Hint: {puzzle.hints[currentHintIndex]}
        </div>
      )}

      {/* Controls */}
      <PuzzleControls
        onReset={reset}
        onHint={puzzle.hints?.length ? showHint : undefined}
      />

      {/* Star thresholds info */}
      {!isComplete && (
        <div className="flex gap-4 text-xs text-gray-400">
          <span><StarRating stars={3} size="sm" /> {puzzle.starThresholds.three} moves</span>
          <span><StarRating stars={2} size="sm" /> {puzzle.starThresholds.two} moves</span>
          <span><StarRating stars={1} size="sm" /> {puzzle.starThresholds.one} moves</span>
        </div>
      )}
    </div>
  );
}
