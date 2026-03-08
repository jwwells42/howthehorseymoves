"use client";

import { useState, useCallback, useMemo } from "react";
import { BoardState, PieceKind, PieceColor, SquareId, createBoardState, parseFen, squareToCoords, coordsToSquare } from "@/lib/logic/types";
import { getValidMoves } from "@/lib/logic/moves";
import { isCheckmate, isStalemate, getLegalMoves, getAllLegalMoves } from "@/lib/logic/attacks";
import { Puzzle, OpponentResponse } from "@/lib/puzzles/types";
import { useProgress } from "./progress-context";

export interface SlideAnimation {
  piece: PieceKind;
  color: PieceColor;
  from: SquareId;
  to: SquareId;
}

export function usePuzzle(puzzle: Puzzle) {
  const { completePuzzle } = useProgress();
  const isCheckmateMode = puzzle.mode === "checkmate";
  const isBotMode = puzzle.mode === "checkmate-bot";
  const isMultiMove = isCheckmateMode && puzzle.opponentResponses && puzzle.opponentResponses.length > 0;

  const buildBoard = useCallback(() => {
    if (typeof puzzle.setup === "string") {
      const { placements, castlingRights, enPassantSquare } = parseFen(puzzle.setup);
      return createBoardState(placements, {
        enPassantSquare: puzzle.enPassantSquare ?? enPassantSquare,
        castlingRights: puzzle.castlingRights ?? castlingRights,
      });
    }
    return createBoardState(puzzle.setup, {
      enPassantSquare: puzzle.enPassantSquare,
      castlingRights: puzzle.castlingRights,
    });
  }, [puzzle.setup, puzzle.enPassantSquare, puzzle.castlingRights]);

  const [board, setBoard] = useState<BoardState>(buildBoard);
  const [selectedSquare, setSelectedSquare] = useState<SquareId | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [reachedTargets, setReachedTargets] = useState<SquareId[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [stalemateTrigger, setStalemateTrigger] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);
  const [solutionStep, setSolutionStep] = useState(0);
  const [wrongMoveSquare, setWrongMoveSquare] = useState<SquareId | null>(null);
  const [opponentSlide, setOpponentSlide] = useState<SlideAnimation | null>(null);
  const [waitingForAnimation, setWaitingForAnimation] = useState(false);

  const validMoves = useMemo(() => {
    if (!selectedSquare) return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== "w") return [];
    if (!isBotMode && p.piece !== puzzle.piece) return [];
    return isBotMode
      ? getLegalMoves(selectedSquare, board, "w")
      : getValidMoves(p.piece, selectedSquare, board, "w");
  }, [selectedSquare, board, puzzle.piece, isBotMode]);

  const calculateStars = useCallback(
    (moves: number) => {
      const { three, two, one } = puzzle.starThresholds;
      if (moves <= three) return 3;
      if (moves <= two) return 2;
      if (moves <= one) return 1;
      return 1;
    },
    [puzzle.starThresholds]
  );

  const stars = useMemo(() => calculateStars(moveCount), [calculateStars, moveCount]);

  // Apply special move side-effects (en passant capture, castling rook)
  const applyMoveEffects = useCallback(
    (pieces: Map<SquareId, { piece: PieceKind; color: PieceColor }>, from: SquareId, to: SquareId, movedPiece: { piece: PieceKind; color: PieceColor }) => {
      if (movedPiece.piece === "P" && to === board.enPassantSquare) {
        const [, fromY] = squareToCoords(from);
        const [toX] = squareToCoords(to);
        const capturedSq = coordsToSquare(toX, fromY);
        if (capturedSq) pieces.delete(capturedSq);
      }

      if (movedPiece.piece === "K") {
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
    },
    [board.enPassantSquare]
  );

  // Apply an opponent response and animate it
  const applyOpponentResponse = useCallback(
    (currentBoard: BoardState, response: OpponentResponse) => {
      const oppPieces = new Map(currentBoard.pieces);
      const oppPiece = oppPieces.get(response.from);
      if (!oppPiece) return currentBoard;

      // Set up animation before updating board
      setOpponentSlide({
        piece: oppPiece.piece,
        color: oppPiece.color,
        from: response.from,
        to: response.to,
      });
      setWaitingForAnimation(true);

      oppPieces.delete(response.from);
      oppPieces.set(response.to, oppPiece);
      const newBoard: BoardState = { pieces: oppPieces };
      setBoard(newBoard);

      // Clear animation after delay
      setTimeout(() => {
        setOpponentSlide(null);
        setWaitingForAnimation(false);
      }, 700);

      return newBoard;
    },
    []
  );

  // Make a random bot move for black
  const makeBotMove = useCallback(
    (currentBoard: BoardState) => {
      setWaitingForAnimation(true);
      setTimeout(() => {
        const moves = getAllLegalMoves("b", currentBoard);
        if (moves.length === 0) return; // stalemate already handled

        const move = moves[Math.floor(Math.random() * moves.length)];
        const newPieces = new Map(currentBoard.pieces);
        const piece = newPieces.get(move.from)!;
        newPieces.delete(move.from);
        newPieces.set(move.to, piece);

        setOpponentSlide({
          piece: piece.piece,
          color: piece.color,
          from: move.from,
          to: move.to,
        });

        const newBoard: BoardState = { pieces: newPieces };
        setBoard(newBoard);

        // Check if white is now in checkmate or stalemate after bot move
        if (isCheckmate("w", newBoard)) {
          // Player lost — treat as needing reset
          setTimeout(() => {
            setOpponentSlide(null);
            setWaitingForAnimation(false);
          }, 500);
          return;
        }
        if (isStalemate("w", newBoard)) {
          setStalemateTrigger(true);
        }

        setTimeout(() => {
          setOpponentSlide(null);
          setWaitingForAnimation(false);
        }, 500);
      }, 400);
    },
    []
  );

  // Execute a validated move from `from` to `to`
  const executeMove = useCallback(
    (from: SquareId, to: SquareId) => {
      if (isCheckmateMode) {
        // Multi-move: validate against solution
        if (isMultiMove) {
          const expectedTarget = puzzle.solution[solutionStep];
          if (to !== expectedTarget) {
            // Wrong move — flash and reject
            setWrongMoveSquare(to);
            setSelectedSquare(null);
            setTimeout(() => setWrongMoveSquare(null), 600);
            return;
          }
        }
      }

      const newPieces = new Map(board.pieces);
      const piece = newPieces.get(from)!;
      newPieces.delete(from);
      newPieces.set(to, piece);

      applyMoveEffects(newPieces, from, to, piece);

      const newBoard: BoardState = { pieces: newPieces };
      setBoard(newBoard);
      setSelectedSquare(null);
      const newMoveCount = moveCount + 1;
      setMoveCount(newMoveCount);

      if (isBotMode) {
        // Bot mode: check for checkmate/stalemate, otherwise bot plays
        if (isCheckmate("b", newBoard)) {
          setIsComplete(true);
          const finalStars = calculateStars(newMoveCount);
          completePuzzle(puzzle.id, finalStars, newMoveCount);
        } else if (isStalemate("b", newBoard)) {
          setStalemateTrigger(true);
        } else {
          makeBotMove(newBoard);
        }
      } else if (isCheckmateMode) {
        const newStep = solutionStep + 1;
        setSolutionStep(newStep);

        // Check if this was the last move in the solution
        const isLastMove = newStep >= puzzle.solution.length;

        if (isLastMove || !isMultiMove) {
          // Final move or mate-in-1: check for checkmate/stalemate
          if (isCheckmate("b", newBoard)) {
            setIsComplete(true);
            const finalStars = calculateStars(newMoveCount);
            completePuzzle(puzzle.id, finalStars, newMoveCount);
          } else if (isStalemate("b", newBoard)) {
            setStalemateTrigger(true);
          } else if (!isMultiMove) {
            // Mate-in-1 with no forced solution: wrong move, reject
            setWrongMoveSquare(to);
            // Revert the move
            setBoard(board);
            setMoveCount(moveCount);
            setSolutionStep(solutionStep);
            setTimeout(() => setWrongMoveSquare(null), 600);
          }
        } else {
          // Not the last move — apply opponent response
          const response = puzzle.opponentResponses?.[solutionStep];
          if (response) {
            setTimeout(() => {
              applyOpponentResponse(newBoard, response);
            }, 300);
          }
        }
      } else {
        // Reach-target mode
        const hasMultiStepSolution = puzzle.solution.length > 1;

        if (hasMultiStepSolution) {
          // Multi-step: validate move order against solution
          const expectedTarget = puzzle.solution[solutionStep];
          if (to !== expectedTarget) {
            setWrongMoveSquare(to);
            setSelectedSquare(null);
            setBoard(board);
            setMoveCount(moveCount);
            setTimeout(() => setWrongMoveSquare(null), 600);
            return;
          }
        }

        if (puzzle.targets.includes(to) && !reachedTargets.includes(to)) {
          const newReached = [...reachedTargets, to];
          setReachedTargets(newReached);

          if (hasMultiStepSolution) {
            const newStep = solutionStep + 1;
            setSolutionStep(newStep);

            if (newReached.length === puzzle.targets.length) {
              setIsComplete(true);
              const finalStars = calculateStars(newMoveCount);
              completePuzzle(puzzle.id, finalStars, newMoveCount);
            } else {
              const response = puzzle.opponentResponses?.[solutionStep];
              if (response) {
                setTimeout(() => {
                  applyOpponentResponse(newBoard, response);
                }, 300);
              }
            }
          } else {
            if (newReached.length === puzzle.targets.length) {
              setIsComplete(true);
              const finalStars = calculateStars(newMoveCount);
              completePuzzle(puzzle.id, finalStars, newMoveCount);
            }
          }
        }
      }
    },
    [board, moveCount, reachedTargets, puzzle, calculateStars, completePuzzle, isCheckmateMode, isBotMode, isMultiMove, solutionStep, applyMoveEffects, applyOpponentResponse, makeBotMove]
  );

  const handleSquareClick = useCallback(
    (sq: SquareId) => {
      if (isComplete || waitingForAnimation) return;

      if (!selectedSquare) {
        const p = board.pieces.get(sq);
        if (p && p.color === "w" && (isBotMode || p.piece === puzzle.piece)) {
          setSelectedSquare(sq);
        }
        return;
      }

      if (sq === selectedSquare) {
        setSelectedSquare(null);
        return;
      }

      const p = board.pieces.get(selectedSquare);
      if (!p) return;
      const moves = isBotMode
        ? getLegalMoves(selectedSquare, board, "w")
        : getValidMoves(p.piece, selectedSquare, board, "w");
      if (!moves.includes(sq)) {
        const target = board.pieces.get(sq);
        if (target && target.color === "w" && (isBotMode || target.piece === puzzle.piece)) {
          setSelectedSquare(sq);
        } else {
          setSelectedSquare(null);
        }
        return;
      }

      executeMove(selectedSquare, sq);
    },
    [board, selectedSquare, isComplete, waitingForAnimation, puzzle, isBotMode, executeMove]
  );

  const handleDrop = useCallback(
    (from: SquareId, to: SquareId) => {
      if (isComplete || waitingForAnimation || from === to) return;
      const p = board.pieces.get(from);
      if (!p || p.color !== "w" || (!isBotMode && p.piece !== puzzle.piece)) return;
      const moves = isBotMode
        ? getLegalMoves(from, board, "w")
        : getValidMoves(p.piece, from, board, "w");
      if (!moves.includes(to)) return;
      executeMove(from, to);
    },
    [board, isComplete, waitingForAnimation, puzzle, isBotMode, executeMove]
  );

  const reset = useCallback(() => {
    setBoard(buildBoard());
    setSelectedSquare(null);
    setMoveCount(0);
    setReachedTargets([]);
    setIsComplete(false);
    setStalemateTrigger(false);
    setCurrentHintIndex(-1);
    setSolutionStep(0);
    setWrongMoveSquare(null);
    setOpponentSlide(null);
    setWaitingForAnimation(false);
  }, [buildBoard]);

  const showHint = useCallback(() => {
    if (puzzle.hints && currentHintIndex < puzzle.hints.length - 1) {
      setCurrentHintIndex((prev) => prev + 1);
    }
  }, [puzzle.hints, currentHintIndex]);

  return {
    board,
    selectedSquare,
    validMoves,
    reachedTargets,
    moveCount,
    isComplete,
    stalemateTrigger,
    wrongMoveSquare,
    opponentSlide,
    stars,
    currentHintIndex,
    handleSquareClick,
    handleDrop,
    reset,
    showHint,
  };
}
