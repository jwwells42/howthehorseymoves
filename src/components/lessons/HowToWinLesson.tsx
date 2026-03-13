"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Board from "@/components/board/Board";
import StarRating from "@/components/puzzle/StarRating";
import {
  BoardState,
  SquareId,
  PieceKind,
  PieceColor,
  parseFen,
  createBoardState,
  squareToCoords,
  coordsToSquare,
} from "@/lib/logic/types";
import { getLegalMoves, isCheckmate, isStalemate, isInCheck } from "@/lib/logic/attacks";
import type { Arrow } from "@/lib/logic/pgn";

/* ── Move application (simplified, no en passant needed) ──── */

function applyMove(board: BoardState, from: SquareId, to: SquareId): BoardState {
  const pieces = new Map(board.pieces);
  const piece = pieces.get(from);
  if (!piece) return board;

  pieces.delete(from);
  pieces.set(to, piece);

  // Castling rook
  if (piece.piece === "K") {
    const [fx] = squareToCoords(from);
    const [tx] = squareToCoords(to);
    if (Math.abs(tx - fx) === 2) {
      if (tx > fx) {
        const rookFrom = `h${to[1]}` as SquareId;
        const rookTo = `f${to[1]}` as SquareId;
        const rook = pieces.get(rookFrom);
        if (rook) { pieces.delete(rookFrom); pieces.set(rookTo, rook); }
      } else {
        const rookFrom = `a${to[1]}` as SquareId;
        const rookTo = `d${to[1]}` as SquareId;
        const rook = pieces.get(rookFrom);
        if (rook) { pieces.delete(rookFrom); pieces.set(rookTo, rook); }
      }
    }
  }

  // Pawn promotion (auto-queen)
  if (piece.piece === "P") {
    const rank = to[1];
    if ((piece.color === "w" && rank === "8") || (piece.color === "b" && rank === "1")) {
      pieces.set(to, { piece: "Q", color: piece.color });
    }
  }

  return { pieces };
}

/* ── Step types ──────────────────────────────────────────── */

type ValidationMode =
  | "any"              // Accept any legal move
  | "check"            // Must give check
  | "checkmate"        // Must deliver checkmate
  | "no-stalemate";    // Must deliver checkmate, reject stalemate

interface LessonStep {
  title: string;
  instruction: string;
  fen: string;
  type: "demo" | "interactive";
  arrows?: Arrow[];
  dangerSquares?: SquareId[];
  validation?: ValidationMode;
}

/* ── Lesson steps ────────────────────────────────────────── */

