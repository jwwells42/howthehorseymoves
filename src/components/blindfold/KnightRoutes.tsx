"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import StarRating from "@/components/puzzle/StarRating";

const KNIGHT_OFFSETS = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

function isValidSquare(sq: string): boolean {
  if (sq.length !== 2) return false;
  const f = sq.charCodeAt(0) - 97;
  const r = parseInt(sq[1]) - 1;
  return f >= 0 && f <= 7 && r >= 0 && r <= 7;
}

function isKnightMove(from: string, to: string): boolean {
  const df = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
  const dr = Math.abs(parseInt(from[1]) - parseInt(to[1]));
  return (df === 1 && dr === 2) || (df === 2 && dr === 1);
}

function getKnightMoves(sq: string): string[] {
  const f = sq.charCodeAt(0) - 97;
  const r = parseInt(sq[1]) - 1;
  return KNIGHT_OFFSETS
    .map(([df, dr]) => [f + df, r + dr])
    .filter(([nf, nr]) => nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7)
    .map(([nf, nr]) => String.fromCharCode(97 + nf) + (nr + 1));
}

function shortestPath(from: string, to: string): number {
  if (from === to) return 0;
  const queue: [string, number][] = [[from, 0]];
  const visited = new Set([from]);
  while (queue.length > 0) {
    const [sq, dist] = queue.shift()!;
    for (const next of getKnightMoves(sq)) {
      if (next === to) return dist + 1;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([next, dist + 1]);
      }
    }
  }
  return -1;
}

function generatePair(): { start: string; target: string; optimal: number } {
  for (;;) {
    const sf = Math.floor(Math.random() * 8);
    const sr = Math.floor(Math.random() * 8);
    const tf = Math.floor(Math.random() * 8);
    const tr = Math.floor(Math.random() * 8);
    if (sf === tf && sr === tr) continue;
    const start = String.fromCharCode(97 + sf) + (sr + 1);
    const target = String.fromCharCode(97 + tf) + (tr + 1);
    const dist = shortestPath(start, target);
    if (dist >= 2 && dist <= 4) return { start, target, optimal: dist };
  }
}

function getStars(moves: number, optimal: number): number {
  if (moves <= optimal) return 3;
  if (moves <= optimal + 1) return 2;
  return 1;
}

export default function KnightRoutes() {
  const [puzzle, setPuzzle] = useState(generatePair);
  const [route, setRoute] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<"playing" | "won">("playing");
  const inputRef = useRef<HTMLInputElement>(null);
  const newRouteRef = useRef<HTMLButtonElement>(null);

  const currentSquare = route.length > 0 ? route[route.length - 1] : puzzle.start;
  const moveCount = route.length;

  useEffect(() => {
    if (result === "playing") {
      inputRef.current?.focus();
    } else if (result === "won") {
      newRouteRef.current?.focus();
    }
  }, [result, route]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const sq = input.trim().toLowerCase();
      setInput("");

      if (!isValidSquare(sq)) {
        setError("Not a valid square.");
        return;
      }

      if (!isKnightMove(currentSquare, sq)) {
        setError(`A knight can\u2019t reach ${sq} from ${currentSquare}.`);
        return;
      }

      setError(null);
      const newRoute = [...route, sq];
      setRoute(newRoute);

      if (sq === puzzle.target) {
        setResult("won");
      }
    },
    [input, currentSquare, route, puzzle.target],
  );

  const newPuzzle = useCallback(() => {
    setPuzzle(generatePair());
    setRoute([]);
    setInput("");
    setError(null);
    setResult("playing");
  }, []);

  const stars = getStars(moveCount, puzzle.optimal);

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Knight Routes</h2>
        <p className="text-muted">
          Find a knight route from <span className="font-bold">{puzzle.start}</span> to{" "}
          <span className="font-bold">{puzzle.target}</span>.
        </p>
        <p className="text-xs text-faint mt-1">
          Shortest path: {puzzle.optimal} moves
        </p>
      </div>

      {/* Route display */}
      <div className="w-full p-4 rounded-xl border border-card-border bg-card min-h-[3rem] flex flex-wrap items-center gap-1">
        <span className="font-mono font-bold">{puzzle.start}</span>
        {route.map((sq, i) => (
          <span key={i} className="font-mono">
            <span className="text-faint mx-1">&rarr;</span>
            <span className={`font-bold ${sq === puzzle.target ? "text-green-400" : ""}`}>{sq}</span>
          </span>
        ))}
        {result === "playing" && (
          <span className="text-faint mx-1">&rarr; ?</span>
        )}
      </div>

      {result === "playing" ? (
        <>
          <form onSubmit={handleSubmit} className="flex gap-2 w-full">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Next square..."
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
          {error && (
            <p className="text-red-400 text-sm font-medium">{error}</p>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <p className="font-bold text-lg">Route complete!</p>
          <p className="text-sm text-muted">{moveCount} moves (optimal: {puzzle.optimal})</p>
          <StarRating stars={stars} size="lg" />
          <button
            ref={newRouteRef}
            onClick={newPuzzle}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            New Route
          </button>
        </div>
      )}
    </div>
  );
}
