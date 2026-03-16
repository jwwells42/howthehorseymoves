<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import { parsePgn } from '$lib/logic/pgn';
  import { getLegalMoves } from '$lib/logic/attacks';
  import type { ModelGame } from '$lib/games/types';
  import type { SquareId, PieceColor } from '$lib/logic/types';
  import type { Arrow } from '$lib/logic/pgn';

  const AUTOPLAY_MS = 1200;

  let { game }: { game: ModelGame } = $props();

  let parsed = $derived(parsePgn(game.pgn));
  let totalMoves = $derived(parsed.moves.length);

  // Viewer state
  let currentMove = $state(0);
  let isPlaying = $state(false);

  // Test mode state
  let testMode = $state(false);
  let testMoveIdx = $state(0);
  let testSelected = $state<SquareId | null>(null);
  let testHintArrow = $state<Arrow | null>(null);
  let testComplete = $state(false);
  let testDragFrom = $state<SquareId | null>(null);

  // Move list scroll container
  let moveListEl: HTMLDivElement | undefined = $state(undefined);

  // Derived board position
  let board = $derived(testMode ? parsed.positions[testMoveIdx] : parsed.positions[currentMove]);
  let lastMove = $derived(currentMove > 0 ? parsed.moves[currentMove - 1] : null);
  let currentComment = $derived(lastMove?.comment);
  let currentArrows = $derived(lastMove?.arrows);

  let testColorToMove: PieceColor = $derived(testMoveIdx % 2 === 0 ? 'w' : 'b');

  let testValidMoves = $derived.by(() => {
    if (!testMode || !testSelected || testComplete) return [];
    return getLegalMoves(testSelected, parsed.positions[testMoveIdx], testColorToMove);
  });

  let testDragMoves = $derived.by(() => {
    if (!testMode || !testDragFrom || testComplete) return [];
    return getLegalMoves(testDragFrom, parsed.positions[testMoveIdx], testColorToMove);
  });

  // Build move pairs for display
  let movePairs = $derived.by(() => {
    const pairs: { num: number; white: string; black?: string }[] = [];
    for (let i = 0; i < totalMoves; i += 2) {
      const wm = parsed.moves[i];
      const bm = parsed.moves[i + 1];
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: wm.san + (wm.nag ?? ''),
        black: bm ? bm.san + (bm.nag ?? '') : undefined,
      });
    }
    return pairs;
  });

  // Test mode status text
  let testStatusText = $derived.by(() => {
    if (testComplete) return 'You did it! You reproduced the entire game.';
    const moveNum = Math.floor(testMoveIdx / 2) + 1;
    const isWhiteTurn = testMoveIdx % 2 === 0;
    return `Move ${moveNum}${isWhiteTurn ? '.' : '...'} ${isWhiteTurn ? 'White' : 'Black'} to play`;
  });

  // Test mode arrows
  let testArrows = $derived(testHintArrow ? [testHintArrow] : undefined);

  // --- Navigation ---
  function goForward() {
    currentMove = Math.min(currentMove + 1, totalMoves);
  }

  function goBack() {
    currentMove = Math.max(currentMove - 1, 0);
  }

  function goToStart() {
    currentMove = 0;
  }

  function goToEnd() {
    currentMove = totalMoves;
  }

  function togglePlay() {
    isPlaying = !isPlaying;
  }

  // --- Auto-play ---
  $effect(() => {
    if (testMode) return;
    if (!isPlaying || currentMove >= totalMoves) return;
    const timer = setTimeout(() => {
      currentMove += 1;
      if (currentMove >= totalMoves) isPlaying = false;
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  });

  // --- Keyboard controls ---
  function handleKeydown(e: KeyboardEvent) {
    if (testMode) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
    else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  }

  // --- Scroll current move into view ---
  $effect(() => {
    if (testMode) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    currentMove; // track dependency
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

  // --- Test mode logic ---
  function advanceTestMove(from: SquareId, to: SquareId) {
    const expected = parsed.moves[testMoveIdx];
    if (from === expected.from && to === expected.to) {
      testHintArrow = null;
      const next = testMoveIdx + 1;
      if (next >= totalMoves) {
        testMoveIdx = next;
        testComplete = true;
      } else {
        testMoveIdx = next;
      }
      testSelected = null;
    } else {
      // Wrong move — show hint arrow
      testHintArrow = { from: expected.from, to: expected.to, color: '#15803d' };
      testSelected = null;
    }
  }

  function handleTestClick(sq: SquareId) {
    if (testComplete) return;
    const currentBoard = parsed.positions[testMoveIdx];

    if (!testSelected) {
      const p = currentBoard.pieces.get(sq);
      if (p && p.color === testColorToMove) {
        testSelected = sq;
        testHintArrow = null;
      }
      return;
    }

    if (sq === testSelected) {
      testSelected = null;
      return;
    }

    // Clicking another own piece
    const target = currentBoard.pieces.get(sq);
    if (target && target.color === testColorToMove) {
      testSelected = sq;
      return;
    }

    // Try to move
    const legal = getLegalMoves(testSelected, currentBoard, testColorToMove);
    if (!legal.includes(sq)) {
      testSelected = null;
      return;
    }

    advanceTestMove(testSelected, sq);
  }

  function handleTestDrop(from: SquareId, to: SquareId) {
    if (testComplete || from === to) return;
    const currentBoard = parsed.positions[testMoveIdx];
    const p = currentBoard.pieces.get(from);
    if (!p || p.color !== testColorToMove) return;
    const legal = getLegalMoves(from, currentBoard, testColorToMove);
    if (!legal.includes(to)) return;
    advanceTestMove(from, to);
  }

  function handleTestDragStart(sq: SquareId) {
    if (testComplete) return;
    testDragFrom = sq;
    testHintArrow = null;
  }

  function handleTestDragEnd() {
    testDragFrom = null;
  }

  function startTestMode() {
    testMode = true;
    testMoveIdx = 0;
    testSelected = null;
    testHintArrow = null;
    testComplete = false;
    isPlaying = false;
  }

  function exitTestMode() {
    testMode = false;
    testSelected = null;
    testHintArrow = null;
    testComplete = false;
    currentMove = 0;
  }

  function retryTest() {
    testMoveIdx = 0;
    testComplete = false;
    testHintArrow = null;
  }

  // No-op for viewer mode Board callbacks
  function noop() {}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if testMode}
  <!-- Test mode -->
  <div class="test-wrapper">
    <div class="test-header">
      <h2 class="test-title">Test Mode</h2>
      <p class="test-status">{testStatusText}</p>
    </div>

    <div class="board-container">
      <div class="player-label">
        <div class="player-dot player-dot-black"></div>
        <span class="player-name">{game.black}</span>
      </div>

      <Board
        board={board}
        selectedSquare={testSelected}
        validMoves={testValidMoves}
        targets={[]}
        reachedTargets={[]}
        dragValidMoves={testDragMoves}
        onSquareClick={handleTestClick}
        onDrop={handleTestDrop}
        onDragStart={handleTestDragStart}
        onDragEnd={handleTestDragEnd}
        playableColors={['w', 'b']}
        arrows={testArrows}
      />

      <div class="player-label">
        <div class="player-dot player-dot-white"></div>
        <span class="player-name">{game.white}</span>
      </div>
    </div>

    <div class="test-buttons">
      {#if testComplete}
        <button class="btn-try-again" onclick={retryTest}>
          Try Again
        </button>
      {/if}
      <button class="btn-back-viewer" onclick={exitTestMode}>
        Back to Viewer
      </button>
    </div>
  </div>
{:else}
  <!-- Viewer mode -->
  <div class="viewer-layout">
    <!-- Board side -->
    <div class="board-side">
      <div class="player-label">
        <div class="player-dot player-dot-black"></div>
        <span class="player-name">{game.black}</span>
      </div>

      <Board
        board={board}
        selectedSquare={null}
        validMoves={[]}
        targets={[]}
        reachedTargets={[]}
        dragValidMoves={[]}
        onSquareClick={noop}
        onDrop={noop}
        onDragStart={noop}
        onDragEnd={noop}
        pawnSlide={lastMove ? { from: lastMove.from, to: lastMove.to } : undefined}
        readOnly={true}
        arrows={currentArrows}
      />

      <div class="player-label">
        <div class="player-dot player-dot-white"></div>
        <span class="player-name">{game.white}</span>
      </div>

      <!-- Navigation controls -->
      <div class="nav-controls">
        <button
          class="nav-btn"
          onclick={goToStart}
          disabled={currentMove === 0}
          aria-label="Start"
        >&#x23EE;</button>
        <button
          class="nav-btn"
          onclick={goBack}
          disabled={currentMove === 0}
          aria-label="Back"
        >&#x25C0;</button>
        <button
          class="nav-btn nav-btn-wide"
          onclick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >{isPlaying ? '\u23F8' : '\u25B6'}</button>
        <button
          class="nav-btn"
          onclick={goForward}
          disabled={currentMove >= totalMoves}
          aria-label="Forward"
        >&#x25B6;</button>
        <button
          class="nav-btn"
          onclick={goToEnd}
          disabled={currentMove >= totalMoves}
          aria-label="End"
        >&#x23ED;</button>
      </div>

      <!-- Test button -->
      <div class="test-btn-wrap">
        <button class="btn-test" onclick={startTestMode}>
          Test Yourself
        </button>
      </div>

      <!-- Move comment -->
      <div class="comment-area">
        {#if currentComment}
          <p class="comment-text">{currentComment}</p>
        {/if}
      </div>
    </div>

    <!-- Move list side -->
    <div class="move-list-side">
      <div class="game-info">
        <span class="game-event">{game.event}</span>
        <span class="game-year">{game.year}</span>
      </div>
      <p class="game-desc">{game.description}</p>

      <div class="move-list" bind:this={moveListEl}>
        <div class="move-grid">
          {#each movePairs as pair, i}
            <span class="move-num">{pair.num}.</span>
            <button
              class="move-btn"
              class:move-active={currentMove === i * 2 + 1}
              data-active={currentMove === i * 2 + 1}
              onclick={() => { currentMove = i * 2 + 1; }}
            >
              {pair.white}
            </button>
            {#if pair.black}
              <button
                class="move-btn"
                class:move-active={currentMove === i * 2 + 2}
                data-active={currentMove === i * 2 + 2}
                onclick={() => { currentMove = i * 2 + 2; }}
              >
                {pair.black}
              </button>
            {:else}
              <span></span>
            {/if}
          {/each}
        </div>
        {#if game.result}
          <div class="game-result">{game.result}</div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* --- Test Mode --- */
  .test-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 56rem;
    margin: 0 auto;
  }

  .test-header {
    text-align: center;
  }

  .test-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
  }

  .test-status {
    color: var(--text-muted, #888);
    margin: 0;
  }

  .test-buttons {
    display: flex;
    gap: 0.75rem;
  }

  .btn-try-again {
    padding: 0.5rem 1.25rem;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .btn-try-again:hover {
    background: #15803d;
  }

  .btn-back-viewer {
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border, #333);
    background: var(--card-bg, #1a1a1a);
    color: inherit;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .btn-back-viewer:hover {
    background: var(--btn-hover, #2a2a2a);
  }

  /* --- Player labels --- */
  .player-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem;
  }

  .player-dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .player-dot-black {
    background: #1a1a1a;
  }

  .player-dot-white {
    background: white;
  }

  .player-name {
    font-size: 0.875rem;
    color: var(--text-muted, #888);
  }

  /* --- Board container (shared test/viewer) --- */
  .board-container {
    width: 100%;
    max-width: 560px;
  }

  /* --- Viewer layout --- */
  .viewer-layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    align-items: flex-start;
    max-width: 56rem;
    margin: 0 auto;
  }

  @media (min-width: 1024px) {
    .viewer-layout {
      flex-direction: row;
    }
  }

  .board-side {
    flex: 1;
    width: 100%;
    max-width: 560px;
  }

  @media (min-width: 1024px) {
    .board-side {
      max-width: 560px;
    }
  }

  /* --- Nav controls --- */
  .nav-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
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

  .nav-btn-wide {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }

  /* --- Test yourself button --- */
  .test-btn-wrap {
    display: flex;
    justify-content: center;
    margin-top: 0.75rem;
  }

  .btn-test {
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border, #333);
    background: var(--card-bg, #1a1a1a);
    color: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .btn-test:hover {
    background: var(--btn-hover, #2a2a2a);
  }

  /* --- Comment area --- */
  .comment-area {
    margin-top: 0.75rem;
    min-height: 3rem;
  }

  .comment-text {
    font-size: 0.875rem;
    color: var(--text-muted, #888);
    font-style: italic;
    text-align: center;
    padding: 0 0.5rem;
    margin: 0;
  }

  /* --- Move list side --- */
  .move-list-side {
    width: 100%;
  }

  @media (min-width: 1024px) {
    .move-list-side {
      width: 14rem;
    }
  }

  .game-info {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .game-event {
    font-weight: 700;
  }

  .game-year {
    color: var(--text-faint, #666);
    margin-left: 0.5rem;
  }

  .game-desc {
    font-size: 0.75rem;
    color: var(--text-muted, #888);
    margin: 0 0 0.75rem;
  }

  .move-list {
    border-radius: 0.5rem;
    border: 1px solid var(--card-border, #333);
    background: var(--card-bg, #1a1a1a);
    padding: 0.75rem;
    max-height: 400px;
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

  .game-result {
    text-align: center;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-muted, #888);
    margin-top: 0.5rem;
  }
</style>
