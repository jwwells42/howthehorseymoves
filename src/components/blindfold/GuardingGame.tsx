"use client";

import { useState, useEffect, useCallback } from "react";
import StarRating from "@/components/puzzle/StarRating";

const PIECE_TYPES = ["Q", "N", "R", "B"] as const;
type PT = (typeof PIECE_TYPES)[number];
const NAMES: Record<PT, string> = { Q: "Queen", N: "Knight", R: "Rook", B: "Bishop" };
const SVGS: Record<PT, string> = {
  Q: "/pieces/wQ.svg", N: "/pieces/wN.svg", R: "/pieces/wR.svg", B: "/pieces/wB.svg",
};

interface Piece { type: PT; square: string }
type GKey = `${PT}-${PT}`;
interface MoveRecord { piece: PT; from: string; to: string }

// --- Square helpers ---
function sqFR(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, parseInt(sq[1]) - 1];
}
function frSq(f: number, r: number): string {
  return String.fromCharCode(97 + f) + (r + 1);
}

// --- Directions ---
const DIAGS: [number, number][] = [[1,1],[1,-1],[-1,1],[-1,-1]];
const LINES: [number, number][] = [[1,0],[-1,0],[0,1],[0,-1]];
const ALL8: [number, number][] = [...DIAGS, ...LINES];
const NJUMPS: [number, number][] = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

// --- Attack logic ---
function slidingReaches(
  ff: number, fr: number, tf: number, tr: number,
  occ: Set<string>, dirs: [number, number][]
): boolean {
  for (const [df, dr] of dirs) {
    let f = ff + df, r = fr + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      if (f === tf && r === tr) return true;
      if (occ.has(frSq(f, r))) break;
      f += df; r += dr;
    }
  }
  return false;
}

function doesAttack(pt: PT, from: string, to: string, pieces: Piece[]): boolean {
  if (from === to) return false;
  const [ff, fr] = sqFR(from);
  const [tf, tr] = sqFR(to);
  if (pt === "N") {
    const df = Math.abs(ff - tf), dr = Math.abs(fr - tr);
    return (df === 1 && dr === 2) || (df === 2 && dr === 1);
  }
  const occ = new Set(pieces.map(p => p.square));
  return slidingReaches(ff, fr, tf, tr, occ, pt === "B" ? DIAGS : pt === "R" ? LINES : ALL8);
}

function getGuarding(pieces: Piece[]): Set<GKey> {
  const g = new Set<GKey>();
  for (const a of pieces)
    for (const b of pieces)
      if (a.type !== b.type && doesAttack(a.type, a.square, b.square, pieces))
        g.add(`${a.type}-${b.type}`);
  return g;
}

// --- Move generation ---
function pieceMoves(pt: PT, from: string, occ: Set<string>): string[] {
  const [ff, fr] = sqFR(from);
  if (pt === "N") {
    return NJUMPS
      .map(([df, dr]) => [ff + df, fr + dr] as [number, number])
      .filter(([f, r]) => f >= 0 && f <= 7 && r >= 0 && r <= 7)
      .map(([f, r]) => frSq(f, r))
      .filter(sq => !occ.has(sq));
  }
  const dirs = pt === "B" ? DIAGS : pt === "R" ? LINES : ALL8;
  const moves: string[] = [];
  for (const [df, dr] of dirs) {
    let f = ff + df, r = fr + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const sq = frSq(f, r);
      if (occ.has(sq)) break;
      moves.push(sq);
      f += df; r += dr;
    }
  }
  return moves;
}

function pickMove(pieces: Piece[]): MoveRecord | null {
  const occ = new Set(pieces.map(p => p.square));
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  for (const i of order) {
    const moves = pieceMoves(pieces[i].type, pieces[i].square, occ);
    if (moves.length > 0) {
      const to = moves[Math.floor(Math.random() * moves.length)];
      return { piece: pieces[i].type, from: pieces[i].square, to };
    }
  }
  return null;
}

function randomPlacement(): Piece[] {
  const used = new Set<string>();
  return PIECE_TYPES.map(type => {
    let sq: string;
    do { sq = frSq(Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)); } while (used.has(sq));
    used.add(sq);
    return { type, square: sq };
  });
}

function getStars(streak: number): number {
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  if (streak >= 1) return 1;
  return 0;
}

// --- Board SVG ---
const SQ = 44;
const BD = SQ * 8;
const LT = "#d4c4a0";
const DKC = "#7a9e6e";

