"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import StarRating from "@/components/puzzle/StarRating";

const LIGHT = "#d4c4a0";
const DARK = "#7a9e6e";

type PieceColor = "w" | "b";
type PieceKind = "K" | "Q" | "R" | "B" | "N" | "P";

interface PiecePlacement {
  piece: PieceKind;
  color: PieceColor;
  square: string;
}

const PIECE_POOL: { piece: PieceKind; color: PieceColor }[] = [
  { piece: "Q", color: "w" }, { piece: "R", color: "w" }, { piece: "R", color: "w" },
  { piece: "B", color: "w" }, { piece: "B", color: "w" }, { piece: "N", color: "w" },
  { piece: "N", color: "w" }, { piece: "P", color: "w" },
  { piece: "Q", color: "b" }, { piece: "R", color: "b" }, { piece: "R", color: "b" },
  { piece: "B", color: "b" }, { piece: "B", color: "b" }, { piece: "N", color: "b" },
  { piece: "N", color: "b" }, { piece: "P", color: "b" },
];

function randomSquare(): string {
  const f = Math.floor(Math.random() * 8);
  const r = Math.floor(Math.random() * 8);
  return String.fromCharCode(97 + f) + (r + 1);
}

function generatePosition(numPieces: number): PiecePlacement[] {
  const usedSquares = new Set<string>();
  const placements: PiecePlacement[] = [];

  // Always include both kings
  let wkSq: string;
  do { wkSq = randomSquare(); } while (usedSquares.has(wkSq));
  usedSquares.add(wkSq);
  placements.push({ piece: "K", color: "w", square: wkSq });

  let bkSq: string;
  do { bkSq = randomSquare(); } while (usedSquares.has(bkSq));
  usedSquares.add(bkSq);
  placements.push({ piece: "K", color: "b", square: bkSq });

  // Fill remaining with random pieces
  for (let i = 2; i < numPieces; i++) {
    let sq: string;
    do { sq = randomSquare(); } while (usedSquares.has(sq));
    usedSquares.add(sq);
    const p = PIECE_POOL[Math.floor(Math.random() * PIECE_POOL.length)];
    placements.push({ ...p, square: sq });
  }

  return placements;
}

function sqToCoords(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
}

function PositionBoard({ placements, size, placedSquares, wrongSquares }: {
  placements: PiecePlacement[];
  size: number;
  placedSquares?: Set<string>;
  wrongSquares?: Set<string>;
}) {
  const S = size;
  const B = S * 8;

  return (
    <svg viewBox={`0 0 ${B} ${B}`} className="w-full max-w-[280px] sm:max-w-[320px]">
      {Array.from({ length: 8 }, (_, ri) =>
        Array.from({ length: 8 }, (_, fi) => {
          const isLight = (fi + ri) % 2 === 0;
          const sqName = String.fromCharCode(97 + fi) + (8 - ri);
          let fill = isLight ? LIGHT : DARK;
          if (placedSquares?.has(sqName)) fill = "#a3d9a3";
          if (wrongSquares?.has(sqName)) fill = "#f0a0a0";
          return <rect key={`${fi}-${ri}`} x={fi * S} y={ri * S} width={S} height={S} fill={fill} />;
        })
      )}
      {placements.map((p, i) => {
        const [f, r] = sqToCoords(p.square);
        return (
          <image
            key={i}
            href={`/pieces/${p.color}${p.piece}.svg`}
            x={f * S + S * 0.1}
            y={r * S + S * 0.1}
            width={S * 0.8}
            height={S * 0.8}
          />
        );
      })}
    </svg>
  );
}

const LEVELS = [
  { pieces: 4, time: 8000, label: "4 pieces" },
  { pieces: 6, time: 8000, label: "6 pieces" },
  { pieces: 8, time: 6000, label: "8 pieces" },
];

type Phase = "idle" | "showing" | "placing" | "result" | "done";

