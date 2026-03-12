"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Board from "@/components/board/Board";
import StarRating from "@/components/puzzle/StarRating";
import { BoardState, SquareId, PieceKind, PieceColor, FILES } from "@/lib/logic/types";

/* ── Starting position data ─────────────────────────────── */

const WHITE_PIECES: { piece: PieceKind; square: SquareId }[] = [
  { piece: "R", square: "a1" }, { piece: "N", square: "b1" },
  { piece: "B", square: "c1" }, { piece: "Q", square: "d1" },
  { piece: "K", square: "e1" }, { piece: "B", square: "f1" },
  { piece: "N", square: "g1" }, { piece: "R", square: "h1" },
  ...FILES.map(f => ({ piece: "P" as PieceKind, square: `${f}2` as SquareId })),
];

const BLACK_PIECES: { piece: PieceKind; square: SquareId }[] = [
  { piece: "R", square: "a8" }, { piece: "N", square: "b8" },
  { piece: "B", square: "c8" }, { piece: "Q", square: "d8" },
  { piece: "K", square: "e8" }, { piece: "B", square: "f8" },
  { piece: "N", square: "g8" }, { piece: "R", square: "h8" },
  ...FILES.map(f => ({ piece: "P" as PieceKind, square: `${f}7` as SquareId })),
];

/* ── Stages ──────────────────────────────────────────────── */

interface Stage {
  label: string;
  instruction: string;
  piecesToPlace: { piece: PieceKind; square: SquareId }[];
  needsTray: boolean;
}

const STAGES: Stage[] = [
  { label: "Rooks", instruction: "Place the white rooks!", piecesToPlace: WHITE_PIECES.filter(p => p.piece === "R"), needsTray: false },
  { label: "Knights", instruction: "Place the white knights!", piecesToPlace: WHITE_PIECES.filter(p => p.piece === "N"), needsTray: false },
  { label: "Bishops", instruction: "Place the white bishops!", piecesToPlace: WHITE_PIECES.filter(p => p.piece === "B"), needsTray: false },
  { label: "King", instruction: "Place the white king!", piecesToPlace: WHITE_PIECES.filter(p => p.piece === "K"), needsTray: false },
  { label: "Queen", instruction: "Place the white queen!", piecesToPlace: WHITE_PIECES.filter(p => p.piece === "Q"), needsTray: false },
  { label: "Pawns", instruction: "Place all the white pawns!", piecesToPlace: WHITE_PIECES.filter(p => p.piece === "P"), needsTray: false },
  { label: "Full Setup", instruction: "Set up all the white pieces!", piecesToPlace: [...WHITE_PIECES], needsTray: true },
];

function mistakesToStars(m: number): number {
  if (m === 0) return 3;
  if (m <= 2) return 2;
  return 1;
}

const noop = () => {};

/* ── Component ───────────────────────────────────────────── */

type Phase = "idle" | "playing" | "done";

