"use client";

import { useRef, useState, useCallback } from "react";
import { BoardState, FILES, RANKS, SquareId, PieceKind, PieceColor, squareToCoords } from "@/lib/logic/types";
import type { SlideAnimation } from "@/lib/state/use-puzzle";
import type { Arrow } from "@/lib/logic/pgn";

const SQUARE_SIZE = 100;
const BOARD_SIZE = SQUARE_SIZE * 8;

const LIGHT = "#d4c4a0";
const DARK = "#7a9e6e";
const SELECTED_COLOR = "#f0e060";
const VALID_MOVE_COLOR = "#00000033";
const TARGET_COLOR = "#d4920a";
const LAST_MOVE_COLOR = "#a8c4f0";
const WRONG_MOVE_COLOR = "#ef4444";

interface DragState {
  from: SquareId;
  piece: PieceKind;
  color: PieceColor;
  x: number; // SVG coordinates
  y: number;
}

interface BoardProps {
  board: BoardState;
  selectedSquare: SquareId | null;
  validMoves: SquareId[];
  targets: SquareId[];
  reachedTargets: SquareId[];
  dragValidMoves: SquareId[];
  draggablePiece?: PieceKind;
  onSquareClick: (sq: SquareId) => void;
  onDrop: (from: SquareId, to: SquareId) => void;
  onDragStart: (sq: SquareId) => void;
  onDragEnd: () => void;
  pawnSlide?: { from: SquareId; to: SquareId };
  wrongMoveSquare?: SquareId | null;
  opponentSlide?: SlideAnimation | null;
  readOnly?: boolean;
  arrows?: Arrow[];
}

