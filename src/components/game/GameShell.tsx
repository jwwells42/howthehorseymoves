"use client";

import { useState, useCallback, useMemo } from "react";
import Board from "@/components/board/Board";
import { useGame } from "@/lib/state/use-game";
import { SquareId } from "@/lib/logic/types";
import { getLegalMoves } from "@/lib/logic/attacks";

export default function GameShell() {
  const {
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
  } = useGame();

  const [dragFrom, setDragFrom] = useState<SquareId | null>(null);

  const dragValidMoves = useMemo(() => {
    if (!dragFrom) return [];
    return getLegalMoves(dragFrom, board, "w");
  }, [dragFrom, board]);

  const onDragStart = useCallback((sq: SquareId) => {
    if (result !== "playing" || waitingForBot) return;
    setDragFrom(sq);
  }, [result, waitingForBot]);

  const onDragEnd = useCallback(() => {
    setDragFrom(null);
  }, []);

  const resultMessage = (() => {
    switch (result) {
      case "checkmate-white": return "Checkmate — you win!";
      case "checkmate-black": return "Checkmate — you lose!";
      case "stalemate": return "Stalemate — it's a draw!";
      default: return null;
    }
  })();

  return (
    <div className="flex flex-col items-center gap-4 p-4 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-1">Play vs Computer</h2>
        <p className="text-muted">
          {resultMessage ?? (
            inCheck ? "You're in check!" :
            waitingForBot ? "Opponent is thinking..." :
            "You play white. Make a move!"
          )}
        </p>
      </div>

      <div className="relative w-full flex justify-center">
        <Board
          board={board}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          targets={[]}
          reachedTargets={[]}
          dragValidMoves={dragValidMoves}
          onSquareClick={handleSquareClick}
          onDrop={handleDrop}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          opponentSlide={botSlide}
        />
      </div>

      {result !== "playing" && (
        <button
          onClick={newGame}
          className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          New Game
        </button>
      )}
    </div>
  );
}