export default function SetupTrainer() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [placed, setPlaced] = useState<Set<SquareId>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [wrongSquare, setWrongSquare] = useState<SquareId | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<PieceKind | null>(null);
  const [bestStars, setBestStars] = useState(0);

  useEffect(() => {
    setBestStars(parseInt(localStorage.getItem("setup-best-stars") ?? "0", 10));
  }, []);

  const stage = STAGES[stageIndex];

  // Build current board state
  const board = useMemo((): BoardState => {
    const pieces = new Map<SquareId, { piece: PieceKind; color: PieceColor }>();

    // Black pieces always present
    for (const p of BLACK_PIECES) {
      pieces.set(p.square, { piece: p.piece, color: "b" });
    }

    if (stage) {
      // Pre-placed white pieces (everything NOT being placed this stage)
      const toPlaceSquares = new Set(stage.piecesToPlace.map(p => p.square));
      for (const p of WHITE_PIECES) {
        if (!toPlaceSquares.has(p.square)) {
          pieces.set(p.square, { piece: p.piece, color: "w" });
        }
      }

      // Correctly placed pieces
      for (const sq of placed) {
        const target = stage.piecesToPlace.find(p => p.square === sq);
        if (target) {
          pieces.set(sq, { piece: target.piece, color: "w" });
        }
      }
    }

    return { pieces };
  }, [stage, placed]);

  // Handle square click
  const handleSquareClick = useCallback((sq: SquareId) => {
    if (phase !== "playing") return;

    // Already has a piece? Ignore.
    if (board.pieces.has(sq)) return;

    // Is this a target square for the current stage?
    const target = stage.piecesToPlace.find(p => p.square === sq && !placed.has(sq));

    if (!target) {
      setMistakes(m => m + 1);
      setWrongSquare(sq);
      setTimeout(() => setWrongSquare(null), 400);
      return;
    }

    // For tray stages, check piece type matches
    if (stage.needsTray) {
      if (!selectedPiece) return; // No piece selected — ignore
      if (selectedPiece !== target.piece) {
        setMistakes(m => m + 1);
        setWrongSquare(sq);
        setTimeout(() => setWrongSquare(null), 400);
        return;
      }
    }

    // Correct placement
    const newPlaced = new Set(placed);
    newPlaced.add(sq);
    setPlaced(newPlaced);

    // Stage complete?
    if (newPlaced.size === stage.piecesToPlace.length) {
      if (stageIndex < STAGES.length - 1) {
        // Advance to next stage after brief pause
        setTimeout(() => {
          setStageIndex(i => i + 1);
          setPlaced(new Set());
          setSelectedPiece(null);
        }, 600);
      } else {
        // All stages done
        setTimeout(() => {
          const stars = mistakesToStars(mistakes);
          const prev = parseInt(localStorage.getItem("setup-best-stars") ?? "0", 10);
          if (stars > prev) {
            localStorage.setItem("setup-best-stars", stars.toString());
            setBestStars(stars);
          }
          setPhase("done");
        }, 600);
      }
    }
  }, [phase, board.pieces, stage, placed, selectedPiece, stageIndex, mistakes]);

  const startGame = () => {
    setPhase("playing");
    setStageIndex(0);
    setPlaced(new Set());
    setMistakes(0);
    setSelectedPiece(null);
  };

  // Remaining pieces for tray
  const remaining = stage?.needsTray
    ? stage.piecesToPlace.filter(p => !placed.has(p.square))
    : [];

  /* ── Idle screen ─── */
  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 p-4 max-w-2xl mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Set Up the Board</h2>
          <p className="text-muted">Place each piece on its starting square.</p>
          <p className="text-sm text-faint mt-1">7 stages — from individual pieces to the full setup!</p>
        </div>
        {bestStars > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-faint">Best:</span>
            <StarRating stars={bestStars} size="sm" />
          </div>
        )}
        <button
          onClick={startGame}
          className="px-8 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-lg transition-colors"
        >
          Start
        </button>
      </div>
    );
  }

  /* ── Done screen ─── */
  if (phase === "done") {
    const stars = mistakesToStars(mistakes);
    return (
      <div className="flex flex-col items-center gap-6 p-4 max-w-2xl mx-auto">
        <div className="text-center">
          <div className="text-5xl mb-3">&#127881;</div>
          <h2 className="text-2xl font-bold mb-2">Board Complete!</h2>
          <p className="text-muted">
            {mistakes === 0
              ? "Perfect — no mistakes!"
              : `${mistakes} mistake${mistakes === 1 ? "" : "s"}`}
          </p>
        </div>
        <StarRating stars={stars} size="lg" />
        <button
          onClick={startGame}
          className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
        >
          Play Again
        </button>
      </div>
    );
  }

  /* ── Playing ─── */
  return (
    <div className="flex flex-col items-center gap-4 p-4 max-w-2xl mx-auto">
      {/* Stage info */}
      <div className="text-center">
        <div className="text-xs text-faint mb-1">
          Stage {stageIndex + 1} of {STAGES.length}
        </div>
        <h2 className="text-xl font-bold mb-1">{stage.instruction}</h2>
        {!stage.needsTray && (
          <div className="flex justify-center mt-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/pieces/w${stage.piecesToPlace[0].piece}.svg`}
              alt={stage.label}
              className="w-10 h-10"
            />
          </div>
        )}
        <p className="text-sm text-faint mt-1">
          {mistakes > 0 && `${mistakes} mistake${mistakes === 1 ? "" : "s"} · `}
          {placed.size}/{stage.piecesToPlace.length} placed
        </p>
      </div>

      {/* Piece tray for full setup stage */}
      {stage.needsTray && (
        <div className="flex gap-1.5 justify-center flex-wrap">
          {remaining.map((p) => (
            <button
              key={p.square}
              onClick={() => setSelectedPiece(p.piece)}
              className={`w-12 h-12 rounded-lg border-2 transition-colors ${
                selectedPiece === p.piece
                  ? "border-yellow-400 bg-yellow-400/20"
                  : "border-card-border bg-card hover:border-foreground/30"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/pieces/w${p.piece}.svg`} alt={p.piece} className="w-full h-full" />
            </button>
          ))}
        </div>
      )}

      {/* Board */}
      <div className="w-full flex justify-center">
        <Board
          board={board}
          selectedSquare={null}
          validMoves={[]}
          targets={[]}
          reachedTargets={[]}
          dragValidMoves={[]}
          onSquareClick={handleSquareClick}
          onDrop={noop as (from: SquareId, to: SquareId) => void}
          onDragStart={noop as (sq: SquareId) => void}
          onDragEnd={noop}
          wrongMoveSquare={wrongSquare}
          readOnly
        />
      </div>
    </div>
  );
}
