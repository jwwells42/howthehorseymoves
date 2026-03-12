"use client";

import { useState, useCallback, useMemo } from "react";
import Board from "@/components/board/Board";
import PuzzleControls from "./PuzzleControls";
import StarRating from "./StarRating";
import SuccessOverlay from "./SuccessOverlay";
import { usePuzzle } from "@/lib/state/use-puzzle";
import { Puzzle } from "@/lib/puzzles/types";
import { SquareId, squareToCoords, coordsToSquare } from "@/lib/logic/types";
import { getValidMoves } from "@/lib/logic/moves";
import { getLegalMoves } from "@/lib/logic/attacks";

interface PuzzleShellProps {
  puzzle: Puzzle;
  onNext?: () => void;
  nextLabel?: string;
}

export default function PuzzleShell({ puzzle, onNext, nextLabel }: PuzzleShellProps) {
  const {
    board,
    selectedSquare,
    validMoves,
    reachedTargets,
    moveCount,
    isComplete,
    stalemateTrigger,
    wrongMoveSquare,
    opponentSlide,
    stars,
    currentHintIndex,
    handleSquareClick,
    handleDrop,
    reset,
    showHint,
  } = usePuzzle(puzzle);

  const [dragFrom, setDragFrom] = useState<SquareId | null>(null);

  // Compute en passant pawn slide animation (from starting rank to current square)
  const pawnSlideData = useMemo(() => {
    const ep = puzzle.enPassantSquare;
    if (!ep) return null;
    const [epFile, epRank] = squareToCoords(ep);
    // En passant square is on rank 5 (index 2) for black pawns that moved from rank 7→5
    // The pawn itself is one rank behind the EP square (closer to its start)
    const pawnRank = epRank === 2 ? 3 : 4; // rank index: 3=rank5, 4=rank4
    const startRank = epRank === 2 ? 1 : 6; // rank index: 1=rank7, 6=rank2
    const pawnSq = coordsToSquare(epFile, pawnRank);
    const startSq = coordsToSquare(epFile, startRank);
    if (!pawnSq || !startSq) return null;
    return { from: startSq, to: pawnSq };
  }, [puzzle.enPassantSquare]);

  // Show the slide until the player makes their first move
  const showPawnSlide = pawnSlideData && moveCount === 0;

  const isBotMode = puzzle.mode === "checkmate-bot";

  const dragValidMoves = useMemo(() => {
    if (!dragFrom) return [];
    const p = board.pieces.get(dragFrom);
    if (!p || p.color !== "w" || (!isBotMode && p.piece !== puzzle.piece)) return [];
    return isBotMode
      ? getLegalMoves(dragFrom, board, "w")
      : getValidMoves(p.piece, dragFrom, board, "w");
  }, [dragFrom, board, puzzle.piece, isBotMode]);

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
        <p className="text-muted">{puzzle.instruction}</p>
      </div>

      {/* Move counter */}
      <div className="text-sm text-faint">
        Moves: {moveCount} / {puzzle.starThresholds.three}
      </div>

      {/* Board */}
      <div className="relative w-full flex justify-center">
        <Board
          board={board}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          targets={puzzle.arrows ? [] : puzzle.targets}
          reachedTargets={reachedTargets}
          dragValidMoves={dragValidMoves}
          draggablePiece={isBotMode ? undefined : puzzle.piece}
          onSquareClick={handleSquareClick}
          onDrop={handleDrop}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          pawnSlide={showPawnSlide ? pawnSlideData : undefined}
          wrongMoveSquare={wrongMoveSquare}
          opponentSlide={opponentSlide}
          arrows={moveCount === 0 ? puzzle.arrows : undefined}
        />
        {isComplete && (
          <SuccessOverlay stars={stars} onNext={onNext} onRetry={reset} nextLabel={nextLabel} />
        )}
      </div>

      {/* Stalemate warning */}
      {stalemateTrigger && (
        <div className="bg-red-900/40 border border-red-500/50 rounded-lg px-4 py-3 text-red-200 text-sm text-center">
          <strong>Stalemate!</strong> The opponent has no legal moves but isn&apos;t in check. That&apos;s a draw, not a win.
          <button onClick={reset} className="ml-2 underline font-medium">Try again</button>
        </div>
      )}

      {/* Hint display */}
      {currentHintIndex >= 0 && puzzle.hints && puzzle.hints[currentHintIndex] && (
        <div className="bg-amber-900/40 border border-amber-500/50 rounded-lg px-4 py-2 text-amber-200 text-sm">
          Hint: {puzzle.hints[currentHintIndex]}
        </div>
      )}

      {/* Controls */}
      <PuzzleControls
        onReset={reset}
        onHint={puzzle.hints?.length ? showHint : undefined}
      />

      {/* Star thresholds info */}
      <div className="flex gap-4 text-xs text-faint">
        <span><StarRating stars={3} size="sm" /> {puzzle.starThresholds.three} moves</span>
        <span><StarRating stars={2} size="sm" /> {puzzle.starThresholds.two} moves</span>
        <span><StarRating stars={1} size="sm" /> {puzzle.starThresholds.one} moves</span>
      </div>
    </div>
  );
}
