import { type BoardState, type PieceKind, type PieceColor, type SquareId, createBoardState, parseFen, squareToCoords, coordsToSquare } from '$lib/logic/types';
import { getValidMoves } from '$lib/logic/moves';
import { isCheckmate, isStalemate, getLegalMoves } from '$lib/logic/attacks';
import { applyMove } from '$lib/logic/pgn';
import type { Arrow } from '$lib/logic/pgn';
import type { Puzzle, RoutePuzzle, TacticPuzzle, ConversionPuzzle, FindMovesPuzzle } from '$lib/puzzles/types';
import { parsePuzzleMoves, type MoveNode, type SquareHighlight } from '$lib/puzzles/parse-moves';
import { pickBotMove } from '$lib/logic/bot';
import { completePuzzle as saveComplete } from '$lib/state/progress-store';
import { playSound } from '$lib/state/sound';

export interface SlideAnimation {
  piece: PieceKind;
  color: PieceColor;
  from: SquareId;
  to: SquareId;
}

export function createPuzzleState(puzzle: Puzzle) {
  if (puzzle.type === 'route') return createRouteState(puzzle);
  if (puzzle.type === 'puzzle') return createTacticState(puzzle);
  if (puzzle.type === 'find-moves') return createFindMovesState(puzzle);
  return createConversionState(puzzle);
}

// ═══════════════════════════════════════════════
// Route puzzle state
// ═══════════════════════════════════════════════

function getAttackSquares(sq: SquareId, p: { piece: PieceKind; color: PieceColor }, currentBoard: BoardState): SquareId[] {
  if (p.piece === 'P') {
    // Pawns attack diagonally, not forward
    const [px, py] = squareToCoords(sq);
    const dir = p.color === 'w' ? -1 : 1;
    const attacks: SquareId[] = [];
    for (const dx of [-1, 1]) {
      const target = coordsToSquare(px + dx, py + dir);
      if (target) attacks.push(target);
    }
    return attacks;
  }
  return getValidMoves(p.piece, sq, currentBoard, p.color);
}

