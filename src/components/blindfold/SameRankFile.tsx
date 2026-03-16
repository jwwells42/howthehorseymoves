"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import StarRating from "@/components/puzzle/StarRating";

const GAME_DURATION = 30;
const LIGHT = "#d4c4a0";
const DARK = "#7a9e6e";

interface Attempt {
  sq1: string;
  sq2: string;
  same: boolean;
  sharedType: "rank" | "file" | null;
  correct: boolean;
}

function generatePair(): { sq1: string; sq2: string; same: boolean; sharedType: "rank" | "file" | null } {
  const forceSame = Math.random() < 0.5;

  for (;;) {
    const f1 = Math.floor(Math.random() * 8);
    const r1 = Math.floor(Math.random() * 8);

    if (forceSame) {
      const useRank = Math.random() < 0.5;
      if (useRank) {
        const f2 = Math.floor(Math.random() * 8);
        if (f2 === f1) continue;
        return {
          sq1: String.fromCharCode(97 + f1) + (r1 + 1),
          sq2: String.fromCharCode(97 + f2) + (r1 + 1),
          same: true,
          sharedType: "rank",
        };
      } else {
        const r2 = Math.floor(Math.random() * 8);
        if (r2 === r1) continue;
        return {
          sq1: String.fromCharCode(97 + f1) + (r1 + 1),
          sq2: String.fromCharCode(97 + f1) + (r2 + 1),
          same: true,
          sharedType: "file",
        };
      }
    } else {
      const f2 = Math.floor(Math.random() * 8);
      const r2 = Math.floor(Math.random() * 8);
      if (f1 === f2 && r1 === r2) continue;
      if (f1 === f2 || r1 === r2) continue;
      return {
        sq1: String.fromCharCode(97 + f1) + (r1 + 1),
        sq2: String.fromCharCode(97 + f2) + (r2 + 1),
        same: false,
        sharedType: null,
      };
    }
  }
}

function getStars(score: number): number {
  if (score >= 20) return 3;
  if (score >= 12) return 2;
  if (score >= 6) return 1;
  return 0;
}

function sqToCoords(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
}

function MiniBoard({ attempt }: { attempt: Attempt }) {
  const S = 10;
  const B = S * 8;
  const [f1, r1] = sqToCoords(attempt.sq1);
  const [f2, r2] = sqToCoords(attempt.sq2);

  const highlightSquares: [number, number][] = [];
  if (attempt.sharedType === "rank") {
    for (let f = 0; f < 8; f++) highlightSquares.push([f, r1]);
  } else if (attempt.sharedType === "file") {
    for (let r = 0; r < 8; r++) highlightSquares.push([f1, r]);
  }

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
            const isHighlight = highlightSquares.some(([hf, hr]) => hf === fi && hr === ri);
            const isSq1 = fi === f1 && ri === r1;
            const isSq2 = fi === f2 && ri === r2;

            let fill = isLight ? LIGHT : DARK;
            if (isHighlight) fill = attempt.correct ? "#a3d9a3" : "#f0a0a0";
            if (isSq1 || isSq2) fill = "#5b9bd5";

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
        <span className="font-mono font-bold">{attempt.sq1} — {attempt.sq2}</span>
        <br />
        <span className={attempt.correct ? "text-green-400" : "text-red-400"}>
          {attempt.same ? `Yes (${attempt.sharedType})` : "No"}
          {!attempt.correct && (
            <span className="text-faint"> (you: {attempt.same ? "No" : "Yes"})</span>
          )}
        </span>
      </div>
    </div>
  );
}

export default function SameRankFile() {
  const [gameState, setGameState] = useState<"idle" | "playing" | "done">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [pair, setPair] = useState(generatePair);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [bestStars, setBestStars] = useState(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setBestScore(parseInt(localStorage.getItem("blindfold-rankfile-best") ?? "0", 10));
    setBestStars(parseInt(localStorage.getItem("blindfold-rankfile-best-stars") ?? "0", 10));
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
      localStorage.setItem("blindfold-rankfile-best", String(score));
      setBestScore(score);
    }
    if (stars > bestStars) {
      localStorage.setItem("blindfold-rankfile-best-stars", String(stars));
      setBestStars(stars);
    }
  }, [gameState, score, bestScore, bestStars]);

  const handleAnswer = useCallback(
    (answeredYes: boolean) => {
      if (gameState !== "playing") return;
      if (flashTimeout.current) clearTimeout(flashTimeout.current);

      const correct = pair.same === answeredYes;
      setHistory((h) => [...h, { sq1: pair.sq1, sq2: pair.sq2, same: pair.same, sharedType: pair.sharedType, correct }]);

      if (correct) {
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
    setHistory([]);
  }, []);

  const stars = getStars(score);
  const timerColor = timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-orange-400" : "bg-green-500";

  if (gameState === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Same Rank or File?</h2>
        <p className="text-muted">
          Two squares will appear. Do they share a rank or file? You have 30 seconds!
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

      <div
        className={`text-5xl font-bold py-8 transition-colors duration-100 ${
          flash === "correct" ? "text-green-400" : flash === "wrong" ? "text-red-400" : ""
        }`}
      >
        {pair.sq1} &mdash; {pair.sq2}
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