export default function Board({
  board,
  selectedSquare,
  validMoves,
  targets,
  reachedTargets,
  dragValidMoves,
  draggablePiece,
  onSquareClick,
  onDrop,
  onDragStart,
  onDragEnd,
  pawnSlide,
  wrongMoveSquare,
  opponentSlide,
  readOnly,
  arrows,
}: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  // Convert a pointer event to SVG coordinates
  const pointerToSvg = useCallback((e: React.PointerEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const svgToSquare = useCallback((x: number, y: number): SquareId | null => {
    const file = Math.floor(x / SQUARE_SIZE);
    const rank = Math.floor(y / SQUARE_SIZE);
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return `${FILES[file]}${RANKS[rank]}` as SquareId;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent, sq: SquareId) => {
    if (readOnly) return;
    const p = board.pieces.get(sq);
    if (!p || p.color !== "w" || (draggablePiece && p.piece !== draggablePiece)) return;
    const svgPt = pointerToSvg(e);
    if (!svgPt) return;

    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag({ from: sq, piece: p.piece, color: p.color, x: svgPt.x, y: svgPt.y });
    onDragStart(sq);
  }, [readOnly, board, draggablePiece, pointerToSvg, onDragStart]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag) return;
    const svgPt = pointerToSvg(e);
    if (!svgPt) return;
    setDrag((prev) => prev ? { ...prev, x: svgPt.x, y: svgPt.y } : null);
  }, [drag, pointerToSvg]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!drag) return;
    const svgPt = pointerToSvg(e);
    if (svgPt) {
      const dropSq = svgToSquare(svgPt.x, svgPt.y);
      if (dropSq && dropSq !== drag.from) {
        onDrop(drag.from, dropSq);
      } else {
        // Dropped on same square or off-board — treat as click
        onSquareClick(drag.from);
      }
    }
    setDrag(null);
    onDragEnd();
  }, [drag, pointerToSvg, svgToSquare, onDrop, onSquareClick, onDragEnd]);

  // Merge click-selected valid moves with drag valid moves
  const allHighlightedMoves = drag ? dragValidMoves : validMoves;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
      className="w-full max-w-[min(90vw,90vh-8rem)] aspect-square touch-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Squares */}
      {RANKS.map((rank, ri) =>
        FILES.map((file, fi) => {
          const sq = `${file}${rank}` as SquareId;
          const isLight = (fi + ri) % 2 === 0;
          const isSelected = sq === selectedSquare || (drag && sq === drag.from);
          const isTarget = targets.includes(sq) && !reachedTargets.includes(sq);
          const isReached = reachedTargets.includes(sq);
          const hasOccupant = board.pieces.has(sq);

          const isPawnSlideSquare = pawnSlide && (sq === pawnSlide.from || sq === pawnSlide.to);
          const isWrongMove = sq === wrongMoveSquare;

          let fill = isLight ? LIGHT : DARK;
          if (isPawnSlideSquare) fill = LAST_MOVE_COLOR;
          if (isSelected) fill = SELECTED_COLOR;
          if (isWrongMove) fill = WRONG_MOVE_COLOR;

          return (
            <g
              key={sq}
              onClick={() => { if (!drag) onSquareClick(sq); }}
              onPointerDown={(e) => handlePointerDown(e, sq)}
              className="cursor-pointer"
            >
              <rect
                x={fi * SQUARE_SIZE}
                y={ri * SQUARE_SIZE}
                width={SQUARE_SIZE}
                height={SQUARE_SIZE}
                fill={fill}
              />
              {ri === 7 && (
                <text
                  x={fi * SQUARE_SIZE + 5}
                  y={ri * SQUARE_SIZE + SQUARE_SIZE - 5}
                  fontSize="14"
                  fill={isLight ? DARK : LIGHT}
                  fontWeight="bold"
                  className="pointer-events-none select-none"
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
                  className="pointer-events-none select-none"
                >
                  {rank}
                </text>
              )}
              {isTarget && !hasOccupant && (
                <text
                  x={fi * SQUARE_SIZE + SQUARE_SIZE / 2}
                  y={ri * SQUARE_SIZE + SQUARE_SIZE / 2 + 18}
                  fontSize="70"
                  textAnchor="middle"
                  fill="#f5c518"
                  stroke="#8b6914"
                  strokeWidth="2"
                  className="pointer-events-none select-none"
                  style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}
                >
                  &#9733;
                </text>
              )}
              {isReached && (
                <text
                  x={fi * SQUARE_SIZE + SQUARE_SIZE / 2}
                  y={ri * SQUARE_SIZE + SQUARE_SIZE / 2 + 8}
                  fontSize="36"
                  textAnchor="middle"
                  fill="#ffffff"
                  stroke="#2d6a2e"
                  strokeWidth="1.5"
                  className="pointer-events-none select-none"
                  style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
                >
                  &#10003;
                </text>
              )}
            </g>
          );
        })
      )}

      {/* Valid move indicators */}
      {allHighlightedMoves.map((sq) => {
        const [fx, fy] = squareToCoords(sq);
        const occupant = board.pieces.get(sq);
        const isTarget = targets.includes(sq);
        if (occupant) {
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

      {/* Pieces (skip the dragged piece from its original position) */}
      {Array.from(board.pieces.entries()).map(([sq, { piece, color }]) => {
        if (drag && sq === drag.from) return null;
        const [fx, fy] = squareToCoords(sq);

        // Animate the pawn that "just moved" in en passant puzzles
        const isEpSliding = pawnSlide && sq === pawnSlide.to && piece === "P";
        // Animate opponent response pieces
        const isOppSliding = opponentSlide && sq === opponentSlide.to;

        let slideStyle: React.CSSProperties | undefined;
        if (readOnly) {
          // No animation in game viewer — fast clicking shouldn't jerk
        } else if (isEpSliding && pawnSlide) {
          const [fromFx, fromFy] = squareToCoords(pawnSlide.from);
          const dx = (fromFx - fx) * SQUARE_SIZE;
          const dy = (fromFy - fy) * SQUARE_SIZE;
          slideStyle = {
            "--slide-x": `${dx}px`,
            "--slide-y": `${dy}px`,
            animation: "pawn-slide 0.4s ease-out 0.3s backwards",
          } as React.CSSProperties;
        } else if (isOppSliding && opponentSlide) {
          const [fromFx, fromFy] = squareToCoords(opponentSlide.from);
          const dx = (fromFx - fx) * SQUARE_SIZE;
          const dy = (fromFy - fy) * SQUARE_SIZE;
          slideStyle = {
            "--slide-x": `${dx}px`,
            "--slide-y": `${dy}px`,
            animation: "pawn-slide 0.4s ease-out forwards",
          } as React.CSSProperties;
        }

        return (
          <image
            key={`piece-${sq}`}
            href={`/pieces/${color}${piece}.svg`}
            x={fx * SQUARE_SIZE + 5}
            y={fy * SQUARE_SIZE + 5}
            width={SQUARE_SIZE - 10}
            height={SQUARE_SIZE - 10}
            className="pointer-events-none"
            style={slideStyle}
          />
        );
      })}

      {/* Stars on top of target pieces */}
      {targets.map((sq) => {
        if (reachedTargets.includes(sq)) return null;
        if (!board.pieces.has(sq)) return null;
        const [fx, fy] = squareToCoords(sq);
        return (
          <text
            key={`target-star-${sq}`}
            x={fx * SQUARE_SIZE + SQUARE_SIZE / 2}
            y={fy * SQUARE_SIZE + SQUARE_SIZE / 2 + 18}
            fontSize="70"
            textAnchor="middle"
            fill="#f5c518"
            stroke="#8b6914"
            strokeWidth="2"
            className="pointer-events-none select-none"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))" }}
          >
            &#9733;
          </text>
        );
      })}

      {/* Arrows */}
      {arrows && arrows.map((arrow, i) => {
        const [fx, fy] = squareToCoords(arrow.from);
        const [tx, ty] = squareToCoords(arrow.to);
        const x1 = fx * SQUARE_SIZE + SQUARE_SIZE / 2;
        const y1 = fy * SQUARE_SIZE + SQUARE_SIZE / 2;
        const x2 = tx * SQUARE_SIZE + SQUARE_SIZE / 2;
        const y2 = ty * SQUARE_SIZE + SQUARE_SIZE / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const headW = 45;
        const headH = 55;
        const ux = dx / len;
        const uy = dy / len;
        // End the shaft where the arrowhead base starts; tip lands at square center
        const ex = x2 - ux * headW;
        const ey = y2 - uy * headW;
        const markerId = `arrow-${i}`;
        return (
          <g key={`arrow-${i}`} className="pointer-events-none">
            <defs>
              <marker
                id={markerId}
                markerWidth={headW}
                markerHeight={headH}
                refX={headW}
                refY={headH / 2}
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <polygon
                  points={`0 0, ${headW} ${headH / 2}, 0 ${headH}`}
                  fill={arrow.color}
                  opacity={0.8}
                />
              </marker>
            </defs>
            <line
              x1={x1} y1={y1} x2={ex} y2={ey}
              stroke={arrow.color}
              strokeWidth={18}
              strokeLinecap="round"
              opacity={0.7}
              markerEnd={`url(#${markerId})`}
            />
          </g>
        );
      })}

      {/* Dragged piece following cursor */}
      {drag && (
        <image
          href={`/pieces/${drag.color}${drag.piece}.svg`}
          x={drag.x - SQUARE_SIZE / 2}
          y={drag.y - SQUARE_SIZE / 2}
          width={SQUARE_SIZE}
          height={SQUARE_SIZE}
          className="pointer-events-none"
          opacity={0.9}
        />
      )}
    </svg>
  );
}