function createRouteState(puzzle: RoutePuzzle) {
  const wallSet = new Set(puzzle.walls);

  function buildBoard(): BoardState {
    const placements = [...puzzle.position];
    for (const sq of puzzle.walls) {
      placements.push({ piece: 'P', color: 'w', square: sq });
    }
    return createBoardState(placements);
  }

  let board = $state<BoardState>(buildBoard());
  let selectedSquare = $state<SquareId | null>(null);
  let moveCount = $state(0);
  let reachedTargets = $state<SquareId[]>([]);
  let isComplete = $state(false);
  let currentHintIndex = $state(-1);
  let wrongMoveSquare = $state<SquareId | null>(null);

  // Squares threatened by enemy (black) pieces — only when threats mode is on
  let dangerSet = $derived.by(() => {
    if (!puzzle.threats) return new Set<SquareId>();
    const dangers = new Set<SquareId>();
    for (const [sq, p] of board.pieces) {
      if (p.color === 'b') {
        dangers.add(sq);
        for (const m of getAttackSquares(sq, p, board)) dangers.add(m);
      }
    }
    return dangers;
  });

  // Red highlights for attacked squares (exclude walls — they're already blocked)
  let dangerHighlights = $derived.by(() => {
    if (!puzzle.threats) return [] as SquareHighlight[];
    const result: SquareHighlight[] = [];
    const seen = new Set<SquareId>();
    for (const [sq, p] of board.pieces) {
      if (p.color === 'b') {
        for (const m of getAttackSquares(sq, p, board)) {
          if (!seen.has(m) && !wallSet.has(m)) {
            seen.add(m);
            result.push({ square: m, color: '#dc2626' });
          }
        }
      }
    }
    return result;
  });

  function getFilteredMoves(from: SquareId): SquareId[] {
    const p = board.pieces.get(from);
    if (!p || p.color !== 'w' || p.piece !== puzzle.playerPiece) return [];
    const moves = getValidMoves(p.piece, from, board, 'w');
    if (!puzzle.threats) return moves;
    return moves.filter(m => !dangerSet.has(m));
  }

  let validMoves = $derived.by(() => {
    if (!selectedSquare) return [];
    return getFilteredMoves(selectedSquare);
  });

  function calculateStars(moves: number): number {
    const { three, two, one } = puzzle.starThresholds;
    if (moves <= three) return 3;
    if (moves <= two) return 2;
    if (moves <= one) return 1;
    return 1;
  }

  let stars = $derived(calculateStars(moveCount));

  function executeMove(from: SquareId, to: SquareId) {
    const newPieces = new Map(board.pieces);
    const piece = newPieces.get(from)!;
    newPieces.delete(from);
    newPieces.set(to, piece);
    board = { pieces: newPieces };
    selectedSquare = null;
    const newMoveCount = moveCount + 1;
    moveCount = newMoveCount;
    playSound('move');

    if (puzzle.stars.includes(to) && !reachedTargets.includes(to)) {
      const newReached = [...reachedTargets, to];
      reachedTargets = newReached;
      if (newReached.length === puzzle.stars.length) {
        isComplete = true;
        saveComplete(puzzle.id, calculateStars(newMoveCount), newMoveCount);
        playSound('stars');
      }
    }
  }

  function handleSquareClick(sq: SquareId) {
    if (isComplete) return;
    if (!selectedSquare) {
      const p = board.pieces.get(sq);
      if (p && p.color === 'w' && p.piece === puzzle.playerPiece) selectedSquare = sq;
      return;
    }
    if (sq === selectedSquare) { selectedSquare = null; return; }
    const moves = getFilteredMoves(selectedSquare);
    if (!moves.includes(sq)) {
      const target = board.pieces.get(sq);
      if (target && target.color === 'w' && target.piece === puzzle.playerPiece) {
        selectedSquare = sq;
      } else {
        selectedSquare = null;
      }
      return;
    }
    executeMove(selectedSquare, sq);
  }

  function handleDrop(from: SquareId, to: SquareId) {
    if (isComplete || from === to) return;
    const moves = getFilteredMoves(from);
    if (!moves.includes(to)) return;
    executeMove(from, to);
  }

  function reset() {
    board = buildBoard();
    selectedSquare = null;
    moveCount = 0;
    reachedTargets = [];
    isComplete = false;
    currentHintIndex = -1;
    wrongMoveSquare = null;
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
    get stalemateTrigger() { return false; },
    get wrongMoveSquare() { return wrongMoveSquare; },
    get opponentSlide() { return null as SlideAnimation | null; },
    get stars() { return stars; },
    get currentHintIndex() { return currentHintIndex; },
    get arrows() { return (puzzle.arrows ?? []) as Arrow[]; },
    get highlights() { return dangerHighlights; },
    get demoPhase() { return null as 'playing' | 'resetting' | null; },
    getMovesFrom: getFilteredMoves,
    handleSquareClick,
    handleDrop,
    reset,
    showHint,
  };
}

// ═══════════════════════════════════════════════
// Tactic puzzle state (PGN-based)
// ═══════════════════════════════════════════════

