<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import BotPanel from '$lib/characters/BotPanel.svelte';
  import { getCharacter } from '$lib/characters/bots';
  import { createGameState } from '$lib/state/use-game.svelte';
  import { getLegalMoves } from '$lib/logic/attacks';
  import { playSound } from '$lib/state/sound';
  import type { BotLevel } from '$lib/logic/bot';
  import type { SquareId, PieceKind } from '$lib/logic/types';

  let { botLevel = 'random' }: { botLevel?: BotLevel } = $props();

  let character = $derived(getCharacter(botLevel));

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

  // Navigation
  let canGoBack = $derived(
    reviewIndex === null ? game.positions.length > 1 : reviewIndex > 0
  );
  let canGoForward = $derived(reviewIndex !== null);

  function goBack() {
    if (reviewIndex === null) {
      reviewIndex = game.positions.length - 2;
    } else if (reviewIndex > 0) {
      reviewIndex--;
    }
  }

  function goForward() {
    if (reviewIndex === null) return;
    if (reviewIndex >= game.positions.length - 1) {
      reviewIndex = null;
    } else {
      reviewIndex++;
    }
  }

  function goToStart() {
    reviewIndex = 0;
  }

  function goToEnd() {
    reviewIndex = null;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
  }

  function onDragStart(sq: SquareId) {
    if (game.result !== 'playing' || game.waitingForBot || isReviewing || game.pendingPromotion) return;
    dragFrom = sq;
  }

  const PROMO_PIECES: PieceKind[] = ['Q', 'R', 'B', 'N'];

  function onDragEnd() {
    dragFrom = null;
  }

  function onSquareClick(sq: SquareId) {
    if (isReviewing) return;
    game.handleSquareClick(sq);
  }

  function onDrop(from: SquareId, to: SquareId) {
    if (isReviewing) return;
    game.handleDrop(from, to);
  }

  let isDraw = $derived(
    game.result === 'stalemate' || game.result === 'threefold'
    || game.result === 'fifty-move' || game.result === 'insufficient-material'
  );
  let showDrawOverlay = $state(false);

  // Show draw overlay when a draw occurs
  $effect(() => {
    if (isDraw) showDrawOverlay = true;
  });

  let resultMessage = $derived.by(() => {
    switch (game.result) {
      case 'checkmate-white': return 'Checkmate \u2014 you win!';
      case 'checkmate-black': return 'Checkmate \u2014 you lose!';
      case 'stalemate': return 'Stalemate \u2014 it\u2019s a draw!';
      case 'threefold': return 'Threefold repetition \u2014 it\u2019s a draw!';
      case 'fifty-move': return '50-move rule \u2014 it\u2019s a draw!';
      case 'insufficient-material': return 'Insufficient material \u2014 it\u2019s a draw!';
      default: return null;
    }
  });

  let statusText = $derived.by(() => {
    if (isReviewing) return 'Reviewing';
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

  // Which position index is active (for highlighting)
  let activeIndex = $derived(
    reviewIndex !== null ? reviewIndex : game.positions.length - 1
  );

  // Auto-scroll the highlighted move into view
  $effect(() => {
    void activeIndex;
    if (!moveListEl) return;
    const highlighted = moveListEl.querySelector("[data-active='true']") as HTMLElement | null;
    if (!highlighted) return;
    const top = highlighted.offsetTop - moveListEl.offsetTop;
    const bottom = top + highlighted.offsetHeight;
    if (top < moveListEl.scrollTop) {
      moveListEl.scrollTop = top;
    } else if (bottom > moveListEl.scrollTop + moveListEl.clientHeight) {
      moveListEl.scrollTop = bottom - moveListEl.clientHeight;
    }
  });

  function goToMove(positionIdx: number) {
    if (positionIdx >= game.positions.length - 1) {
      reviewIndex = null;
    } else {
      reviewIndex = positionIdx;
    }
  }

  function startNewGame() {
    reviewIndex = null;
    showDrawOverlay = false;
    botAnimation = 'idle';
    if (character) botReaction = pickReaction(character.reactions.greeting);
    game.newGame();
  }

  // === Bot character reactions ===
  type AnimationType = 'idle' | 'thinking' | 'bounce' | 'shake' | 'jump' | 'tilt' | 'celebrate' | 'droop';
  let botReaction = $state('');
  let botAnimation = $state<AnimationType>('idle');
  let animTimer: ReturnType<typeof setTimeout> | null = null;

  function pickReaction(pool: string[]): string {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function triggerAnimation(anim: AnimationType, duration: number) {
    if (animTimer) clearTimeout(animTimer);
    botAnimation = anim;
    animTimer = setTimeout(() => { botAnimation = 'idle'; }, duration);
  }

  // Greeting on mount
  $effect(() => {
    if (character) botReaction = pickReaction(character.reactions.greeting);
  });

  // Bot thinking
  $effect(() => {
    if (!character) return;
    if (game.waitingForBot) {
      botAnimation = 'thinking';
      botReaction = pickReaction(character.reactions.thinking);
    }
  });

  // React to new moves
  let lastMoveCount = $state(0);
  $effect(() => {
    if (!character) return;
    const moves = game.moveHistory;
    if (moves.length <= lastMoveCount) {
      lastMoveCount = moves.length;
      return;
    }
    const newMoveIdx = lastMoveCount;
    lastMoveCount = moves.length;

    for (let i = newMoveIdx; i < moves.length; i++) {
      const san = moves[i].san;
      const isBotMove = i % 2 === 1; // black = bot
      const isCapture = san.includes('x');
      const isCheck = san.includes('+') || san.includes('#');

      if (isBotMove) {
        if (isCapture) {
          triggerAnimation('bounce', 500);
          botReaction = pickReaction(character.reactions.capture);
          playSound('botCapture');
        } else if (isCheck) {
          triggerAnimation('jump', 600);
          botReaction = pickReaction(character.reactions.check);
          playSound('botReact');
        } else {
          triggerAnimation('tilt', 400);
          botReaction = pickReaction(character.reactions.move);
        }
      } else {
        // Player move
        if (isCapture) {
          triggerAnimation('shake', 500);
          botReaction = pickReaction(character.reactions.captured);
          playSound('botCapture');
        }
      }
    }
  });

  // React to game end
  $effect(() => {
    if (!character || game.result === 'playing') return;
    if (game.result === 'checkmate-white') {
      triggerAnimation('droop', 1000);
      botReaction = pickReaction(character.reactions.checkmated);
    } else if (game.result === 'checkmate-black') {
      triggerAnimation('celebrate', 1500);
      botReaction = pickReaction(character.reactions.checkmate);
    } else {
      triggerAnimation('idle', 0);
      botReaction = pickReaction(character.reactions.draw);
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<BoardLayout>
  {#snippet boardArea()}
    <Board
      board={displayBoard}
      selectedSquare={isReviewing ? null : game.selectedSquare}
      validMoves={isReviewing || game.pendingPromotion ? [] : game.validMoves}
      targets={[]}
      reachedTargets={[]}
      dragValidMoves={isReviewing || game.pendingPromotion ? [] : dragValidMoves}
      onSquareClick={onSquareClick}
      onDrop={onDrop}
      {onDragStart}
      {onDragEnd}
      opponentSlide={isReviewing ? null : game.botSlide}
    />
    {#if game.result === 'checkmate-white' && reviewIndex === null}
      <div class="result-overlay">
        <div class="trophy">&#127942;</div>
      </div>
    {/if}
    {#if isDraw && reviewIndex === null && showDrawOverlay}
      <div class="result-overlay" onclick={() => showDrawOverlay = false} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') showDrawOverlay = false; }} role="button" tabindex="-1">
        <div class="draw-symbol">&#189;</div>
      </div>
    {/if}
    {#if game.pendingPromotion}
      <div class="promo-overlay">
        <div class="promo-picker">
          {#each PROMO_PIECES as p}
            <button class="promo-btn" onclick={() => game.completePromotion(p)}>
              <img src="/pieces/w{p}.svg" alt={p} width="60" height="60" />
            </button>
          {/each}
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet sidebarArea()}
    {#if character}
      <BotPanel {character} reaction={botReaction} animation={botAnimation} />
    {:else}
      <div class="header">
        <h2 class="title">Play vs Computer</h2>
        <p class="status">{statusText}</p>
      </div>
    {/if}

    <div class="move-panel">
      <div class="move-list" bind:this={moveListEl}>
        <div class="move-grid">
          {#each movePairs as pair, i}
            <span class="move-num">{pair.num}.</span>
            <button
              class={['move-btn', activeIndex === i * 2 + 1 && 'move-active']}
              data-active={activeIndex === i * 2 + 1}
              onclick={() => goToMove(i * 2 + 1)}
            >
              {pair.white}
            </button>
            {#if pair.black}
              <button
                class={['move-btn', activeIndex === i * 2 + 2 && 'move-active']}
                data-active={activeIndex === i * 2 + 2}
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
    </div>

    <div class="nav-controls">
      <button
        class="nav-btn"
        onclick={goToStart}
        disabled={!canGoBack}
        aria-label="Start"
      >&#x23EE;</button>
      <button
        class="nav-btn"
        onclick={goBack}
        disabled={!canGoBack}
        aria-label="Back"
      >&#x25C0;</button>
      <button
        class="nav-btn"
        onclick={goForward}
        disabled={!canGoForward}
        aria-label="Forward"
      >&#x25B6;</button>
      <button
        class="nav-btn"
        onclick={goToEnd}
        disabled={!canGoForward}
        aria-label="End"
      >&#x23ED;</button>
    </div>

    {#if game.result !== 'playing'}
      <button class="new-game-btn" onclick={startNewGame}>
        New Game
      </button>
    {/if}

  {/snippet}
</BoardLayout>

<style>
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

  .move-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 0;
  }

  .move-list {
    border-radius: 0.5rem;
    border: 1px solid var(--card-border, #333);
    background: var(--card-bg, #1a1a1a);
    padding: 0.5rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
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

  .nav-controls {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    flex-shrink: 0;
  }

  .nav-btn {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--btn-bg, #2a2a2a);
    color: inherit;
    border: none;
    cursor: pointer;
    font-size: 1.125rem;
    transition: background-color 0.15s;
  }

  .nav-btn:hover:not(:disabled) {
    background: var(--btn-hover, #3a3a3a);
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
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
    flex-shrink: 0;
  }

  .new-game-btn:hover {
    background: #15803d;
  }


  /* Result overlays */
  .result-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 5;
    animation: fade-in 0.3s ease-out;
  }
  .result-overlay[role="button"] {
    pointer-events: auto;
    cursor: pointer;
  }
  .trophy {
    font-size: 6rem;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
    animation: trophy-pop 0.5s ease-out;
  }
  .draw-symbol {
    font-size: 8rem;
    font-weight: bold;
    color: #facc15;
    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    animation: trophy-pop 0.5s ease-out;
  }
  @keyframes trophy-pop {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); }
  }

  /* Promotion picker */
  .promo-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 0.25rem;
    z-index: 10;
  }

  .promo-picker {
    display: flex;
    gap: 0.5rem;
    background: var(--card-bg, #1a1a1a);
    border: 2px solid var(--card-border, #333);
    border-radius: 0.75rem;
    padding: 0.75rem;
  }

  .promo-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4.5rem;
    height: 4.5rem;
    background: var(--btn-bg, #374151);
    border: 2px solid transparent;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
  }

  .promo-btn:hover {
    background: var(--btn-hover, #4b5563);
    border-color: #22c55e;
  }

  .promo-btn img {
    width: 3.5rem;
    height: 3.5rem;
  }
</style>
