"use client";

import { BoardState, FILES, RANKS, SquareId, squareToCoords } from "@/lib/logic/types";
import Image from "next/image";

const SQUARE_SIZE = 100;
const BOARD_SIZE = SQUARE_SIZE * 8;

const LIGHT = "#f0d9b5";
const DARK = "#b58863";
const SELECTED_COLOR = "#ffff00";
const VALID_MOVE_COLOR = "#00000033";
const TARGET_COLOR = "#ffd700";

interface BoardProps {
  board: BoardState;
  selectedSquare: SquareId | null;
  validMoves: SquareId[];
  targets: SquareId[];
  reachedTargets: SquareId[];
  onSquareClick: (sq: SquareId) => void;
}

export default function Board({
  board,
  selectedSquare,
  validMoves,
  targets,
  reachedTargets,
  onSquareClick,
}: BoardProps) {
  return (
    <svg
      viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
      className="w-full max-w-[min(90vw,90vh-8rem)] aspect-square"
    >
      {/* Squares */}
      {RANKS.map((rank, ri) =>
        FILES.map((file, fi) => {
          const sq = `${file}${rank}` as SquareId;
          const isLight = (fi + ri) % 2 === 0;
          const isSelected = sq === selectedSquare;
          const isTarget = targets.includes(sq) && !reachedTargets.includes(sq);
          const isReached = reachedTargets.includes(sq);

          let fill = isLight ? LIGHT : DARK;
          if (isSelected) fill = SELECTED_COLOR;

          return (
            <g key={sq} onClick={() => onSquareClick(sq)} className="cursor-pointer">
              <rect
                x={fi * SQUARE_SIZE}
                y={ri * SQUARE_SIZE}
                width={SQUARE_SIZE}
                height={SQUARE_SIZE}
                fill={fill}
              />
              {/* Coordinate labels */}
              {ri === 7 && (
                <text
                  x={fi * SQUARE_SIZE + 5}
                  y={ri * SQUARE_SIZE + SQUARE_SIZE - 5}
                  fontSize="14"
                  fill={isLight ? DARK : LIGHT}
                  fontWeight="bold"
                >
                  {file}
                </text>
              )}
              {fi === 0 && (
                <text
                  x={5}
                  y={ri * SQUARE_SIZE + 16}
                  fontSize="14"
                  fill={isLight ? DARK : LIGHT}
                  fontWeight="bold"
                >
                  {rank}
                </text>
              )}
              {/* Target star */}
              {isTarget && (
                <text
                  x={fi * SQUARE_SIZE + SQUARE_SIZE / 2}
                  y={ri * SQUARE_SIZE + SQUARE_SIZE / 2 + 8}
                  fontSize="36"
                  textAnchor="middle"
                  fill={TARGET_COLOR}
                  className="pointer-events-none select-none"
                  style={{ filter: "drop-shadow(0 0 4px rgba(255,215,0,0.6))" }}
                >
                  &#9733;
                </text>
              )}
              {/* Reached target (green check) */}
              {isReached && (
                <text
                  x={fi * SQUARE_SIZE + SQUARE_SIZE / 2}
                  y={ri * SQUARE_SIZE + SQUARE_SIZE / 2 + 8}
                  fontSize="36"
                  textAnchor="middle"
                  fill="#22c55e"
                  className="pointer-events-none select-none"
                >
                  &#10003;
                </text>
              )}
            </g>
          );
        })
      )}

      {/* Valid move indicators */}
      {validMoves.map((sq) => {
        const [fx, fy] = squareToCoords(sq);
        const occupant = board.pieces.get(sq);
        const isTarget = targets.includes(sq);
        if (occupant) {
          // Capture ring
          return (
            <circle
              key={`move-${sq}`}
              cx={fx * SQUARE_SIZE + SQUARE_SIZE / 2}
              cy={fy * SQUARE_SIZE + SQUARE_SIZE / 2}
              r={SQUARE_SIZE * 0.45}
              fill="none"
              stroke={isTarget ? TARGET_COLOR : VALID_MOVE_COLOR}
              strokeWidth={4}
              className="pointer-events-none"
            />
          );
        }
        return (
          <circle
            key={`move-${sq}`}
            cx={fx * SQUARE_SIZE + SQUARE_SIZE / 2}
            cy={fy * SQUARE_SIZE + SQUARE_SIZE / 2}
            r={isTarget ? SQUARE_SIZE * 0.25 : SQUARE_SIZE * 0.15}
            fill={isTarget ? `${TARGET_COLOR}88` : VALID_MOVE_COLOR}
            className="pointer-events-none"
          />
        );
      })}

      {/* Pieces */}
      {Array.from(board.pieces.entries()).map(([sq, { piece, color }]) => {
        const [fx, fy] = squareToCoords(sq);
        return (
          <image
            key={`piece-${sq}`}
            href={`/pieces/${color}${piece}.svg`}
            x={fx * SQUARE_SIZE + 5}
            y={fy * SQUARE_SIZE + 5}
            width={SQUARE_SIZE - 10}
            height={SQUARE_SIZE - 10}
            className="pointer-events-none"
          />
        );
      })}
    </svg>
  );
}