function createTacticState(puzzle: TacticPuzzle) {
  const tree = parsePuzzleMoves(puzzle.pgn, puzzle.fen);

  const defaultThresholds = {
    three: tree.whiteMovesCount,
    two: tree.whiteMovesCount + 1,
    one: tree.whiteMovesCount + 2,
  };
  const thresholds = puzzle.starThresholds ?? defaultThresholds;

  let board = $state<BoardState>(tree.root);
  let selectedSquare = $state<SquareId | null>(null);
  let moveCount = $state(0);
  let isComplete = $state(false);
  let stalemateTrigger = $state(false);
  let currentHintIndex = $state(-1);
  let wrongMoveSquare = $state<SquareId | null>(null);
  let opponentSlide = $state<SlideAnimation | null>(null);
  let waitingForAnimation = $state(false);
  let currentChildren = $state<MoveNode[]>(tree.children);
  let currentArrows = $state<Arrow[]>(tree.initialArrows ?? []);
  let currentHighlights = $state<SquareHighlight[]>(tree.initialHighlights ?? []);
  let demoPhase = $state<'playing' | 'resetting' | null>(puzzle.demo ? 'playing' : null);

  function calculateStars(moves: number): number {
    if (moves <= thresholds.three) return 3;
    if (moves <= thresholds.two) return 2;
    if (moves <= thresholds.one) return 1;
    return 1;
  }

  let stars = $derived(calculateStars(moveCount));

  let validMoves = $derived.by(() => {
    if (!selectedSquare || demoPhase) return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== 'w') return [];
    return getLegalMoves(selectedSquare, board, 'w');
  });

  function autoPlayOpponent() {
    if (isComplete || demoPhase) return;
    if (currentChildren.length === 0) return;

    const nextMove = currentChildren[0];
    if (nextMove.color !== 'b') return;

    waitingForAnimation = true;
    setTimeout(() => {
      const piece = board.pieces.get(nextMove.from);
      opponentSlide = {
        piece: piece?.piece ?? 'P',
        color: 'b',
        from: nextMove.from,
        to: nextMove.to,
      };
      board = nextMove.boardAfter;
      currentChildren = nextMove.children;
      currentArrows = nextMove.arrows ?? [];
      currentHighlights = nextMove.highlights ?? [];
      playSound('move');

      setTimeout(() => {
        opponentSlide = null;
        waitingForAnimation = false;

        if (currentChildren.length === 0) {
          isComplete = true;
          saveComplete(puzzle.id, calculateStars(moveCount), moveCount);
          playSound('stars');
        } else {
          autoPlayOpponent();
        }
      }, 500);
    }, 300);
  }

  // Demo playback
  function startDemo() {
    if (!puzzle.demo) return;
    demoPhase = 'playing';

    const demoTree = puzzle.demo === true
      ? tree
      : parsePuzzleMoves(puzzle.demo, puzzle.fen);

    const demoMoves: MoveNode[] = [];
    let nodes = demoTree.children;
    while (nodes.length > 0) {
      demoMoves.push(nodes[0]);
      nodes = nodes[0].children;
    }

    let i = 0;
    function playNext() {
      if (i >= demoMoves.length) {
        demoPhase = 'resetting';
        setTimeout(() => {
          board = tree.root;
          currentChildren = tree.children;
          currentArrows = tree.initialArrows ?? [];
          currentHighlights = tree.initialHighlights ?? [];
          opponentSlide = null;
          waitingForAnimation = false;
          demoPhase = null;
          // Auto-play if starts with black
          if (tree.children.length > 0 && tree.children[0].color === 'b') {
            autoPlayOpponent();
          }
        }, 800);
        return;
      }

      const move = demoMoves[i];
      const piece = board.pieces.get(move.from);
      opponentSlide = {
        piece: piece?.piece ?? 'P',
        color: move.color,
        from: move.from,
        to: move.to,
      };
      board = move.boardAfter;
      currentArrows = move.arrows ?? [];
      currentHighlights = move.highlights ?? [];
      i++;

      setTimeout(() => {
        opponentSlide = null;
        setTimeout(playNext, 200);
      }, 600);
    }

    setTimeout(playNext, 500);
  }

  // Kick off demo or initial auto-play
  if (puzzle.demo) {
    setTimeout(() => startDemo(), 100);
  } else if (tree.children.length > 0 && tree.children[0].color === 'b') {
    setTimeout(() => autoPlayOpponent(), 100);
  }

  function executeMove(from: SquareId, to: SquareId) {
    const match = currentChildren.find(c =>
      c.color === 'w' && c.from === from && c.to === to
    );

    if (!match) {
      wrongMoveSquare = to;
      selectedSquare = null;
      playSound('wrong');
      setTimeout(() => (wrongMoveSquare = null), 600);
      return;
    }

    board = match.boardAfter;
    selectedSquare = null;
    const newMoveCount = moveCount + 1;
    moveCount = newMoveCount;
    currentChildren = match.children;
    currentArrows = match.arrows ?? [];
    currentHighlights = match.highlights ?? [];
    playSound('move');

    if (match.children.length === 0) {
      isComplete = true;
      saveComplete(puzzle.id, calculateStars(newMoveCount), newMoveCount);
      playSound('stars');
      return;
    }

    autoPlayOpponent();
  }

  function handleSquareClick(sq: SquareId) {
    if (isComplete || waitingForAnimation || demoPhase) return;
    if (!selectedSquare) {
      const p = board.pieces.get(sq);
      if (p && p.color === 'w') selectedSquare = sq;
      return;
    }
    if (sq === selectedSquare) { selectedSquare = null; return; }
    const p = board.pieces.get(selectedSquare);
    if (!p) return;
    const moves = getLegalMoves(selectedSquare, board, 'w');
    if (!moves.includes(sq)) {
      const target = board.pieces.get(sq);
      if (target && target.color === 'w') {
        selectedSquare = sq;
      } else {
        selectedSquare = null;
      }
      return;
    }
    executeMove(selectedSquare, sq);
  }

  function handleDrop(from: SquareId, to: SquareId) {
    if (isComplete || waitingForAnimation || demoPhase || from === to) return;
    const p = board.pieces.get(from);
    if (!p || p.color !== 'w') return;
    const moves = getLegalMoves(from, board, 'w');
    if (!moves.includes(to)) return;
    executeMove(from, to);
  }

  function reset() {
    board = tree.root;
    selectedSquare = null;
    moveCount = 0;
    isComplete = false;
    stalemateTrigger = false;
    currentHintIndex = -1;
    wrongMoveSquare = null;
    opponentSlide = null;
    waitingForAnimation = false;
    currentChildren = tree.children;
    currentArrows = tree.initialArrows ?? [];
    currentHighlights = tree.initialHighlights ?? [];

    if (puzzle.demo) {
      demoPhase = 'playing';
      setTimeout(() => startDemo(), 100);
    } else {
      demoPhase = null;
      if (tree.children.length > 0 && tree.children[0].color === 'b') {
        setTimeout(() => autoPlayOpponent(), 100);
      }
    }
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
    get reachedTargets() { return [] as SquareId[]; },
    get moveCount() { return moveCount; },
    get isComplete() { return isComplete; },
    get stalemateTrigger() { return stalemateTrigger; },
    get wrongMoveSquare() { return wrongMoveSquare; },
    get opponentSlide() { return opponentSlide; },
    get stars() { return stars; },
    get currentHintIndex() { return currentHintIndex; },
    get arrows() { return currentArrows; },
    get highlights() { return currentHighlights; },
    get demoPhase() { return demoPhase; },
    getMovesFrom(from: SquareId) {
      const p = board.pieces.get(from);
      if (!p || p.color !== 'w') return [];
      return getLegalMoves(from, board, 'w');
    },
    handleSquareClick,
    handleDrop,
    reset,
    showHint,
  };
}

