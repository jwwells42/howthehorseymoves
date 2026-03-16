"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import StarRating from "@/components/puzzle/StarRating";

const KNIGHT_OFFSETS: [number, number][] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

const LIGHT = "#d4c4a0";
const DARK = "#7a9e6e";

function sqToFR(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, parseInt(sq[1]) - 1];
}

function frToSq(f: number, r: number): string {
  return String.fromCharCode(97 + f) + (r + 1);
}

function isOnBoard(f: number, r: number): boolean {
  return f >= 0 && f <= 7 && r >= 0 && r <= 7;
}

function isValidSquare(sq: string): boolean {
  if (sq.length !== 2) return false;
  const [f, r] = sqToFR(sq);
  return isOnBoard(f, r);
}

function isKnightMove(from: string, to: string): boolean {
  const df = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
  const dr = Math.abs(parseInt(from[1]) - parseInt(to[1]));
  return (df === 1 && dr === 2) || (df === 2 && dr === 1);
}

/** All squares attacked by a queen on `sq` (on an otherwise empty board), plus the queen square itself. */
function getQueenDanger(sq: string): Set<string> {
  const [qf, qr] = sqToFR(sq);
  const danger = new Set<string>();
  danger.add(sq); // can't land on the queen either

  // 8 directions: rank, file, diagonals
  for (const [df, dr] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
    let f = qf + df, r = qr + dr;
    while (isOnBoard(f, r)) {
      danger.add(frToSq(f, r));
      f += df;
      r += dr;
    }
  }
  return danger;
}

function getKnightMoves(sq: string): string[] {
  const [f, r] = sqToFR(sq);
  return KNIGHT_OFFSETS
    .map(([df, dr]) => [f + df, r + dr] as [number, number])
    .filter(([nf, nr]) => isOnBoard(nf, nr))
    .map(([nf, nr]) => frToSq(nf, nr));
}

/** BFS for shortest knight path avoiding danger squares. Returns -1 if impossible. */
function shortestSafePath(from: string, to: string, danger: Set<string>): number {
  if (from === to) return 0;
  if (danger.has(from) || danger.has(to)) return -1;
  const visited = new Set([from]);
  const queue: [string, number][] = [[from, 0]];
  while (queue.length > 0) {
    const [sq, dist] = queue.shift()!;
    for (const next of getKnightMoves(sq)) {
      if (danger.has(next)) continue;
      if (next === to) return dist + 1;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([next, dist + 1]);
      }
    }
  }
  return -1;
}

interface Puzzle {
  queenSq: string;
  start: string;
  target: string;
  danger: Set<string>;
  optimal: number;
}

function generatePuzzle(): Puzzle {
  for (;;) {
    // Place queen — avoid the very center (too many attacked squares) and very corners
    // to keep puzzles interesting
    const qf = Math.floor(Math.random() * 8);
    const qr = Math.floor(Math.random() * 8);
    const queenSq = frToSq(qf, qr);
    const danger = getQueenDanger(queenSq);

    // Collect safe squares
    const safe: string[] = [];
    for (let f = 0; f < 8; f++) {
      for (let r = 0; r < 8; r++) {
        const sq = frToSq(f, r);
        if (!danger.has(sq)) safe.push(sq);
      }
    }

    if (safe.length < 8) continue; // not enough room

    // Try random start/target pairs
    for (let attempt = 0; attempt < 50; attempt++) {
      const start = safe[Math.floor(Math.random() * safe.length)];
      const target = safe[Math.floor(Math.random() * safe.length)];
      if (start === target) continue;

      const dist = shortestSafePath(start, target, danger);
      if (dist >= 3 && dist <= 7) {
        return { queenSq, start, target, danger, optimal: dist };
      }
    }
  }
}

function getStars(moves: number, optimal: number): number {
  if (moves <= optimal) return 3;
  if (moves <= optimal + 1) return 2;
  return 1;
}

function GauntletBoard({ start, route, target, queenSq, danger }: {
  start: string; route: string[]; target: string; queenSq: string; danger: Set<string>;
}) {
  const S = 36;
  const B = S * 8;
  const allStops = [start, ...route];

  function sqXY(sq: string): [number, number] {
    const [f, r] = sqToFR(sq);
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
          const sq = frToSq(col, 7 - row);
          const isLight = (col + row) % 2 === 0;
          let fill = isLight ? LIGHT : DARK;

          // Danger tint
          if (danger.has(sq) && sq !== queenSq) {
            fill = isLight ? "#e8c0c0" : "#b06060";
          }

          // Start/target
          if (sq === start || sq === target) fill = "#4ade80";
          // Route stops
          else if (allStops.includes(sq)) fill = "#60a5fa";

          return <rect key={`${col}-${row}`} x={col * S} y={row * S} width={S} height={S} fill={fill} />;
        })
      )}
      {/* Queen */}
      <image href="/pieces/bQ.svg" {...(() => {
        const [x, y] = sqXY(queenSq);
        return { x: x - S * 0.4, y: y - S * 0.4, width: S * 0.8, height: S * 0.8 };
      })()} />
      {/* Lines connecting stops */}
      {allStops.slice(1).map((sq, i) => {
        const [x1, y1] = sqXY(allStops[i]);
        const [x2, y2] = sqXY(sq);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="rgba(0,0,0,0.35)" strokeWidth="2" strokeLinecap="round" />;
      })}
      {/* Numbered dots */}
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

export default function KnightGauntlet() {
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

      if (!isKnightMove(currentSquare, sq)) {
        setError(`A knight can\u2019t reach ${sq} from ${currentSquare}.`);
        return;
      }

      if (puzzle.danger.has(sq)) {
        setError(`${sq} is attacked by the queen! \u2620`);
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
        <h2 className="text-xl font-bold mb-2">Knight Gauntlet</h2>
        <p className="text-muted">
          Move the knight from <span className="font-bold">{puzzle.start}</span> to{" "}
          <span className="font-bold">{puzzle.target}</span> without landing on any square
          the queen on <span className="font-bold text-red-400">{puzzle.queenSq}</span> attacks.
        </p>
        <p className="text-xs text-faint mt-1">
          Shortest safe path: {puzzle.optimal} moves
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
          <p className="font-bold text-lg">Safe passage!</p>
          <p className="text-sm text-muted">{moveCount} moves (optimal: {puzzle.optimal})</p>
          <StarRating stars={stars} size="lg" />
          <GauntletBoard
            start={puzzle.start}
            route={route}
            target={puzzle.target}
            queenSq={puzzle.queenSq}
            danger={puzzle.danger}
          />
          <button
            ref={newRouteRef}
            onClick={newPuzzle}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            New Gauntlet
          </button>
        </div>
      )}
    </div>
  );
}
