<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import PuzzleControls from './PuzzleControls.svelte';
  import StarRating from './StarRating.svelte';
  import SuccessOverlay from './SuccessOverlay.svelte';
  import { createPuzzleState } from '$lib/state/use-puzzle.svelte';
  import type { Puzzle } from '$lib/puzzles/types';
  import { type SquareId, squareToCoords, coordsToSquare } from '$lib/logic/types';
  import { getValidMoves } from '$lib/logic/moves';
  import { getLegalMoves } from '$lib/logic/attacks';

  interface Props {
    puzzle: Puzzle;
    onNext?: () => void;
    nextLabel?: string;
  }
  let { puzzle, onNext, nextLabel }: Props = $props();

  let ps = $derived(createPuzzleState(puzzle));

  let dragFrom = $state<SquareId | null>(null);

  // Compute en passant pawn slide animation
  let pawnSlideData = $derived.by(() => {
    const ep = puzzle.enPassantSquare;
    if (!ep) return undefined;
    const [epFile, epRank] = squareToCoords(ep);
    const pawnRank = epRank === 2 ? 3 : 4;
    const startRank = epRank === 2 ? 1 : 6;
    const pawnSq = coordsToSquare(epFile, pawnRank);
    const startSq = coordsToSquare(epFile, startRank);
    if (!pawnSq || !startSq) return undefined;
    return { from: startSq, to: pawnSq };
  });

  let showPawnSlide = $derived(pawnSlideData && ps.moveCount === 0);
  let isBotMode = $derived(puzzle.mode === 'checkmate-bot');

  let dragValidMoves = $derived.by(() => {
    if (!dragFrom) return [];
    const p = ps.board.pieces.get(dragFrom);
    if (!p || p.color !== 'w' || (!isBotMode && p.piece !== puzzle.piece)) return [];
    return isBotMode
      ? getLegalMoves(dragFrom, ps.board, 'w')
      : getValidMoves(p.piece, dragFrom, ps.board, 'w');
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
  {#if !puzzle.strictSolution}
    <div class="move-counter">
      Moves: {ps.moveCount} / {puzzle.starThresholds.three}
    </div>
  {/if}

  <!-- Board -->
  <div class="board-wrapper">
    <Board
      board={ps.board}
      selectedSquare={ps.selectedSquare}
      validMoves={ps.validMoves}
      targets={puzzle.arrows || puzzle.strictSolution ? [] : puzzle.targets}
      reachedTargets={ps.reachedTargets}
      {dragValidMoves}
      draggablePiece={isBotMode ? undefined : puzzle.piece}
      onSquareClick={ps.handleSquareClick}
      onDrop={ps.handleDrop}
      {onDragStart}
      {onDragEnd}
      pawnSlide={showPawnSlide ? pawnSlideData : undefined}
      wrongMoveSquare={ps.wrongMoveSquare}
      opponentSlide={ps.opponentSlide}
      arrows={ps.moveCount === 0 ? puzzle.arrows : undefined}
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
  {#if !puzzle.strictSolution}
    <div class="thresholds">
      <span><StarRating stars={3} size="sm" /> {puzzle.starThresholds.three} moves</span>
      <span><StarRating stars={2} size="sm" /> {puzzle.starThresholds.two} moves</span>
      <span><StarRating stars={1} size="sm" /> {puzzle.starThresholds.one} moves</span>
    </div>
  {/if}
</div>

<style>
  .shell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    max-width: 42rem;
    margin: 0 auto;
  }
  .header { text-align: center; }
  .title { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.25rem; }
  .instruction { color: var(--text-muted); }
  .move-counter { font-size: 0.875rem; color: var(--text-faint); }
  .board-wrapper { position: relative; width: 100%; display: flex; justify-content: center; }
  .stalemate-warning {
    background: rgba(127, 29, 29, 0.4);
    border: 1px solid rgba(239, 68, 68, 0.5);
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    color: #fca5a5;
    font-size: 0.875rem;
    text-align: center;
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
  }
  .thresholds {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--text-faint);
  }
  .thresholds span {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }
</style>
