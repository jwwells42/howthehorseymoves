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

interface Challenge {
  before: PiecePlacement[];
  after: PiecePlacement[];
  movedPiece: PiecePlacement;
  movedTo: string;
  answer: string; // "Xsq → sq" description
}

const PIECE_POOL: { piece: PieceKind; color: PieceColor }[] = [
  { piece: "K", color: "w" }, { piece: "Q", color: "w" }, { piece: "R", color: "w" },
  { piece: "B", color: "w" }, { piece: "N", color: "w" }, { piece: "P", color: "w" },
  { piece: "K", color: "b" }, { piece: "Q", color: "b" }, { piece: "R", color: "b" },
  { piece: "B", color: "b" }, { piece: "N", color: "b" }, { piece: "P", color: "b" },
];

function randomSquare(): string {
  const f = Math.floor(Math.random() * 8);
  const r = Math.floor(Math.random() * 8);
  return String.fromCharCode(97 + f) + (r + 1);
}

function generateChallenge(numPieces: number): Challenge {
  const usedSquares = new Set<string>();
  const placements: PiecePlacement[] = [];

  for (let i = 0; i < numPieces; i++) {
    let sq: string;
    do { sq = randomSquare(); } while (usedSquares.has(sq));
    usedSquares.add(sq);
    const p = PIECE_POOL[Math.floor(Math.random() * PIECE_POOL.length)];
    placements.push({ ...p, square: sq });
  }

  // Pick a random piece to move
  const moveIdx = Math.floor(Math.random() * placements.length);
  const movedPiece = placements[moveIdx];
  let newSq: string;
  do { newSq = randomSquare(); } while (usedSquares.has(newSq));

  const after = placements.map((p, i) =>
    i === moveIdx ? { ...p, square: newSq } : { ...p }
  );

  const colorName = movedPiece.color === "w" ? "White" : "Black";
  return {
    before: placements,
    after,
    movedPiece,
    movedTo: newSq,
    answer: `${colorName} ${movedPiece.piece} ${movedPiece.square} → ${newSq}`,
  };
}

function sqToCoords(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
}

function PositionBoard({ placements, size, highlight }: {
  placements: PiecePlacement[];
  size: number;
  highlight?: { from?: string; to?: string };
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
          if (highlight?.from === sqName) fill = "#f0a0a0";
          if (highlight?.to === sqName) fill = "#a3d9a3";
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

function getStars(correct: number, total: number): number {
  const pct = total > 0 ? correct / total : 0;
  if (pct >= 0.9) return 3;
  if (pct >= 0.7) return 2;
  if (pct >= 0.5) return 1;
  return 0;
}

type Phase = "idle" | "showing" | "guessing" | "feedback" | "done";

export default function WhatChanged() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(4); // starting piece count
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [input, setInput] = useState("");
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [round, setRound] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [bestStars, setBestStars] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const ROUNDS = 10;
  const SHOW_TIME = 4000; // ms to memorize

  useEffect(() => {
    setBestStars(parseInt(localStorage.getItem("blindfold-changed-best-stars") ?? "0", 10));
  }, []);

  const startGame = useCallback(() => {
    const ch = generateChallenge(level);
    setChallenge(ch);
    setPhase("showing");
    setCorrect(0);
    setTotal(0);
    setRound(1);
    showTimerRef.current = setTimeout(() => {
      setPhase("guessing");
    }, SHOW_TIME);
  }, [level]);

  useEffect(() => {
    if (phase === "guessing") inputRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!challenge || phase !== "guessing") return;
      const sq = input.trim().toLowerCase();
      setInput("");

      // Accept the moved-to square as the answer
      const right = sq === challenge.movedTo || sq === challenge.movedPiece.square;
      setIsCorrect(right);
      if (right) setCorrect((c) => c + 1);
      setTotal((t) => t + 1);
      setPhase("feedback");
    },
    [challenge, input, phase],
  );

  const nextRound = useCallback(() => {
    if (round >= ROUNDS) {
      const stars = getStars(correct + (isCorrect ? 0 : 0), total); // already counted
      if (stars > bestStars) {
        localStorage.setItem("blindfold-changed-best-stars", String(stars));
        setBestStars(stars);
      }
      setPhase("done");
      return;
    }
    const ch = generateChallenge(level);
    setChallenge(ch);
    setPhase("showing");
    setRound((r) => r + 1);
    showTimerRef.current = setTimeout(() => {
      setPhase("guessing");
    }, SHOW_TIME);
  }, [round, level, correct, total, bestStars, isCorrect]);

  const stars = getStars(correct, total);

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">What Changed?</h2>
        <p className="text-muted">
          Memorize a position, then identify what moved. {ROUNDS} rounds — type the square something moved to (or from).
        </p>
        <div className="flex items-center gap-4">
          <label className="text-sm text-muted">Pieces:</label>
          {[4, 6, 8].map((n) => (
            <button
              key={n}
              onClick={() => setLevel(n)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                level === n ? "bg-green-600 text-white" : "border border-card-border text-faint hover:text-foreground"
              }`}
            >
              {n}
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
        <p className="text-3xl font-bold">{correct}/{total} correct</p>
        {stars > 0 && <StarRating stars={stars} size="lg" />}
        <button
          onClick={() => setPhase("idle")}
          className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
        >
          Play Again
        </button>
      </div>
    );
  }

  if (!challenge) return null;

  if (phase === "showing") {
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <div className="text-sm text-faint">Round {round}/{ROUNDS} — Memorize this position!</div>
        <PositionBoard placements={challenge.before} size={40} />
        <div className="text-sm text-muted animate-pulse">Studying...</div>
      </div>
    );
  }

  if (phase === "guessing") {
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <div className="text-sm text-faint">Round {round}/{ROUNDS} — What moved?</div>
        <PositionBoard placements={challenge.after} size={40} />
        <p className="text-sm text-muted">One piece moved. Type the square it moved <strong>to</strong> or <strong>from</strong>.</p>
        <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-[200px]">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Square..."
            maxLength={2}
            className="flex-1 px-4 py-2 rounded-lg border border-card-border bg-card text-foreground font-mono text-lg text-center focus:outline-none focus:border-foreground/40"
            autoComplete="off"
            autoCapitalize="off"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Go
          </button>
        </form>
      </div>
    );
  }

  // feedback
  return (
    <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
      <div className="text-sm text-faint">Round {round}/{ROUNDS}</div>
      <p className={`text-xl font-bold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
        {isCorrect ? "Correct!" : "Wrong!"}
      </p>
      <p className="text-sm text-muted">{challenge.answer}</p>
      <PositionBoard
        placements={challenge.after}
        size={40}
        highlight={{ from: challenge.movedPiece.square, to: challenge.movedTo }}
      />
      <button
        onClick={nextRound}
        className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
      >
        {round >= ROUNDS ? "See Results" : "Next"}
      </button>
    </div>
  );
}
