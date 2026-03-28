<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { playSound } from '$lib/state/sound';
  import {
    type BoardState,
    type SquareId,
    type PiecePlacement,
    createBoardState,
  } from '$lib/logic/types';
  import { getLegalMoves, getAllLegalMoves } from '$lib/logic/attacks';
  import { probeKPK, squareToIndex, KPK_BLACK } from '$lib/logic/kpk-bitbase';
  import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';

  interface Props {
    title: string;
    instruction: string;
    placements: PiecePlacement[];
  }

  let { title, instruction, placements }: Props = $props();

  /* ── KPK helpers ──────────────────────────────── */

  function findKPKPieces(
    board: BoardState,
  ): { wk: SquareId; bk: SquareId; wp: SquareId } | null {
    let wk: SquareId | undefined;
    let bk: SquareId | undefined;
    let wp: SquareId | undefined;
    for (const [sq, piece] of board.pieces) {
      if (piece.color === 'w' && piece.piece === 'K') wk = sq;
      else if (piece.color === 'b' && piece.piece === 'K') bk = sq;
      else if (piece.color === 'w' && piece.piece === 'P') wp = sq;
    }
    if (!wk || !bk || !wp) return null;
    return { wk, bk, wp };
  }

  function probeBoard(board: BoardState, stm: number): boolean | null {
    const pieces = findKPKPieces(board);
    if (!pieces) return null;
    return probeKPK(
      squareToIndex(pieces.wk),
      squareToIndex(pieces.bk),
      squareToIndex(pieces.wp),
      stm,
    );
  }

  /* ── State ────────────────────────────────────── */

  function buildBoard(): BoardState {
    return createBoardState(placements);
  }

  let board = $state<BoardState>(buildBoard());
  let selectedSquare = $state<SquareId | null>(null);
  let result = $state<'playing' | 'won'>('playing');
  let mistakes = $state(0);
  let feedback = $state<string | null>(null);
  let botSlide = $state<SlideAnimation | null>(null);
  let waitingForBot = $state(false);
  let dragFrom = $state<SquareId | null>(null);

  let validMoves = $derived.by(() => {
    if (!selectedSquare) return [];
    return getLegalMoves(selectedSquare, board, 'w');
  });

  let dragValidMoves = $derived.by(() => {
    if (!dragFrom) return [];
    return getLegalMoves(dragFrom, board, 'w');
  });

  let stars = $derived(mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1);

  let statusText = $derived.by(() => {
    if (result === 'won') return 'Pawn promoted \u2014 you win!';
    if (waitingForBot) return 'Opponent is thinking...';
    return instruction;
  });

  /* ── Bot move ─────────────────────────────────── */

  function makeBotMove(currentBoard: BoardState) {
    waitingForBot = true;

    setTimeout(() => {
      const moves = getAllLegalMoves('b', currentBoard);
      if (moves.length === 0) {
        waitingForBot = false;
        return;
      }

      const move = moves[Math.floor(Math.random() * moves.length)];
      const newPieces = new Map(currentBoard.pieces);
      const piece = newPieces.get(move.from)!;
      newPieces.delete(move.from);
      newPieces.set(move.to, piece);

      botSlide = {
        piece: piece.piece,
        color: piece.color,
        from: move.from,
        to: move.to,
      };
      board = { pieces: newPieces };
      playSound('move');

      setTimeout(() => {
        botSlide = null;
        waitingForBot = false;
      }, 500);
    }, 400);
  }

  /* ── Execute player move ──────────────────────── */

  function executeMove(from: SquareId, to: SquareId) {
    const newPieces = new Map(board.pieces);
    const piece = newPieces.get(from)!;
    newPieces.delete(from);
    newPieces.set(to, piece);

    // Pawn promotion — win!
    if (piece.piece === 'P' && to[1] === '8') {
      newPieces.set(to, { piece: 'Q', color: 'w' });
      board = { pieces: newPieces };
      selectedSquare = null;
      result = 'won';
      feedback = null;
      playSound('stars');
      return;
    }

    const newBoard: BoardState = { pieces: newPieces };

    // Bitbase check: does this move maintain a win?
    const isWin = probeBoard(newBoard, KPK_BLACK);
    if (isWin === false) {
      mistakes += 1;
      feedback = 'That lets black draw \u2014 try again!';
      selectedSquare = null;
      playSound('wrong');
      return;
    }

    board = newBoard;
    selectedSquare = null;
    feedback = null;
    playSound('move');
    makeBotMove(newBoard);
  }

  /* ── Click handling ───────────────────────────── */

  function handleSquareClick(sq: SquareId) {
    if (result !== 'playing' || waitingForBot) return;

    if (!selectedSquare) {
      const p = board.pieces.get(sq);
      if (p && p.color === 'w') {
        selectedSquare = sq;
        feedback = null;
      }
      return;
    }

    if (sq === selectedSquare) {
      selectedSquare = null;
      return;
    }

    const target = board.pieces.get(sq);
    if (target && target.color === 'w') {
      selectedSquare = sq;
      return;
    }

    const legal = getLegalMoves(selectedSquare, board, 'w');
    if (!legal.includes(sq)) {
      selectedSquare = null;
      return;
    }

    executeMove(selectedSquare, sq);
  }

  /* ── Drag-and-drop handling ───────────────────── */

  function handleDrop(from: SquareId, to: SquareId) {
    if (result !== 'playing' || waitingForBot || from === to) return;
    const p = board.pieces.get(from);
    if (!p || p.color !== 'w') return;
    const legal = getLegalMoves(from, board, 'w');
    if (!legal.includes(to)) return;
    executeMove(from, to);
  }

  function onDragStart(sq: SquareId) {
    if (result !== 'playing' || waitingForBot) return;
    dragFrom = sq;
  }

  function onDragEnd() {
    dragFrom = null;
  }

  /* ── Reset ────────────────────────────────────── */

  function reset() {
    board = buildBoard();
    selectedSquare = null;
    result = 'playing';
    mistakes = 0;
    feedback = null;
    botSlide = null;
    waitingForBot = false;
    dragFrom = null;
  }
