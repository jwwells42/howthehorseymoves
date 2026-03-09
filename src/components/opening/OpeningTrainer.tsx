"use client";

import { useState, useCallback, useMemo } from "react";
import Board from "@/components/board/Board";
import { SquareId } from "@/lib/logic/types";
import { getLegalMoves } from "@/lib/logic/attacks";
import type { Arrow } from "@/lib/logic/pgn";
import type { SlideAnimation } from "@/lib/state/use-puzzle";
import {
  Opening,
  OpeningLine,
  parseOpeningPgn,
  extractLines,
  findBranchPoint,
} from "@/lib/openings";

type Phase = "learn" | "practice";

export default function OpeningTrainer({ opening }: { opening: Opening }) {
  const { tree, lines } = useMemo(() => {
    const t = parseOpeningPgn(opening.pgn);
    const l = extractLines(t);
    return { tree: t, lines: l };
  }, [opening.pgn]);

  const startBoard = tree.startBoard;

  const [lineIdx, setLineIdx] = useState(0);
  const [moveIdx, setMoveIdx] = useState(0);
  const [board, setBoard] = useState(startBoard);
  const [phase, setPhase] = useState<Phase>("learn");
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const [wrongMoveSquare, setWrongMoveSquare] = useState<SquareId | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [opponentSlide, setOpponentSlide] = useState<SlideAnimation | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [lineComplete, setLineComplete] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const currentLine = lines[lineIdx];
  const isWhiteTurn = moveIdx < currentLine.length && currentLine[moveIdx].colorPlayed === "w";
  const atEnd = moveIdx >= currentLine.length;

  // Arrow for current white move
  const arrows = useMemo((): Arrow[] | undefined => {
    if (atEnd || !isWhiteTurn || waiting) return undefined;
    if (phase === "learn" || showHint) {
      const move = currentLine[moveIdx];
      return [{ from: move.from, to: move.to, color: "#15803d" }];
    }
    return undefined;
  }, [atEnd, isWhiteTurn, waiting, phase, showHint, currentLine, moveIdx]);

  // Valid moves for selected piece
  const validMoves = useMemo(() => {
    if (!selectedSquare || waiting || atEnd || !isWhiteTurn) return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== "w") return [];
    return getLegalMoves(selectedSquare, board, "w");
  }, [selectedSquare, board, waiting, atEnd, isWhiteTurn]);

  const dragValidMoves = useMemo(() => {
    // Reuse validMoves for drag
    return validMoves;
  }, [validMoves]);

  // Auto-play black's move
  const autoPlayBlack = useCallback(
    (idx: number, line: OpeningLine) => {
      if (idx >= line.length) return;
      const move = line[idx];
      setWaiting(true);

      setTimeout(() => {
        setOpponentSlide({
          piece: move.san.includes("x") ? "P" : "P", // placeholder
          color: "b",
          from: move.from,
          to: move.to,
        });
        setBoard(move.boardAfter);
        const nextIdx = idx + 1;
        setMoveIdx(nextIdx);

        setTimeout(() => {
          setOpponentSlide(null);
          setWaiting(false);
          if (nextIdx >= line.length) {
            setLineComplete(true);
          }
        }, 400);
      }, 300);
    },
    []
  );

  // Advance to next line or phase
  const advanceLine = useCallback(() => {
    setLineComplete(false);
    setSelectedSquare(null);

    if (lineIdx + 1 < lines.length) {
      // Next line — rewind to branch point
      const nextLine = lines[lineIdx + 1];
      const bp = findBranchPoint(currentLine, nextLine);
      const newBoard = bp > 0 ? nextLine[bp - 1].boardAfter : startBoard;

      setLineIdx(lineIdx + 1);
      setMoveIdx(bp);
      setBoard(newBoard);

      // If the branch point move is black's, auto-play it
      if (bp < nextLine.length && nextLine[bp].colorPlayed === "b") {
        setTimeout(() => autoPlayBlack(bp, nextLine), 400);
      }
    } else if (phase === "learn") {
      // All lines learned — switch to practice
      setPhase("practice");
      setLineIdx(0);
      setMoveIdx(0);
      setBoard(startBoard);
    } else {
      // All lines practiced
      setAllDone(true);
    }
  }, [lineIdx, lines, currentLine, startBoard, phase, autoPlayBlack]);

  // Handle a validated white move
  const executeWhiteMove = useCallback(
    (from: SquareId, to: SquareId) => {
      if (atEnd || !isWhiteTurn || waiting) return;

      const expected = currentLine[moveIdx];
      if (from === expected.from && to === expected.to) {
        // Correct
        setBoard(expected.boardAfter);
        setSelectedSquare(null);
        setShowHint(false);
        setWrongMoveSquare(null);
        const nextIdx = moveIdx + 1;
        setMoveIdx(nextIdx);

        if (nextIdx >= currentLine.length) {
          setLineComplete(true);
        } else if (currentLine[nextIdx].colorPlayed === "b") {
          autoPlayBlack(nextIdx, currentLine);
        }
      } else {
        // Wrong move
        setWrongMoveSquare(to);
        setShowHint(true);
        setSelectedSquare(null);
        setTimeout(() => setWrongMoveSquare(null), 600);
      }
    },
    [atEnd, isWhiteTurn, waiting, currentLine, moveIdx, autoPlayBlack]
  );

  const handleSquareClick = useCallback(
    (sq: SquareId) => {
      if (waiting || atEnd || lineComplete) return;
      if (!isWhiteTurn) return;

      if (!selectedSquare) {
        const p = board.pieces.get(sq);
        if (p && p.color === "w") setSelectedSquare(sq);
        return;
      }

      if (sq === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      // Check if clicking another white piece
      const target = board.pieces.get(sq);
      if (target && target.color === "w") {
        setSelectedSquare(sq);
        return;
      }

      // Try to make the move
      const moves = getLegalMoves(selectedSquare, board, "w");
      if (!moves.includes(sq)) {
        setSelectedSquare(null);
        return;
      }

      executeWhiteMove(selectedSquare, sq);
    },
    [board, selectedSquare, waiting, atEnd, lineComplete, isWhiteTurn, executeWhiteMove]
  );

  const handleDrop = useCallback(
    (from: SquareId, to: SquareId) => {
      if (waiting || atEnd || lineComplete || !isWhiteTurn || from === to) return;
      const p = board.pieces.get(from);
      if (!p || p.color !== "w") return;
      const moves = getLegalMoves(from, board, "w");
      if (!moves.includes(to)) return;
      executeWhiteMove(from, to);
    },
    [board, waiting, atEnd, lineComplete, isWhiteTurn, executeWhiteMove]
  );

  const [dragFrom, setDragFrom] = useState<SquareId | null>(null);
  const onDragStart = useCallback((sq: SquareId) => setDragFrom(sq), []);
  const onDragEnd = useCallback(() => setDragFrom(null), []);

  const dragMoves = useMemo(() => {
    if (!dragFrom || waiting || atEnd || !isWhiteTurn) return [];
    const p = board.pieces.get(dragFrom);
    if (!p || p.color !== "w") return [];
    return getLegalMoves(dragFrom, board, "w");
  }, [dragFrom, board, waiting, atEnd, isWhiteTurn]);

  const reset = useCallback(() => {
    setLineIdx(0);
    setMoveIdx(0);
    setBoard(startBoard);
    setPhase("learn");
    setSelectedSquare(null);
    setWrongMoveSquare(null);
    setShowHint(false);
    setOpponentSlide(null);
    setWaiting(false);
    setLineComplete(false);
    setAllDone(false);
  }, [startBoard]);

  // Build move list display for current line
  const moveDisplay = useMemo(() => {
    const pairs: { num: number; white: string; black?: string; whiteIdx: number; blackIdx?: number }[] = [];
    for (let i = 0; i < currentLine.length; i += 2) {
      const w = currentLine[i];
      const b = currentLine[i + 1];
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: w.san,
        black: b?.san,
        whiteIdx: i,
        blackIdx: b ? i + 1 : undefined,
      });
    }
    return pairs;
  }, [currentLine]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 max-w-2xl mx-auto">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-1">{opening.name}</h2>
        <p className="text-muted">{opening.description}</p>
      </div>

      <div className="flex gap-4 text-sm text-faint">
        <span>Line {lineIdx + 1} of {lines.length}</span>
        <span>{phase === "learn" ? "Learning" : "Practicing"}</span>
      </div>

      <div className="relative w-full flex justify-center">
        <Board
          board={board}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          targets={[]}
          reachedTargets={[]}
          dragValidMoves={dragMoves}
          onSquareClick={handleSquareClick}
          onDrop={handleDrop}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          wrongMoveSquare={wrongMoveSquare}
          opponentSlide={opponentSlide}
          arrows={arrows}
        />
        {allDone && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
            <div className="text-center">
              <div className="text-4xl mb-2">&#10003;</div>
              <p className="text-lg font-bold mb-3">Lines mastered!</p>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg bg-btn hover:bg-btn-hover"
              >
                Practice again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="text-sm text-center min-h-8">
        {lineComplete && !allDone && (
          <div className="flex items-center gap-3 justify-center">
            <span className="text-green-400 font-medium">Line complete!</span>
            <button
              onClick={advanceLine}
              className="px-4 py-1.5 rounded-lg bg-btn hover:bg-btn-hover text-sm"
            >
              {lineIdx + 1 < lines.length
                ? "Next variation"
                : phase === "learn"
                  ? "Practice"
                  : "Finish"}
            </button>
          </div>
        )}
        {!lineComplete && !allDone && isWhiteTurn && !waiting && (
          <span className="text-muted">
            {phase === "learn" ? "Follow the arrow" : "Your move"}
          </span>
        )}
        {!lineComplete && !allDone && !isWhiteTurn && !waiting && !atEnd && (
          <span className="text-muted">Opponent is thinking...</span>
        )}
      </div>

      {/* Move list */}
      <div className="rounded-lg border border-card-border bg-card px-4 py-3 w-full max-w-md">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {moveDisplay.map((pair) => (
            <span key={pair.num}>
              <span className="text-faint">{pair.num}.</span>{" "}
              <span className={moveIdx > pair.whiteIdx ? "text-foreground" : moveIdx === pair.whiteIdx ? "text-foreground font-bold" : "text-faint"}>
                {pair.white}
              </span>
              {pair.black && (
                <>
                  {" "}
                  <span className={pair.blackIdx !== undefined && moveIdx > pair.blackIdx ? "text-foreground" : pair.blackIdx !== undefined && moveIdx === pair.blackIdx ? "text-foreground font-bold" : "text-faint"}>
                    {pair.black}
                  </span>
                </>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-btn hover:bg-btn-hover text-sm"
      >
        Start over
      </button>
    </div>
  );
}
