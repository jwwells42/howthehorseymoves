"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Board from "@/components/board/Board";
import {
  BoardState,
  SquareId,
  PieceKind,
  PieceColor,
  parseFen,
  createBoardState,
  squareToCoords,
  coordsToSquare,
} from "@/lib/logic/types";
import { getLegalMoves } from "@/lib/logic/attacks";
import { isCheckmate } from "@/lib/logic/attacks";

/* ── Types ────────────────────────────────────────────────── */

interface PolgarProblem {
  id: number;
  fen: string;
  moves: string; // "f6-g7" or "d3-c3;a3-a2;b8-b2"
  btm: boolean; // true = Black to Move
}

interface SolutionMove {
  from: SquareId;
  to: SquareId;
}

type MateType = "mate-in-1" | "mate-in-2" | "mate-in-3";

const MATE_LABELS: Record<MateType, string> = {
  "mate-in-1": "Mate in One",
  "mate-in-2": "Mate in Two",
  "mate-in-3": "Mate in Three",
};

/* ── Helpers ──────────────────────────────────────────────── */

function parseSolutionMoves(moves: string): SolutionMove[] {
  return moves.split(";").map((m) => {
    const [from, to] = m.split("-");
    return { from: from as SquareId, to: to as SquareId };
  });
}

function boardFromFen(fen: string): BoardState {
  const { placements, castlingRights, enPassantSquare } = parseFen(fen);
  return createBoardState(placements, { castlingRights, enPassantSquare });
}

function applyMove(board: BoardState, from: SquareId, to: SquareId): BoardState {
  const pieces = new Map(board.pieces);
  const piece = pieces.get(from);
  if (!piece) return board;

  pieces.delete(from);
  pieces.set(to, piece);

  // En passant capture
  if (piece.piece === "P" && to === board.enPassantSquare) {
    const [, fromY] = squareToCoords(from);
    const [toX] = squareToCoords(to);
    const captured = coordsToSquare(toX, fromY);
    if (captured) pieces.delete(captured);
  }

  // Castling rook
  if (piece.piece === "K") {
    const [fx] = squareToCoords(from);
    const [tx] = squareToCoords(to);
    if (Math.abs(tx - fx) === 2) {
      if (tx > fx) {
        const rookFrom = `h${to[1]}` as SquareId;
        const rookTo = `f${to[1]}` as SquareId;
        const rook = pieces.get(rookFrom);
        if (rook) { pieces.delete(rookFrom); pieces.set(rookTo, rook); }
      } else {
        const rookFrom = `a${to[1]}` as SquareId;
        const rookTo = `d${to[1]}` as SquareId;
        const rook = pieces.get(rookFrom);
        if (rook) { pieces.delete(rookFrom); pieces.set(rookTo, rook); }
      }
    }
  }

  // Pawn promotion (auto-queen)
  if (piece.piece === "P") {
    const rank = to[1];
    if ((piece.color === "w" && rank === "8") || (piece.color === "b" && rank === "1")) {
      pieces.set(to, { piece: "Q", color: piece.color });
    }
  }

  return { pieces };
}

/* ── Component ────────────────────────────────────────────── */

interface PolgarTrainerProps {
  type: MateType;
}

