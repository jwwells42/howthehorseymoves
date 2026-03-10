"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import StarRating from "@/components/puzzle/StarRating";

const GAME_DURATION = 30;
const ALL_SQUARES: string[] = [];
for (let f = 0; f < 8; f++) {
  for (let r = 1; r <= 8; r++) {
    ALL_SQUARES.push(String.fromCharCode(97 + f) + r);
  }
}

function isDark(sq: string): boolean {
  const file = sq.charCodeAt(0) - 97;
  const rank = parseInt(sq[1]) - 1;
  return (file + rank) % 2 === 0;
}

function randomSquare(): string {
  return ALL_SQUARES[Math.floor(Math.random() * ALL_SQUARES.length)];
}

function getStars(score: number): number {
  if (score >= 15) return 3;
  if (score >= 10) return 2;
  if (score >= 5) return 1;
  return 0;
}

const DARK_COLOR = "#2c2c2c";
const LIGHT_COLOR = "#f0ead6";

const BOARD_LIGHT = "#d4c4a0";
const BOARD_DARK = "#7a9e6e";

interface Attempt {
  square: string;
  dark: boolean;
  correct: boolean;
}

/** Mini board highlighting a single square, tinted to show dark/light + correct/wrong. */
function MiniBoard({ attempt }: { attempt: Attempt }) {
  const S = 10;
  const B = S * 8;
  const f = attempt.square.charCodeAt(0) - 97;
  const r = parseInt(attempt.square[1]) - 1;
  const svgR = 7 - r; // SVG row (y=0 is top = rank 8)

  // Tinted highlights that preserve dark/light distinction
  let highlight: string;
  if (attempt.dark && attempt.correct) highlight = "#2a5a2a";
  else if (attempt.dark && !attempt.correct) highlight = "#5a2a2a";
  else if (!attempt.dark && attempt.correct) highlight = "#b8e0b8";
  else highlight = "#e0b8b8";

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
            const isTarget = fi === f && ri === svgR;
            return (
              <rect
                key={`${fi}-${ri}`}
                x={fi * S}
                y={ri * S}
                width={S}
                height={S}
                fill={isTarget ? highlight : isLight ? BOARD_LIGHT : BOARD_DARK}
              />
            );
          }),
        )}
      </svg>
      <div className="text-xs text-center">
        <span className="font-mono font-bold">{attempt.square}</span>
        <br />
        <span className={attempt.correct ? "text-green-400" : "text-red-400"}>
          {attempt.dark ? "Dark" : "Light"}
          {!attempt.correct && (
            <span className="text-faint"> (you: {attempt.dark ? "Light" : "Dark"})</span>
          )}
        </span>
      </div>
    </div>
  );
}

export default function ColorOfSquare() {
  const [gameState, setGameState] = useState<"idle" | "playing" | "done">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [target, setTarget] = useState(randomSquare);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [bestStars, setBestStars] = useState(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  const flashTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setBestScore(parseInt(localStorage.getItem("blindfold-color-best") ?? "0", 10));
    setBestStars(parseInt(localStorage.getItem("blindfold-color-best-stars") ?? "0", 10));
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

  // Persist best score when game ends
  useEffect(() => {
    if (gameState !== "done") return;
    const stars = getStars(score);
    if (score > bestScore) {
      localStorage.setItem("blindfold-color-best", String(score));
      setBestScore(score);
    }
    if (stars > bestStars) {
      localStorage.setItem("blindfold-color-best-stars", String(stars));
      setBestStars(stars);
    }
  }, [gameState, score, bestScore, bestStars]);

  const handleAnswer = useCallback(
    (answeredDark: boolean) => {
      if (gameState !== "playing") return;
      if (flashTimeout.current) clearTimeout(flashTimeout.current);

      const correct = isDark(target) === answeredDark;
      setHistory((h) => [...h, { square: target, dark: isDark(target), correct }]);

      if (correct) {
        setScore((s) => s + 1);
        setFlash("correct");
      } else {
        setFlash("wrong");
      }
      setTarget(randomSquare());
      flashTimeout.current = setTimeout(() => setFlash(null), 200);
    },
    [gameState, target],
  );

  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setTarget(randomSquare());
    setFlash(null);
    setHistory([]);
  }, []);

  const stars = getStars(score);
  const timerColor = timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-orange-400" : "bg-green-500";

  if (gameState === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Color of Square</h2>
        <p className="text-muted">
          A square will appear. Click the correct color — dark or light. You have 30 seconds!
        </p>
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-lg border-2 border-foreground/20" style={{ backgroundColor: DARK_COLOR }} />
          <div className="w-16 h-16 rounded-lg border-2 border-foreground/20" style={{ backgroundColor: LIGHT_COLOR }} />
        </div>
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

      {/* Target square */}
      <div
        className={`text-6xl font-bold py-8 transition-colors duration-100 ${
          flash === "correct" ? "text-green-400" : flash === "wrong" ? "text-red-400" : ""
        }`}
      >
        {target}
      </div>

      {/* Answer buttons */}
      <div className="flex gap-6">
        <button
          onClick={() => handleAnswer(true)}
          className="w-28 h-28 rounded-xl border-4 border-foreground/20 hover:border-foreground/50 transition-colors active:scale-95 transition-transform"
          style={{ backgroundColor: DARK_COLOR }}
          aria-label="Dark square"
        />
        <button
          onClick={() => handleAnswer(false)}
          className="w-28 h-28 rounded-xl border-4 border-foreground/20 hover:border-foreground/50 transition-colors active:scale-95 transition-transform"
          style={{ backgroundColor: LIGHT_COLOR }}
          aria-label="Light square"
        />
      </div>
    </div>
  );
}
