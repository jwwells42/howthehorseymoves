<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import BoardOverlay from '$lib/components/board/BoardOverlay.svelte';
  import PromotionPicker from '$lib/components/board/PromotionPicker.svelte';
  import ResultSymbol from '$lib/components/board/ResultSymbol.svelte';
  import MoveNav from '$lib/components/board/MoveNav.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import BotPanel from '$lib/characters/BotPanel.svelte';
  import { getCharacter } from '$lib/characters/bots';
  import { createGameState } from '$lib/state/use-game.svelte';
  import { getLegalMoves } from '$lib/logic/attacks';
  import { playSound } from '$lib/state/sound';
  import { getNextStopAfter } from '$lib/curriculum';
  import type { BotLevel } from '$lib/logic/bot';
  import type { SquareId } from '$lib/logic/types';

  let { botLevel = 'random' }: { botLevel?: BotLevel } = $props();

  let character = $derived(getCharacter(botLevel));

  // Every bot is the boss of a curriculum level, so beating one should offer the
  // way onward like any other stop. The stop ids are `play-{level}` throughout;
  // the last bot in the curriculum has no next stop, and the button hides.
  let nextStop = $derived(getNextStopAfter(`play-${botLevel}`));

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
  let showResignOverlay = $state(false);

  // Show draw overlay when a draw occurs
  $effect(() => {
    if (isDraw) showDrawOverlay = true;
  });

  // A white flag over the board: the one signal a non-reader can read.
  $effect(() => {
    if (game.result === 'resigned') showResignOverlay = true;
  });

  let resultMessage = $derived.by(() => {
    switch (game.result) {
      case 'checkmate-white': return 'Checkmate \u2014 you win!';
      case 'checkmate-black': return 'Checkmate \u2014 you lose!';
      case 'resigned': return 'You resigned.';
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

  // Resigning is two taps: the flag arms it, the check confirms. Students tap
  // fast and a one-tap resign would end games by accident.
  let confirmingResign = $state(false);

  function doResign() {
    confirmingResign = false;
    game.resign();
  }

  function startNewGame() {
    reviewIndex = null;
    showDrawOverlay = false;
    confirmingResign = false;
    showResignOverlay = false;
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
          playSound('botCaptures');
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
          playSound('botCaptured');
        }
      }
    }
  });

  // Record a win against this bot — drives the trophy on /play and marks the
  // matching curriculum stop complete. Stored as '3' because getStopStars()
  // parseInts localStorage progress values as a star count.
  $effect(() => {
    if (game.result === 'checkmate-white') {
      localStorage.setItem(`bot-beaten-${botLevel}`, '3');
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
    } else if (game.result === 'resigned') {
      // No celebrating a student who gave up.
      triggerAnimation('idle', 0);
      botReaction = pickReaction(character.reactions.resign);
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
      dragValidMoves={isReviewing || game.pendingPromotion ? [] : dragValidMoves}
      onSquareClick={onSquareClick}
      onDrop={onDrop}
      {onDragStart}
      {onDragEnd}
      opponentSlide={isReviewing ? null : game.botSlide}
    />
    {#if game.result === 'checkmate-white' && reviewIndex === null}
      <BoardOverlay>
        <ResultSymbol result="win" />
        <div class="win-buttons">
          <Button onclick={startNewGame}>Play Again</Button>
          {#if nextStop}
            <Button variant="primary" href={nextStop.href}>{nextStop.name} &rarr;</Button>
          {/if}
        </div>
      </BoardOverlay>
    {/if}
    {#if isDraw && reviewIndex === null && showDrawOverlay}
      <BoardOverlay dim={false} onclick={() => (showDrawOverlay = false)}>
        <ResultSymbol result="draw" />
      </BoardOverlay>
    {/if}
    {#if game.result === 'resigned' && reviewIndex === null && showResignOverlay}
      <BoardOverlay dim={false} onclick={() => (showResignOverlay = false)}>
        <ResultSymbol result="resign" />
      </BoardOverlay>
    {/if}
    {#if game.pendingPromotion}
      <PromotionPicker onpick={game.completePromotion} />
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

    <MoveNav
      {canGoBack}
      {canGoForward}
      onStart={goToStart}
      onBack={goBack}
      onForward={goForward}
      onEnd={goToEnd}
    />

    {#if game.result !== 'playing'}
      <Button variant="primary" onclick={startNewGame}>New Game</Button>
    {:else if confirmingResign}
      <div class="resign-confirm">
        <span class="resign-flag" aria-hidden="true">&#127987;&#65039;</span>
        <button class="confirm-btn confirm-yes" onclick={doResign} aria-label="Yes, resign">&#10003;</button>
        <button class="confirm-btn confirm-no" onclick={() => confirmingResign = false} aria-label="No, keep playing">&#10007;</button>
      </div>
    {:else}
      <Button onclick={() => (confirmingResign = true)}>
        <span aria-hidden="true">&#127987;&#65039;</span> Resign
      </Button>
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
    font-weight: var(--weight-strong);
    margin: 0 0 0.25rem;
  }

  .status {
    color: var(--ink-muted);
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
    border: 1px solid var(--line);
    background: var(--surface);
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
    font-size: var(--size-secondary);
  }

  .move-num {
    color: var(--ink-muted);
    text-align: right;
  }

  .move-btn {
    text-align: left;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    cursor: pointer;
    background: none;
    border: none;
    font-size: inherit;
    transition: background-color 0.15s;
  }

  .move-btn:hover {
    background: var(--surface-raised);
  }

  .move-active {
    background: var(--line);
    font-weight: var(--weight-strong);
  }

  .resign-confirm {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .resign-flag {
    font-size: var(--size-large);
  }

  .confirm-btn {
    width: 2.75rem;
    height: 2.75rem;
    border: none;
    border-radius: 0.5rem;
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
    cursor: pointer;
  }

  /* Resigning is the danger: the ✓ that confirms it is the wrong colour.
     Keeping on playing is the safe, ordinary choice. */
  .confirm-yes {
    background: var(--wrong);
    color: var(--on-answer);
  }

  .confirm-no {
    background: var(--surface-raised);
    border: 1px solid var(--line);
  }

  .confirm-no:hover {
    background: var(--line);
  }

  .win-buttons {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 22rem;
  }
</style>
