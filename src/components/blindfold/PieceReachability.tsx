"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import StarRating from "@/components/puzzle/StarRating";

const GAME_DURATION = 30;
const LIGHT = "#d4c4a0";
const DARK = "#7a9e6e";

type PieceType = "N" | "B";

const PIECE_NAMES: Record<PieceType, string> = { N: "Knight", B: "Bishop" };

interface Question {
  piece: PieceType;
  from: string;
  to: string;
  reachable: boolean;
  reason: string;
}

interface Attempt extends Question {
  correct: boolean;
}

function sameColor(sq1: string, sq2: string): boolean {
  const f1 = sq1.charCodeAt(0) - 97, r1 = parseInt(sq1[1]) - 1;
  const f2 = sq2.charCodeAt(0) - 97, r2 = parseInt(sq2[1]) - 1;
  return (f1 + r1) % 2 === (f2 + r2) % 2;
}

function knightCanReachInN(from: string, to: string, n: number): boolean {
  if (n === 0) return from === to;
  const visited = new Set([from]);
  let frontier = [from];
  for (let step = 0; step < n; step++) {
    const next: string[] = [];
    for (const sq of frontier) {
      const f = sq.charCodeAt(0) - 97;
      const r = parseInt(sq[1]) - 1;
      for (const [df, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nf = f + df, nr = r + dr;
        if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
        const nsq = String.fromCharCode(97 + nf) + (nr + 1);
        if (visited.has(nsq)) continue;
        visited.add(nsq);
        next.push(nsq);
        if (nsq === to) return true;
      }
    }
    frontier = next;
  }
  return false;
}

function generateQuestion(): Question {
  const piece: PieceType = Math.random() < 0.5 ? "N" : "B";
  const forceYes = Math.random() < 0.5;

  for (;;) {
    const f1 = Math.floor(Math.random() * 8);
    const r1 = Math.floor(Math.random() * 8);
    const f2 = Math.floor(Math.random() * 8);
    const r2 = Math.floor(Math.random() * 8);
    if (f1 === f2 && r1 === r2) continue;
    const from = String.fromCharCode(97 + f1) + (r1 + 1);
    const to = String.fromCharCode(97 + f2) + (r2 + 1);

    if (piece === "B") {
      const same = sameColor(from, to);
      if (forceYes && !same) continue;
      if (!forceYes && same) continue;
      return {
        piece: "B",
        from, to,
        reachable: same,
        reason: same ? "Same color squares" : "Different color squares",
      };
    } else {
      // Knight: "Can a knight reach X from Y in N moves?"
      const moves = Math.floor(Math.random() * 3) + 2; // 2-4 moves
      const canReach = knightCanReachInN(from, to, moves);
      if (forceYes && !canReach) continue;
      if (!forceYes && canReach) continue;
      return {
        piece: "N",
        from, to,
        reachable: canReach,
        reason: canReach ? `Reachable in ≤${moves} moves` : `Not reachable in ${moves} moves`,
      };
    }
  }
}

function getStars(score: number): number {
  if (score >= 18) return 3;
  if (score >= 10) return 2;
  if (score >= 5) return 1;
  return 0;
}

function sqToCoords(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
}

function MiniBoard({ attempt }: { attempt: Attempt }) {
  const S = 10;
  const B = S * 8;
  const [f1, r1] = sqToCoords(attempt.from);
  const [f2, r2] = sqToCoords(attempt.to);
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
            const isSq1 = fi === f1 && ri === r1;
            const isSq2 = fi === f2 && ri === r2;
            let fill = isLight ? LIGHT : DARK;
            if (isSq1) fill = "#5b9bd5";
            if (isSq2) fill = attempt.reachable ? "#4ade80" : "#ef4444";
            return (
              <rect key={`${fi}-${ri}`} x={fi * S} y={ri * S} width={S} height={S} fill={fill} />
            );
          }),
        )}
      </svg>
      <div className="text-xs text-center">
        <span className="font-mono font-bold">{PIECE_NAMES[attempt.piece]}</span>
        <br />
        <span className="font-mono">{attempt.from} → {attempt.to}</span>
        <br />
        <span className={attempt.correct ? "text-green-400" : "text-red-400"}>
          {attempt.reachable ? "Yes" : "No"}
          {!attempt.correct && (
            <span className="text-faint"> (you: {attempt.reachable ? "No" : "Yes"})</span>
          )}
        </span>
      </div>
    </div>
  );
}

export default function PieceReachability() {
  const [gameState, setGameState] = useState<"idle" | "playing" | "done">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [question, setQuestion] = useState(generateQuestion);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [bestStars, setBestStars] = useState(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setBestScore(parseInt(localStorage.getItem("blindfold-reachability-best") ?? "0", 10));
    setBestStars(parseInt(localStorage.getItem("blindfold-reachability-best-stars") ?? "0", 10));
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
    if (gameState !== "done") return;
    const stars = getStars(score);
    if (score > bestScore) {
      localStorage.setItem("blindfold-reachability-best", String(score));
      setBestScore(score);
    }
    if (stars > bestStars) {
      localStorage.setItem("blindfold-reachability-best-stars", String(stars));
      setBestStars(stars);
    }
  }, [gameState, score, bestScore, bestStars]);

  const handleAnswer = useCallback(
    (answeredYes: boolean) => {
      if (gameState !== "playing") return;
      if (flashTimeout.current) clearTimeout(flashTimeout.current);

      const correct = question.reachable === answeredYes;
      setHistory((h) => [...h, { ...question, correct }]);

      if (correct) {
        setScore((s) => s + 1);
        setFlash("correct");
      } else {
        setFlash("wrong");
      }
      setQuestion(generateQuestion());
      flashTimeout.current = setTimeout(() => setFlash(null), 200);
    },
    [gameState, question],
  );

  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setQuestion(generateQuestion());
    setFlash(null);
    setHistory([]);
  }, []);

  const stars = getStars(score);
  const timerColor = timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-orange-400" : "bg-green-500";

  if (gameState === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Piece Reachability</h2>
        <p className="text-muted">
          Can the piece reach the target square? Bishops need same-color squares. Knights need the right number of moves. You have 30 seconds!
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

      {/* Question display */}
      <div className="flex flex-col items-center gap-2 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/pieces/w${question.piece}.svg`}
          alt={PIECE_NAMES[question.piece]}
          className="w-12 h-12"
        />
        <div
          className={`text-3xl font-bold transition-colors duration-100 ${
            flash === "correct" ? "text-green-400" : flash === "wrong" ? "text-red-400" : ""
          }`}
        >
          {question.from} → {question.to}
        </div>
        <div className="text-sm text-muted">
          {question.piece === "B"
            ? "Can a bishop reach it?"
            : `Can a knight reach it in ≤${question.reason.match(/\d+/)?.[0] ?? "?"} moves?`}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => handleAnswer(true)}
          className="px-10 py-4 rounded-xl border-2 border-green-600 text-green-400 font-bold text-lg hover:bg-green-600/20 transition-colors active:scale-95"
        >
          Yes
        </button>
        <button
          onClick={() => handleAnswer(false)}
          className="px-10 py-4 rounded-xl border-2 border-red-500 text-red-400 font-bold text-lg hover:bg-red-500/20 transition-colors active:scale-95"
        >
          No
        </button>
      </div>
    </div>
  );
}
