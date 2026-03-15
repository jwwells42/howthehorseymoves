"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Board from "@/components/board/Board";
import StarRating from "@/components/puzzle/StarRating";
import { BoardState, SquareId, createBoardState } from "@/lib/logic/types";
import { getLegalMoves } from "@/lib/logic/attacks";
import {
  MateEndgameType,
  ENDGAME_INFO,
  generatePosition,
  validateEndgameMove,
  applyEndgameMove,
  pickDefenseMove,
} from "@/lib/logic/endgame";
import type { SlideAnimation } from "@/lib/state/use-puzzle";

interface MateTrainerProps {
  type: MateEndgameType;
}

export default function MateTrainer({ type }: MateTrainerProps) {
  const info = ENDGAME_INFO[type];
  const storageKey = `endings-${type}-best-stars`;

  const [board, setBoard] = useState<BoardState>(() =>
    createBoardState(generatePosition(type)),
  );
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const [result, setResult] = useState<"playing" | "won">("playing");
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [botSlide, setBotSlide] = useState<SlideAnimation | null>(null);
  const [waitingForBot, setWaitingForBot] = useState(false);
  const [dragFrom, setDragFrom] = useState<SquareId | null>(null);
  const [bestStars, setBestStars] = useState(0);

  useEffect(() => {
    setBestStars(parseInt(localStorage.getItem(storageKey) ?? "0", 10));
  }, [storageKey]);

  const validMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return getLegalMoves(selectedSquare, board, "w");
  }, [selectedSquare, board]);

  const dragValidMoves = useMemo(() => {
    if (!dragFrom) return [];
    return getLegalMoves(dragFrom, board, "w");
  }, [dragFrom, board]);

  const stars = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;

  const makeBotMove = useCallback((currentBoard: BoardState) => {
    setWaitingForBot(true);
    setTimeout(() => {
      const move = pickDefenseMove(currentBoard);
      if (!move) {
        setWaitingForBot(false);
        return;
      }
      const piece = currentBoard.pieces.get(move.from)!;
      setBotSlide({
        piece: piece.piece,
        color: piece.color,
        from: move.from,
        to: move.to,
      });
      const newBoard = applyEndgameMove(currentBoard, move.from, move.to);
      setBoard(newBoard);
      setTimeout(() => {
        setBotSlide(null);
        setWaitingForBot(false);
      }, 500);
    }, 400);
  }, []);

  const executeMove = useCallback(
    (from: SquareId, to: SquareId) => {
      const validation = validateEndgameMove(board, from, to);
      if (!validation.valid) {
        setMistakes((m) => m + 1);
        setFeedback(validation.reason ?? "Invalid move");
        setSelectedSquare(null);
        return;
      }

      const newBoard = applyEndgameMove(board, from, to);
      setBoard(newBoard);
      setSelectedSquare(null);
      setFeedback(null);

      if (validation.checkmate) {
        setResult("won");
        const s = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
        const prev = parseInt(localStorage.getItem(storageKey) ?? "0", 10);
        if (s > prev) {
          localStorage.setItem(storageKey, s.toString());
          setBestStars(s);
        }
        return;
      }

      makeBotMove(newBoard);
    },
    [board, makeBotMove, mistakes, storageKey],
  );

  const handleSquareClick = useCallback(
    (sq: SquareId) => {
      if (result !== "playing" || waitingForBot) return;

      if (!selectedSquare) {
        const p = board.pieces.get(sq);
        if (p && p.color === "w") {
          setSelectedSquare(sq);
          setFeedback(null);
        }
        return;
      }

      if (sq === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      const target = board.pieces.get(sq);
      if (target && target.color === "w") {
        setSelectedSquare(sq);
        return;
      }

      const legal = getLegalMoves(selectedSquare, board, "w");
      if (!legal.includes(sq)) {
        setSelectedSquare(null);
        return;
      }

      executeMove(selectedSquare, sq);
    },
    [board, selectedSquare, result, waitingForBot, executeMove],
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
    [board, result, waitingForBot, executeMove],
  );

  const onDragStart = useCallback(
    (sq: SquareId) => {
      if (result !== "playing" || waitingForBot) return;
      setDragFrom(sq);
    },
    [result, waitingForBot],
  );

  const onDragEnd = useCallback(() => {
    setDragFrom(null);
  }, []);

  const reset = useCallback(() => {
    setBoard(createBoardState(generatePosition(type)));
    setSelectedSquare(null);
    setResult("playing");
    setMistakes(0);
    setFeedback(null);
    setBotSlide(null);
    setWaitingForBot(false);
    setDragFrom(null);
  }, [type]);

  return (
    <div className="flex flex-col items-center gap-4 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-1">{info.name}</h2>
        <p className="text-muted">
          {result === "won"
            ? "Checkmate — you win!"
            : waitingForBot
              ? "Opponent is thinking..."
              : info.description}
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

      {feedback && result === "playing" && (
        <p className="text-red-400 text-sm font-medium">{feedback}</p>
      )}

      {result === "won" && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <StarRating stars={stars} size="lg" />
          <p className="text-sm text-muted">
            {mistakes === 0
              ? "Perfect — no mistakes!"
              : `${mistakes} mistake${mistakes > 1 ? "s" : ""}`}
          </p>
          {bestStars > 0 && bestStars > stars && (
            <p className="text-xs text-faint">Best: {bestStars} stars</p>
          )}
          <button
            onClick={reset}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            New Position
          </button>
        </div>
      )}
    </div>
  );
}
