"use client";

import { useState, useCallback, useMemo } from "react";
import Board from "@/components/board/Board";
import StarRating from "@/components/puzzle/StarRating";
import { BoardState, SquareId, PieceKind, PieceColor, createBoardState, PiecePlacement } from "@/lib/logic/types";
import { getLegalMoves, getAllLegalMoves } from "@/lib/logic/attacks";
import { probeKPK, squareToIndex, KPK_WHITE, KPK_BLACK } from "@/lib/logic/kpk-bitbase";
import type { SlideAnimation } from "@/lib/state/use-puzzle";

interface EndgameShellProps {
  title: string;
  instruction: string;
  placements: PiecePlacement[];
}

/** Find the three KPK pieces on the board. Returns null if pawn is gone (promoted/captured). */
function findKPKPieces(board: BoardState): { wk: SquareId; bk: SquareId; wp: SquareId } | null {
  let wk: SquareId | undefined, bk: SquareId | undefined, wp: SquareId | undefined;
  for (const [sq, piece] of board.pieces) {
    if (piece.color === "w" && piece.piece === "K") wk = sq;
    else if (piece.color === "b" && piece.piece === "K") bk = sq;
    else if (piece.color === "w" && piece.piece === "P") wp = sq;
  }
  if (!wk || !bk || !wp) return null;
  return { wk, bk, wp };
}

/** Probe the bitbase for a board position. Returns null if pieces can't be found. */
function probeBoard(board: BoardState, stm: number): boolean | null {
  const pieces = findKPKPieces(board);
  if (!pieces) return null;
  return probeKPK(
    squareToIndex(pieces.wk),
    squareToIndex(pieces.bk),
    squareToIndex(pieces.wp),
    stm,
  );
}

export default function EndgameShell({ title, instruction, placements }: EndgameShellProps) {
  const buildBoard = useCallback(() => createBoardState(placements), [placements]);

  const [board, setBoard] = useState<BoardState>(buildBoard);
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const [result, setResult] = useState<"playing" | "won">("playing");
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [botSlide, setBotSlide] = useState<SlideAnimation | null>(null);
  const [waitingForBot, setWaitingForBot] = useState(false);
  const [dragFrom, setDragFrom] = useState<SquareId | null>(null);

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
      const moves = getAllLegalMoves("b", currentBoard);
      if (moves.length === 0) {
        // Stalemate — shouldn't happen if student plays correctly
        setWaitingForBot(false);
        return;
      }

      // Pick a random legal move (all moves lose in a winning position)
      const move = moves[Math.floor(Math.random() * moves.length)];
      const newPieces = new Map(currentBoard.pieces);
      const piece = newPieces.get(move.from)!;
      newPieces.delete(move.from);
      newPieces.set(move.to, piece);

      setBotSlide({ piece: piece.piece, color: piece.color, from: move.from, to: move.to });
      const newBoard: BoardState = { pieces: newPieces };
      setBoard(newBoard);

      setTimeout(() => {
        setBotSlide(null);
        setWaitingForBot(false);
      }, 500);
    }, 400);
  }, []);

  const executeMove = useCallback(
    (from: SquareId, to: SquareId) => {
      const newPieces = new Map(board.pieces);
      const piece = newPieces.get(from)!;
      newPieces.delete(from);
      newPieces.set(to, piece);

      // Check for pawn promotion
      if (piece.piece === "P" && to[1] === "8") {
        newPieces.set(to, { piece: "Q", color: "w" });
        setBoard({ pieces: newPieces });
        setSelectedSquare(null);
        setResult("won");
        setFeedback(null);
        return;
      }

      const newBoard: BoardState = { pieces: newPieces };

      // Probe bitbase: is the position still WIN for white?
      const isWin = probeBoard(newBoard, KPK_BLACK);
      if (isWin === false) {
        // Student made a drawing move — don't apply it
        setMistakes((m) => m + 1);
        setFeedback("That lets black draw — try again!");
        setSelectedSquare(null);
        return;
      }

      // Good move
      setBoard(newBoard);
      setSelectedSquare(null);
      setFeedback(null);
      makeBotMove(newBoard);
    },
    [board, makeBotMove],
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

      // Clicking another own piece
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
    setBoard(buildBoard());
    setSelectedSquare(null);
    setResult("playing");
    setMistakes(0);
    setFeedback(null);
    setBotSlide(null);
    setWaitingForBot(false);
    setDragFrom(null);
  }, [buildBoard]);

  return (
    <div className="flex flex-col items-center gap-4 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-1">{title}</h2>
        <p className="text-muted">
          {result === "won"
            ? "Pawn promoted — you win!"
            : waitingForBot
              ? "Opponent is thinking..."
              : instruction}
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
          <button
            onClick={reset}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
