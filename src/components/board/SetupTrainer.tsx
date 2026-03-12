"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Board from "@/components/board/Board";
import StarRating from "@/components/puzzle/StarRating";
import { BoardState, SquareId, PieceKind, PieceColor, FILES, RANKS } from "@/lib/logic/types";

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
}

const STAGES: Stage[] = [
  { label: "Rooks", instruction: "Place the white rooks!", piecesToPlace: WHITE_PIECES.filter(p => p.piece === "R") },
  { label: "Knights", instruction: "Place the white knights!", piecesToPlace: WHITE_PIECES.filter(p => p.piece === "N") },
  { label: "Bishops", instruction: "Place the white bishops!", piecesToPlace: WHITE_PIECES.filter(p => p.piece === "B") },
  { label: "King", instruction: "Place the white king!", piecesToPlace: WHITE_PIECES.filter(p => p.piece === "K") },
  { label: "Queen", instruction: "Place the white queen!", piecesToPlace: WHITE_PIECES.filter(p => p.piece === "Q") },
  { label: "Pawns", instruction: "Place all the white pawns!", piecesToPlace: WHITE_PIECES.filter(p => p.piece === "P") },
  { label: "Full Setup", instruction: "Set up all the white pieces!", piecesToPlace: [...WHITE_PIECES] },
];

function mistakesToStars(m: number): number {
  if (m === 0) return 3;
  if (m <= 2) return 2;
  return 1;
}

const noop = () => {};

/* ── Component ───────────────────────────────────────────── */

type Phase = "idle" | "playing" | "done";

interface TrayDrag {
  piece: PieceKind;
  x: number;
  y: number;
}

