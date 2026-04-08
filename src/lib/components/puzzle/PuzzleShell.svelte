<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import PuzzleControls from './PuzzleControls.svelte';
  import StarRating from './StarRating.svelte';
  import SuccessOverlay from './SuccessOverlay.svelte';
  import { createPuzzleState } from '$lib/state/use-puzzle.svelte';
  import type { Puzzle } from '$lib/puzzles/types';
  import type { PieceKind, SquareId } from '$lib/logic/types';

  interface Props {
    puzzle: Puzzle;
    onNext?: () => void;
    nextLabel?: string;
  }
  let { puzzle, onNext, nextLabel }: Props = $props();

  let ps = $derived(createPuzzleState(puzzle));

  let dragFrom = $state<SquareId | null>(null);

  let isRoute = $derived(puzzle.type === 'route');
  let isConversion = $derived(puzzle.type === 'conversion');
  let isFindMoves = $derived(puzzle.type === 'find-moves');
  let findMovesMode = $derived(puzzle.type === 'find-moves' ? (puzzle.mode ?? 'test') : 'test');
  let showFindMovesIntro = $state(false);

  $effect(() => {
    if (puzzle.type === 'find-moves') {
      if (findMovesMode === 'test') {
        showFindMovesIntro = true;
      } else {
        showFindMovesIntro = false;
      }
      // Auto-start demo mode
      if (findMovesMode === 'demo') {
        const s = ps as unknown as { runDemo: () => void };
        setTimeout(() => s.runDemo(), 400);
      }
    }
  });

  // Find-moves specific derived values (safe to access only when isFindMoves is true)
  let findMovesInfo = $derived.by(() => {
    if (puzzle.type !== 'find-moves') return null;
    const s = ps as unknown as { foundCount: number; totalCorrect: number; mistakes: number };
    return { found: s.foundCount, total: s.totalCorrect, mistakes: s.mistakes };
  });

  let dragValidMoves = $derived.by(() => {
    if (!dragFrom) return [];
    return ps.getMovesFrom(dragFrom);
  });

  // Route and find-moves puzzles render wall pieces as brick walls
  let obstacles = $derived.by(() => {
    if (puzzle.type !== 'route' && puzzle.type !== 'find-moves') return [];
    const pp = puzzle.playerPiece;
    if (pp === 'P') return [];
    const result: SquareId[] = [];
    for (const [sq, p] of ps.board.pieces) {
      if (p.color === 'w' && p.piece !== pp) {
        result.push(sq);
      }
    }
    return result;
  });

  // Targets (stars) only for route puzzles (not find-moves)
  let targets = $derived(puzzle.type === 'route' ? puzzle.stars : [] as SquareId[]);

  // Draggable piece restriction — route: only playerPiece; find-moves: none (no dragging); others: any white piece
  let draggablePiece = $derived(
    puzzle.type === 'find-moves' ? ('_' as PieceKind) :
    puzzle.type === 'route' ? puzzle.playerPiece : undefined
  );

  // Show move counter for route and conversion
  let showMoveCounter = $derived(puzzle.type === 'route' || puzzle.type === 'conversion');

  // Star thresholds — always available
  let thresholds = $derived.by(() => {
    if (puzzle.type === 'route' || puzzle.type === 'conversion' || puzzle.type === 'find-moves') return puzzle.starThresholds;
    return puzzle.starThresholds ?? null;
  });

  function onDragStart(sq: SquareId) { dragFrom = sq; }
  function onDragEnd() { dragFrom = null; }
</script>