const STEPS: LessonStep[] = [
  // Part 1: Check
  {
    title: "Check!",
    instruction: "The rook attacks the king. That's check!",
    fen: "4r3/8/8/8/8/8/8/4K3 w - - 0 1",
    type: "demo",
    arrows: [{ from: "e8" as SquareId, to: "e1" as SquareId, color: "#dc2626" }],
  },

  // Part 2: Escape check — move
  {
    title: "Move the King",
    instruction: "Your king is in check! Move it to safety.",
    fen: "4r3/8/8/8/8/8/8/4K3 w - - 0 1",
    type: "interactive",
    arrows: [{ from: "e8" as SquareId, to: "e1" as SquareId, color: "#dc2626" }],
    validation: "any",
  },

  // Part 2: Escape check — capture
  {
    title: "Capture!",
    instruction: "Take the piece that's attacking your king!",
    fen: "8/8/8/8/8/5n2/4B3/6K1 w - - 0 1",
    type: "interactive",
    arrows: [
      { from: "f3" as SquareId, to: "g1" as SquareId, color: "#dc2626" },
      { from: "e2" as SquareId, to: "f3" as SquareId, color: "#22c55e" },
    ],
    validation: "any",
  },

  // Part 2: Escape check — block
  {
    title: "Block!",
    instruction: "Put a piece in the way to block the attack!",
    fen: "4rbk1/6pp/8/8/8/5B2/r2P1P2/3RKR2 w - - 0 1",
    type: "interactive",
    arrows: [
      { from: "e8" as SquareId, to: "e1" as SquareId, color: "#dc2626" },
      { from: "f3" as SquareId, to: "e2" as SquareId, color: "#22c55e" },
    ],
    validation: "any",
  },

  // Part 3: Give check
  {
    title: "Give Check!",
    instruction: "Move a piece to attack their king!",
    fen: "4k3/8/8/8/8/8/8/3QK3 w - - 0 1",
    type: "interactive",
    validation: "check",
  },

  // Part 4: Checkmate (demo)
  {
    title: "Checkmate!",
    instruction: "The king is in check and can't escape. You win!",
    fen: "4R1k1/5ppp/8/8/8/8/8/6K1 b - - 0 1",
    type: "demo",
    arrows: [{ from: "e8" as SquareId, to: "g8" as SquareId, color: "#dc2626" }],
    dangerSquares: ["f8" as SquareId, "h8" as SquareId],
  },

  // Part 5: Stalemate (demo)
  {
    title: "Stalemate",
    instruction: "Not in check, but can't move. It's a draw — not a win!",
    fen: "k7/8/1Q6/8/8/8/8/6K1 b - - 0 1",
    type: "demo",
    dangerSquares: ["a7" as SquareId, "b7" as SquareId, "b8" as SquareId],
  },

  // Part 6: Deliver checkmate (practice)
  {
    title: "Deliver Checkmate!",
    instruction: "Find the move that traps the king. Checkmate!",
    fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    type: "interactive",
    validation: "checkmate",
  },
  {
    title: "Deliver Checkmate!",
    instruction: "Use the rook to trap the king!",
    fen: "7k/8/6K1/8/8/8/8/R7 w - - 0 1",
    type: "interactive",
    validation: "checkmate",
  },
  {
    title: "Deliver Checkmate!",
    instruction: "Use the queen to trap the king!",
    fen: "k7/8/1K6/8/8/8/8/3Q4 w - - 0 1",
    type: "interactive",
    validation: "checkmate",
  },
  {
    title: "Deliver Checkmate!",
    instruction: "Put the queen where the king can't escape!",
    fen: "7k/8/6Q1/8/8/8/8/6K1 w - - 0 1",
    type: "interactive",
    validation: "checkmate",
  },
  {
    title: "Deliver Checkmate!",
    instruction: "Use both rooks to trap the king!",
    fen: "2k5/R7/8/8/8/8/8/1R4K1 w - - 0 1",
    type: "interactive",
    validation: "checkmate",
  },

  // Part 7: Don't stalemate!
  {
    title: "Win, Don't Draw!",
    instruction: "One move wins. The other is a draw. Choose wisely!",
    fen: "7k/8/5Q2/5K2/8/8/8/8 w - - 0 1",
    type: "interactive",
    validation: "no-stalemate",
  },
  {
    title: "Win, Don't Draw!",
    instruction: "Checkmate the king — don't stalemate!",
    fen: "8/8/8/8/8/2K5/2Q5/k7 w - - 0 1",
    type: "interactive",
    validation: "no-stalemate",
  },
];

/* ── Component ────────────────────────────────────────────── */

function mistakesToStars(m: number): number {
  if (m === 0) return 3;
  if (m <= 3) return 2;
  return 1;
}

