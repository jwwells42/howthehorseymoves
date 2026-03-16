"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import StarRating from "@/components/puzzle/StarRating";

const GAME_DURATION = 30;

type Direction = "above" | "below" | "left" | "right" | "above-left" | "above-right" | "below-left" | "below-right";

const DIRECTION_LABELS: Record<Direction, string> = {
  "above": "\u2191 Above",
  "below": "\u2193 Below",
  "left": "\u2190 Left",
  "right": "\u2192 Right",
  "above-left": "\u2196 Above-Left",
  "above-right": "\u2197 Above-Right",
  "below-left": "\u2199 Below-Left",
  "below-right": "\u2198 Below-Right",
};

interface Question {
  sq1: string;
  sq2: string;
  direction: Direction;
}

interface Attempt extends Question {
  correct: boolean;
  answered: Direction;
}

function getDirection(sq1: string, sq2: string): Direction {
  const f1 = sq1.charCodeAt(0) - 97, r1 = parseInt(sq1[1]);
  const f2 = sq2.charCodeAt(0) - 97, r2 = parseInt(sq2[1]);

  const up = r2 > r1;
  const down = r2 < r1;
  const right = f2 > f1;
  const left = f2 < f1;

  if (up && !left && !right) return "above";
  if (down && !left && !right) return "below";
  if (left && !up && !down) return "left";
  if (right && !up && !down) return "right";
  if (up && left) return "above-left";
  if (up && right) return "above-right";
  if (down && left) return "below-left";
  return "below-right";
}

function generateQuestion(): Question {
  for (;;) {
    const f1 = Math.floor(Math.random() * 8);
    const r1 = Math.floor(Math.random() * 8);
    const f2 = Math.floor(Math.random() * 8);
    const r2 = Math.floor(Math.random() * 8);
    if (f1 === f2 && r1 === r2) continue;
    const sq1 = String.fromCharCode(97 + f1) + (r1 + 1);
    const sq2 = String.fromCharCode(97 + f2) + (r2 + 1);
    return { sq1, sq2, direction: getDirection(sq1, sq2) };
  }
}

function getStars(score: number): number {
  if (score >= 20) return 3;
  if (score >= 12) return 2;
  if (score >= 6) return 1;
  return 0;
}

// Simplified to 4 cardinal + 4 diagonal buttons
const BUTTON_LAYOUT: Direction[][] = [
  ["above-left", "above", "above-right"],
  ["left", "right"],
  ["below-left", "below", "below-right"],
];

const BUTTON_SYMBOLS: Record<Direction, string> = {
  "above-left": "\u2196",
  "above": "\u2191",
  "above-right": "\u2197",
  "left": "\u2190",
  "right": "\u2192",
  "below-left": "\u2199",
  "below": "\u2193",
  "below-right": "\u2198",
};

export default function RelativePosition() {
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
    setBestScore(parseInt(localStorage.getItem("blindfold-relative-best") ?? "0", 10));
    setBestStars(parseInt(localStorage.getItem("blindfold-relative-best-stars") ?? "0", 10));
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
      localStorage.setItem("blindfold-relative-best", String(score));
      setBestScore(score);
    }
    if (stars > bestStars) {
      localStorage.setItem("blindfold-relative-best-stars", String(stars));
      setBestStars(stars);
    }
  }, [gameState, score, bestScore, bestStars]);

  const handleAnswer = useCallback(
    (dir: Direction) => {
      if (gameState !== "playing") return;
      if (flashTimeout.current) clearTimeout(flashTimeout.current);

      const correct = question.direction === dir;
      setHistory((h) => [...h, { ...question, correct, answered: dir }]);

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
        <h2 className="text-xl font-bold">Relative Position</h2>
        <p className="text-muted">
          Where is the second square relative to the first? Click the direction arrow. You have 30 seconds!
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
            <div className="space-y-2">
              {wrongOnes.map((a, i) => (
                <div key={i} className="text-sm">
                  <span className="font-mono font-bold">{a.sq1} → {a.sq2}</span>{" "}
                  <span className="text-green-400">{DIRECTION_LABELS[a.direction]}</span>{" "}
                  <span className="text-faint">(you: {DIRECTION_LABELS[a.answered]})</span>
                </div>
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

      <div className="text-center py-2">
        <div className="text-sm text-muted mb-1">Where is <span className="font-bold">{question.sq2}</span> from <span className="font-bold">{question.sq1}</span>?</div>
        <div
          className={`text-4xl font-bold transition-colors duration-100 ${
            flash === "correct" ? "text-green-400" : flash === "wrong" ? "text-red-400" : ""
          }`}
        >
          {question.sq1} → {question.sq2}
        </div>
      </div>

      {/* Direction pad */}
      <div className="flex flex-col items-center gap-2">
        {BUTTON_LAYOUT.map((row, ri) => (
          <div key={ri} className="flex gap-2 justify-center">
            {row.map((dir) => (
              <button
                key={dir}
                onClick={() => handleAnswer(dir)}
                className="w-14 h-14 rounded-lg border-2 border-card-border bg-card text-2xl hover:border-foreground/40 transition-colors active:scale-95"
              >
                {BUTTON_SYMBOLS[dir]}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
