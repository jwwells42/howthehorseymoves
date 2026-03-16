"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import StarRating from "@/components/puzzle/StarRating";

const LIGHT = "#d4c4a0";
const DARK = "#7a9e6e";

function isValidSquare(sq: string): boolean {
  if (sq.length !== 2) return false;
  const f = sq.charCodeAt(0) - 97;
  const r = parseInt(sq[1]) - 1;
  return f >= 0 && f <= 7 && r >= 0 && r <= 7;
}

function sameColor(sq1: string, sq2: string): boolean {
  const f1 = sq1.charCodeAt(0) - 97, r1 = parseInt(sq1[1]) - 1;
  const f2 = sq2.charCodeAt(0) - 97, r2 = parseInt(sq2[1]) - 1;
  return (f1 + r1) % 2 === (f2 + r2) % 2;
}

function isBishopMove(from: string, to: string): boolean {
  const df = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
  const dr = Math.abs(parseInt(from[1]) - parseInt(to[1]));
  return df === dr && df > 0;
}

function getBishopMoves(sq: string): string[] {
  const f = sq.charCodeAt(0) - 97;
  const r = parseInt(sq[1]) - 1;
  const moves: string[] = [];
  for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    let nf = f + df, nr = r + dr;
    while (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
      moves.push(String.fromCharCode(97 + nf) + (nr + 1));
      nf += df;
      nr += dr;
    }
  }
  return moves;
}

function shortestPath(from: string, to: string): number {
  if (!sameColor(from, to)) return -1;
  if (from === to) return 0;
  if (isBishopMove(from, to)) return 1;
  // On an empty board, any same-color non-diagonal square is reachable in 2
  return 2;
}

function generatePair(): { start: string; target: string; optimal: number; possible: boolean } {
  const roll = Math.random();
  for (;;) {
    const sf = Math.floor(Math.random() * 8);
    const sr = Math.floor(Math.random() * 8);
    const tf = Math.floor(Math.random() * 8);
    const tr = Math.floor(Math.random() * 8);
    if (sf === tf && sr === tr) continue;
    const start = String.fromCharCode(97 + sf) + (sr + 1);
    const target = String.fromCharCode(97 + tf) + (tr + 1);
    const same = sameColor(start, target);

    if (roll < 0.30) {
      // Want impossible (different color)
      if (same) continue;
      return { start, target, optimal: -1, possible: false };
    } else if (roll < 0.65) {
      // Want distance 1 (same diagonal)
      if (!same || !isBishopMove(start, target)) continue;
      return { start, target, optimal: 1, possible: true };
    } else {
      // Want distance 2 (same color, not same diagonal)
      if (!same || isBishopMove(start, target)) continue;
      return { start, target, optimal: 2, possible: true };
    }
  }
}