// ═══════════════════════════════════════════════
// Conversion puzzle state (vs bot)
// ═══════════════════════════════════════════════

function createConversionState(puzzle: ConversionPuzzle) {
  function buildBoard(): BoardState {
    return createBoardState(puzzle.position);
  }

  let board = $state<BoardState>(buildBoard());
  let selectedSquare = $state<SquareId | null>(null);
  let moveCount = $state(0);
  let isComplete = $state(false);
  let stalemateTrigger = $state(false);
  let currentHintIndex = $state(-1);
  let wrongMoveSquare = $state<SquareId | null>(null);
  let opponentSlide = $state<SlideAnimation | null>(null);
  let waitingForAnimation = $state(false);

  let validMoves = $derived.by(() => {
    if (!selectedSquare) return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== 'w') return [];
    return getLegalMoves(selectedSquare, board, 'w');
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

  function makeBotMove(currentBoard: BoardState) {
    waitingForAnimation = true;
    setTimeout(() => {
      const move = pickBotMove(currentBoard, 'b', puzzle.bot);
      if (!move) return;

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
      playSound('move');

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
    playSound('move');

    if (puzzle.goal === 'checkmate' && isCheckmate('b', newBoard)) {
      isComplete = true;
      saveComplete(puzzle.id, calculateStars(newMoveCount), newMoveCount);
      playSound('stars');
    } else if (isStalemate('b', newBoard)) {
      stalemateTrigger = true;
    } else {
      makeBotMove(newBoard);
    }
  }

  function handleSquareClick(sq: SquareId) {
    if (isComplete || waitingForAnimation) return;
    if (!selectedSquare) {
      const p = board.pieces.get(sq);
      if (p && p.color === 'w') selectedSquare = sq;
      return;
    }
    if (sq === selectedSquare) { selectedSquare = null; return; }
    const p = board.pieces.get(selectedSquare);
    if (!p) return;
    const moves = getLegalMoves(selectedSquare, board, 'w');
    if (!moves.includes(sq)) {
      const target = board.pieces.get(sq);
      if (target && target.color === 'w') {
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
    if (!p || p.color !== 'w') return;
    const moves = getLegalMoves(from, board, 'w');
    if (!moves.includes(to)) return;
    executeMove(from, to);
  }

  function reset() {
    board = buildBoard();
    selectedSquare = null;
    moveCount = 0;
    isComplete = false;
    stalemateTrigger = false;
    currentHintIndex = -1;
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
    get reachedTargets() { return [] as SquareId[]; },
    get moveCount() { return moveCount; },
    get isComplete() { return isComplete; },
    get stalemateTrigger() { return stalemateTrigger; },
    get wrongMoveSquare() { return wrongMoveSquare; },
    get opponentSlide() { return opponentSlide; },
    get stars() { return stars; },
    get currentHintIndex() { return currentHintIndex; },
    get arrows() { return [] as Arrow[]; },
    get highlights() { return [] as SquareHighlight[]; },
    get demoPhase() { return null as 'playing' | 'resetting' | null; },
    getMovesFrom(from: SquareId) {
      const p = board.pieces.get(from);
      if (!p || p.color !== 'w') return [];
      return getLegalMoves(from, board, 'w');
    },
    handleSquareClick,
    handleDrop,
    reset,
    showHint,
  };
}

// ═══════════════════════════════════════════════
// Find-moves puzzle state
// ═══════════════════════════════════════════════

function createFindMovesState(puzzle: FindMovesPuzzle) {
  // Build the board from position + walls
  const placements = [...puzzle.position];
  for (const w of puzzle.walls) {
    placements.push({ piece: 'P' as PieceKind, color: 'w' as PieceColor, square: w });
  }
  const board = createBoardState(placements, puzzle.enPassantSquare ? { enPassantSquare: puzzle.enPassantSquare } : undefined);

  // Find the player piece square
  const pieceSquare = puzzle.position.find(p => p.piece === puzzle.playerPiece && p.color === 'w')!.square;

  // Compute all valid destination squares
  const correctSquares = new Set<SquareId>(getValidMoves(puzzle.playerPiece, pieceSquare, board, 'w'));

  let foundSquares = $state<Set<SquareId>>(new Set());
  let mistakes = $state(0);
  let isComplete = $state(false);
  let wrongMoveSquare = $state<SquareId | null>(null);
  let currentHintIndex = $state(-1);

  const stars = $derived.by(() => {
    if (!isComplete) return 0;
    const { three, two } = puzzle.starThresholds;
    if (mistakes <= three) return 3;
    if (mistakes <= two) return 2;
    return 1;
  });

  const highlights = $derived.by(() => {
    const result: SquareHighlight[] = [];
    for (const sq of foundSquares) {
      result.push({ square: sq, color: '#22c55e' });
    }
    return result;
  });

  function handleSquareClick(sq: SquareId) {
    if (isComplete) return;
    if (sq === pieceSquare) return;
    if (foundSquares.has(sq)) return;

    if (correctSquares.has(sq)) {
      const next = new Set(foundSquares);
      next.add(sq);
      foundSquares = next;
      if (next.size === correctSquares.size) {
        isComplete = true;
        saveComplete(puzzle.id, stars, mistakes);
        playSound('stars');
      } else {
        playSound('correct');
      }
    } else {
      mistakes++;
      wrongMoveSquare = sq;
      playSound('wrong');
      setTimeout(() => { wrongMoveSquare = null; }, 600);
    }
  }

  function reset() {
    foundSquares = new Set();
    mistakes = 0;
    isComplete = false;
    wrongMoveSquare = null;
    currentHintIndex = -1;
  }

  function showHint() {
    if (puzzle.hints && currentHintIndex < puzzle.hints.length - 1) {
      currentHintIndex = currentHintIndex + 1;
    }
  }

  return {
    get board() { return board; },
    get selectedSquare() { return null; },
    get validMoves() { return [] as SquareId[]; },
    get reachedTargets() { return [] as SquareId[]; },
    get moveCount() { return 0; },
    get isComplete() { return isComplete; },
    get stalemateTrigger() { return false; },
    get wrongMoveSquare() { return wrongMoveSquare; },
    get opponentSlide() { return null as SlideAnimation | null; },
    get stars() { return stars; },
    get currentHintIndex() { return currentHintIndex; },
    get arrows() { return [] as Arrow[]; },
    get highlights() { return highlights; },
    get demoPhase() { return null as 'playing' | 'resetting' | null; },
    get totalCorrect() { return correctSquares.size; },
    get foundCount() { return foundSquares.size; },
    get mistakes() { return mistakes; },
    getMovesFrom() { return [] as SquareId[]; },
    handleSquareClick,
    handleDrop(_from: SquareId, _to: SquareId) {},
    reset,
    showHint,
  };
}