function BoardSVG({ pieces, label, size }: { pieces: Piece[]; label?: string; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "w-full max-w-[300px] sm:max-w-[480px]" : "w-full max-w-[300px]";
  return (
    <div className="flex flex-col items-center">
      {label && <p className="text-xs text-faint mb-1">{label}</p>}
      <svg viewBox={`-14 -2 ${BD + 28} ${BD + 16}`} className={sizeClass}>
        {Array.from({ length: 8 }, (_, i) => (
          <text key={`r${i}`} x={-6} y={(7 - i) * SQ + SQ / 2 + 4}
            textAnchor="middle" fontSize="9" fill="#888">{i + 1}</text>
        ))}
        {Array.from({ length: 8 }, (_, i) => (
          <text key={`f${i}`} x={i * SQ + SQ / 2} y={BD + 11}
            textAnchor="middle" fontSize="9" fill="#888">{String.fromCharCode(97 + i)}</text>
        ))}
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 8 }, (_, col) => (
            <rect key={`${col}-${row}`} x={col * SQ} y={row * SQ}
              width={SQ} height={SQ} fill={(col + row) % 2 === 0 ? LT : DKC} />
          ))
        )}
        {pieces.map(p => {
          const [f, r] = sqFR(p.square);
          return (
            <image key={p.type} href={SVGS[p.type]}
              x={f * SQ + 2} y={(7 - r) * SQ + 2} width={SQ - 4} height={SQ - 4} />
          );
        })}
      </svg>
    </div>
  );
}

