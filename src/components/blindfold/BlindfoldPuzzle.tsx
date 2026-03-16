"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Board from "@/components/board/Board";
import StarRating from "@/components/puzzle/StarRating";
import { parseFen, createBoardState } from "@/lib/logic/types";
import { isCheckmate, getLegalMoves } from "@/lib/logic/attacks";
import type { BoardState, SquareId } from "@/lib/logic/types";

const noop = () => {};
const noopSq = noop as (sq: SquareId) => void;
const noopDrop = noop as (from: SquareId, to: SquareId) => void;

// Mate-in-1 puzzles where white delivers checkmate (all pieces invisible)
const PUZZLES = [
  { fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1", desc: "White: Ke1, Qh5, Bc4, pawns d2,e4,f2,g2,h2,a2,b2,c2. Black: Ke8, Qd8, Ra8,Rh8, Bc8,Bf8, Nc6,Nf6, pawns a7,b7,c7,d7,e5,f7,g7,h7" },
  { fen: "rnbqkbnr/ppppp2p/6p1/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 1", desc: "White: Ke1, Qh5, Ra1,Rh1, Bc1,Bf1, Nb1,Ng1, pawns a2-d2,f2-h2,e4. Black: Ke8, Qd8, Ra8,Rh8, Bc8,Bf8, Nb8,Ng8, pawns a7-e7,f5,g6,h7" },
  { fen: "r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQR1K1 w kq - 0 1", desc: "White: Kg1, Qd1, Ra1,Re1, Bc1,Bc4, Nc3,Nf3, pawns a2-d2,f2-h2,e4. Black: Ke8, Qe7, Ra8,Rh8, Bc5,Bc8, Nc6,Nf6, pawns a7-d7,e5,f7-h7" },
  { fen: "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1", desc: "White: Ke1, Qf3, Ra1,Rh1, Bc1,Bc4, Nb1,Ng1, pawns a2-d2,f2-h2,e4. Black: Ke8, Qd8, Ra8,Rh8, Bc5,Bc8, Nc6,Ng8, pawns a7-d7,e5,f7-h7" },
];

type Phase = "idle" | "playing" | "solved" | "wrong" | "done";

function applyMoveOnBoard(board: BoardState, from: SquareId, to: SquareId): BoardState {
  const newPieces = new Map(board.pieces);
  const piece = newPieces.get(from);
  if (!piece) return board;
  newPieces.delete(from);
  newPieces.set(to, piece);
  return { pieces: newPieces };
}

export default function BlindfoldPuzzle() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [board, setBoard] = useState<BoardState | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [bestStars, setBestStars] = useState(0);

  const puzzle = PUZZLES[puzzleIdx % PUZZLES.length];
  const emptyBoard = useMemo(() => createBoardState([]), []);

  useEffect(() => {
    setBestStars(parseInt(localStorage.getItem("blindfold-puzzle-best-stars") ?? "0", 10));
  }, []);

  const startPuzzle = useCallback((idx: number) => {
    const p = PUZZLES[idx % PUZZLES.length];
    const { placements } = parseFen(p.fen);
    setBoard(createBoardState(placements));
    setSelectedSquare(null);
    setPhase("playing");
  }, []);

  const startGame = useCallback(() => {
    setPuzzleIdx(0);
    setCorrect(0);
    setTotal(0);
    startPuzzle(0);
  }, [startPuzzle]);

  const validMoves = useMemo(() => {
    if (!selectedSquare || !board) return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== "w") return [];
    return getLegalMoves(selectedSquare, board, "w");
  }, [selectedSquare, board]);

  const handleSquareClick = useCallback(
    (sq: SquareId) => {
      if (phase !== "playing" || !board) return;

      if (!selectedSquare) {
        const p = board.pieces.get(sq);
        if (p && p.color === "w") setSelectedSquare(sq);
        return;
      }

      if (sq === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      const moves = getLegalMoves(selectedSquare, board, "w");
      if (!moves.includes(sq)) {
        const p = board.pieces.get(sq);
        if (p && p.color === "w") setSelectedSquare(sq);
        else setSelectedSquare(null);
        return;
      }

      const newBoard = applyMoveOnBoard(board, selectedSquare, sq);
      setBoard(newBoard);
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
    [phase, board, selectedSquare],
  );

  const nextPuzzle = useCallback(() => {
    const nextIdx = puzzleIdx + 1;
    if (nextIdx >= PUZZLES.length) {
      const pct = total > 0 ? correct / total : 0;
      const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;
      if (stars > bestStars) {
        localStorage.setItem("blindfold-puzzle-best-stars", String(stars));
        setBestStars(stars);
      }
      setPhase("done");
      return;
    }
    setPuzzleIdx(nextIdx);
    startPuzzle(nextIdx);
  }, [puzzleIdx, correct, total, bestStars, startPuzzle]);

  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center gap-6 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Blindfold Puzzle Solving</h2>
        <p className="text-muted">
          Pieces are invisible! Read the position description, then find checkmate by clicking squares. {PUZZLES.length} puzzles.
        </p>
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

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold">Complete!</h2>
        <p className="text-3xl font-bold">{correct}/{total} correct</p>
        {(correct / Math.max(total, 1)) >= 0.3 && (
          <StarRating stars={correct / total >= 0.9 ? 3 : correct / total >= 0.6 ? 2 : 1} size="lg" />
        )}
        <button
          onClick={() => setPhase("idle")}
          className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
        >
          Play Again
        </button>
      </div>
    );
  }

  if ((phase === "solved" || phase === "wrong") && board) {
    return (
      <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
        <p className={`text-xl font-bold ${phase === "solved" ? "text-green-400" : "text-red-400"}`}>
          {phase === "solved" ? "Checkmate!" : "Not checkmate!"}
        </p>
        <div className="text-sm text-faint">{correct}/{total} correct</div>
        <div className="w-full max-w-[320px]">
          <Board board={board} readOnly selectedSquare={null} validMoves={[]} targets={[]} reachedTargets={[]} dragValidMoves={[]} onSquareClick={noopSq} onDrop={noopDrop} onDragStart={noopSq} onDragEnd={noop} />
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

  // playing phase — empty board with position description
  return (
    <div className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
      <div className="text-sm text-faint">Puzzle {puzzleIdx + 1}/{PUZZLES.length}</div>

      {/* Position description */}
      <div className="w-full p-3 rounded-xl border border-card-border bg-card text-left text-sm font-mono leading-relaxed">
        {puzzle.desc}
      </div>

      <p className="text-sm text-muted">Find the checkmate! Click squares to move.</p>

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
    </div>
  );
}