</script>

<div class="endgame-shell">
  <div class="header">
    <h2 class="title">{title}</h2>
    <p class="status">{statusText}</p>
  </div>

  <div class="board-wrap">
    <Board
      {board}
      {selectedSquare}
      {validMoves}
      targets={[]}
      reachedTargets={[]}
      {dragValidMoves}
      onSquareClick={handleSquareClick}
      onDrop={handleDrop}
      {onDragStart}
      {onDragEnd}
      opponentSlide={botSlide}
    />
  </div>

  {#if feedback && result === 'playing'}
    <p class="feedback">{feedback}</p>
  {/if}

  {#if result === 'won'}
    <div class="result">
      <StarRating {stars} size="lg" />
      <p class="result-text">
        {#if mistakes === 0}
          Perfect — no mistakes!
        {:else}
          {mistakes} mistake{mistakes > 1 ? 's' : ''}
        {/if}
      </p>
      <button class="play-again-btn" onclick={reset}>
        Play Again
      </button>
    </div>
  {/if}
</div>

<style>
  .endgame-shell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    max-width: 42rem;
    max-height: 100dvh;
    overflow: hidden;
    margin: 0 auto;
  }

  .header {
    text-align: center;
  }

  .title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
  }

  .status {
    color: #888;
    margin: 0;
  }

  .board-wrap {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .feedback {
    color: #f87171;
    font-size: 0.875rem;
    font-weight: 500;
    margin: 0;
  }

  .result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    animation: fade-in 0.3s ease-out;
  }

  .result-text {
    font-size: 0.875rem;
    color: #888;
    margin: 0;
  }

  .play-again-btn {
    padding: 0.5rem 1.5rem;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .play-again-btn:hover {
    background: #15803d;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(0.5rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
