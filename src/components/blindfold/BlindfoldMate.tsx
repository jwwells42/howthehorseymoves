"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import StarRating from "@/components/puzzle/StarRating";
import { BoardState, SquareId, PieceKind, createBoardState } from "@/lib/logic/types";
import { getLegalMoves } from "@/lib/logic/attacks";
import {
  MateEndgameType,
  ENDGAME_INFO,
  PIECE_NAMES,
  generatePosition,
  validateEndgameMove,
  applyEndgameMove,
  pickDefenseMove,
  formatPosition,
  formatMoveNotation,
} from "@/lib/logic/endgame";

/* ── Types ───────────────────────────────────────── */

interface BlindfoldMateProps {
  type: MateEndgameType;
}

interface MoveEntry {
  number: number;
  white: string;
  black?: string;
}

/* ── Input parsing (standard algebraic notation) ─── */

function isValidSquare(s: string): boolean {
  if (s.length !== 2) return false;
  const f = s.charCodeAt(0) - 97;
  const r = parseInt(s[1]) - 1;
  return f >= 0 && f <= 7 && r >= 0 && r <= 7;
}

function parseSAN(
  raw: string,
  board: BoardState,
): { from: SquareId; to: SquareId } | { error: string } {
  let s = raw.trim().replace(/[+#]/g, "");
  if (s.length === 0) return { error: "Enter a move like Qd2 or Kc3" };

  const pieceChar = s[0].toUpperCase();
  if (!"KQRBN".includes(pieceChar)) {
    return { error: "Start with a piece letter (K, Q, R, B)" };
  }

  const rest = s.slice(1).toLowerCase().replace(/x/g, "");
  if (rest.length < 2 || rest.length > 3) {
    return { error: "Enter a move like Qd2 or Kc3" };
  }

  const dest = rest.slice(-2);
  const disambig = rest.slice(0, -2);

  if (!isValidSquare(dest)) {
    return { error: `${dest} is not a valid square` };
  }

  const to = dest as SquareId;
  const piece = pieceChar as PieceKind;

  // Find all white pieces of this type that can legally move to 'to'
  const candidates: SquareId[] = [];
  for (const [sq, p] of board.pieces) {
    if (p.color === "w" && p.piece === piece) {
      const legal = getLegalMoves(sq, board, "w");
      if (legal.includes(to)) {
        candidates.push(sq);
      }
    }
  }

  if (candidates.length === 0) {
    return { error: `No ${PIECE_NAMES[piece]} can reach ${dest}` };
  }

  if (candidates.length === 1) {
    return { from: candidates[0], to };
  }

  // Disambiguation needed
  if (!disambig) {
    return { error: `Which one? Try ${pieceChar}${candidates[0][0]}${dest}` };
  }
  const filtered = candidates.filter((sq) => {
    if (disambig >= "a" && disambig <= "h") return sq[0] === disambig;
    if (disambig >= "1" && disambig <= "8") return sq[1] === disambig;
    return false;
  });
  if (filtered.length !== 1) {
    return { error: `No ${PIECE_NAMES[piece]} on ${disambig} can reach ${dest}` };
  }
  return { from: filtered[0], to };
}

/* ── Component ───────────────────────────────────── */

export default function BlindfoldMate({ type }: BlindfoldMateProps) {
  const info = ENDGAME_INFO[type];
  const storageKey = `blindfold-mate-${type}-best-stars`;

  const [phase, setPhase] = useState<"idle" | "playing" | "won">("idle");
  const [board, setBoard] = useState<BoardState>({ pieces: new Map() });
  const [startPos, setStartPos] = useState({ white: "", black: "" });
  const [moves, setMoves] = useState<MoveEntry[]>([]);
  const [moveNumber, setMoveNumber] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [waitingForBot, setWaitingForBot] = useState(false);
  const [bestStars, setBestStars] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const movesEndRef = useRef<HTMLDivElement>(null);

  // Load best stars
  useEffect(() => {
    setBestStars(parseInt(localStorage.getItem(storageKey) ?? "0", 10));
  }, [storageKey]);

  // Auto-scroll move list
  useEffect(() => {
    movesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [moves]);

  // Focus input when playing
  useEffect(() => {
    if (phase === "playing" && !waitingForBot) {
      inputRef.current?.focus();
    }
  }, [phase, waitingForBot, moves]);

  const startGame = useCallback(() => {
    const placements = generatePosition(type);
    const newBoard = createBoardState(placements);
    setBoard(newBoard);
    setStartPos(formatPosition(newBoard));
    setMoves([]);
    setMoveNumber(1);
    setMistakes(0);
    setInput("");
    setError(null);
    setWaitingForBot(false);
    setPhase("playing");
  }, [type]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (waitingForBot || phase !== "playing") return;

      const parsed = parseSAN(input, board);
      setInput("");

      if ("error" in parsed) {
        setError(parsed.error);
        return;
      }

      const { from, to } = parsed;

      // Validate (stalemate, hanging)
      const validation = validateEndgameMove(board, from, to);
      if (!validation.valid) {
        setMistakes((m) => m + 1);
        setError(validation.reason ?? "Invalid move");
        return;
      }

      setError(null);
      const newBoard = applyEndgameMove(board, from, to);
      const whiteNotation = formatMoveNotation(board, from, to, newBoard, "b");

      if (validation.checkmate) {
        setBoard(newBoard);
        setMoves((prev) => [
          ...prev,
          { number: moveNumber, white: whiteNotation },
        ]);
        setPhase("won");
        const s = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
        if (s > bestStars) {
          localStorage.setItem(storageKey, s.toString());
          setBestStars(s);
        }
        return;
      }

      // Bot responds
      setBoard(newBoard);
      setWaitingForBot(true);

      setTimeout(() => {
        const botMove = pickDefenseMove(newBoard);
        if (!botMove) {
          setWaitingForBot(false);
          return;
        }

        const afterBot = applyEndgameMove(newBoard, botMove.from, botMove.to);
        const blackNotation = formatMoveNotation(
          newBoard,
          botMove.from,
          botMove.to,
          afterBot,
          "w",
        );

        setBoard(afterBot);
        setMoves((prev) => [
          ...prev,
          { number: moveNumber, white: whiteNotation, black: blackNotation },
        ]);
        setMoveNumber((n) => n + 1);
        setWaitingForBot(false);
      }, 600);
    },
    [input, board, phase, waitingForBot, moveNumber, mistakes, bestStars, storageKey],
  );

  const stars = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;

  /* ── Idle screen ───────────────────────────────── */

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto p-4">
        <h2 className="text-xl font-bold">{info.name}</h2>
        <p className="text-muted text-center text-sm">
          Deliver checkmate without seeing the board. Enter moves in
          standard notation (e.g., Qd2, Kc3, Rad1).
        </p>
        {bestStars > 0 && <StarRating stars={bestStars} size="sm" />}
        <button
          onClick={startGame}
          className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Start
        </button>
      </div>
    );
  }

  /* ── Playing / Won screen ──────────────────────── */

  return (
    <div className="flex flex-col items-center gap-4 max-w-md mx-auto p-4">
      <h2 className="text-xl font-bold">{info.name}</h2>

      {/* Starting position */}
      <div className="w-full rounded-lg bg-card border border-card-border p-3 text-sm font-mono">
        <div>
          <span className="text-muted">White: </span>
          {startPos.white}
        </div>
        <div>
          <span className="text-muted">Black: </span>
          {startPos.black}
        </div>
      </div>

      {/* Move list */}
      {moves.length > 0 && (
        <div className="w-full rounded-lg bg-card border border-card-border p-3 text-sm font-mono max-h-48 overflow-y-auto">
          {moves.map((m) => (
            <div key={m.number}>
              <span className="text-muted">{m.number}.</span> {m.white}
              {m.black && `  ${m.black}`}
            </div>
          ))}
          <div ref={movesEndRef} />
        </div>
      )}

      {phase === "playing" && (
        <>
          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2 w-full">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={waitingForBot ? "..." : "e.g. Qd2"}
              maxLength={6}
              disabled={waitingForBot}
              className="flex-1 px-4 py-2 rounded-lg border border-card-border bg-card text-foreground font-mono text-lg text-center focus:outline-none focus:border-foreground/40 disabled:opacity-50"
              autoComplete="off"
              autoCapitalize="off"
            />
            <button
              type="submit"
              disabled={waitingForBot}
              className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Go
            </button>
          </form>

          {/* Error feedback */}
          {error && (
            <p className="text-red-400 text-sm font-medium">{error}</p>
          )}

          {/* Mistake counter */}
          {mistakes > 0 && (
            <p className="text-sm text-faint">
              {mistakes} mistake{mistakes !== 1 && "s"}
            </p>
          )}
        </>
      )}

      {phase === "won" && (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <p className="text-green-500 font-bold">Checkmate!</p>
          <StarRating stars={stars} size="lg" />
          <p className="text-sm text-muted">
            {mistakes === 0
              ? "Perfect — no mistakes!"
              : `${mistakes} mistake${mistakes > 1 ? "s" : ""}`}
          </p>
          <button
            onClick={startGame}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            New Position
          </button>
        </div>
      )}
    </div>
  );
}
