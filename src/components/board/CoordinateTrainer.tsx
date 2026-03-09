"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { FILES, RANKS, SquareId } from "@/lib/logic/types";

const SQUARE_SIZE = 100;
const BOARD_SIZE = SQUARE_SIZE * 8;
const LIGHT = "#d4c4a0";
const DARK = "#7a9e6e";
const CORRECT_COLOR = "#4ade80";
const WRONG_COLOR = "#ef4444";
const GAME_DURATION = 30;

const ALL_SQUARES: SquareId[] = [];
for (const f of FILES) {
  for (const r of RANKS) {
    ALL_SQUARES.push(`${f}${r}` as SquareId);
  }
}

function randomSquare(exclude?: SquareId): SquareId {
  let sq: SquareId;
  do {
    sq = ALL_SQUARES[Math.floor(Math.random() * 64)];
  } while (sq === exclude);
  return sq;
}

type GameState = "idle" | "playing" | "done";

export default function CoordinateTrainer() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [target, setTarget] = useState<SquareId>(() => randomSquare());
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [flash, setFlash] = useState<{ sq: SquareId; correct: boolean } | null>(null);
  const [bestScore, setBestScore] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("coord-best") ?? "0", 10);
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setTarget(randomSquare());
    setFlash(null);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setGameState("done");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Save best score
  useEffect(() => {
    if (gameState === "done" && score > bestScore) {
      setBestScore(score);
      localStorage.setItem("coord-best", String(score));
    }
  }, [gameState, score, bestScore]);

  const handleClick = useCallback(
    (sq: SquareId) => {
      if (gameState !== "playing") return;
      if (sq === target) {
        setScore((s) => s + 1);
        setFlash({ sq, correct: true });
        setTarget(randomSquare(sq));
      } else {
        setFlash({ sq, correct: false });
      }
      setTimeout(() => setFlash(null), 200);
    },
    [gameState, target],
  );

  const progressPct = (timeLeft / GAME_DURATION) * 100;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Pre-game / post-game messages */}
      {gameState === "idle" && (
        <div className="text-center">
          <p className="text-muted mb-4">
            A coordinate appears — click the right square. How many can you get in {GAME_DURATION} seconds?
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-colors"
          >
            Start
          </button>
        </div>
      )}
      {gameState === "done" && (
        <div className="text-center">
          <div className="text-4xl font-bold mb-1">{score}</div>
          <p className="text-muted mb-1">
            {score >= 20 ? "Amazing!" : score >= 15 ? "Great job!" : score >= 10 ? "Nice work!" : "Keep practicing!"}
          </p>
          {bestScore > 0 && (
            <p className="text-sm text-faint mb-3">Best: {bestScore}</p>
          )}
          <button
            onClick={startGame}
            className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-colors"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Timer bar + score */}
      {gameState === "playing" && (
        <div className="w-full max-w-[min(90vw,90vh-8rem)] flex items-center gap-3">
          <span className="text-sm font-bold w-8 text-right">{timeLeft}s</span>
          <div className="flex-1 h-2 rounded-full bg-btn overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{
                width: `${progressPct}%`,
                backgroundColor: timeLeft <= 5 ? "#ef4444" : timeLeft <= 10 ? "#f59e0b" : "#4ade80",
              }}
            />
          </div>
          <span className="text-sm font-bold w-8">{score}</span>
        </div>
      )}

      {/* Board */}
      <svg
        viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
        className="w-full max-w-[min(90vw,90vh-8rem)] aspect-square touch-none"
      >
        {RANKS.map((rank, ri) =>
          FILES.map((file, fi) => {
            const sq = `${file}${rank}` as SquareId;
            const isLight = (fi + ri) % 2 === 0;
            const isFlash = flash && flash.sq === sq;

            let fill = isLight ? LIGHT : DARK;
            if (isFlash) {
              fill = flash.correct ? CORRECT_COLOR : WRONG_COLOR;
            }

            return (
              <g
                key={sq}
                onClick={() => handleClick(sq)}
                className={gameState === "playing" ? "cursor-pointer" : ""}
              >
                <rect
                  x={fi * SQUARE_SIZE}
                  y={ri * SQUARE_SIZE}
                  width={SQUARE_SIZE}
                  height={SQUARE_SIZE}
                  fill={fill}
                />
                {/* File labels on bottom rank */}
                {ri === 7 && (
                  <text
                    x={fi * SQUARE_SIZE + 5}
                    y={ri * SQUARE_SIZE + SQUARE_SIZE - 5}
                    fontSize="14"
                    fill={isLight ? DARK : LIGHT}
                    fontWeight="bold"
                    className="pointer-events-none select-none"
                  >
                    {file}
                  </text>
                )}
                {/* Rank labels on left file */}
                {fi === 0 && (
                  <text
                    x={5}
                    y={ri * SQUARE_SIZE + 16}
                    fontSize="14"
                    fill={isLight ? DARK : LIGHT}
                    fontWeight="bold"
                    className="pointer-events-none select-none"
                  >
                    {rank}
                  </text>
                )}
              </g>
            );
          }),
        )}

        {/* Target coordinate in center of board */}
        {gameState === "playing" && (
          <text
            x={BOARD_SIZE / 2}
            y={BOARD_SIZE / 2 + 36}
            fontSize="120"
            textAnchor="middle"
            fill="white"
            stroke="black"
            strokeWidth="3"
            paintOrder="stroke"
            fontWeight="bold"
            className="pointer-events-none select-none"
            style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}
          >
            {target}
          </text>
        )}
      </svg>
    </div>
  );
}
