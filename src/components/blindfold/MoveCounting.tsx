"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import StarRating from "@/components/puzzle/StarRating";

const GAME_DURATION = 30;
const LIGHT = "#d4c4a0";
const DARK = "#7a9e6e";

type PieceType = "N" | "B" | "R" | "Q" | "K";

const PIECE_NAMES: Record<PieceType, string> = {
  N: "Knight", B: "Bishop", R: "Rook", Q: "Queen", K: "King",
};

const PIECE_ICONS: Record<PieceType, string> = {
  N: "/pieces/wN.svg", B: "/pieces/wB.svg", R: "/pieces/wR.svg", Q: "/pieces/wQ.svg", K: "/pieces/wK.svg",
};

interface Attempt {
  piece: PieceType;
  square: string;
  correct: boolean;
  answer: number;
  expected: number;
}

function countAttacks(piece: PieceType, f: number, r: number): number {
  if (piece === "N") {
    const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    return offsets.filter(([df, dr]) => {
      const nf = f + df, nr = r + dr;
      return nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7;
    }).length;
  }
  if (piece === "K") {
    const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    return offsets.filter(([df, dr]) => {
      const nf = f + df, nr = r + dr;
      return nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7;
    }).length;
  }
  if (piece === "R") {
    return 14;
  }
  if (piece === "B") {
    return Math.min(f, r) + Math.min(7 - f, r) + Math.min(f, 7 - r) + Math.min(7 - f, 7 - r);
  }
  // Queen = Bishop + Rook
  const bishopCount = Math.min(f, r) + Math.min(7 - f, r) + Math.min(f, 7 - r) + Math.min(7 - f, 7 - r);
  return bishopCount + 14;
}

function getAttackedSquares(piece: PieceType, f: number, r: number): [number, number][] {
  const squares: [number, number][] = [];
  if (piece === "N") {
    for (const [df, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const nf = f + df, nr = r + dr;
      if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) squares.push([nf, nr]);
    }
  } else if (piece === "K") {
    for (const [df, dr] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const nf = f + df, nr = r + dr;
      if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) squares.push([nf, nr]);
    }
  } else {
    const dirs: [number, number][] = [];
    if (piece === "B" || piece === "Q") dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
    if (piece === "R" || piece === "Q") dirs.push([1,0],[-1,0],[0,1],[0,-1]);
    for (const [df, dr] of dirs) {
      let nf = f + df, nr = r + dr;
      while (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
        squares.push([nf, nr]);
        nf += df; nr += dr;
      }
    }
  }
  return squares;
}

const PIECE_POOL: PieceType[] = ["N", "N", "N", "B", "B", "K", "K", "Q", "R"];

function generateQuestion(): { piece: PieceType; square: string; expected: number } {
  const piece = PIECE_POOL[Math.floor(Math.random() * PIECE_POOL.length)];
  const f = Math.floor(Math.random() * 8);
  const r = Math.floor(Math.random() * 8);
  const square = String.fromCharCode(97 + f) + (r + 1);
  return { piece, square, expected: countAttacks(piece, f, r) };
}

function getStars(score: number): number {
  if (score >= 10) return 3;
  if (score >= 6) return 2;
  if (score >= 3) return 1;
  return 0;
}

function MiniBoard({ attempt }: { attempt: Attempt }) {
  const S = 10;
  const B = S * 8;
  const f = attempt.square.charCodeAt(0) - 97;
  const r = parseInt(attempt.square[1]) - 1;
  const svgR = 7 - r;
  const attacked = getAttackedSquares(attempt.piece, f, r);
  const attackedSet = new Set(attacked.map(([af, ar]) => `${af},${7 - ar}`));
  const borderColor = attempt.correct ? "#22c55e" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        viewBox={`0 0 ${B} ${B}`}
        className="w-20 h-20"
        style={{ border: `3px solid ${borderColor}`, borderRadius: 4 }}
      >
        {Array.from({ length: 8 }, (_, ri) =>
          Array.from({ length: 8 }, (_, fi) => {
            const isLight = (fi + ri) % 2 === 0;
            const isPiece = fi === f && ri === svgR;
            const isAttacked = attackedSet.has(`${fi},${ri}`);

            let fill = isLight ? LIGHT : DARK;
            if (isAttacked) fill = attempt.correct ? "#a3d9a3" : "#f0a0a0";
            if (isPiece) fill = "#5b9bd5";

            return (
              <rect
                key={`${fi}-${ri}`}
                x={fi * S}
                y={ri * S}
                width={S}
                height={S}
                fill={fill}
              />
            );
          }),
        )}
      </svg>
      <div className="text-xs text-center">
        <span className="font-mono font-bold">{PIECE_NAMES[attempt.piece]} {attempt.square}</span>
        <br />
        <span className={attempt.correct ? "text-green-400" : "text-red-400"}>
          {attempt.expected} squares
          {!attempt.correct && (
            <span className="text-faint"> (you: {attempt.answer})</span>
          )}
        </span>
      </div>
    </div>
  );
}