export default function HowToWinLesson() {
  const [stepIndex, setStepIndex] = useState(0);
  const [board, setBoard] = useState<BoardState>({ pieces: new Map() });
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const [solved, setSolved] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [wrongMoveSquare, setWrongMoveSquare] = useState<SquareId | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [bestStars, setBestStars] = useState(0);
  const [done, setDone] = useState(false);

  const storageKey = "how-to-win-best-stars";

  // Load initial step
  useEffect(() => {
    const { placements, castlingRights, enPassantSquare } = parseFen(STEPS[0].fen);
    setBoard(createBoardState(placements, { castlingRights, enPassantSquare }));
    setBestStars(parseInt(localStorage.getItem(storageKey) ?? "0", 10));
  }, []);

  const step = STEPS[stepIndex];
  const playerColor: PieceColor = "w";

  const validMoves = useMemo(() => {
    if (!selectedSquare || solved || step?.type === "demo") return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== playerColor) return [];
    return getLegalMoves(selectedSquare, board, playerColor);
  }, [selectedSquare, board, solved, step, playerColor]);

  const goToStep = useCallback((idx: number) => {
    if (idx >= STEPS.length) {
      const stars = mistakesToStars(mistakes);
      const prev = parseInt(localStorage.getItem(storageKey) ?? "0", 10);
      if (stars > prev) {
        localStorage.setItem(storageKey, stars.toString());
        setBestStars(stars);
      }
      setDone(true);
      return;
    }
    const s = STEPS[idx];
    const { placements, castlingRights, enPassantSquare } = parseFen(s.fen);
    setBoard(createBoardState(placements, { castlingRights, enPassantSquare }));
    setStepIndex(idx);
    setSelectedSquare(null);
    setSolved(false);
    setWrongMoveSquare(null);
    setFeedbackMessage(null);
  }, [mistakes]);

  const executeMove = useCallback((from: SquareId, to: SquareId) => {
    if (solved || !step || step.type === "demo") return;

    const newBoard = applyMove(board, from, to);
    const validation = step.validation ?? "any";

    if (validation === "check") {
      if (!isInCheck("b", newBoard)) {
        setMistakes(m => m + 1);
        setWrongMoveSquare(to);
        setSelectedSquare(null);
        setTimeout(() => setWrongMoveSquare(null), 600);
        return;
      }
    } else if (validation === "checkmate") {
      if (!isCheckmate("b", newBoard)) {
        setMistakes(m => m + 1);
        setWrongMoveSquare(to);
        setSelectedSquare(null);
        setTimeout(() => setWrongMoveSquare(null), 600);
        return;
      }
    } else if (validation === "no-stalemate") {
      if (isStalemate("b", newBoard)) {
        setMistakes(m => m + 1);
        setWrongMoveSquare(to);
        setFeedbackMessage("That's stalemate — a draw!");
        setSelectedSquare(null);
        setTimeout(() => {
          setWrongMoveSquare(null);
          setFeedbackMessage(null);
        }, 1500);
        return;
      }
      if (!isCheckmate("b", newBoard)) {
        setMistakes(m => m + 1);
        setWrongMoveSquare(to);
        setSelectedSquare(null);
        setTimeout(() => setWrongMoveSquare(null), 600);
        return;
      }
    }
    // "any" validation: just accept any legal move

    setBoard(newBoard);
    setSelectedSquare(null);
    setSolved(true);
  }, [board, solved, step]);

  const handleSquareClick = useCallback((sq: SquareId) => {
    if (solved || !step || step.type === "demo") return;

    if (!selectedSquare) {
      const p = board.pieces.get(sq);
      if (p && p.color === playerColor) setSelectedSquare(sq);
      return;
    }

    if (sq === selectedSquare) { setSelectedSquare(null); return; }

    const p = board.pieces.get(sq);
    if (p && p.color === playerColor) { setSelectedSquare(sq); return; }

    const moves = getLegalMoves(selectedSquare, board, playerColor);
    if (!moves.includes(sq)) { setSelectedSquare(null); return; }

    executeMove(selectedSquare, sq);
  }, [board, selectedSquare, playerColor, solved, step, executeMove]);

  const handleDrop = useCallback((from: SquareId, to: SquareId) => {
    if (solved || !step || step.type === "demo" || from === to) return;
    const p = board.pieces.get(from);
    if (!p || p.color !== playerColor) return;
    const moves = getLegalMoves(from, board, playerColor);
    if (!moves.includes(to)) return;
    executeMove(from, to);
  }, [board, playerColor, solved, step, executeMove]);

  // Done screen
  if (done) {
    const stars = mistakesToStars(mistakes);
    return (
      <div className="flex flex-col items-center gap-6 p-4 max-w-2xl mx-auto">
        <div className="text-center">
          <div className="text-5xl mb-3">&#127881;</div>
          <h2 className="text-2xl font-bold mb-2">Lesson Complete!</h2>
          <p className="text-muted">
            {mistakes === 0
              ? "Perfect — no mistakes!"
              : `${mistakes} mistake${mistakes === 1 ? "" : "s"}`}
          </p>
        </div>
        <StarRating stars={stars} size="lg" />
        <div className="flex gap-3">
          <button
            onClick={() => {
              setDone(false);
              setMistakes(0);
              goToStep(0);
            }}
            className="px-6 py-2 rounded-lg bg-btn hover:bg-btn-hover font-medium transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  if (!step) return null;

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="flex flex-col items-center gap-4 p-4 max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="h-2 rounded-full bg-card-border overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-faint mt-1 text-center">
          {stepIndex + 1} / {STEPS.length}
        </p>
      </div>

      {/* Step info */}
      <div className="text-center">
        <h2 className="text-xl font-bold">{step.title}</h2>
        <p className="text-sm text-muted mt-1">{step.instruction}</p>
      </div>

      {/* Board */}
      <div className="w-full max-w-md">
        <Board
          board={board}
          selectedSquare={step.type === "interactive" ? selectedSquare : null}
          validMoves={validMoves}
          targets={[]}
          reachedTargets={[]}
          dragValidMoves={validMoves}
          onSquareClick={handleSquareClick}
          onDrop={handleDrop}
          onDragStart={(sq) => setSelectedSquare(sq)}
          onDragEnd={() => setSelectedSquare(null)}
          wrongMoveSquare={wrongMoveSquare}
          arrows={step.arrows}
          dangerSquares={step.dangerSquares}
          readOnly={step.type === "demo"}
          playableColors={["w"]}
        />
      </div>

      {/* Feedback */}
      {feedbackMessage && (
        <p className="text-red-500 font-bold text-sm animate-pulse">
          {feedbackMessage}
        </p>
      )}

      {/* Controls */}
      {step.type === "demo" ? (
        <button
          onClick={() => goToStep(stepIndex + 1)}
          className="px-8 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg transition-colors"
        >
          Next
        </button>
      ) : solved ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-green-500 font-bold">Correct!</p>
          <button
            onClick={() => goToStep(stepIndex + 1)}
            className="px-8 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg transition-colors"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
