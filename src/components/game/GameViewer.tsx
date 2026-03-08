"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Board from "@/components/board/Board";
import { parsePgn } from "@/lib/logic/pgn";
import { ModelGame } from "@/lib/games/types";

const AUTOPLAY_MS = 1200;

export default function GameViewer({ game }: { game: ModelGame }) {
  const parsed = useMemo(() => parsePgn(game.pgn), [game.pgn]);

  const [currentMove, setCurrentMove] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const moveListRef = useRef<HTMLDivElement>(null);

  const board = parsed.positions[currentMove];
  const lastMove = currentMove > 0 ? parsed.moves[currentMove - 1] : null;
  const totalMoves = parsed.moves.length;
  const currentComment = lastMove?.comment;
  const currentArrows = lastMove?.arrows;

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
    if (!isPlaying || currentMove >= totalMoves) return;
    const timer = setTimeout(() => {
      setCurrentMove(m => {
        const next = m + 1;
        if (next >= totalMoves) setIsPlaying(false);
        return next;
      });
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [isPlaying, currentMove, totalMoves]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); goBack(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goForward(); }
      else if (e.key === " ") { e.preventDefault(); setIsPlaying(p => !p); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goBack, goForward]);

  // Scroll current move into view within the move list (not the page)
  useEffect(() => {
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
  }, [currentMove]);

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

        {/* Move comment */}
        {currentComment && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-card border border-card-border text-sm text-muted italic">
            {currentComment}
          </div>
        )}

        {/* Navigation controls */}
        <div className="flex items-center justify-center gap-2 mt-4">
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

        <p className="text-xs text-faint text-center mt-2">
          Arrow keys ← → &nbsp;|&nbsp; Space to play/pause
        </p>
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
