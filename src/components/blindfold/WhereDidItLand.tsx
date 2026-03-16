"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import StarRating from "@/components/puzzle/StarRating";

const OPENINGS = [
  { name: "Italian Game", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"] },
  { name: "Sicilian Defense", moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4"] },
  { name: "Queen's Gambit", moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6"] },
  { name: "French Defense", moves: ["e4", "e6", "d4", "d5", "Nc3", "Nf6"] },
  { name: "Ruy Lopez", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5", "a6", "Ba4"] },
  { name: "Scotch Game", moves: ["e4", "e5", "Nf3", "Nc6", "d4", "exd4", "Nxd4"] },
  { name: "King's Indian", moves: ["d4", "Nf6", "c4", "g6", "Nc3", "Bg7"] },
  { name: "Caro-Kann", moves: ["e4", "c6", "d4", "d5", "Nc3", "dxe4", "Nxe4"] },
  { name: "London System", moves: ["d4", "d5", "Bf4", "Nf6", "e3", "c5"] },
  { name: "Pirc Defense", moves: ["e4", "d6", "d4", "Nf6", "Nc3", "g6"] },
];

// Initial board with pieces
const INITIAL_PIECES: Record<string, { piece: string; color: "w" | "b" }> = {};
for (const f of "abcdefgh") {
  INITIAL_PIECES[`${f}2`] = { piece: "P", color: "w" };
  INITIAL_PIECES[`${f}7`] = { piece: "P", color: "b" };
}
INITIAL_PIECES["a1"] = { piece: "R", color: "w" };
INITIAL_PIECES["b1"] = { piece: "N", color: "w" };
INITIAL_PIECES["c1"] = { piece: "B", color: "w" };
INITIAL_PIECES["d1"] = { piece: "Q", color: "w" };
INITIAL_PIECES["e1"] = { piece: "K", color: "w" };
INITIAL_PIECES["f1"] = { piece: "B", color: "w" };
INITIAL_PIECES["g1"] = { piece: "N", color: "w" };
INITIAL_PIECES["h1"] = { piece: "R", color: "w" };
INITIAL_PIECES["a8"] = { piece: "R", color: "b" };
INITIAL_PIECES["b8"] = { piece: "N", color: "b" };
INITIAL_PIECES["c8"] = { piece: "B", color: "b" };
INITIAL_PIECES["d8"] = { piece: "Q", color: "b" };
INITIAL_PIECES["e8"] = { piece: "K", color: "b" };
INITIAL_PIECES["f8"] = { piece: "B", color: "b" };
INITIAL_PIECES["g8"] = { piece: "N", color: "b" };
INITIAL_PIECES["h8"] = { piece: "R", color: "b" };

// Simple SAN parser for opening moves
function parseSanMove(san: string, board: Map<string, { piece: string; color: "w" | "b" }>, isWhite: boolean): { from: string; to: string } | null {
  const color = isWhite ? "w" : "b";
  let s = san.replace(/[+#!?]/g, "");

  // Castling
  if (s === "O-O" || s === "O-O-O") {
    const rank = isWhite ? "1" : "8";
    if (s === "O-O") return { from: `e${rank}`, to: `g${rank}` };
    return { from: `e${rank}`, to: `c${rank}` };
  }

  const isCapture = s.includes("x");
  s = s.replace("x", "");

  // Pawn move
  if (s[0] >= "a" && s[0] <= "h") {
    const to = s.slice(-2);
    if (isCapture) {
      const fromFile = s[0];
      const dir = isWhite ? -1 : 1;
      const fromRank = parseInt(to[1]) + dir;
      return { from: `${fromFile}${fromRank}`, to };
    }
    // Regular pawn push
    const dir = isWhite ? -1 : 1;
    const fromSq1 = `${to[0]}${parseInt(to[1]) + dir}`;
    if (board.has(fromSq1) && board.get(fromSq1)!.piece === "P" && board.get(fromSq1)!.color === color) {
      return { from: fromSq1, to };
    }
    const fromSq2 = `${to[0]}${parseInt(to[1]) + dir * 2}`;
    if (board.has(fromSq2) && board.get(fromSq2)!.piece === "P" && board.get(fromSq2)!.color === color) {
      return { from: fromSq2, to };
    }
    return null;
  }

  // Piece move
  const pieceChar = s[0];
  const rest = s.slice(1);
  const to = rest.slice(-2);
  const disambig = rest.slice(0, -2);

  // Find the piece
  for (const [sq, p] of board) {
    if (p.piece !== pieceChar || p.color !== color) continue;
    if (disambig.length === 1) {
      if (disambig >= "a" && disambig <= "h" && sq[0] !== disambig) continue;
      if (disambig >= "1" && disambig <= "8" && sq[1] !== disambig) continue;
    }
    return { from: sq, to };
  }
  return null;
}

function applyMoves(moves: string[]): Map<string, { piece: string; color: "w" | "b" }> {
  const board = new Map(Object.entries(INITIAL_PIECES));
  for (let i = 0; i < moves.length; i++) {
    const isWhite = i % 2 === 0;
    const parsed = parseSanMove(moves[i], board, isWhite);
    if (!parsed) continue;
    const piece = board.get(parsed.from);
    if (!piece) continue;
    board.delete(parsed.from);
    board.set(parsed.to, piece);
    // Handle castling rook
    if (piece.piece === "K" && Math.abs(parsed.from.charCodeAt(0) - parsed.to.charCodeAt(0)) === 2) {
      const rank = parsed.from[1];
      if (parsed.to[0] === "g") {
        const rook = board.get(`h${rank}`);
        if (rook) { board.delete(`h${rank}`); board.set(`f${rank}`, rook); }
      } else {
        const rook = board.get(`a${rank}`);
        if (rook) { board.delete(`a${rank}`); board.set(`d${rank}`, rook); }
      }
    }
  }
  return board;
}

interface Question {
  opening: string;
  moves: string[];
  askPiece: string;
  askColor: "w" | "b";
  correctSquare: string;
}

function generateQuestion(): Question {
  const opening = OPENINGS[Math.floor(Math.random() * OPENINGS.length)];
  // Use a random subset of moves (at least 3)
  const numMoves = Math.min(opening.moves.length, Math.floor(Math.random() * 3) + 3);
  const moves = opening.moves.slice(0, numMoves);
  const board = applyMoves(moves);

  // Pick a random piece that moved during the sequence
  const movedPieces: { piece: string; color: "w" | "b"; square: string }[] = [];
  for (const [sq, p] of board) {
    // Check if this piece is NOT in its initial position
    const initial = INITIAL_PIECES[sq];
    if (!initial || initial.piece !== p.piece || initial.color !== p.color) {
      movedPieces.push({ ...p, square: sq });
    }
  }

  if (movedPieces.length === 0) {
    // Fallback: pick any piece
    const entries = [...board.entries()];
    const [sq, p] = entries[Math.floor(Math.random() * entries.length)];
    return { opening: opening.name, moves, askPiece: p.piece, askColor: p.color, correctSquare: sq };
  }

  const pick = movedPieces[Math.floor(Math.random() * movedPieces.length)];
  return { opening: opening.name, moves, askPiece: pick.piece, askColor: pick.color, correctSquare: pick.square };
}

function getStars(correct: number, total: number): number {
  const pct = total > 0 ? correct / total : 0;
  if (pct >= 0.9) return 3;
  if (pct >= 0.7) return 2;
  if (pct >= 0.5) return 1;
  return 0;
}

const PIECE_NAMES: Record<string, string> = {
  K: "King", Q: "Queen", R: "Rook", B: "Bishop", N: "Knight", P: "Pawn",
};

const ROUNDS = 10;

export default function WhereDidItLand() {
  const [phase, setPhase] = useState<"idle" | "playing" | "feedback" | "done">("idle");
  const [question, setQuestion] = useState<Question | null>(null);
  const [input, setInput] = useState("");
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [round, setRound] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [bestStars, setBestStars] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBestStars(parseInt(localStorage.getItem("blindfold-landed-best-stars") ?? "0", 10));
  }, []);

  useEffect(() => {
    if (phase === "playing") inputRef.current?.focus();
  }, [phase, round]);

  const startGame = useCallback(() => {
    setQuestion(generateQuestion());
    setPhase("playing");
    setCorrect(0);
    setTotal(0);
    setRound(1);
    setInput("");
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!question || phase !== "playing") return;
      const sq = input.trim().toLowerCase();
      setInput("");

      const right = sq === question.correctSquare;
      setIsCorrect(right);
      if (right) setCorrect((c) => c + 1);
      setTotal((t) => t + 1);
      setPhase("feedback");
    },
    [question, input, phase],
  );

  const nextRound = useCallback(() => {
    if (round >= ROUNDS) {
      const stars = getStars(correct, total);
      if (stars > bestStars) {
        localStorage.setItem("blindfold-landed-best-stars", String(stars));
        setBestStars(stars);
      }
      setPhase("done");
      return;
    }
    setQuestion(generateQuestion());
    setPhase("playing");
    setRound((r) => r + 1);
    setInput("");
  }, [round, correct, total, bestStars]);

  const stars = getStars(correct, total);

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Where Did It Land?</h2>
        <p className="text-muted">
          Follow a sequence of opening moves mentally. Then answer: where is a specific piece? {ROUNDS} rounds.
        </p>
        {bestStars > 0 && (
          <div className="text-sm text-faint">
            <StarRating stars={bestStars} size="sm" />
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

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Complete!</h2>
        <p className="text-3xl font-bold">{correct}/{total} correct</p>
        {stars > 0 && <StarRating stars={stars} size="lg" />}
        <button
          onClick={() => setPhase("idle")}
          className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
        >
          Play Again
        </button>
      </div>
    );
  }

  if (!question) return null;

  const colorName = question.askColor === "w" ? "white" : "black";

  if (phase === "feedback") {
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <div className="text-sm text-faint">Round {round}/{ROUNDS}</div>
        <p className={`text-xl font-bold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
          {isCorrect ? "Correct!" : "Wrong!"}
        </p>
        <p className="text-muted">
          The {colorName} {PIECE_NAMES[question.askPiece]} is on <span className="font-bold font-mono">{question.correctSquare}</span>
        </p>
        <div className="text-sm text-faint">
          <span className="font-medium">{question.opening}:</span>{" "}
          {question.moves.map((m, i) => (
            <span key={i}>
              {i % 2 === 0 && <span>{Math.floor(i / 2) + 1}. </span>}
              {m}{" "}
            </span>
          ))}
        </div>
        <button
          onClick={nextRound}
          className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          {round >= ROUNDS ? "See Results" : "Next"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
      <div className="text-sm text-faint">Round {round}/{ROUNDS}</div>

      {/* Move sequence */}
      <div className="w-full p-4 rounded-xl border border-card-border bg-card">
        <div className="text-xs text-faint mb-2">{question.opening}</div>
        <div className="font-mono text-lg">
          {question.moves.map((m, i) => (
            <span key={i}>
              {i % 2 === 0 && <span className="text-faint">{Math.floor(i / 2) + 1}. </span>}
              <span className="font-bold">{m} </span>
            </span>
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="py-2">
        <div className="text-lg">
          Where is the{" "}
          <span className="font-bold">{colorName} {PIECE_NAMES[question.askPiece]}</span>?
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/pieces/${question.askColor}${question.askPiece}.svg`}
          alt={`${colorName} ${PIECE_NAMES[question.askPiece]}`}
          className="w-12 h-12 mx-auto mt-2"
        />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-[200px]">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Square..."
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
    </div>
  );
}
