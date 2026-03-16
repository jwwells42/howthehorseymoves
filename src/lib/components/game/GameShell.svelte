<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import { createGameState } from '$lib/state/use-game.svelte';
  import { getLegalMoves } from '$lib/logic/attacks';
  import type { BotLevel } from '$lib/logic/bot';
  import type { SquareId } from '$lib/logic/types';

  let { botLevel = 'random' }: { botLevel?: BotLevel } = $props();

  let game = $derived(createGameState(botLevel));

  let dragFrom = $state<SquareId | null>(null);

  let dragValidMoves = $derived.by(() => {
    if (!dragFrom) return [];
    return getLegalMoves(dragFrom, game.board, 'w');
  });

  function onDragStart(sq: SquareId) {
    if (game.result !== 'playing' || game.waitingForBot) return;
    dragFrom = sq;
  }

  function onDragEnd() {
    dragFrom = null;
  }

  let resultMessage = $derived.by(() => {
    switch (game.result) {
      case 'checkmate-white': return 'Checkmate \u2014 you win!';
      case 'checkmate-black': return 'Checkmate \u2014 you lose!';
      case 'stalemate': return 'Stalemate \u2014 it\u2019s a draw!';
      default: return null;
    }
  });

  let statusText = $derived.by(() => {
    if (resultMessage) return resultMessage;
    if (game.inCheck) return "You're in check!";
    if (game.waitingForBot) return 'Opponent is thinking...';
    return 'You play white. Make a move!';
  });
</script>

<div class="game-shell">
  <div class="header">
    <h2 class="title">Play vs Computer</h2>
    <p class="status">{statusText}</p>
  </div>

  <div class="board-wrap">
    <Board
      board={game.board}
      selectedSquare={game.selectedSquare}
      validMoves={game.validMoves}
      targets={[]}
      reachedTargets={[]}
      dragValidMoves={dragValidMoves}
      onSquareClick={game.handleSquareClick}
      onDrop={game.handleDrop}
      {onDragStart}
      {onDragEnd}
      opponentSlide={game.botSlide}
    />
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
    padding: 1rem;
    max-width: 42rem;
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