<BoardLayout>
  {#snippet headerArea()}
    <div class="header">
      <h2 class="title">{puzzle.title}</h2>
      <p class="instruction">{puzzle.instruction}</p>
    </div>
  {/snippet}

  {#snippet boardArea()}
    <Board
      board={ps.board}
      selectedSquare={ps.selectedSquare}
      validMoves={ps.validMoves}
      {targets}
      reachedTargets={ps.reachedTargets}
      {dragValidMoves}
      {draggablePiece}
      onSquareClick={ps.handleSquareClick}
      onDrop={ps.handleDrop}
      {onDragStart}
      {onDragEnd}
      wrongMoveSquare={ps.wrongMoveSquare}
      opponentSlide={ps.opponentSlide}
      arrows={ps.arrows.length > 0 ? ps.arrows : undefined}
      highlights={ps.highlights.length > 0 ? ps.highlights : undefined}
      {obstacles}
    />
    {#if showFindMovesIntro}
      <div class="find-intro-overlay" role="button" tabindex="0" onclick={() => showFindMovesIntro = false} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') showFindMovesIntro = false; }}>
        <div class="find-intro-box">
          <div class="find-intro-icon">&#10003;</div>
          <p class="find-intro-text">Tap every square this piece can move to!</p>
          <span class="find-intro-hint">Tap to start</span>
        </div>
      </div>
    {/if}
    {#if ps.isComplete}
      <SuccessOverlay stars={ps.stars} {onNext} onRetry={ps.reset} {nextLabel} />
    {/if}
  {/snippet}

  {#snippet sidebarArea()}
    {#if findMovesInfo}
      <div class="move-counter">
        {findMovesInfo.found} of {findMovesInfo.total} found{findMovesInfo.mistakes > 0 ? ` · ${findMovesInfo.mistakes} wrong` : ''}
      </div>
    {:else if showMoveCounter && thresholds}
      <div class="move-counter">
        Moves: {ps.moveCount} / {thresholds.three}
      </div>
    {/if}

    {#if ps.stalemateTrigger}
      <div class="stalemate-warning">
        <strong>Stalemate!</strong> The opponent has no legal moves but isn't in check. That's a draw, not a win.
        <button class="stalemate-retry" onclick={ps.reset}>Try again</button>
      </div>
    {/if}

    {#if ps.currentHintIndex >= 0 && puzzle.hints?.[ps.currentHintIndex]}
      <div class="hint-box">
        Hint: {puzzle.hints[ps.currentHintIndex]}
      </div>
    {/if}

    <PuzzleControls
      onReset={ps.reset}
      onHint={puzzle.hints?.length ? ps.showHint : undefined}
    />

    {#if isFindMoves && findMovesMode === 'test' && thresholds}
      <div class="thresholds">
        <span><StarRating stars={3} size="sm" /> {thresholds.three === 0 ? 'no' : `≤${thresholds.three}`} mistakes</span>
        <span><StarRating stars={2} size="sm" /> ≤{thresholds.two} mistakes</span>
        <span><StarRating stars={1} size="sm" /> ≤{thresholds.one} mistakes</span>
      </div>
    {:else if showMoveCounter && thresholds}
      <div class="thresholds">
        <span><StarRating stars={3} size="sm" /> {thresholds.three} moves</span>
        <span><StarRating stars={2} size="sm" /> {thresholds.two} moves</span>
        <span><StarRating stars={1} size="sm" /> {thresholds.one} moves</span>
      </div>
    {/if}
  {/snippet}
</BoardLayout>

<style>
  .header { text-align: center; flex-shrink: 0; }
  .title { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.25rem; }
  .instruction { color: var(--text-muted); }
  .move-counter { font-size: 0.875rem; color: var(--text-faint); flex-shrink: 0; }

  .stalemate-warning {
    background: rgba(127, 29, 29, 0.4);
    border: 1px solid rgba(239, 68, 68, 0.5);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    color: #fca5a5;
    font-size: 0.875rem;
    text-align: center;
    flex-shrink: 0;
  }
  .stalemate-retry {
    margin-left: 0.5rem;
    text-decoration: underline;
    font-weight: 500;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
  }
  .hint-box {
    background: rgba(120, 53, 15, 0.4);
    border: 1px solid rgba(245, 158, 11, 0.5);
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    color: #fcd34d;
    font-size: 0.875rem;
    flex-shrink: 0;
  }
  .thresholds {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.125rem 0.375rem;
    font-size: 0.6875rem;
    color: var(--text-faint);
    flex-shrink: 0;
  }
  .thresholds span {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    white-space: nowrap;
  }

  /* Find-moves intro overlay */
  .find-intro-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.5rem;
    z-index: 10;
    cursor: pointer;
    animation: fade-in 0.3s ease-out;
  }
  .find-intro-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
  }
  .find-intro-icon {
    font-size: 4rem;
    color: #4ade80;
    filter: drop-shadow(0 2px 8px rgba(74, 222, 128, 0.5));
  }
  .find-intro-text {
    font-size: 1.25rem;
    font-weight: bold;
    color: white;
    text-align: center;
    max-width: 16rem;
  }
  .find-intro-hint {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.5);
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
