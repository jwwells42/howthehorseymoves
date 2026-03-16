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

function isRookMove(from: string, to: string): boolean {
  return from[0] === to[0] || from[1] === to[1];
}

function isBlocked(from: string, to: string, obstacles: Set<string>): boolean {
  const f1 = from.charCodeAt(0) - 97, r1 = parseInt(from[1]) - 1;
  const f2 = to.charCodeAt(0) - 97, r2 = parseInt(to[1]) - 1;

  if (f1 === f2) {
    const step = r2 > r1 ? 1 : -1;
    for (let r = r1 + step; r !== r2; r += step) {
      if (obstacles.has(String.fromCharCode(97 + f1) + (r + 1))) return true;
    }
  } else {
    const step = f2 > f1 ? 1 : -1;
    for (let f = f1 + step; f !== f2; f += step) {
      if (obstacles.has(String.fromCharCode(97 + f) + (r1 + 1))) return true;
    }
  }
  return false;
}

function bfsRookMaze(from: string, to: string, obstacles: Set<string>): number {
  if (from === to) return 0;
  const visited = new Set([from]);
  const queue: [string, number][] = [[from, 0]];

  while (queue.length > 0) {
    const [sq, dist] = queue.shift()!;
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;

    // All rook destinations from this square
    for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let nf = f + df, nr = r + dr;
      while (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
        const nsq = String.fromCharCode(97 + nf) + (nr + 1);
        if (obstacles.has(nsq)) break;
        if (!visited.has(nsq)) {
          if (nsq === to) return dist + 1;
          visited.add(nsq);
          queue.push([nsq, dist + 1]);
        }
        nf += df;
        nr += dr;
      }
    }
  }
  return -1;
}

function generatePuzzle(): { start: string; target: string; obstacles: Set<string>; optimal: number } {
  for (;;) {
    const sf = Math.floor(Math.random() * 8);
    const sr = Math.floor(Math.random() * 8);
    const tf = Math.floor(Math.random() * 8);
    const tr = Math.floor(Math.random() * 8);
    if (sf === tf && sr === tr) continue;
    // Must not be on same rank or file (otherwise trivial)
    if (sf === tf || sr === tr) continue;

    const start = String.fromCharCode(97 + sf) + (sr + 1);
    const target = String.fromCharCode(97 + tf) + (tr + 1);

    // Place 3-6 random obstacles
    const numObs = Math.floor(Math.random() * 4) + 3;
    const obstacles = new Set<string>();
    for (let i = 0; i < numObs; i++) {
      let oSq: string;
      do {
        oSq = String.fromCharCode(97 + Math.floor(Math.random() * 8)) + (Math.floor(Math.random() * 8) + 1);
      } while (oSq === start || oSq === target || obstacles.has(oSq));
      obstacles.add(oSq);
    }

    const optimal = bfsRookMaze(start, target, obstacles);
    if (optimal >= 2 && optimal <= 4) {
      return { start, target, obstacles, optimal };
    }
  }
}

function RouteBoard({ start, route, target, obstacles }: {
  start: string; route: string[]; target: string; obstacles: Set<string>;
}) {
  const S = 36;
  const B = S * 8;
  const allStops = [start, ...route];

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
          if (sq === start || sq === target) fill = "#4ade80";
          else if (obstacles.has(sq)) fill = "#f59e0b";
          return <rect key={`${col}-${row}`} x={col * S} y={row * S} width={S} height={S} fill={fill} />;
        })
      )}
      {/* Obstacle pawn icons */}
      {[...obstacles].map((sq) => {
        const [x, y] = sqXY(sq);
        return (
          <image key={`obs-${sq}`} href="/pieces/wP.svg"
            x={x - S * 0.35} y={y - S * 0.35} width={S * 0.7} height={S * 0.7} />
        );
      })}
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

export default function RookMaze() {
  const [puzzle, setPuzzle] = useState(generatePuzzle);
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

      if (!isRookMove(currentSquare, sq)) {
        setError(`A rook can\u2019t reach ${sq} from ${currentSquare} — must share a rank or file.`);
        return;
      }

      if (puzzle.obstacles.has(sq)) {
        setError(`${sq} is blocked by an obstacle!`);
        return;
      }

      if (isBlocked(currentSquare, sq, puzzle.obstacles)) {
        setError(`An obstacle is in the way between ${currentSquare} and ${sq}.`);
        return;
      }

      setError(null);
      const newRoute = [...route, sq];
      setRoute(newRoute);

      if (sq === puzzle.target) {
        setResult("won");
      }
    },
    [input, currentSquare, route, puzzle],
  );

  const newPuzzle = useCallback(() => {
    setPuzzle(generatePuzzle());
    setRoute([]);
    setInput("");
    setError(null);
    setResult("playing");
  }, []);

  const stars = getStars(moveCount, puzzle.optimal);

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Rook Maze</h2>
        <p className="text-muted">
          Navigate a rook from <span className="font-bold">{puzzle.start}</span> to{" "}
          <span className="font-bold">{puzzle.target}</span> around the obstacles.
        </p>
        <p className="text-xs text-faint mt-1">
          Obstacles: {[...puzzle.obstacles].sort().join(", ")} — Shortest: {puzzle.optimal} moves
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
          <p className="text-sm text-muted">{moveCount} move{moveCount !== 1 ? "s" : ""} (optimal: {puzzle.optimal})</p>
          <StarRating stars={stars} size="lg" />
          <RouteBoard start={puzzle.start} route={route} target={puzzle.target} obstacles={puzzle.obstacles} />
          <button
            ref={newRouteRef}
            onClick={newPuzzle}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            New Maze
          </button>
        </div>
      )}
    </div>
  );
}