export default function FlashPosition() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [levelIdx, setLevelIdx] = useState(0);
  const [position, setPosition] = useState<PiecePlacement[]>([]);
  const [placed, setPlaced] = useState<PiecePlacement[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<{ piece: PieceKind; color: PieceColor } | null>(null);
  const [round, setRound] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalPieces, setTotalPieces] = useState(0);
  const [bestStars, setBestStars] = useState(0);
  const showTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const ROUNDS = 5;
  const level = LEVELS[levelIdx];

  useEffect(() => {
    setBestStars(parseInt(localStorage.getItem("blindfold-flash-best-stars") ?? "0", 10));
  }, []);

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, []);

  const startRound = useCallback(() => {
    const pos = generatePosition(level.pieces);
    setPosition(pos);
    setPlaced([]);
    setSelectedPiece(null);
    setPhase("showing");
    showTimerRef.current = setTimeout(() => {
      setPhase("placing");
    }, level.time);
  }, [level]);

  const startGame = useCallback(() => {
    setRound(1);
    setTotalCorrect(0);
    setTotalPieces(0);
    startRound();
  }, [startRound]);

  const handleBoardClick = useCallback(
    (sq: string) => {
      if (phase !== "placing" || !selectedPiece) return;
      // Don't place on already-placed square
      if (placed.some((p) => p.square === sq)) return;
      setPlaced((prev) => [...prev, { ...selectedPiece, square: sq }]);
    },
    [phase, selectedPiece, placed],
  );

  const checkAnswer = useCallback(() => {
    let correct = 0;
    for (const p of placed) {
      const match = position.find(
        (orig) => orig.square === p.square && orig.piece === p.piece && orig.color === p.color
      );
      if (match) correct++;
    }
    setTotalCorrect((c) => c + correct);
    setTotalPieces((t) => t + position.length);
    setPhase("result");
  }, [placed, position]);

  const nextRound = useCallback(() => {
    if (round >= ROUNDS) {
      const pct = totalPieces > 0 ? totalCorrect / totalPieces : 0;
      const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
      if (stars > bestStars) {
        localStorage.setItem("blindfold-flash-best-stars", String(stars));
        setBestStars(stars);
      }
      setPhase("done");
      return;
    }
    setRound((r) => r + 1);
    startRound();
  }, [round, totalCorrect, totalPieces, bestStars, startRound]);

  // Compute result data
  const correctSquares = new Set<string>();
  const wrongSquares = new Set<string>();
  if (phase === "result") {
    for (const p of placed) {
      const match = position.find(
        (orig) => orig.square === p.square && orig.piece === p.piece && orig.color === p.color
      );
      if (match) correctSquares.add(p.square);
      else wrongSquares.add(p.square);
    }
  }

  const overallStars = totalPieces > 0
    ? (totalCorrect / totalPieces >= 0.9 ? 3 : totalCorrect / totalPieces >= 0.7 ? 2 : totalCorrect / totalPieces >= 0.4 ? 1 : 0)
    : 0;

  // Piece tray for placing
  const TRAY_PIECES: { piece: PieceKind; color: PieceColor }[] = [
    { piece: "K", color: "w" }, { piece: "Q", color: "w" }, { piece: "R", color: "w" },
    { piece: "B", color: "w" }, { piece: "N", color: "w" }, { piece: "P", color: "w" },
    { piece: "K", color: "b" }, { piece: "Q", color: "b" }, { piece: "R", color: "b" },
    { piece: "B", color: "b" }, { piece: "N", color: "b" }, { piece: "P", color: "b" },
  ];

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Flash Position</h2>
        <p className="text-muted">
          A position flashes briefly. Then place the pieces from memory! {ROUNDS} rounds.
        </p>
        <div className="flex items-center gap-4">
          <label className="text-sm text-muted">Difficulty:</label>
          {LEVELS.map((l, i) => (
            <button
              key={i}
              onClick={() => setLevelIdx(i)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                levelIdx === i ? "bg-green-600 text-white" : "border border-card-border text-faint hover:text-foreground"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        {bestStars > 0 && (
          <div className="text-sm text-faint">
            <StarRating stars={bestStars} size="sm" />
          </div>
        )}
        <button
          onClick={startGame}
          className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-colors"
        >
          Start
        </button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Complete!</h2>
        <p className="text-3xl font-bold">{totalCorrect}/{totalPieces} pieces correct</p>
        {overallStars > 0 && <StarRating stars={overallStars} size="lg" />}
        <button
          onClick={() => setPhase("idle")}
          className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
        >
          Play Again
        </button>
      </div>
    );
  }

  if (phase === "showing") {
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <div className="text-sm text-faint">Round {round}/{ROUNDS} — Memorize!</div>
        <PositionBoard placements={position} size={40} />
        <div className="text-sm text-muted animate-pulse">Studying...</div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <div className="text-sm text-faint">Round {round}/{ROUNDS}</div>
        <p className="font-bold">{correctSquares.size}/{position.length} correct</p>
        <div className="text-xs text-muted">Correct answer:</div>
        <PositionBoard placements={position} size={40} placedSquares={correctSquares} wrongSquares={wrongSquares} />
        <button
          onClick={nextRound}
          className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          {round >= ROUNDS ? "See Results" : "Next"}
        </button>
      </div>
    );
  }

  // placing phase
  return (
    <div className="flex flex-col items-center gap-4 max-w-lg mx-auto">
      <div className="text-sm text-faint">Round {round}/{ROUNDS} — Place from memory!</div>

      {/* Board for placing */}
      <div className="relative">
        <svg
          viewBox="0 0 320 320"
          className="w-full max-w-[280px] sm:max-w-[320px] cursor-pointer"
          onClick={(e) => {
            const svg = e.currentTarget;
            const rect = svg.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width * 320;
            const y = (e.clientY - rect.top) / rect.height * 320;
            const fi = Math.floor(x / 40);
            const ri = Math.floor(y / 40);
            if (fi >= 0 && fi < 8 && ri >= 0 && ri < 8) {
              const sq = String.fromCharCode(97 + fi) + (8 - ri);
              handleBoardClick(sq);
            }
          }}
        >
          {Array.from({ length: 8 }, (_, ri) =>
            Array.from({ length: 8 }, (_, fi) => {
              const isLight = (fi + ri) % 2 === 0;
              return <rect key={`${fi}-${ri}`} x={fi * 40} y={ri * 40} width={40} height={40} fill={isLight ? LIGHT : DARK} />;
            })
          )}
          {placed.map((p, i) => {
            const [f, r] = sqToCoords(p.square);
            return (
              <image
                key={i}
                href={`/pieces/${p.color}${p.piece}.svg`}
                x={f * 40 + 4}
                y={r * 40 + 4}
                width={32}
                height={32}
              />
            );
          })}
        </svg>
      </div>

      {/* Piece tray */}
      <div className="grid grid-cols-6 gap-1">
        {TRAY_PIECES.map((p) => {
          const isSelected = selectedPiece?.piece === p.piece && selectedPiece?.color === p.color;
          return (
            <button
              key={`${p.color}${p.piece}`}
              onClick={() => setSelectedPiece(isSelected ? null : p)}
              className={`w-10 h-10 rounded border-2 transition-colors ${
                isSelected ? "border-green-500 bg-green-600/20" : "border-card-border hover:border-foreground/30"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/pieces/${p.color}${p.piece}.svg`} alt={`${p.color}${p.piece}`} className="w-full h-full" />
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setPlaced([])}
          className="px-4 py-2 rounded-lg border border-card-border text-faint hover:text-foreground transition-colors text-sm"
        >
          Clear
        </button>
        <button
          onClick={checkAnswer}
          className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Check ({placed.length}/{level.pieces})
        </button>
      </div>
    </div>
  );
}
