"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import StarRating from "@/components/puzzle/StarRating";

const GAME_DURATION = 30;
const LIGHT = "#d4c4a0";
const DARK = "#7a9e6e";

interface Attempt {
  square: string;
  neighbors: string[];
  found: string[];
  missed: string[];
  correct: boolean;
}

function getNeighbors(sq: string): string[] {
  const f = sq.charCodeAt(0) - 97;
  const r = parseInt(sq[1]) - 1;
  const neighbors: string[] = [];
  for (const [df, dr] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nf = f + df, nr = r + dr;
    if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
      neighbors.push(String.fromCharCode(97 + nf) + (nr + 1));
    }
  }
  return neighbors.sort();
}

function randomSquare(): string {
  const f = Math.floor(Math.random() * 8);
  const r = Math.floor(Math.random() * 8);
  return String.fromCharCode(97 + f) + (r + 1);
}

function isValidSquare(sq: string): boolean {
  if (sq.length !== 2) return false;
  const f = sq.charCodeAt(0) - 97;
  const r = parseInt(sq[1]) - 1;
  return f >= 0 && f <= 7 && r >= 0 && r <= 7;
}

function getStars(score: number): number {
  if (score >= 8) return 3;
  if (score >= 5) return 2;
  if (score >= 3) return 1;
  return 0;
}

function sqToCoords(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
}

function MiniBoard({ attempt }: { attempt: Attempt }) {
  const S = 10;
  const B = S * 8;
  const [cf, cr] = sqToCoords(attempt.square);
  const foundSet = new Set(attempt.found);
  const missedSet = new Set(attempt.missed);
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
            const isCenter = fi === cf && ri === cr;
            const sqName = String.fromCharCode(97 + fi) + (8 - ri);
            const isFound = foundSet.has(sqName);
            const isMissed = missedSet.has(sqName);

            let fill = isLight ? LIGHT : DARK;
            if (isFound) fill = "#a3d9a3";
            if (isMissed) fill = "#f0a0a0";
            if (isCenter) fill = "#5b9bd5";

            return (
              <rect key={`${fi}-${ri}`} x={fi * S} y={ri * S} width={S} height={S} fill={fill} />
            );
          }),
        )}
      </svg>
      <div className="text-xs text-center">
        <span className="font-mono font-bold">{attempt.square}</span>
        <br />
        <span className={attempt.correct ? "text-green-400" : "text-red-400"}>
          {attempt.found.length}/{attempt.neighbors.length}
          {attempt.missed.length > 0 && (
            <span className="text-faint"> missed: {attempt.missed.join(", ")}</span>
          )}
        </span>
      </div>
    </div>
  );
}

export default function NeighborSquares() {
  const [gameState, setGameState] = useState<"idle" | "playing" | "done">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [target, setTarget] = useState(randomSquare);
  const [input, setInput] = useState("");
  const [entered, setEntered] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bestScore, setBestScore] = useState(0);
  const [bestStars, setBestStars] = useState(0);
  const [history, setHistory] = useState<Attempt[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const neighbors = getNeighbors(target);

  useEffect(() => {
    setBestScore(parseInt(localStorage.getItem("blindfold-neighbors-best") ?? "0", 10));
    setBestStars(parseInt(localStorage.getItem("blindfold-neighbors-best-stars") ?? "0", 10));
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
  }, [gameState, target]);

  useEffect(() => {
    if (gameState !== "done") return;
    const stars = getStars(score);
    if (score > bestScore) {
      localStorage.setItem("blindfold-neighbors-best", String(score));
      setBestScore(score);
    }
    if (stars > bestStars) {
      localStorage.setItem("blindfold-neighbors-best-stars", String(stars));
      setBestStars(stars);
    }
  }, [gameState, score, bestScore, bestStars]);

  const advanceToNext = useCallback((currentEntered: string[]) => {
    const currentNeighbors = getNeighbors(target);
    const missed = currentNeighbors.filter((n) => !currentEntered.includes(n));
    const allCorrect = missed.length === 0;
    setHistory((h) => [...h, {
      square: target,
      neighbors: currentNeighbors,
      found: currentEntered,
      missed,
      correct: allCorrect,
    }]);
    if (allCorrect) setScore((s) => s + 1);
    setTarget(randomSquare());
    setEntered([]);
    setError(null);
  }, [target]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (gameState !== "playing") return;
      const sq = input.trim().toLowerCase();
      setInput("");

      if (!isValidSquare(sq)) {
        setError("Not a valid square.");
        return;
      }

      if (entered.includes(sq)) {
        setError("Already entered.");
        return;
      }

      if (!neighbors.includes(sq)) {
        setError(`${sq} is not adjacent to ${target}.`);
        return;
      }

      setError(null);
      const newEntered = [...entered, sq];
      setEntered(newEntered);

      // If all neighbors found, advance
      if (newEntered.length === neighbors.length) {
        advanceToNext(newEntered);
      }
    },
    [gameState, input, entered, neighbors, target, advanceToNext],
  );

  const handleSkip = useCallback(() => {
    if (gameState !== "playing") return;
    advanceToNext(entered);
  }, [gameState, entered, advanceToNext]);

  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setTarget(randomSquare());
    setEntered([]);
    setInput("");
    setError(null);
    setHistory([]);
  }, []);

  const stars = getStars(score);
  const timerColor = timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-orange-400" : "bg-green-500";

  if (gameState === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Neighbor Squares</h2>
        <p className="text-muted">
          A square appears. Type all adjacent squares (where a king could move). Find them all, then the next square appears. You have 30 seconds!
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
        <p className="text-3xl font-bold">{score} completed</p>
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
            <h3 className="font-bold text-sm mb-3">Incomplete ({wrongOnes.length})</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 justify-items-center">
              {wrongOnes.map((attempt, i) => (
                <MiniBoard key={i} attempt={attempt} />
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="w-full border-t border-foreground/10 mt-2 pt-4">
            <h3 className="font-bold text-sm mb-3">All squares ({history.length})</h3>
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
        <span>Completed: {score}</span>
        <span>{timeLeft}s</span>
      </div>

      {/* Target square */}
      <div className="text-5xl font-bold py-4">{target}</div>
      <div className="text-sm text-muted">
        {entered.length}/{neighbors.length} neighbors found
      </div>

      {/* Entered squares */}
      {entered.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {entered.map((sq) => (
            <span key={sq} className="px-2 py-1 bg-green-600/20 text-green-400 rounded font-mono text-sm font-bold">
              {sq}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 w-full max-w-[240px]">
        <form onSubmit={handleSubmit} className="flex gap-2 flex-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Square..."
            maxLength={2}
            className="flex-1 px-3 py-2 rounded-lg border border-card-border bg-card text-foreground font-mono text-lg text-center focus:outline-none focus:border-foreground/40"
            autoComplete="off"
            autoCapitalize="off"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            Go
          </button>
        </form>
        <button
          onClick={handleSkip}
          className="px-3 py-2 rounded-lg border border-card-border text-faint hover:text-foreground transition-colors text-sm"
        >
          Skip
        </button>
      </div>

      {error && (
        <p className="text-red-400 text-sm font-medium">{error}</p>
      )}
    </div>
  );
}
