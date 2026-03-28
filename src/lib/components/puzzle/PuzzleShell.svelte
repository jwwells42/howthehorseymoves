<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import PuzzleControls from './PuzzleControls.svelte';
  import StarRating from './StarRating.svelte';
  import SuccessOverlay from './SuccessOverlay.svelte';
  import { createPuzzleState } from '$lib/state/use-puzzle.svelte';
  import type { Puzzle } from '$lib/puzzles/types';
  import type { SquareId } from '$lib/logic/types';

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

  let dragValidMoves = $derived.by(() => {
    if (!dragFrom) return [];
    return ps.getMovesFrom(dragFrom);
  });

  // Route puzzles render wall pieces as brick walls
  let obstacles = $derived.by(() => {
    if (puzzle.type !== 'route') return [];
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

  // Targets (stars) only for route puzzles
  let targets = $derived(puzzle.type === 'route' ? puzzle.stars : [] as SquareId[]);

  // Draggable piece restriction — route: only playerPiece; others: any white piece
  let draggablePiece = $derived(puzzle.type === 'route' ? puzzle.playerPiece : undefined);

  // Show move counter for route and conversion
  let showMoveCounter = $derived(puzzle.type === 'route' || puzzle.type === 'conversion');

  // Star thresholds — always available
  let thresholds = $derived.by(() => {
    if (puzzle.type === 'route' || puzzle.type === 'conversion') return puzzle.starThresholds;
    return puzzle.starThresholds ?? null;
  });

  function onDragStart(sq: SquareId) { dragFrom = sq; }
  function onDragEnd() { dragFrom = null; }
</script>

<div class="shell">
  <!-- Instruction -->
  <div class="header">
    <h2 class="title">{puzzle.title}</h2>
    <p class="instruction">{puzzle.instruction}</p>
  </div>

  <!-- Move counter -->
  {#if showMoveCounter && thresholds}
    <div class="move-counter">
      Moves: {ps.moveCount} / {thresholds.three}
    </div>
  {/if}

  <!-- Board -->
  <div class="board-wrapper">
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
    {#if ps.isComplete}
      <SuccessOverlay stars={ps.stars} {onNext} onRetry={ps.reset} {nextLabel} />
    {/if}
  </div>

  <!-- Stalemate warning -->
  {#if ps.stalemateTrigger}
    <div class="stalemate-warning">
      <strong>Stalemate!</strong> The opponent has no legal moves but isn't in check. That's a draw, not a win.
      <button class="stalemate-retry" onclick={ps.reset}>Try again</button>
    </div>
  {/if}

  <!-- Hint display -->
  {#if ps.currentHintIndex >= 0 && puzzle.hints?.[ps.currentHintIndex]}
    <div class="hint-box">
      Hint: {puzzle.hints[ps.currentHintIndex]}
    </div>
  {/if}

  <!-- Controls -->
  <PuzzleControls
    onReset={ps.reset}
    onHint={puzzle.hints?.length ? ps.showHint : undefined}
  />

  <!-- Star thresholds -->
  {#if showMoveCounter && thresholds}
    <div class="thresholds">
      <span><StarRating stars={3} size="sm" /> {thresholds.three} moves</span>
      <span><StarRating stars={2} size="sm" /> {thresholds.two} moves</span>
      <span><StarRating stars={1} size="sm" /> {thresholds.one} moves</span>
    </div>
  {/if}
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    flex: 1;
    min-height: 0;
    width: 100%;
  }
  .header { text-align: center; flex-shrink: 0; }
  .title { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.25rem; }
  .instruction { color: var(--text-muted); }
  .move-counter { font-size: 0.875rem; color: var(--text-faint); flex-shrink: 0; }
  .board-wrapper { position: relative; flex: 1; min-height: 0; display: flex; justify-content: center; align-items: center; width: 100%; }
  @media (max-height: 480px) {
    .shell { gap: 0.25rem; }
    .header { display: none; }
  }
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
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--text-faint);
    flex-shrink: 0;
  }
  .thresholds span {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
</style>
