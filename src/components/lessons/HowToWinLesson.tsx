"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  | "any"
  | "check"
  | "checkmate"
  | "no-stalemate";

interface LessonStep {
  slug: string;
  title: string;
  instruction: string;
  fen: string;
  type: "demo" | "interactive";
  arrows?: Arrow[];
  dangerSquares?: SquareId[];
  safeSquares?: SquareId[];
  validation?: ValidationMode;
  isVictory?: boolean;
}

/* ── Sections ────────────────────────────────────────────── */

export type HowToWinSection = "check" | "checkmate" | "stalemate";

export interface SectionInfo {
  key: HowToWinSection;
  title: string;
  description: string;
  icon: string;
  storageKey: string;
}

export const SECTIONS: SectionInfo[] = [
  {
    key: "check",
    title: "Check",
    description: "Learn what check is and three ways to escape it.",
    icon: "/pieces/wR.svg",
    storageKey: "how-to-win-check-stars",
  },
  {
    key: "checkmate",
    title: "Checkmate",
    description: "Trap the king with nowhere to go. That's how you win!",
    icon: "/pieces/wQ.svg",
    storageKey: "how-to-win-checkmate-stars",
  },
  {
    key: "stalemate",
    title: "Stalemate",
    description: "Don't let the game end in a draw when you're winning!",
    icon: "/pieces/bK.svg",
    storageKey: "how-to-win-stalemate-stars",
  },
];

