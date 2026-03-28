<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import { createGameState } from '$lib/state/use-game.svelte';
  import { getLegalMoves } from '$lib/logic/attacks';
  import type { BotLevel } from '$lib/logic/bot';
  import type { SquareId } from '$lib/logic/types';

  let { botLevel = 'random' }: { botLevel?: BotLevel } = $props();

  let game = $derived(createGameState(botLevel));

  let dragFrom = $state<SquareId | null>(null);
  let reviewIndex = $state<number | null>(null);

  let moveListEl = $state<HTMLDivElement | undefined>(undefined);

  let dragValidMoves = $derived.by(() => {
    if (!dragFrom) return [];
    return getLegalMoves(dragFrom, game.board, 'w');
  });

  // Board to display: review position or live
  let displayBoard = $derived(
    reviewIndex !== null ? game.positions[reviewIndex] : game.board
  );

  let isReviewing = $derived(reviewIndex !== null);

  function onDragStart(sq: SquareId) {
    if (game.result !== 'playing' || game.waitingForBot || isReviewing) return;
    dragFrom = sq;
  }

  function onDragEnd() {
    dragFrom = null;
  }

  function onSquareClick(sq: SquareId) {
    if (isReviewing) {
      reviewIndex = null;
      return;
    }
    game.handleSquareClick(sq);
  }

  function onDrop(from: SquareId, to: SquareId) {
    if (isReviewing) {
      reviewIndex = null;
      return;
    }
    game.handleDrop(from, to);
  }

  let resultMessage = $derived.by(() => {
    switch (game.result) {
      case 'checkmate-white': return 'Checkmate \u2014 you win!';
      case 'checkmate-black': return 'Checkmate \u2014 you lose!';
      case 'stalemate': return 'Stalemate \u2014 it\u2019s a draw!';
      case 'threefold': return 'Threefold repetition \u2014 it\u2019s a draw!';
      default: return null;
    }
  });

  let statusText = $derived.by(() => {
    if (isReviewing) return 'Reviewing \u2014 click the board to return';
    if (resultMessage) return resultMessage;
    if (game.inCheck) return "You're in check!";
    if (game.waitingForBot) return 'Opponent is thinking...';
    return 'You play white. Make a move!';
  });

  // Build move pairs for display
  let movePairs = $derived.by(() => {
    const pairs: { num: number; white: string; black?: string }[] = [];
    const moves = game.moveHistory;
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: moves[i].san,
        black: moves[i + 1]?.san,
      });
    }
    return pairs;
  });

  // Auto-scroll the move list
  $effect(() => {
    void game.moveHistory.length;
    if (!moveListEl) return;
    moveListEl.scrollTop = moveListEl.scrollHeight;
  });

  function goToMove(moveIdx: number) {
    reviewIndex = moveIdx;
  }

  function exitReview() {
    reviewIndex = null;
  }
</script>

<div class="game-shell">
  <div class="header">
    <h2 class="title">Play vs Computer</h2>
    <p class="status">{statusText}</p>
  </div>

  <div class="main-area">
    <div class="board-wrap">
      <Board
        board={displayBoard}
        selectedSquare={isReviewing ? null : game.selectedSquare}
        validMoves={isReviewing ? [] : game.validMoves}
        targets={[]}
        reachedTargets={[]}
        dragValidMoves={isReviewing ? [] : dragValidMoves}
        onSquareClick={onSquareClick}
        onDrop={onDrop}
        {onDragStart}
        {onDragEnd}
        opponentSlide={isReviewing ? null : game.botSlide}
      />
    </div>

    <div class="move-panel">
      <div class="move-list" bind:this={moveListEl}>
        <div class="move-grid">
          {#each movePairs as pair, i}
            <span class="move-num">{pair.num}.</span>
            <button
              class={['move-btn', reviewIndex === i * 2 + 1 && 'move-active']}
              onclick={() => goToMove(i * 2 + 1)}
            >
              {pair.white}
            </button>
            {#if pair.black}
              <button
                class={['move-btn', reviewIndex === i * 2 + 2 && 'move-active']}
                onclick={() => goToMove(i * 2 + 2)}
              >
                {pair.black}
              </button>
            {:else}
              <span></span>
            {/if}
          {/each}
        </div>
      </div>
      {#if isReviewing}
        <button class="back-btn" onclick={exitReview}>Back to game</button>
      {/if}
    </div>
  </div>

  {#if game.result !== 'playing'}
    <button class="new-game-btn" onclick={game.newGame}>
      New Game
    </button>
  {/if}
</div>

<style>
  .game-shell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 72rem;
    flex: 1;
    min-height: 0;
    width: 100%;
    margin: 0 auto;
  }

  @media (max-height: 480px) {
    .game-shell { gap: 0.25rem; }
    .header { display: none; }
  }

  .header {
    flex-shrink: 0;
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

  .main-area {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    flex: 1;
    min-height: 0;
    align-items: center;
  }

  @media (min-width: 768px) {
    .main-area {
      flex-direction: row;
      align-items: flex-start;
      justify-content: center;
    }
  }

  .board-wrap {
    position: relative;
    width: 100%;
    flex: 1;
    min-height: 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .move-panel {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  @media (min-width: 768px) {
    .move-panel {
      width: 12rem;
      flex-shrink: 0;
    }
  }

  .move-list {
    border-radius: 0.5rem;
    border: 1px solid var(--card-border, #333);
    background: var(--card-bg, #1a1a1a);
    padding: 0.5rem;
    max-height: 8rem;
    overflow-y: auto;
  }

  @media (min-width: 768px) {
    .move-list {
      flex: 1;
      min-height: 0;
      max-height: none;
    }
  }

  .move-grid {
    display: grid;
    grid-template-columns: 2rem 1fr 1fr;
    column-gap: 0.25rem;
    row-gap: 0.125rem;
    font-size: 0.875rem;
  }

  .move-num {
    color: var(--text-faint, #666);
    text-align: right;
  }

  .move-btn {
    text-align: left;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    cursor: pointer;
    background: none;
    border: none;
    color: inherit;
    font-size: inherit;
    transition: background-color 0.15s;
  }

  .move-btn:hover {
    background: var(--btn-bg, #2a2a2a);
  }

  .move-active {
    background: var(--btn-hover, #3a3a3a);
    font-weight: 700;
  }

  .back-btn {
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    border: 1px solid var(--card-border, #333);
    background: var(--card-bg, #1a1a1a);
    color: inherit;
    font-size: 0.75rem;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .back-btn:hover {
    background: var(--btn-hover, #2a2a2a);
  }

  .new-game-btn {
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

  .new-game-btn:hover {
    background: #15803d;
  }
</style>