export default function SetupTrainer() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [placed, setPlaced] = useState<Set<SquareId>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [wrongSquare, setWrongSquare] = useState<SquareId | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<PieceKind | null>(null);
  const [bestStars, setBestStars] = useState(0);
  const [trayDrag, setTrayDrag] = useState<TrayDrag | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBestStars(parseInt(localStorage.getItem("setup-best-stars") ?? "0", 10));
  }, []);

  const stage = STAGES[stageIndex];

  // Check if this stage has only one piece type
  const pieceTypes = useMemo(() => {
    if (!stage) return [];
    const types = new Set(stage.piecesToPlace.map(p => p.piece));
    return Array.from(types);
  }, [stage]);
  const isSingleType = pieceTypes.length === 1;

  // Auto-select for single-type stages
  useEffect(() => {
    if (phase === "playing" && isSingleType) {
      setSelectedPiece(pieceTypes[0]);
    }
  }, [phase, isSingleType, pieceTypes, stageIndex]);

  // Remaining pieces for tray
  const remaining = useMemo(() => {
    if (!stage) return [];
    return stage.piecesToPlace.filter(p => !placed.has(p.square));
  }, [stage, placed]);

  // Build current board state
  const board = useMemo((): BoardState => {
    const pieces = new Map<SquareId, { piece: PieceKind; color: PieceColor }>();
    for (const p of BLACK_PIECES) {
      pieces.set(p.square, { piece: p.piece, color: "b" });
    }
    if (stage) {
      const toPlaceSquares = new Set(stage.piecesToPlace.map(p => p.square));
      for (const p of WHITE_PIECES) {
        if (!toPlaceSquares.has(p.square)) {
          pieces.set(p.square, { piece: p.piece, color: "w" });
        }
      }
      for (const sq of placed) {
        const target = stage.piecesToPlace.find(p => p.square === sq);
        if (target) {
          pieces.set(sq, { piece: target.piece, color: "w" });
        }
      }
    }
    return { pieces };
  }, [stage, placed]);

  // Convert client coordinates to board square
  const clientToSquare = useCallback((clientX: number, clientY: number): SquareId | null => {
    const svg = boardRef.current?.querySelector("svg");
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const fx = Math.floor((clientX - rect.left) / rect.width * 8);
    const fy = Math.floor((clientY - rect.top) / rect.height * 8);
    if (fx < 0 || fx > 7 || fy < 0 || fy > 7) return null;
    return `${FILES[fx]}${RANKS[fy]}` as SquareId;
  }, []);

  // Attempt to place a piece on a square
  const attemptPlacement = useCallback((sq: SquareId, pieceType: PieceKind) => {
    if (phase !== "playing" || !stage) return;
    if (board.pieces.has(sq)) return;

    const target = stage.piecesToPlace.find(p => p.square === sq && !placed.has(sq));
    if (!target || target.piece !== pieceType) {
      setMistakes(m => m + 1);
      setWrongSquare(sq);
      setTimeout(() => setWrongSquare(null), 400);
      return;
    }

    // Correct placement
    const newPlaced = new Set(placed);
    newPlaced.add(sq);
    setPlaced(newPlaced);

    // Clear selection if no more of this type remain
    const remainingOfType = stage.piecesToPlace.filter(
      p => p.piece === pieceType && !newPlaced.has(p.square)
    );
    if (remainingOfType.length === 0 && !isSingleType) {
      setSelectedPiece(null);
    }

    // Stage complete?
    if (newPlaced.size === stage.piecesToPlace.length) {
      if (stageIndex < STAGES.length - 1) {
        setTimeout(() => {
          setStageIndex(i => i + 1);
          setPlaced(new Set());
          setSelectedPiece(null);
        }, 600);
      } else {
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
  }, [phase, stage, placed, board.pieces, isSingleType, stageIndex, mistakes]);

  // Handle board square click
  const handleSquareClick = useCallback((sq: SquareId) => {
    if (!selectedPiece) return;
    attemptPlacement(sq, selectedPiece);
  }, [selectedPiece, attemptPlacement]);

  // Tray drag handlers
  const handleTrayPointerDown = useCallback((e: React.PointerEvent, piece: PieceKind) => {
    if (phase !== "playing") return;
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelectedPiece(piece);
    setTrayDrag({ piece, x: e.clientX, y: e.clientY });
  }, [phase]);

  const handleContainerPointerMove = useCallback((e: React.PointerEvent) => {
    if (!trayDrag) return;
    setTrayDrag({ ...trayDrag, x: e.clientX, y: e.clientY });
  }, [trayDrag]);

  const handleContainerPointerUp = useCallback((e: React.PointerEvent) => {
    if (!trayDrag) return;
    const sq = clientToSquare(e.clientX, e.clientY);
    if (sq) {
      attemptPlacement(sq, trayDrag.piece);
    }
    setTrayDrag(null);
  }, [trayDrag, clientToSquare, attemptPlacement]);

  const startGame = () => {
    setPhase("playing");
    setStageIndex(0);
    setPlaced(new Set());
    setMistakes(0);
    setSelectedPiece(null);
    setTrayDrag(null);
  };

  /* ── Idle screen ─── */
  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 p-4 max-w-2xl mx-auto">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Place the Pieces</h2>
          <p className="text-muted">Put each piece on its starting square.</p>
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
        <div className="flex gap-3">
          <button
            onClick={startGame}
            className="px-6 py-2 rounded-lg bg-btn hover:bg-btn-hover font-medium transition-colors"
          >
            Play Again
          </button>
          <Link
            href="/play?level=random"
            className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
          >
            Play a Game!
          </Link>
        </div>
      </div>
    );
  }

  /* ── Playing ─── */
  return (
    <div
      className="flex flex-col items-center gap-4 p-4 max-w-3xl mx-auto"
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
    >
      {/* Stage info */}
      <div className="text-center">
        <div className="text-xs text-faint mb-1">
          Stage {stageIndex + 1} of {STAGES.length}
        </div>
        <h2 className="text-xl font-bold">{stage.instruction}</h2>
        <p className="text-sm text-faint mt-1">
          {mistakes > 0 && `${mistakes} mistake${mistakes === 1 ? "" : "s"} · `}
          {placed.size}/{stage.piecesToPlace.length} placed
        </p>
      </div>

      {/* Board + Tray side by side */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 w-full">
        {/* Board */}
        <div ref={boardRef} className="flex-1 w-full flex justify-center">
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

        {/* Piece tray */}
        <div className="flex sm:flex-col gap-1.5 flex-wrap justify-center sm:justify-start sm:pt-2">
          <div className="text-xs text-faint text-center sm:mb-1 w-full hidden sm:block">
            {isSingleType ? "Click or drag" : "Pick & place"}
          </div>
          {remaining.map((p) => (
            <button
              key={p.square}
              onClick={() => setSelectedPiece(p.piece)}
              onPointerDown={(e) => handleTrayPointerDown(e, p.piece)}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 transition-colors touch-none ${
                selectedPiece === p.piece
                  ? "border-yellow-400 bg-yellow-400/20"
                  : "border-card-border bg-card hover:border-foreground/30"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/pieces/w${p.piece}.svg`}
                alt={p.piece}
                className="w-full h-full pointer-events-none"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Drag ghost */}
      {trayDrag && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/pieces/w${trayDrag.piece}.svg`}
          alt=""
          className="pointer-events-none"
          style={{
            position: "fixed",
            left: trayDrag.x - 30,
            top: trayDrag.y - 30,
            width: 60,
            height: 60,
            opacity: 0.8,
            zIndex: 50,
          }}
        />
      )}
    </div>
  );
}