// --- Main ---
export default function GuardingGame() {
  const [phase, setPhase] = useState<"idle" | "guessing" | "feedback" | "done">("idle");
  const [visible, setVisible] = useState<Piece[]>([]);
  const [secret, setSecret] = useState<Piece[]>([]);
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [selected, setSelected] = useState<Set<GKey>>(new Set());
  const [answer, setAnswer] = useState<Set<GKey>>(new Set());
  const [streak, setStreak] = useState(0);
  const [peakStreak, setPeakStreak] = useState(0);
  const [wasRight, setWasRight] = useState(false);
  const [best, setBest] = useState(0);
  const [bestStars, setBestStars] = useState(0);

  useEffect(() => {
    setBest(parseInt(localStorage.getItem("blindfold-guarding-best") ?? "0", 10));
    setBestStars(parseInt(localStorage.getItem("blindfold-guarding-best-stars") ?? "0", 10));
  }, []);

  const persistBest = useCallback((s: number) => {
    const stars = getStars(s);
    if (s > best) {
      localStorage.setItem("blindfold-guarding-best", String(s));
      setBest(s);
    }
    if (stars > bestStars) {
      localStorage.setItem("blindfold-guarding-best-stars", String(stars));
      setBestStars(stars);
    }
  }, [best, bestStars]);

  const startGame = useCallback(() => {
    const pieces = randomPlacement();
    setVisible(pieces);
    setSecret(pieces);
    setMoves([]);
    setSelected(new Set());
    setAnswer(new Set());
    setStreak(0);
    setPeakStreak(0);
    setPhase("guessing");
  }, []);

  const toggle = useCallback((key: GKey) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const check = useCallback(() => {
    const correct = getGuarding(secret);
    setAnswer(correct);
    const right = selected.size === correct.size && [...selected].every(k => correct.has(k));
    setWasRight(right);
    if (right) {
      const s = streak + 1;
      setStreak(s);
      if (s > peakStreak) setPeakStreak(s);
      persistBest(s);
    } else {
      setStreak(0);
    }
    setPhase("feedback");
  }, [secret, selected, streak, peakStreak, persistBest]);

  const nextRound = useCallback(() => {
    const move = pickMove(secret);
    if (!move) { startGame(); return; }
    const newSecret = secret.map(p => p.type === move.piece ? { ...p, square: move.to } : p);
    setSecret(newSecret);
    setMoves(prev => [...prev, move]);
    setSelected(new Set());
    setAnswer(new Set());
    setPhase("guessing");
  }, [secret, startGame]);

  const giveUp = useCallback(() => {
    setPhase("done");
  }, []);

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Who&apos;s Guarding Whom?</h2>
        <p className="text-muted">
          Four pieces are placed on the board. Identify which pieces guard which.
          Then pieces start moving — but the board stays frozen. Track positions in your head!
        </p>
        {best > 0 && (
          <div className="text-sm text-faint">
            Best streak: {best} {bestStars > 0 && <StarRating stars={bestStars} size="sm" />}
          </div>
        )}
        <button onClick={startGame}
          className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 transition-colors">
          Start
        </button>
      </div>
    );
  }

  if (phase === "done") {
    const stars = getStars(peakStreak);
    return (
      <div className="flex flex-col items-center gap-4 max-w-lg mx-auto text-center">
        <h2 className="text-xl font-bold">Game Over</h2>
        <p className="text-2xl font-bold">Best streak: {peakStreak}</p>
        {stars > 0 && <StarRating stars={stars} size="lg" />}
        {best > 0 && <p className="text-sm text-faint">All-time best: {best}</p>}

        <BoardSVG pieces={secret} label="Actual positions" />

        {moves.length > 0 && (
          <div className="w-full p-3 rounded-lg border border-card-border bg-card text-left">
            <p className="text-xs text-faint mb-1.5 font-medium">All moves:</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {moves.map((m, i) => (
                <span key={i} className="text-sm font-mono">
                  <span className="text-faint">{i + 1}.</span>{" "}
                  {NAMES[m.piece]} {m.from} &rarr; {m.to}
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={startGame}
          className="px-8 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors">
          New Game
        </button>
      </div>
    );
  }

  // Latest move only (not full history)
  const latestMove = moves.length > 0 ? moves[moves.length - 1] : null;

  return (
    <div className="flex flex-col gap-4 max-w-lg sm:max-w-5xl mx-auto">
      <div className="flex justify-between w-full text-sm">
        <span className="text-faint">Streak: <span className="font-bold text-foreground">{streak}</span></span>
        {best > 0 && <span className="text-faint">Best: {best}</span>}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-center sm:items-start">
        {/* Left: board + latest move */}
        <div className="flex flex-col items-center gap-3 shrink-0 w-full sm:w-[480px]">
          <BoardSVG pieces={visible} label={moves.length > 0 ? "Board (original positions)" : undefined} size="lg" />

          {latestMove && (
            <div className="w-full p-3 rounded-lg border border-card-border bg-card text-center">
              <span className="text-sm sm:text-base font-mono">
                <span className="text-faint">Move {moves.length}:</span>{" "}
                <span className="font-bold">{NAMES[latestMove.piece]} {latestMove.from} &rarr; {latestMove.to}</span>
              </span>
            </div>
          )}
        </div>

        {/* Right: guarding selector + buttons */}
        <div className="flex flex-col items-center sm:items-start gap-4 w-full">
          <div className="w-full">
            <p className="text-sm sm:text-base font-medium mb-3">
              {moves.length === 0 ? "Which pieces guard which?" : "Now who guards whom?"}
            </p>
            <div className="space-y-3">
              {PIECE_TYPES.map(from => (
                <div key={from} className="flex items-center gap-2">
                  <div className="flex items-center gap-1 w-[52px] sm:w-[60px] shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={SVGS[from]} alt={NAMES[from]} className="w-5 h-5 sm:w-7 sm:h-7" />
                    <span className="text-xs text-faint">&rarr;</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {PIECE_TYPES.filter(to => to !== from).map(to => {
                      const key: GKey = `${from}-${to}`;
                      const isSel = selected.has(key);
                      const isAns = answer.has(key);
                      const fb = phase === "feedback";
                      let cls = "px-2 py-1 sm:px-3 sm:py-1.5 rounded text-xs sm:text-sm font-medium border transition-colors ";
                      if (fb) {
                        if (isSel && isAns) cls += "bg-green-600/30 border-green-500 text-green-300";
                        else if (isSel && !isAns) cls += "bg-red-600/30 border-red-500 text-red-300 line-through";
                        else if (!isSel && isAns) cls += "bg-orange-500/20 border-orange-400 text-orange-300";
                        else cls += "border-card-border text-faint opacity-40";
                      } else {
                        cls += isSel
                          ? "bg-blue-600/30 border-blue-500 text-blue-300"
                          : "border-card-border text-muted hover:border-foreground/30";
                      }
                      return (
                        <button key={key} onClick={() => phase === "guessing" && toggle(key)}
                          disabled={fb} className={cls}>
                          {NAMES[to]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {phase === "guessing" && (
            <div className="flex items-center gap-4">
              <button onClick={check}
                className="px-8 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors">
                Check
              </button>
              {moves.length > 0 && (
                <button onClick={giveUp} className="text-sm text-faint hover:text-foreground transition-colors">
                  Give up
                </button>
              )}
            </div>
          )}

          {phase === "feedback" && (
            <div className="flex flex-col items-center sm:items-start gap-3">
              <p className={wasRight ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                {wasRight ? "Correct!" : "Not quite — check the highlights"}
              </p>
              <div className="flex items-center gap-4">
                <button onClick={nextRound}
                  className="px-8 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors">
                  Next Move
                </button>
                <button onClick={giveUp} className="text-sm text-faint hover:text-foreground transition-colors">
                  Give up
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