export default function PolgarTrainer({ type }: PolgarTrainerProps) {
  const [problems, setProblems] = useState<PolgarProblem[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [board, setBoard] = useState<BoardState>({ pieces: new Map() });
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const [moveStep, setMoveStep] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);
  const [solved, setSolved] = useState(false);
  const [wrongMoveSquare, setWrongMoveSquare] = useState<SquareId | null>(null);
  const [waitingForAnimation, setWaitingForAnimation] = useState(false);
  const [opponentSlide, setOpponentSlide] = useState<{
    piece: PieceKind;
    color: PieceColor;
    from: SquareId;
    to: SquareId;
  } | null>(null);

  const storageKey = `polgar-${type}-index`;
  const solvedKey = `polgar-${type}-solved`;

  // Load problems
  useEffect(() => {
    fetch(`/data/polgar/${type}.json`)
      .then((r) => r.json())
      .then((data: PolgarProblem[]) => {
        setProblems(data);
        const savedIndex = parseInt(localStorage.getItem(storageKey) ?? "0", 10);
        const savedSolved = parseInt(localStorage.getItem(solvedKey) ?? "0", 10);
        const idx = Math.min(savedIndex, data.length - 1);
        setCurrentIndex(idx);
        setTotalSolved(savedSolved);
        setBoard(boardFromFen(data[idx].fen));
      });
  }, [type, storageKey, solvedKey]);

  const problem = problems?.[currentIndex];
  const playerColor: PieceColor = problem?.btm ? "b" : "w";
  const opponentColor: PieceColor = problem?.btm ? "w" : "b";
  const solutionMoves = useMemo(
    () => (problem ? parseSolutionMoves(problem.moves) : []),
    [problem]
  );

  // Player move indices: 0, 2, 4 (even)
  // Opponent move indices: 1, 3 (odd)
  const isPlayerMove = moveStep % 2 === 0;
  const isFinalMove = moveStep === solutionMoves.length - 1;

  const validMoves = useMemo(() => {
    if (!selectedSquare || solved || waitingForAnimation) return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== playerColor) return [];
    return getLegalMoves(selectedSquare, board, playerColor);
  }, [selectedSquare, board, playerColor, solved, waitingForAnimation]);

  const executeMove = useCallback(
    (from: SquareId, to: SquareId) => {
      if (solved || waitingForAnimation || !problem) return;

      // Validate the move
      if (isFinalMove) {
        // Last move must deliver checkmate
        const newBoard = applyMove(board, from, to);
        if (!isCheckmate(opponentColor, newBoard)) {
          setWrongMoveSquare(to);
          setSelectedSquare(null);
          setMistakes((m) => m + 1);
          setTimeout(() => setWrongMoveSquare(null), 600);
          return;
        }
        setBoard(newBoard);
        setSelectedSquare(null);
        setSolved(true);
        const newSolved = totalSolved + 1;
        setTotalSolved(newSolved);
        localStorage.setItem(solvedKey, newSolved.toString());
      } else {
        // Intermediate move: must match solution exactly
        const expected = solutionMoves[moveStep];
        if (from !== expected.from || to !== expected.to) {
          setWrongMoveSquare(to);
          setSelectedSquare(null);
          setMistakes((m) => m + 1);
          setTimeout(() => setWrongMoveSquare(null), 600);
          return;
        }
        const newBoard = applyMove(board, from, to);
        setBoard(newBoard);
        setSelectedSquare(null);
        const nextStep = moveStep + 1;
        setMoveStep(nextStep);

        // Apply opponent response
        if (nextStep < solutionMoves.length) {
          setWaitingForAnimation(true);
          const oppMove = solutionMoves[nextStep];
          setTimeout(() => {
            const oppPiece = newBoard.pieces.get(oppMove.from);
            if (oppPiece) {
              setOpponentSlide({
                piece: oppPiece.piece,
                color: oppPiece.color,
                from: oppMove.from,
                to: oppMove.to,
              });
            }
            const afterOpp = applyMove(newBoard, oppMove.from, oppMove.to);
            setBoard(afterOpp);
            setTimeout(() => {
              setOpponentSlide(null);
              setWaitingForAnimation(false);
              setMoveStep(nextStep + 1);
            }, 500);
          }, 300);
        }
      }
    },
    [
      board,
      solved,
      waitingForAnimation,
      problem,
      isFinalMove,
      opponentColor,
      moveStep,
      solutionMoves,
      totalSolved,
      solvedKey,
    ]
  );

  const handleSquareClick = useCallback(
    (sq: SquareId) => {
      if (solved || waitingForAnimation) return;

      if (!selectedSquare) {
        const p = board.pieces.get(sq);
        if (p && p.color === playerColor) {
          setSelectedSquare(sq);
        }
        return;
      }

      if (sq === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      // Check if clicking another own piece
      const p = board.pieces.get(sq);
      if (p && p.color === playerColor) {
        setSelectedSquare(sq);
        return;
      }

      // Try to move
      const moves = getLegalMoves(selectedSquare, board, playerColor);
      if (!moves.includes(sq)) {
        setSelectedSquare(null);
        return;
      }

      executeMove(selectedSquare, sq);
    },
    [board, selectedSquare, playerColor, solved, waitingForAnimation, executeMove]
  );

  const handleDrop = useCallback(
    (from: SquareId, to: SquareId) => {
      if (solved || waitingForAnimation || from === to) return;
      const p = board.pieces.get(from);
      if (!p || p.color !== playerColor) return;
      const moves = getLegalMoves(from, board, playerColor);
      if (!moves.includes(to)) return;
      executeMove(from, to);
    },
    [board, playerColor, solved, waitingForAnimation, executeMove]
  );

  const handleDragStart = useCallback(
    (sq: SquareId) => {
      setSelectedSquare(sq);
    },
    []
  );

  const goToNext = useCallback(() => {
    if (!problems) return;
    const nextIdx = currentIndex + 1;
    if (nextIdx >= problems.length) return; // at the end
    setCurrentIndex(nextIdx);
    localStorage.setItem(storageKey, nextIdx.toString());
    setBoard(boardFromFen(problems[nextIdx].fen));
    setSelectedSquare(null);
    setMoveStep(0);
    setMistakes(0);
    setSolved(false);
    setWrongMoveSquare(null);
    setOpponentSlide(null);
    setWaitingForAnimation(false);
  }, [problems, currentIndex, storageKey]);

  const skipPuzzle = useCallback(() => {
    goToNext();
  }, [goToNext]);

  // Loading
  if (!problems || !problem) {
    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <p className="text-muted">Loading puzzles...</p>
      </div>
    );
  }

  const atEnd = currentIndex >= problems.length - 1 && solved;

  return (
    <div className="flex flex-col items-center gap-4 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold">{MATE_LABELS[type]}</h2>
        <p className="text-sm text-faint">
          Problem {currentIndex + 1} of {problems.length}
          {totalSolved > 0 && ` · ${totalSolved} solved`}
        </p>
      </div>

      {/* Side to move */}
      <div
        className={`px-3 py-1 rounded-full text-sm font-medium ${
          playerColor === "w"
            ? "bg-white text-gray-900 border border-gray-300"
            : "bg-gray-800 text-white border border-gray-600"
        }`}
      >
        {problem.btm ? "Black to move" : "White to move"}
      </div>

      {/* Board */}
      <div className="w-full max-w-md">
        <Board
          board={board}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          targets={[]}
          reachedTargets={[]}
          dragValidMoves={validMoves}
          onSquareClick={handleSquareClick}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
          onDragEnd={() => setSelectedSquare(null)}
          wrongMoveSquare={wrongMoveSquare}
          opponentSlide={opponentSlide}
          playableColors={[playerColor]}
        />
      </div>

      {/* Status / controls */}
      {solved ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-green-500 font-bold">
            {mistakes === 0 ? "Correct!" : `Solved with ${mistakes} mistake${mistakes === 1 ? "" : "s"}`}
          </p>
          {atEnd ? (
            <p className="text-muted font-medium">
              You&apos;ve completed all {problems.length} puzzles!
            </p>
          ) : (
            <button
              onClick={goToNext}
              className="px-6 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
            >
              Next Puzzle
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {mistakes > 0 && (
            <span className="text-sm text-faint">
              {mistakes} mistake{mistakes === 1 ? "" : "s"}
            </span>
          )}
          <button
            onClick={skipPuzzle}
            className="px-4 py-1.5 rounded-lg bg-btn hover:bg-btn-hover text-sm font-medium transition-colors"
          >
            Skip
          </button>
        </div>
      )}

    </div>
  );
}
