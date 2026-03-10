"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import StarRating from "@/components/puzzle/StarRating";

const GAME_DURATION = 30;

function areSameDiagonal(sq1: string, sq2: string): boolean {
  const df = Math.abs(sq1.charCodeAt(0) - sq2.charCodeAt(0));
  const dr = Math.abs(parseInt(sq1[1]) - parseInt(sq2[1]));
  return df === dr;
}

function generatePair(): { sq1: string; sq2: string; same: boolean } {
  const forceSame = Math.random() < 0.5;

  for (;;) {
    const f1 = Math.floor(Math.random() * 8);
    const r1 = Math.floor(Math.random() * 8);

    if (forceSame) {
      // Pick another square on the same diagonal
      const dir1 = Math.random() < 0.5 ? 1 : -1;
      const dir2 = Math.random() < 0.5 ? 1 : -1;
      const dist = Math.floor(Math.random() * 7) + 1;
      const f2 = f1 + dir1 * dist;
      const r2 = r1 + dir2 * dist;
      if (f2 < 0 || f2 > 7 || r2 < 0 || r2 > 7) continue;
      return {
        sq1: String.fromCharCode(97 + f1) + (r1 + 1),
        sq2: String.fromCharCode(97 + f2) + (r2 + 1),
        same: true,
      };
    } else {
      // Pick two squares NOT on the same diagonal
      const f2 = Math.floor(Math.random() * 8);
      const r2 = Math.floor(Math.random() * 8);
      if (f1 === f2 && r1 === r2) continue;
      const sq1 = String.fromCharCode(97 + f1) + (r1 + 1);
      const sq2 = String.fromCharCode(97 + f2) + (r2 + 1);
      if (areSameDiagonal(sq1, sq2)) continue;
      return { sq1, sq2, same: false };
    }
  }
}

function getStars(score: number): number {
  if (score >= 20) return 3;
  if (score >= 12) return 2;
  if (score >= 6) return 1;
  return 0;
}

export default function SameDiagonal() {
  const [gameState, setGameState] = useState<"idle" | "playing" | "done">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [pair, setPair] = useState(generatePair);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [bestStars, setBestStars] = useState(0);
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setBestScore(parseInt(localStorage.getItem("blindfold-diagonal-best") ?? "0", 10));
    setBestStars(parseInt(localStorage.getItem("blindfold-diagonal-best-stars") ?? "0", 10));
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
      localStorage.setItem("blindfold-diagonal-best", String(score));
      setBestScore(score);
    }
    if (stars > bestStars) {
      localStorage.setItem("blindfold-diagonal-best-stars", String(stars));
      setBestStars(stars);
    }
  }, [gameState, score, bestScore, bestStars]);

  const handleAnswer = useCallback(
    (answeredYes: boolean) => {
      if (gameState !== "playing") return;
      if (flashTimeout.current) clearTimeout(flashTimeout.current);

      if (pair.same === answeredYes) {
        setScore((s) => s + 1);
        setFlash("correct");
      } else {
        setFlash("wrong");
      }
      setPair(generatePair());
      flashTimeout.current = setTimeout(() => setFlash(null), 200);
    },
    [gameState, pair],
  );

  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setPair(generatePair());
    setFlash(null);
  }, []);

  const stars = getStars(score);
  const timerColor = timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-orange-400" : "bg-green-500";

  if (gameState === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Same Diagonal?</h2>
        <p className="text-muted">
          Two squares will appear. Are they on the same diagonal? You have 30 seconds!
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
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Time&apos;s up!</h2>
        <p className="text-3xl font-bold">{score} correct</p>
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
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
      {/* Timer bar */}
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

      {/* Two squares */}
      <div
        className={`text-5xl font-bold py-8 transition-colors duration-100 ${
          flash === "correct" ? "text-green-400" : flash === "wrong" ? "text-red-400" : ""
        }`}
      >
        {pair.sq1} &mdash; {pair.sq2}
      </div>

      {/* Answer buttons */}
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