export default function MoveCounting() {
  const [gameState, setGameState] = useState<"idle" | "playing" | "done">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [question, setQuestion] = useState(generateQuestion);
  const [input, setInput] = useState("");
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [bestStars, setBestStars] = useState(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBestScore(parseInt(localStorage.getItem("blindfold-counting-best") ?? "0", 10));
    setBestStars(parseInt(localStorage.getItem("blindfold-counting-best-stars") ?? "0", 10));
  }, []);

  useEffect(() => {
    if (gameState !== "playing") return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setGameState("done");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    if (gameState === "playing") inputRef.current?.focus();
  }, [gameState, question]);

  useEffect(() => {
    if (gameState !== "done") return;
    const stars = getStars(score);
    if (score > bestScore) {
      localStorage.setItem("blindfold-counting-best", String(score));
      setBestScore(score);
    }
    if (stars > bestStars) {
      localStorage.setItem("blindfold-counting-best-stars", String(stars));
      setBestStars(stars);
    }
  }, [gameState, score, bestScore, bestStars]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (gameState !== "playing") return;
      const answer = parseInt(input.trim());
      if (isNaN(answer)) return;
      if (flashTimeout.current) clearTimeout(flashTimeout.current);

      const correct = answer === question.expected;
      setHistory((h) => [...h, {
        piece: question.piece,
        square: question.square,
        correct,
        answer,
        expected: question.expected,
      }]);

      if (correct) {
        setScore((s) => s + 1);
        setFlash("correct");
      } else {
        setFlash("wrong");
      }
      setInput("");
      setQuestion(generateQuestion());
      flashTimeout.current = setTimeout(() => setFlash(null), 200);
    },
    [gameState, input, question],
  );

  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setQuestion(generateQuestion());
    setInput("");
    setFlash(null);
    setHistory([]);
  }, []);

  const stars = getStars(score);
  const timerColor = timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-orange-400" : "bg-green-500";

  if (gameState === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Move Counting</h2>
        <p className="text-muted">
          A piece appears on a square. How many squares does it control on an empty board? You have 30 seconds!
        </p>
        {bestScore > 0 && (
          <div className="text-sm text-faint">
            Best: {bestScore} {bestStars > 0 && <StarRating stars={bestStars} size="sm" />}
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

  if (gameState === "done") {
    const wrongOnes = history.filter((a) => !a.correct);

    return (
      <div className="flex flex-col items-center gap-4 max-w-2xl mx-auto text-center">
        <h2 className="text-xl font-bold">Time&apos;s up!</h2>
        <p className="text-3xl font-bold">{score}/{history.length} correct</p>
        {stars > 0 && <StarRating stars={stars} size="lg" />}
        {bestScore > 0 && (
          <p className="text-sm text-faint">Personal best: {bestScore}</p>
        )}
        <button
          onClick={startGame}
          className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
        >
          Play Again
        </button>

        {wrongOnes.length > 0 && (
          <div className="w-full border-t border-foreground/10 mt-2 pt-4">
            <h3 className="font-bold text-sm mb-3">Mistakes ({wrongOnes.length})</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 justify-items-center">
              {wrongOnes.map((attempt, i) => (
                <MiniBoard key={i} attempt={attempt} />
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="w-full border-t border-foreground/10 mt-2 pt-4">
            <h3 className="font-bold text-sm mb-3">All answers ({history.length})</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 justify-items-center">
              {history.map((attempt, i) => (
                <MiniBoard key={i} attempt={attempt} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
      <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${timerColor} transition-all duration-1000 ease-linear`}
          style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
        />
      </div>

      <div className="flex justify-between w-full text-sm text-faint">
        <span>Score: {score}</span>
        <span>{timeLeft}s</span>
      </div>

      {/* Piece + Square */}
      <div className="flex flex-col items-center gap-2 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PIECE_ICONS[question.piece]} alt={PIECE_NAMES[question.piece]} className="w-16 h-16" />
        <div
          className={`text-4xl font-bold transition-colors duration-100 ${
            flash === "correct" ? "text-green-400" : flash === "wrong" ? "text-red-400" : ""
          }`}
        >
          {question.square}
        </div>
        <div className="text-sm text-muted">How many squares?</div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-[200px]">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="#"
          maxLength={2}
          className="flex-1 px-4 py-2 rounded-lg border border-card-border bg-card text-foreground font-mono text-2xl text-center focus:outline-none focus:border-foreground/40"
          autoComplete="off"
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
