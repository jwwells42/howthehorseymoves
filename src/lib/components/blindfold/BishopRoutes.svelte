<script lang="ts">
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Board from '$lib/components/board/Board.svelte';
  import AnswerInput from './AnswerInput.svelte';
  import RouteTrail from './RouteTrail.svelte';
  import { playSound } from '$lib/state/sound';
  import { EMPTY_BOARD, type SquareId } from '$lib/logic/types';
  import { MARK, highlight } from '$lib/board-marks';

  function isValidSquare(sq: string): boolean {
    if (sq.length !== 2) return false;
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;
    return f >= 0 && f <= 7 && r >= 0 && r <= 7;
  }

  function sameColor(sq1: string, sq2: string): boolean {
    const f1 = sq1.charCodeAt(0) - 97, r1 = parseInt(sq1[1]) - 1;
    const f2 = sq2.charCodeAt(0) - 97, r2 = parseInt(sq2[1]) - 1;
    return (f1 + r1) % 2 === (f2 + r2) % 2;
  }

  function isBishopMove(from: string, to: string): boolean {
    const df = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
    const dr = Math.abs(parseInt(from[1]) - parseInt(to[1]));
    return df === dr && df > 0;
  }

  function generatePair(): { start: string; target: string; optimal: number; possible: boolean } {
    const roll = Math.random();
    for (;;) {
      const sf = Math.floor(Math.random() * 8);
      const sr = Math.floor(Math.random() * 8);
      const tf = Math.floor(Math.random() * 8);
      const tr = Math.floor(Math.random() * 8);
      if (sf === tf && sr === tr) continue;
      const start = String.fromCharCode(97 + sf) + (sr + 1);
      const target = String.fromCharCode(97 + tf) + (tr + 1);
      const same = sameColor(start, target);

      if (roll < 0.30) {
        if (same) continue;
        return { start, target, optimal: -1, possible: false };
      } else if (roll < 0.65) {
        if (!same || !isBishopMove(start, target)) continue;
        return { start, target, optimal: 1, possible: true };
      } else {
        if (!same || isBishopMove(start, target)) continue;
        return { start, target, optimal: 2, possible: true };
      }
    }
  }

  function getStars(moves: number, optimal: number): number {
    if (moves <= optimal) return 3;
    if (moves <= optimal + 1) return 2;
    return 1;
  }

  let puzzle = $state(generatePair());
  let route = $state<string[]>([]);
  let input = $state('');
  let error = $state<string | null>(null);
  let result = $state<'playing' | 'won' | 'correct-impossible'>('playing');
  let newRouteButton = $state<Button>();

  let currentSquare = $derived(route.length > 0 ? route[route.length - 1] : puzzle.start);
  let moveCount = $derived(route.length);
  let stars = $derived(result === 'correct-impossible' ? 3 : getStars(moveCount, puzzle.optimal));

  let allStops = $derived([puzzle.start, ...route]);

  // Once the puzzle is done, Enter starts the next one.
  $effect(() => {
    if (result !== 'playing') newRouteButton?.focus();
  });

  function handleKeydown(e: KeyboardEvent) {
    if (result !== 'playing') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      handleImpossible();
    }
  }

  function handleSubmit() {
    const sq = input.trim().toLowerCase();
    input = '';

    if (!isValidSquare(sq)) {
      error = 'Not a valid square.';
      playSound('wrong');
      return;
    }

    if (!isBishopMove(currentSquare, sq)) {
      error = `A bishop can\u2019t reach ${sq} from ${currentSquare}.`;
      playSound('wrong');
      return;
    }

    error = null;
    route = [...route, sq];

    if (sq === puzzle.target) {
      result = 'won';
      playSound('stars');
    } else {
      playSound('correct');
    }
  }

  function handleImpossible() {
    if (!puzzle.possible) {
      result = 'correct-impossible';
      playSound('stars');
    } else {
      error = "It IS possible! They\u2019re on the same color squares.";
      playSound('wrong');
    }
  }

  function newPuzzle() {
    puzzle = generatePair();
    route = [];
    input = '';
    error = null;
    result = 'playing';
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="trainer">
  <header class="header">
    <h2>Bishop Routes</h2>
    <p class="instructions">
      Find a bishop path from <strong>{puzzle.start}</strong> to <strong>{puzzle.target}</strong>
      — or spot when it's impossible!
    </p>
  </header>

  <RouteTrail stops={allStops} target={puzzle.target} open={result === 'playing'} />

  {#if result === 'playing'}
    <AnswerInput bind:value={input} onsubmit={handleSubmit} label="Next square" placeholder="Next square..." {error} />
    <Button onclick={handleImpossible}>Can't reach! <span class="shortcut">(Esc)</span></Button>
  {:else}
    <div class="result">
      {#if result === 'correct-impossible'}
        <p class="result-title">Correct! Impossible!</p>
        <p class="instructions">
          {puzzle.start} and {puzzle.target} are on different color squares — a bishop can never reach it.
        </p>
      {:else}
        <p class="result-title">Route complete!</p>
        <p class="instructions">{moveCount} move{moveCount !== 1 ? 's' : ''} (optimal: {puzzle.optimal})</p>
      {/if}
      <StarRating {stars} size="lg" />
      {#if result === 'won'}
        <div class="route-board">
          <Board
            board={EMPTY_BOARD}
            readOnly
            route={allStops as SquareId[]}
            highlights={highlight([puzzle.start, puzzle.target], MARK.note, 'solid')}
            label="Bishop route on chess board"
          />
        </div>
      {/if}
      <Button bind:this={newRouteButton} variant="primary" onclick={newPuzzle}>New Route</Button>
    </div>
  {/if}
</div>

<style>
  .trainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    max-width: 28rem;
    margin: 0 auto;
  }

  .header {
    text-align: center;
  }

  .instructions {
    margin-top: 0.5rem;
    color: var(--ink-muted);
  }

  .shortcut {
    font-weight: normal;
  }

  .result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    text-align: center;
    animation: fade-in 0.3s ease;
  }
  .result-title {
    font-weight: bold;
  }
  .route-board {
    width: 100%;
    max-width: 24rem;
  }
</style>
