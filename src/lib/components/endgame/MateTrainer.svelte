<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import FinishActions from '$lib/components/curriculum/FinishActions.svelte';
  import { playSound } from '$lib/state/sound';
  import { type BoardState, type SquareId, createBoardState } from '$lib/logic/types';
  import { getLegalMoves } from '$lib/logic/attacks';
  import {
    type MateEndgameType,
    ENDGAME_INFO,
    generatePosition,
    validateEndgameMove,
    applyEndgameMove,
    pickDefenseMove,
  } from '$lib/logic/endgame';
  import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';

  interface Props {
    type: MateEndgameType;
  }

  let { type }: Props = $props();

  let info = $derived(ENDGAME_INFO[type]);
  let storageKey = $derived(`endings-${type}-best-stars`);

  /* ── State ────────────────────────────────────── */

  function newBoard() {
    return createBoardState(generatePosition(type));
  }

  let board = $state<BoardState>(newBoard());
  let selectedSquare = $state<SquareId | null>(null);
  let result = $state<'playing' | 'won'>('playing');
  let mistakes = $state(0);
  let feedback = $state<string | null>(null);
  let botSlide = $state<SlideAnimation | null>(null);
  let waitingForBot = $state(false);
  let dragFrom = $state<SquareId | null>(null);
  let bestStars = $state(0);

  $effect(() => {
    bestStars = parseInt(localStorage.getItem(storageKey) ?? '0', 10);
  });

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
    if (result === 'won') return 'Checkmate \u2014 you win!';
    if (waitingForBot) return 'Opponent is thinking...';
    return info.description;
  });

  /* ── Bot move ─────────────────────────────────── */

  function makeBotMove(currentBoard: BoardState) {
    waitingForBot = true;
    setTimeout(() => {
      const move = pickDefenseMove(currentBoard);
      if (!move) {
        waitingForBot = false;
        return;
      }
      const piece = currentBoard.pieces.get(move.from)!;
      botSlide = {
        piece: piece.piece,
        color: piece.color,
        from: move.from,
        to: move.to,
      };
      const newBoard = applyEndgameMove(currentBoard, move.from, move.to);
      board = newBoard;
      playSound('move');
      setTimeout(() => {
        botSlide = null;
        waitingForBot = false;
      }, 500);
    }, 400);
  }

  /* ── Execute player move ──────────────────────── */

  function executeMove(from: SquareId, to: SquareId) {
    const validation = validateEndgameMove(board, from, to);
    if (!validation.valid) {
      mistakes += 1;
      feedback = validation.reason ?? 'Invalid move';
      selectedSquare = null;
      playSound('wrong');
      return;
    }

    const newBoard = applyEndgameMove(board, from, to);
    board = newBoard;
    selectedSquare = null;
    feedback = null;
    playSound('move');

    if (validation.checkmate) {
      result = 'won';
      playSound('stars');
      const s = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
      const prev = parseInt(localStorage.getItem(storageKey) ?? '0', 10);
      if (s > prev) {
        localStorage.setItem(storageKey, s.toString());
        bestStars = s;
      }
      return;
    }

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
    board = newBoard();
    selectedSquare = null;
    result = 'playing';
    mistakes = 0;
    feedback = null;
    botSlide = null;
    waitingForBot = false;
    dragFrom = null;
  }
</script>

<BoardLayout>
  {#snippet boardArea()}
    <Board
      {board}
      {selectedSquare}
      {validMoves}
      {dragValidMoves}
      onSquareClick={handleSquareClick}
      onDrop={handleDrop}
      {onDragStart}
      {onDragEnd}
      opponentSlide={botSlide}
    />
  {/snippet}

  {#snippet sidebarArea()}
    <div class="header">
      <h2 class="title">{info.name}</h2>
      <p class="status">{statusText}</p>
    </div>

    {#if feedback && result === 'playing'}
      <p class="feedback">✗ {feedback}</p>
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
        {#if bestStars > 0 && bestStars > stars}
          <p class="best-text">Best: {bestStars} stars</p>
        {/if}
        <FinishActions label="New Position" onclick={reset} size="normal" />
      </div>
    {/if}
  {/snippet}
</BoardLayout>

<style>
  .header {
    text-align: center;
    flex-shrink: 0;
  }

  .title {
    font-size: var(--size-large);
    margin: 0 0 0.25rem;
  }

  .status {
    color: var(--ink-muted);
    margin: 0;
  }

  /* A move that was not good enough. */
  .feedback {
    color: var(--wrong-text);
    font-size: var(--size-secondary);
    font-weight: var(--weight-strong);
    margin: 0;
    flex-shrink: 0;
  }

  .result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    animation: fade-in 0.3s ease-out;
    flex-shrink: 0;
  }

  .result-text,
  .best-text {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    margin: 0;
  }
</style>