const CHECK_STEPS: LessonStep[] = [
  {
    slug: "what-is-check",
    title: "Check!",
    instruction: "The rook attacks the king. That's check!",
    fen: "4r3/8/8/8/8/8/8/4K3 w - - 0 1",
    type: "demo",
    arrows: [{ from: "e8" as SquareId, to: "e1" as SquareId, color: "#dc2626" }],
  },
  {
    slug: "move-the-king",
    title: "Move the King",
    instruction: "Your king is in check! Move it to safety.",
    fen: "4r3/8/8/8/8/8/8/4K3 w - - 0 1",
    type: "interactive",
    arrows: [{ from: "e8" as SquareId, to: "e1" as SquareId, color: "#dc2626" }],
    validation: "any",
  },
  {
    slug: "capture",
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
  {
    slug: "block",
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
  {
    slug: "give-check",
    title: "Give Check!",
    instruction: "Move a piece to attack their king!",
    fen: "4k3/8/8/8/8/8/8/3QK3 w - - 0 1",
    type: "interactive",
    validation: "check",
  },
];

const CHECKMATE_STEPS: LessonStep[] = [
  {
    slug: "what-is-checkmate",
    title: "Checkmate!",
    instruction: "The king is in check and can't escape. You win!",
    fen: "4R1k1/5ppp/8/8/8/8/8/6K1 b - - 0 1",
    type: "demo",
    arrows: [{ from: "e8" as SquareId, to: "g8" as SquareId, color: "#22c55e" }],
    dangerSquares: ["f8" as SquareId, "h8" as SquareId],
    isVictory: true,
  },
  {
    slug: "back-rank",
    title: "Deliver Checkmate!",
    instruction: "Find the move that traps the king. Checkmate!",
    fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    type: "interactive",
    validation: "checkmate",
  },
  {
    slug: "rook-and-king",
    title: "Deliver Checkmate!",
    instruction: "Use the rook to trap the king!",
    fen: "7k/8/6K1/8/8/8/8/R7 w - - 0 1",
    type: "interactive",
    arrows: [
      { from: "g6" as SquareId, to: "f7" as SquareId, color: "#22c55e" },
      { from: "g6" as SquareId, to: "g7" as SquareId, color: "#22c55e" },
      { from: "g6" as SquareId, to: "h7" as SquareId, color: "#22c55e" },
    ],
    validation: "checkmate",
  },
  {
    slug: "queen-and-king",
    title: "Deliver Checkmate!",
    instruction: "Use the queen to trap the king!",
    fen: "k7/8/1K6/8/8/8/8/3Q4 w - - 0 1",
    type: "interactive",
    validation: "checkmate",
  },
  {
    slug: "queen-corner",
    title: "Deliver Checkmate!",
    instruction: "Put the queen where the king can't escape!",
    fen: "7k/7p/5Q2/8/8/8/8/6K1 w - - 0 1",
    type: "interactive",
    validation: "checkmate",
  },
  {
    slug: "two-rooks",
    title: "Deliver Checkmate!",
    instruction: "Use both rooks to trap the king!",
    fen: "6k1/1R6/8/8/8/8/8/R3K3 w - - 0 1",
    type: "interactive",
    validation: "checkmate",
  },
];

const STALEMATE_STEPS: LessonStep[] = [
  {
    slug: "what-is-stalemate",
    title: "Stalemate",
    instruction: "The king is NOT in check, but every square is attacked. It's a draw!",
    fen: "k7/8/1Q6/8/8/8/8/6K1 b - - 0 1",
    type: "demo",
    arrows: [
      { from: "b6" as SquareId, to: "a7" as SquareId, color: "#dc2626" },
      { from: "b6" as SquareId, to: "b7" as SquareId, color: "#dc2626" },
      { from: "b6" as SquareId, to: "b8" as SquareId, color: "#dc2626" },
    ],
    dangerSquares: ["a7" as SquareId, "b7" as SquareId, "b8" as SquareId],
    safeSquares: ["a8" as SquareId],
  },
  {
    slug: "dont-stalemate-1",
    title: "Win, Don't Draw!",
    instruction: "Five moves win. The rest are draws. Find one!",
    fen: "7k/4Q3/6K1/8/8/8/8/8 w - - 0 1",
    type: "interactive",
    validation: "no-stalemate",
  },
  {
    slug: "dont-stalemate-2",
    title: "Win, Don't Draw!",
    instruction: "Checkmate the king — don't stalemate!",
    fen: "8/8/8/8/8/2K5/2Q5/k7 w - - 0 1",
    type: "interactive",
    validation: "no-stalemate",
  },
];

const SECTION_STEPS: Record<HowToWinSection, LessonStep[]> = {
  check: CHECK_STEPS,
  checkmate: CHECKMATE_STEPS,
  stalemate: STALEMATE_STEPS,
};

/** Find the step index for a slug within a section. Returns 0 if not found. */
export function getStepIndex(section: HowToWinSection, slug: string): number {
  const steps = SECTION_STEPS[section];
  const idx = steps.findIndex(s => s.slug === slug);
  return idx >= 0 ? idx : 0;
}

/** Get step slugs and titles for a section (used by the section listing page). */
export function getSectionSteps(section: HowToWinSection): { slug: string; title: string; instruction: string }[] {
  return SECTION_STEPS[section].map(s => ({ slug: s.slug, title: s.title, instruction: s.instruction }));
}

/* ── Component ────────────────────────────────────────────── */

function mistakesToStars(m: number): number {
  if (m === 0) return 3;
  if (m <= 3) return 2;
  return 1;
}

export default function HowToWinLesson({ section, stepSlug }: { section: HowToWinSection; stepSlug: string }) {
  const router = useRouter();
  const sectionInfo = SECTIONS.find(s => s.key === section)!;
  const steps = SECTION_STEPS[section];
  const storageKey = sectionInfo.storageKey;
  const mistakesKey = `how-to-win-${section}-mistakes`;

  const stepIndex = getStepIndex(section, stepSlug);
  const step = steps[stepIndex];

  const [board, setBoard] = useState<BoardState>({ pieces: new Map() });
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const [solved, setSolved] = useState(false);
  const [wrongMoveSquare, setWrongMoveSquare] = useState<SquareId | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [bestStars, setBestStars] = useState(0);
  const [done, setDone] = useState(false);

  // Load this step's board
  useEffect(() => {
    const { placements, castlingRights, enPassantSquare } = parseFen(step.fen);
    setBoard(createBoardState(placements, { castlingRights, enPassantSquare }));
    setSelectedSquare(null);
    setSolved(false);
    setWrongMoveSquare(null);
    setFeedbackMessage(null);
    setDone(false);
    setBestStars(parseInt(localStorage.getItem(storageKey) ?? "0", 10));
    // Reset mistakes at the start of a section
    if (stepIndex === 0) {
      localStorage.setItem(mistakesKey, "0");
    }
  }, [step, stepIndex, storageKey, mistakesKey]);

  const playerColor: PieceColor = "w";

  const validMoves = useMemo(() => {
    if (!selectedSquare || solved || step?.type === "demo") return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== playerColor) return [];
    return getLegalMoves(selectedSquare, board, playerColor);
  }, [selectedSquare, board, solved, step, playerColor]);

  const goToNext = useCallback(() => {
    if (stepIndex + 1 >= steps.length) {
      // Section complete — save stars
      const mistakes = parseInt(localStorage.getItem(mistakesKey) ?? "0", 10);
      const stars = mistakesToStars(mistakes);
      const prev = parseInt(localStorage.getItem(storageKey) ?? "0", 10);
      if (stars > prev) {
        localStorage.setItem(storageKey, stars.toString());
        setBestStars(stars);
      }
      updateCombinedStars();
      setDone(true);
    } else {
      router.push(`/learn/how-to-win-${section}/${steps[stepIndex + 1].slug}`);
    }
  }, [stepIndex, steps, section, storageKey, mistakesKey, router]);

  const addMistake = useCallback(() => {
    const cur = parseInt(localStorage.getItem(mistakesKey) ?? "0", 10);
    localStorage.setItem(mistakesKey, (cur + 1).toString());
  }, [mistakesKey]);

  const executeMove = useCallback((from: SquareId, to: SquareId) => {
    if (solved || !step || step.type === "demo") return;

    const newBoard = applyMove(board, from, to);
    const validation = step.validation ?? "any";

    if (validation === "check") {
      if (!isInCheck("b", newBoard)) {
        addMistake();
        setWrongMoveSquare(to);
        setSelectedSquare(null);
        setTimeout(() => setWrongMoveSquare(null), 600);
        return;
      }
    } else if (validation === "checkmate") {
      if (!isCheckmate("b", newBoard)) {
        addMistake();
        setWrongMoveSquare(to);
        setSelectedSquare(null);
        setTimeout(() => setWrongMoveSquare(null), 600);
        return;
      }
    } else if (validation === "no-stalemate") {
      if (isStalemate("b", newBoard)) {
        addMistake();
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
        addMistake();
        setWrongMoveSquare(to);
        setSelectedSquare(null);
        setTimeout(() => setWrongMoveSquare(null), 600);
        return;
      }
    }

    setBoard(newBoard);
    setSelectedSquare(null);
    setSolved(true);
  }, [board, solved, step, addMistake]);

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
    const mistakes = parseInt(localStorage.getItem(mistakesKey) ?? "0", 10);
    const stars = mistakesToStars(mistakes);
    const nextSection = SECTIONS[SECTIONS.findIndex(s => s.key === section) + 1];
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
            onClick={() => router.push(`/learn/how-to-win-${section}/${steps[0].slug}`)}
            className="px-6 py-2 rounded-lg bg-btn hover:bg-btn-hover font-medium transition-colors"
          >
            Play Again
          </button>
          {nextSection && (
            <button
              onClick={() => router.push(`/learn/how-to-win-${nextSection.key}/${SECTION_STEPS[nextSection.key][0].slug}`)}
              className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
            >
              Continue to {nextSection.title}!
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!step) return null;

  const progress = ((stepIndex + 1) / steps.length) * 100;

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
          {stepIndex + 1} / {steps.length}
        </p>
      </div>

      {/* Step info */}
      <div className="text-center">
        <h2 className="text-xl font-bold">{step.title}</h2>
        <p className="text-sm text-muted mt-1">{step.instruction}</p>
      </div>

      {/* Board */}
      <div className="w-full max-w-md relative">
        {(step.isVictory || (solved && (step.validation === "checkmate" || step.validation === "no-stalemate"))) && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="text-8xl" style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.4))" }}>
              &#127942;
            </div>
          </div>
        )}
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
          safeSquares={step.safeSquares}
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
          onClick={goToNext}
          className="px-8 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg transition-colors"
        >
          Next
        </button>
      ) : solved ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-green-500 font-bold">Correct!</p>
          <button
            onClick={goToNext}
            className="px-8 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg transition-colors"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function updateCombinedStars() {
  const allKeys = SECTIONS.map(s => s.storageKey);
  const allStars = allKeys.map(k => parseInt(localStorage.getItem(k) ?? "0", 10));
  const min = Math.min(...allStars);
  localStorage.setItem("how-to-win-best-stars", min.toString());
}
