"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Board from "@/components/board/Board";
import StarRating from "@/components/puzzle/StarRating";
import { parseFen, createBoardState } from "@/lib/logic/types";
import { isCheckmate, getLegalMoves } from "@/lib/logic/attacks";
import type { BoardState, SquareId, PieceKind, PieceColor } from "@/lib/logic/types";

const noop = () => {};
const noopSq = noop as (sq: SquareId) => void;
const noopDrop = noop as (from: SquareId, to: SquareId) => void;

// Curated mate-in-1 positions where white delivers checkmate
// Each has a FEN + the mating move's destination square
const PUZZLES = [
  { fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1", answer: "f7" }, // Scholar's Mate
  { fen: "rnbqkbnr/ppppp2p/6p1/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 1", answer: "e8" },
  { fen: "r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQR1K1 w kq - 0 1", answer: "d5" },
  { fen: "rnbqk2r/pppp1Bpp/5n2/2b1p3/4P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 1", answer: "f7" },
  { fen: "r2qk2r/ppp2ppp/2np1n2/2b1p1B1/2B1P1b1/3P1N2/PPP2PPP/RN1Q1RK1 w kq - 0 1", answer: "f7" },
  { fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1", answer: "f7" },
  { fen: "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 1", answer: "e1" },
  { fen: "r1bqk2r/ppppbppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 1", answer: "c6" },
];

type Phase = "idle" | "sighted" | "blind" | "solved" | "wrong";

interface DelayedMove {
  from: SquareId;
  to: SquareId;
  piece: PieceKind;
  color: PieceColor;
}

function applyMove(board: BoardState, from: SquareId, to: SquareId): BoardState {
  const newPieces = new Map(board.pieces);
  const piece = newPieces.get(from);
  if (!piece) return board;
  newPieces.delete(from);
  newPieces.set(to, piece);
  return { pieces: newPieces };
}

export default function BlindTactics() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [delayMoves, setDelayMoves] = useState(0); // 0, 1, or 2
  const [originalBoard, setOriginalBoard] = useState<BoardState | null>(null);
  const [currentBoard, setCurrentBoard] = useState<BoardState | null>(null);
  const [answer, setAnswer] = useState("");
  const [delayedMoves, setDelayedMoves] = useState<DelayedMove[]>([]);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [bestStars, setBestStars] = useState(0);
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const SHOW_TIME = 5000;
  const puzzle = PUZZLES[puzzleIdx % PUZZLES.length];

  useEffect(() => {
    setBestStars(parseInt(localStorage.getItem("blindfold-blindtactics-best-stars") ?? "0", 10));
  }, []);

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, []);

  const startPuzzle = useCallback(() => {
    const { placements } = parseFen(puzzle.fen);
    const board = createBoardState(placements);
    setOriginalBoard(board);
    setAnswer(puzzle.answer);

    // Apply delayed moves (random legal moves for demonstration)
    let b = board;
    const moves: DelayedMove[] = [];
    let turn: PieceColor = "b"; // After white's puzzle, it's black's turn for delays

    for (let i = 0; i < delayMoves; i++) {
      // Find a random legal move for current turn
      const allMoves: { from: SquareId; to: SquareId; piece: PieceKind; color: PieceColor }[] = [];
      for (const [sq, p] of b.pieces) {
        if (p.color !== turn) continue;
        const legal = getLegalMoves(sq as SquareId, b, turn);
        for (const target of legal) {
          allMoves.push({ from: sq as SquareId, to: target, piece: p.piece, color: p.color });
        }
      }
      if (allMoves.length === 0) break;
      const move = allMoves[Math.floor(Math.random() * allMoves.length)];
      b = applyMove(b, move.from, move.to);
      moves.push(move);
      turn = turn === "w" ? "b" : "w";
    }

    setCurrentBoard(b);
    setDelayedMoves(moves);
    setSelectedSquare(null);
    setPhase("sighted");

    showTimerRef.current = setTimeout(() => {
      setPhase("blind");
    }, SHOW_TIME);
  }, [puzzle, delayMoves]);

  const startGame = useCallback(() => {
    setPuzzleIdx(0);
    setCorrect(0);
    setTotal(0);
    startPuzzle();
  }, [startPuzzle]);

  const validMoves = useMemo(() => {
    if (!selectedSquare || !currentBoard) return [];
    const p = currentBoard.pieces.get(selectedSquare);
    if (!p || p.color !== "w") return [];
    return getLegalMoves(selectedSquare, currentBoard, "w");
  }, [selectedSquare, currentBoard]);

  const handleSquareClick = useCallback(
    (sq: SquareId) => {
      if (phase !== "blind" || !currentBoard) return;

      if (!selectedSquare) {
        const p = currentBoard.pieces.get(sq);
        if (p && p.color === "w") setSelectedSquare(sq);
        return;
      }

      if (sq === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      const moves = getLegalMoves(selectedSquare, currentBoard, "w");
      if (!moves.includes(sq)) {
        const p = currentBoard.pieces.get(sq);
        if (p && p.color === "w") setSelectedSquare(sq);
        else setSelectedSquare(null);
        return;
      }

      // Make the move
      const newBoard = applyMove(currentBoard, selectedSquare, sq);
      setSelectedSquare(null);

      if (isCheckmate("b", newBoard)) {
        setCorrect((c) => c + 1);
        setTotal((t) => t + 1);
        setPhase("solved");
      } else {
        setTotal((t) => t + 1);
        setPhase("wrong");
      }
    },
    [phase, currentBoard, selectedSquare],
  );

  const nextPuzzle = useCallback(() => {
    if (puzzleIdx + 1 >= PUZZLES.length) {
      const pct = total > 0 ? correct / total : 0;
      const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;
      if (stars > bestStars) {
        localStorage.setItem("blindfold-blindtactics-best-stars", String(stars));
        setBestStars(stars);
      }
      setPhase("idle");
      return;
    }
    setPuzzleIdx((i) => i + 1);
    startPuzzle();
  }, [puzzleIdx, correct, total, bestStars, startPuzzle]);

  // Build an invisible board for blind phase
  const emptyBoard = useMemo(() => createBoardState([]), []);

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Blind Tactics</h2>
        <p className="text-muted">
          See a position, then it disappears. Find the checkmate blindfolded!
          With delay moves, extra moves play before the board hides.
        </p>
        <div className="flex items-center gap-4">
          <label className="text-sm text-muted">Delay moves:</label>
          {[0, 1, 2].map((n) => (
            <button
              key={n}
              onClick={() => setDelayMoves(n)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                delayMoves === n ? "bg-green-600 text-white" : "border border-card-border text-faint hover:text-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {bestStars > 0 && (
          <div className="text-sm text-faint"><StarRating stars={bestStars} size="sm" /></div>
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

  if (phase === "sighted" && originalBoard) {
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <div className="text-sm text-faint">Puzzle {puzzleIdx + 1}/{PUZZLES.length} — Memorize!</div>
        <div className="w-full max-w-[320px]">
          <Board board={originalBoard} readOnly selectedSquare={null} validMoves={[]} targets={[]} reachedTargets={[]} dragValidMoves={[]} onSquareClick={noopSq} onDrop={noopDrop} onDragStart={noopSq} onDragEnd={noop} />
        </div>
        {delayedMoves.length > 0 && (
          <div className="text-sm text-muted">
            Then: {delayedMoves.map((m) => `${m.piece}${m.to}`).join(", ")}
          </div>
        )}
        <div className="text-sm text-muted animate-pulse">Studying...</div>
      </div>
    );
  }

  if ((phase === "solved" || phase === "wrong") && currentBoard) {
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <p className={`text-xl font-bold ${phase === "solved" ? "text-green-400" : "text-red-400"}`}>
          {phase === "solved" ? "Checkmate!" : "Not checkmate — try to remember the position!"}
        </p>
        <div className="text-sm text-faint">{correct}/{total} correct</div>
        <div className="w-full max-w-[320px]">
          <Board board={currentBoard} readOnly selectedSquare={null} validMoves={[]} targets={[]} reachedTargets={[]} dragValidMoves={[]} onSquareClick={noopSq} onDrop={noopDrop} onDragStart={noopSq} onDragEnd={noop} />
        </div>
        <button
          onClick={nextPuzzle}
          className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          {puzzleIdx + 1 >= PUZZLES.length ? "See Results" : "Next"}
        </button>
      </div>
    );
  }

  // blind phase — show empty board, player clicks to make a move
  return (
    <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
      <div className="text-sm text-faint">Puzzle {puzzleIdx + 1}/{PUZZLES.length} — Find the mate!</div>
      <p className="text-sm text-muted">The board is hidden. Click squares to make your move.</p>
      <div className="w-full max-w-[320px]">
        <Board
          board={emptyBoard}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          targets={[]}
          reachedTargets={[]}
          dragValidMoves={[]}
          onSquareClick={handleSquareClick}
          onDrop={noopDrop}
          onDragStart={noopSq}
          onDragEnd={noop}
        />
      </div>
      <div className="text-xs text-faint">{correct}/{total} correct so far</div>
    </div>
  );
}
