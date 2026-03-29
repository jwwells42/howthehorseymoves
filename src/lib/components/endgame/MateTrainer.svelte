<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
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

<div class="mate-trainer">
  <div class="header">
    <h2 class="title">{info.name}</h2>
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
      {#if bestStars > 0 && bestStars > stars}
        <p class="best-text">Best: {bestStars} stars</p>
      {/if}
      <button class="new-position-btn" onclick={reset}>
        New Position
      </button>
    </div>
  {/if}
</div>

<style>
  .mate-trainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }

  @media (min-height: 32rem) and (min-width: 32rem) {
    .mate-trainer {
      flex: 1;
      min-height: 0;
    }
  }

  .header {
    text-align: center;
    flex-shrink: 0;
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

  @media (min-height: 32rem) and (min-width: 32rem) {
    .board-wrap {
      flex: 1;
      min-height: 0;
      align-items: center;
    }
  }

  .feedback {
    color: #f87171;
    font-size: 0.875rem;
    font-weight: 500;
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

  @media (max-height: 480px) {
    .mate-trainer { gap: 0.25rem; }
    .header { display: none; }
  }

  .result-text {
    font-size: 0.875rem;
    color: #888;
    margin: 0;
  }

  .best-text {
    font-size: 0.75rem;
    color: #666;
    margin: 0;
  }

  .new-position-btn {
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

  .new-position-btn:hover {
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
