"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Board from "@/components/board/Board";
import { parsePgn } from "@/lib/logic/pgn";
import { getLegalMoves } from "@/lib/logic/attacks";
import { ModelGame } from "@/lib/games/types";
import { SquareId, PieceColor } from "@/lib/logic/types";
import type { Arrow } from "@/lib/logic/pgn";

const AUTOPLAY_MS = 1200;

export default function GameViewer({ game }: { game: ModelGame }) {
  const parsed = useMemo(() => parsePgn(game.pgn), [game.pgn]);

  const [currentMove, setCurrentMove] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const moveListRef = useRef<HTMLDivElement>(null);

  // Test mode state
  const [testMode, setTestMode] = useState(false);
  const [testMoveIdx, setTestMoveIdx] = useState(0);
  const [testSelected, setTestSelected] = useState<SquareId | null>(null);
  const [testHintArrow, setTestHintArrow] = useState<Arrow | null>(null);
  const [testComplete, setTestComplete] = useState(false);

  const board = testMode
    ? parsed.positions[testMoveIdx]
    : parsed.positions[currentMove];
  const lastMove = currentMove > 0 ? parsed.moves[currentMove - 1] : null;
  const totalMoves = parsed.moves.length;
  const currentComment = lastMove?.comment;
  const currentArrows = lastMove?.arrows;

  const testColorToMove: PieceColor = testMoveIdx % 2 === 0 ? "w" : "b";

  const testValidMoves = useMemo(() => {
    if (!testMode || !testSelected || testComplete) return [];
    return getLegalMoves(testSelected, parsed.positions[testMoveIdx], testColorToMove);
  }, [testMode, testSelected, testMoveIdx, testComplete, parsed.positions, testColorToMove]);

  const [testDragFrom, setTestDragFrom] = useState<SquareId | null>(null);
  const testDragMoves = useMemo(() => {
    if (!testMode || !testDragFrom || testComplete) return [];
    return getLegalMoves(testDragFrom, parsed.positions[testMoveIdx], testColorToMove);
  }, [testMode, testDragFrom, testMoveIdx, testComplete, parsed.positions, testColorToMove]);

  const advanceTestMove = useCallback((from: SquareId, to: SquareId) => {
    const expected = parsed.moves[testMoveIdx];
    if (from === expected.from && to === expected.to) {
      setTestHintArrow(null);
      const next = testMoveIdx + 1;
      if (next >= totalMoves) {
        setTestMoveIdx(next);
        setTestComplete(true);
      } else {
        setTestMoveIdx(next);
      }
      setTestSelected(null);
    } else {
      // Wrong move — show hint arrow
      setTestHintArrow({ from: expected.from, to: expected.to, color: "#15803d" });
      setTestSelected(null);
    }
  }, [parsed.moves, testMoveIdx, totalMoves]);

  const handleTestClick = useCallback((sq: SquareId) => {
    if (testComplete) return;
    const currentBoard = parsed.positions[testMoveIdx];

    if (!testSelected) {
      const p = currentBoard.pieces.get(sq);
      if (p && p.color === testColorToMove) {
        setTestSelected(sq);
        setTestHintArrow(null);
      }
      return;
    }

    if (sq === testSelected) {
      setTestSelected(null);
      return;
    }

    // Clicking another own piece
    const target = currentBoard.pieces.get(sq);
    if (target && target.color === testColorToMove) {
      setTestSelected(sq);
      return;
    }

    // Try to move
    const legal = getLegalMoves(testSelected, currentBoard, testColorToMove);
    if (!legal.includes(sq)) {
      setTestSelected(null);
      return;
    }

    advanceTestMove(testSelected, sq);
  }, [testComplete, testSelected, testMoveIdx, testColorToMove, parsed.positions, advanceTestMove]);

  const handleTestDrop = useCallback((from: SquareId, to: SquareId) => {
    if (testComplete || from === to) return;
    const currentBoard = parsed.positions[testMoveIdx];
    const p = currentBoard.pieces.get(from);
    if (!p || p.color !== testColorToMove) return;
    const legal = getLegalMoves(from, currentBoard, testColorToMove);
    if (!legal.includes(to)) return;
    advanceTestMove(from, to);
  }, [testComplete, testMoveIdx, testColorToMove, parsed.positions, advanceTestMove]);

  const handleTestDragStart = useCallback((sq: SquareId) => {
    if (testComplete) return;
    setTestDragFrom(sq);
    setTestHintArrow(null);
  }, [testComplete]);

  const handleTestDragEnd = useCallback(() => {
    setTestDragFrom(null);
  }, []);

  const startTestMode = useCallback(() => {
    setTestMode(true);
    setTestMoveIdx(0);
    setTestSelected(null);
    setTestHintArrow(null);
    setTestComplete(false);
    setIsPlaying(false);
  }, []);

  const exitTestMode = useCallback(() => {
    setTestMode(false);
    setTestSelected(null);
    setTestHintArrow(null);
    setTestComplete(false);
    setCurrentMove(0);
  }, []);

  const goForward = useCallback(
    () => setCurrentMove(m => Math.min(m + 1, totalMoves)),
    [totalMoves],
  );
  const goBack = useCallback(
    () => setCurrentMove(m => Math.max(m - 1, 0)),
    [],
  );

  // Auto-play
  useEffect(() => {
    if (testMode) return;
    if (!isPlaying || currentMove >= totalMoves) return;
    const timer = setTimeout(() => {
      setCurrentMove(m => {
        const next = m + 1;
        if (next >= totalMoves) setIsPlaying(false);
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [testMode, isPlaying, currentMove, totalMoves]);

  // Keyboard controls
  useEffect(() => {
    if (testMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); goBack(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goForward(); }
      else if (e.key === " ") { e.preventDefault(); setIsPlaying(p => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [testMode, goBack, goForward]);

  // Scroll current move into view within the move list (not the page)
  useEffect(() => {
    if (testMode) return;
    const container = moveListRef.current;
    if (!container) return;
    const highlighted = container.querySelector("[data-active='true']") as HTMLElement | null;
    if (!highlighted) return;
    const top = highlighted.offsetTop - container.offsetTop;
    const bottom = top + highlighted.offsetHeight;
    if (top < container.scrollTop) {
      container.scrollTop = top;
    } else if (bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = bottom - container.clientHeight;
    }
  }, [testMode, currentMove]);

  // Build move pairs for display (SAN + optional NAG like "!" or "!!")
  const movePairs: { num: number; white: string; black?: string }[] = [];
  for (let i = 0; i < totalMoves; i += 2) {
    const wm = parsed.moves[i];
    const bm = parsed.moves[i + 1];
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: wm.san + (wm.nag ?? ""),
      black: bm ? bm.san + (bm.nag ?? "") : undefined,
    });
  }

  const noop = useCallback(() => {}, []);

  // Test mode rendering
  if (testMode) {
    const moveNum = Math.floor(testMoveIdx / 2) + 1;
    const isWhiteTurn = testMoveIdx % 2 === 0;
    const statusText = testComplete
      ? "You did it! You reproduced the entire game."
      : `Move ${moveNum}${isWhiteTurn ? "." : "..."} ${isWhiteTurn ? "White" : "Black"} to play`;

    return (
      <div className="flex flex-col items-center gap-4 max-w-4xl mx-auto">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-1">Test Mode</h2>
          <p className="text-muted">{statusText}</p>
        </div>

        <div className="w-full max-w-[560px]">
          {/* Black player (top) */}
          <div className="flex items-center gap-2 mb-1 px-1">
            <div className="w-3 h-3 rounded-full bg-[#1a1a1a] border border-foreground/30" />
            <span className="text-sm text-muted">{game.black}</span>
          </div>

          <Board
            board={board}
            selectedSquare={testSelected}
            validMoves={testValidMoves}
            targets={[]}
            reachedTargets={[]}
            dragValidMoves={testDragMoves}
            onSquareClick={handleTestClick}
            onDrop={handleTestDrop}
            onDragStart={handleTestDragStart}
            onDragEnd={handleTestDragEnd}
            playableColors={["w", "b"]}
            arrows={testHintArrow ? [testHintArrow] : undefined}
          />

          {/* White player (bottom) */}
          <div className="flex items-center gap-2 mt-1 px-1">
            <div className="w-3 h-3 rounded-full bg-white border border-foreground/30" />
            <span className="text-sm text-muted">{game.white}</span>
          </div>
        </div>

        <div className="flex gap-3">
          {testComplete && (
            <button
              onClick={() => { setTestMoveIdx(0); setTestComplete(false); setTestHintArrow(null); }}
              className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Try Again
            </button>
          )}
          <button
            onClick={exitTestMode}
            className="px-5 py-2 rounded-lg border border-card-border bg-card hover:bg-btn-hover transition-colors"
          >
            Back to Viewer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start max-w-4xl mx-auto">
      {/* Board side */}
      <div className="flex-1 w-full lg:max-w-[560px]">
        {/* Black player (top) */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <div className="w-3 h-3 rounded-full bg-[#1a1a1a] border border-foreground/30" />
          <span className="text-sm text-muted">{game.black}</span>
        </div>

        <Board
          board={board}
          selectedSquare={null}
          validMoves={[]}
          targets={[]}
          reachedTargets={[]}
          dragValidMoves={[]}
          onSquareClick={noop}
          onDrop={noop}
          onDragStart={noop}
          onDragEnd={noop}
          pawnSlide={lastMove ? { from: lastMove.from, to: lastMove.to } : undefined}
          readOnly
          arrows={currentArrows}
        />

        {/* White player (bottom) */}
        <div className="flex items-center gap-2 mt-1 px-1">
          <div className="w-3 h-3 rounded-full bg-white border border-foreground/30" />
          <span className="text-sm text-muted">{game.white}</span>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <NavButton onClick={() => setCurrentMove(0)} disabled={currentMove === 0} label="Start">
            ⏮
          </NavButton>
          <NavButton onClick={goBack} disabled={currentMove === 0} label="Back">
            ◀
          </NavButton>
          <NavButton
            onClick={() => setIsPlaying(p => !p)}
            disabled={false}
            label={isPlaying ? "Pause" : "Play"}
            wide
          >
            {isPlaying ? "⏸" : "▶"}
          </NavButton>
          <NavButton onClick={goForward} disabled={currentMove >= totalMoves} label="Forward">
            ▶
          </NavButton>
          <NavButton
            onClick={() => setCurrentMove(totalMoves)}
            disabled={currentMove >= totalMoves}
            label="End"
          >
            ⏭
          </NavButton>
        </div>

        {/* Test button */}
        <div className="flex justify-center mt-3">
          <button
            onClick={startTestMode}
            className="px-5 py-2 rounded-lg border border-card-border bg-card hover:bg-btn-hover transition-colors text-sm font-medium"
          >
            Test Yourself
          </button>
        </div>

        {/* Move comment */}
        <div className="mt-3 min-h-12">
          {currentComment && (
            <p className="text-sm text-muted italic text-center px-2">
              {currentComment}
            </p>
          )}
        </div>
      </div>

      {/* Move list side */}
      <div className="lg:w-56 w-full">
        <div className="text-sm mb-2">
          <span className="font-bold">{game.event}</span>
          <span className="text-faint ml-2">{game.year}</span>
        </div>
        <p className="text-xs text-muted mb-3">{game.description}</p>

        <div
          ref={moveListRef}
          className="rounded-lg border border-card-border bg-card p-3 max-h-[400px] overflow-y-auto"
        >
          <div className="grid grid-cols-[2rem_1fr_1fr] gap-x-1 gap-y-0.5 text-sm">
            {movePairs.map((pair, i) => (
              <MoveRow
                key={i}
                num={pair.num}
                white={pair.white}
                black={pair.black}
                whiteActive={currentMove === i * 2 + 1}
                blackActive={currentMove === i * 2 + 2}
                onClickWhite={() => setCurrentMove(i * 2 + 1)}
                onClickBlack={() => setCurrentMove(i * 2 + 2)}
              />
            ))}
          </div>
          {game.result && (
            <div className="text-center text-sm font-bold text-muted mt-2">{game.result}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MoveRow({
  num,
  white,
  black,
  whiteActive,
  blackActive,
  onClickWhite,
  onClickBlack,
}: {
  num: number;
  white: string;
  black?: string;
  whiteActive: boolean;
  blackActive: boolean;
  onClickWhite: () => void;
  onClickBlack: () => void;
}) {
  return (
    <>
      <span className="text-faint text-right">{num}.</span>
      <button
        data-active={whiteActive}
        onClick={onClickWhite}
        className={`text-left px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
          whiteActive
            ? "bg-btn-hover font-bold"
            : "hover:bg-btn"
        }`}
      >
        {white}
      </button>
      {black ? (
        <button
          data-active={blackActive}
          onClick={onClickBlack}
          className={`text-left px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
            blackActive
              ? "bg-btn-hover font-bold"
              : "hover:bg-btn"
          }`}
        >
          {black}
        </button>
      ) : (
        <span />
      )}
    </>
  );
}

function NavButton({
  onClick,
  disabled,
  label,
  wide,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`${
        wide ? "px-6" : "px-3"
      } py-2 rounded-lg bg-btn hover:bg-btn-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg`}
    >
      {children}
    </button>
  );
}