function RouteBoard({ start, route, target }: { start: string; route: string[]; target: string }) {
  const S = 36;
  const B = S * 8;
  const allStops = [start, ...route];
  const stopSet = new Set(allStops);

  function sqXY(sq: string): [number, number] {
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;
    return [f * S + S / 2, (7 - r) * S + S / 2];
  }

  return (
    <svg viewBox={`-14 -2 ${B + 28} ${B + 16}`} className="w-full max-w-[280px] sm:max-w-[360px]">
      {Array.from({ length: 8 }, (_, i) => (
        <text key={`r${i}`} x={-6} y={(7 - i) * S + S / 2 + 3}
          textAnchor="middle" fontSize="8" fill="#888">{i + 1}</text>
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <text key={`f${i}`} x={i * S + S / 2} y={B + 10}
          textAnchor="middle" fontSize="8" fill="#888">{String.fromCharCode(97 + i)}</text>
      ))}
      {Array.from({ length: 8 }, (_, row) =>
        Array.from({ length: 8 }, (_, col) => {
          const sq = String.fromCharCode(97 + col) + (8 - row);
          const isLight = (col + row) % 2 === 0;
          let fill = isLight ? LIGHT : DARK;
          if (sq === start) fill = "#4ade80";
          else if (sq === target) fill = "#4ade80";
          else if (stopSet.has(sq)) fill = "#60a5fa";
          return <rect key={`${col}-${row}`} x={col * S} y={row * S} width={S} height={S} fill={fill} />;
        })
      )}
      {allStops.slice(1).map((sq, i) => {
        const [x1, y1] = sqXY(allStops[i]);
        const [x2, y2] = sqXY(sq);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinecap="round" />;
      })}
      {allStops.map((sq, i) => {
        const [x, y] = sqXY(sq);
        const isEnd = sq === target;
        return (
          <g key={`dot-${i}`}>
            <circle cx={x} cy={y} r={S * 0.3}
              fill={i === 0 || isEnd ? "#166534" : "#1e40af"}
              stroke="white" strokeWidth="1.5" />
            <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="central"
              fontSize="9" fill="white" fontWeight="bold">
              {i === 0 ? "S" : i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function getStars(moves: number, optimal: number): number {
  if (moves <= optimal) return 3;
  if (moves <= optimal + 1) return 2;
  return 1;
}

export default function BishopRoutes() {
  const [puzzle, setPuzzle] = useState(generatePair);
  const [route, setRoute] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<"playing" | "won" | "correct-impossible">("playing");
  const inputRef = useRef<HTMLInputElement>(null);
  const newRouteRef = useRef<HTMLButtonElement>(null);

  const currentSquare = route.length > 0 ? route[route.length - 1] : puzzle.start;
  const moveCount = route.length;

  useEffect(() => {
    if (result === "playing") {
      inputRef.current?.focus();
    } else {
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

      if (!isBishopMove(currentSquare, sq)) {
        setError(`A bishop can\u2019t reach ${sq} from ${currentSquare}.`);
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

  const handleImpossible = useCallback(() => {
    if (!puzzle.possible) {
      setResult("correct-impossible");
    } else {
      setError("It IS possible! They\u2019re on the same color squares.");
    }
  }, [puzzle.possible]);

  const newPuzzle = useCallback(() => {
    setPuzzle(generatePair());
    setRoute([]);
    setInput("");
    setError(null);
    setResult("playing");
  }, []);

  const stars = result === "correct-impossible" ? 3 : getStars(moveCount, puzzle.optimal);

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Bishop Routes</h2>
        <p className="text-muted">
          Find a bishop path from <span className="font-bold">{puzzle.start}</span> to{" "}
          <span className="font-bold">{puzzle.target}</span> — or spot when it&apos;s impossible!
        </p>
        {puzzle.possible && (
          <p className="text-xs text-faint mt-1">
            Shortest path: {puzzle.optimal} move{puzzle.optimal !== 1 ? "s" : ""}
          </p>
        )}
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
          <button
            onClick={handleImpossible}
            className="px-6 py-2 rounded-lg border-2 border-red-500 text-red-400 font-medium hover:bg-red-500/20 transition-colors"
          >
            Can&apos;t reach!
          </button>
          {error && (
            <p className="text-red-400 text-sm font-medium">{error}</p>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          {result === "correct-impossible" ? (
            <>
              <p className="font-bold text-lg">Correct! Impossible!</p>
              <p className="text-sm text-muted">
                {puzzle.start} and {puzzle.target} are on different color squares — a bishop can never reach it.
              </p>
            </>
          ) : (
            <>
              <p className="font-bold text-lg">Route complete!</p>
              <p className="text-sm text-muted">{moveCount} move{moveCount !== 1 ? "s" : ""} (optimal: {puzzle.optimal})</p>
            </>
          )}
          <StarRating stars={stars} size="lg" />
          {result === "won" && (
            <RouteBoard start={puzzle.start} route={route} target={puzzle.target} />
          )}
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
