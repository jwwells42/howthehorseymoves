import { type BoardState, type PieceKind, type PieceColor, type SquareId, createBoardState, parseFen, squareToCoords, coordsToSquare } from '$lib/logic/types';
import { getValidMoves } from '$lib/logic/moves';
import { isCheckmate, isStalemate, getLegalMoves, getAllLegalMoves } from '$lib/logic/attacks';
import type { Puzzle, OpponentResponse } from '$lib/puzzles/types';
import { completePuzzle as saveComplete } from '$lib/state/progress-store';

export interface SlideAnimation {
  piece: PieceKind;
  color: PieceColor;
  from: SquareId;
  to: SquareId;
}

export function createPuzzleState(puzzle: Puzzle) {
  const isCheckmateMode = puzzle.mode === 'checkmate';
  const isBotMode = puzzle.mode === 'checkmate-bot';
  const isMultiMove = isCheckmateMode && puzzle.opponentResponses && puzzle.opponentResponses.length > 0;

  function buildBoard(): BoardState {
    if (typeof puzzle.setup === 'string') {
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
  }

  let board = $state<BoardState>(buildBoard());
  let selectedSquare = $state<SquareId | null>(null);
  let moveCount = $state(0);
  let reachedTargets = $state<SquareId[]>([]);
  let isComplete = $state(false);
  let stalemateTrigger = $state(false);
  let currentHintIndex = $state(-1);
  let solutionStep = $state(0);
  let wrongMoveSquare = $state<SquareId | null>(null);
  let opponentSlide = $state<SlideAnimation | null>(null);
  let waitingForAnimation = $state(false);

  let validMoves = $derived.by(() => {
    if (!selectedSquare) return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== 'w') return [];
    if (!isBotMode && p.piece !== puzzle.piece) return [];
    return isBotMode
      ? getLegalMoves(selectedSquare, board, 'w')
      : getValidMoves(p.piece, selectedSquare, board, 'w');
  });

  function calculateStars(moves: number): number {
    const { three, two, one } = puzzle.starThresholds;
    if (moves <= three) return 3;
    if (moves <= two) return 2;
    if (moves <= one) return 1;
    return 1;
  }

  let stars = $derived(calculateStars(moveCount));

  function applyMoveEffects(
    pieces: Map<SquareId, { piece: PieceKind; color: PieceColor }>,
    from: SquareId,
    to: SquareId,
    movedPiece: { piece: PieceKind; color: PieceColor }
  ) {
    if (movedPiece.piece === 'P' && to === board.enPassantSquare) {
      const [, fromY] = squareToCoords(from);
      const [toX] = squareToCoords(to);
      const capturedSq = coordsToSquare(toX, fromY);
      if (capturedSq) pieces.delete(capturedSq);
    }

    if (movedPiece.piece === 'K') {
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
  }

  function applyOpponentResponse(currentBoard: BoardState, response: OpponentResponse) {
    const oppPieces = new Map(currentBoard.pieces);
    const oppPiece = oppPieces.get(response.from);
    if (!oppPiece) return currentBoard;

    opponentSlide = {
      piece: oppPiece.piece,
      color: oppPiece.color,
      from: response.from,
      to: response.to,
    };
    waitingForAnimation = true;

    oppPieces.delete(response.from);
    oppPieces.set(response.to, oppPiece);
    const newBoard: BoardState = { pieces: oppPieces };
    board = newBoard;

    setTimeout(() => {
      opponentSlide = null;
      waitingForAnimation = false;
    }, 700);

    return newBoard;
  }

  function makeBotMove(currentBoard: BoardState) {
    waitingForAnimation = true;
    setTimeout(() => {
      const moves = getAllLegalMoves('b', currentBoard);
      if (moves.length === 0) return;

      const move = moves[Math.floor(Math.random() * moves.length)];
      const newPieces = new Map(currentBoard.pieces);
      const piece = newPieces.get(move.from)!;
      newPieces.delete(move.from);
      newPieces.set(move.to, piece);

      opponentSlide = {
        piece: piece.piece,
        color: piece.color,
        from: move.from,
        to: move.to,
      };

      const newBoard: BoardState = { pieces: newPieces };
      board = newBoard;

      if (isCheckmate('w', newBoard)) {
        setTimeout(() => {
          opponentSlide = null;
          waitingForAnimation = false;
        }, 500);
        return;
      }
      if (isStalemate('w', newBoard)) {
        stalemateTrigger = true;
      }

      setTimeout(() => {
        opponentSlide = null;
        waitingForAnimation = false;
      }, 500);
    }, 400);
  }

  function executeMove(from: SquareId, to: SquareId) {
    if (isCheckmateMode) {
      if (isMultiMove) {
        const expectedTarget = puzzle.solution[solutionStep];
        if (to !== expectedTarget) {
          wrongMoveSquare = to;
          selectedSquare = null;
          setTimeout(() => (wrongMoveSquare = null), 600);
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
    board = newBoard;
    selectedSquare = null;
    const newMoveCount = moveCount + 1;
    moveCount = newMoveCount;

    if (isBotMode) {
      if (isCheckmate('b', newBoard)) {
        isComplete = true;
        const finalStars = calculateStars(newMoveCount);
        saveComplete(puzzle.id, finalStars, newMoveCount);
      } else if (isStalemate('b', newBoard)) {
        stalemateTrigger = true;
      } else {
        makeBotMove(newBoard);
      }
    } else if (isCheckmateMode) {
      const newStep = solutionStep + 1;
      solutionStep = newStep;

      const isLastMove = newStep >= puzzle.solution.length;

      if (isLastMove || !isMultiMove) {
        if (isCheckmate('b', newBoard)) {
          isComplete = true;
          const finalStars = calculateStars(newMoveCount);
          saveComplete(puzzle.id, finalStars, newMoveCount);
        } else if (isStalemate('b', newBoard)) {
          stalemateTrigger = true;
        } else if (!isMultiMove) {
          wrongMoveSquare = to;
          board = buildBoard();
          moveCount = newMoveCount - 1;
          solutionStep = newStep - 1;
          setTimeout(() => (wrongMoveSquare = null), 600);
        }
      } else {
        const response = puzzle.opponentResponses?.[solutionStep];
        if (response) {
          setTimeout(() => {
            applyOpponentResponse(newBoard, response);
          }, 300);
        }
      }
    } else {
      // Reach-target mode
      const hasMultiStepSolution = puzzle.solution.length > 1 && puzzle.opponentResponses && puzzle.opponentResponses.length > 0;

      if (hasMultiStepSolution || puzzle.strictSolution) {
        const expectedTarget = puzzle.solution[solutionStep];
        if (to !== expectedTarget) {
          if (isCheckmate('b', newBoard)) {
            isComplete = true;
            const finalStars = calculateStars(newMoveCount);
            saveComplete(puzzle.id, finalStars, newMoveCount);
            return;
          }
          wrongMoveSquare = to;
          selectedSquare = null;
          board = buildBoard();
          moveCount = newMoveCount - 1;
          setTimeout(() => (wrongMoveSquare = null), 600);
          return;
        }

        const newStep = solutionStep + 1;
        solutionStep = newStep;

        if (puzzle.targets.includes(to) && !reachedTargets.includes(to)) {
          reachedTargets = [...reachedTargets, to];
        }

        if (newStep >= puzzle.solution.length) {
          isComplete = true;
          const finalStars = calculateStars(newMoveCount);
          saveComplete(puzzle.id, finalStars, newMoveCount);
        } else {
          const response = puzzle.opponentResponses?.[solutionStep];
          if (response) {
            setTimeout(() => {
              applyOpponentResponse(newBoard, response);
            }, 300);
          }
        }
      } else {
        // Basic reach-target
        if (puzzle.targets.includes(to) && !reachedTargets.includes(to)) {
          const newReached = [...reachedTargets, to];
          reachedTargets = newReached;
          if (newReached.length === puzzle.targets.length) {
            isComplete = true;
            const finalStars = calculateStars(newMoveCount);
            saveComplete(puzzle.id, finalStars, newMoveCount);
          }
        }
      }
    }
  }

  function handleSquareClick(sq: SquareId) {
    if (isComplete || waitingForAnimation) return;

    if (!selectedSquare) {
      const p = board.pieces.get(sq);
      if (p && p.color === 'w' && (isBotMode || p.piece === puzzle.piece)) {
        selectedSquare = sq;
      }
      return;
    }

    if (sq === selectedSquare) {
      selectedSquare = null;
      return;
    }

    const p = board.pieces.get(selectedSquare);
    if (!p) return;
    const moves = isBotMode
      ? getLegalMoves(selectedSquare, board, 'w')
      : getValidMoves(p.piece, selectedSquare, board, 'w');
    if (!moves.includes(sq)) {
      const target = board.pieces.get(sq);
      if (target && target.color === 'w' && (isBotMode || target.piece === puzzle.piece)) {
        selectedSquare = sq;
      } else {
        selectedSquare = null;
      }
      return;
    }

    executeMove(selectedSquare, sq);
  }

  function handleDrop(from: SquareId, to: SquareId) {
    if (isComplete || waitingForAnimation || from === to) return;
    const p = board.pieces.get(from);
    if (!p || p.color !== 'w' || (!isBotMode && p.piece !== puzzle.piece)) return;
    const moves = isBotMode
      ? getLegalMoves(from, board, 'w')
      : getValidMoves(p.piece, from, board, 'w');
    if (!moves.includes(to)) return;
    executeMove(from, to);
  }

  function reset() {
    board = buildBoard();
    selectedSquare = null;
    moveCount = 0;
    reachedTargets = [];
    isComplete = false;
    stalemateTrigger = false;
    currentHintIndex = -1;
    solutionStep = 0;
    wrongMoveSquare = null;
    opponentSlide = null;
    waitingForAnimation = false;
  }

  function showHint() {
    if (puzzle.hints && currentHintIndex < puzzle.hints.length - 1) {
      currentHintIndex = currentHintIndex + 1;
    }
  }

  return {
    get board() { return board; },
    get selectedSquare() { return selectedSquare; },
    get validMoves() { return validMoves; },
    get reachedTargets() { return reachedTargets; },
    get moveCount() { return moveCount; },
    get isComplete() { return isComplete; },
    get stalemateTrigger() { return stalemateTrigger; },
    get wrongMoveSquare() { return wrongMoveSquare; },
    get opponentSlide() { return opponentSlide; },
    get stars() { return stars; },
    get currentHintIndex() { return currentHintIndex; },
    handleSquareClick,
    handleDrop,
    reset,
    showHint,
  };
}
