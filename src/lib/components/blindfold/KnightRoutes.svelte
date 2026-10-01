<script lang="ts">
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Board from '$lib/components/board/Board.svelte';
  import AnswerInput from './AnswerInput.svelte';
  import RouteTrail from './RouteTrail.svelte';
  import { playSound } from '$lib/state/sound';
  import { EMPTY_BOARD, type SquareId } from '$lib/logic/types';
  import { MARK, highlight } from '$lib/board-marks';

  const KNIGHT_OFFSETS = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];

  function isValidSquare(sq: string): boolean {
    if (sq.length !== 2) return false;
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;
    return f >= 0 && f <= 7 && r >= 0 && r <= 7;
  }

  function isKnightMove(from: string, to: string): boolean {
    const df = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
    const dr = Math.abs(parseInt(from[1]) - parseInt(to[1]));
    return (df === 1 && dr === 2) || (df === 2 && dr === 1);
  }

  function getKnightMoves(sq: string): string[] {
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;
    return KNIGHT_OFFSETS
      .map(([df, dr]) => [f + df, r + dr])
      .filter(([nf, nr]) => nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7)
      .map(([nf, nr]) => String.fromCharCode(97 + nf) + (nr + 1));
  }

  function shortestPath(from: string, to: string): number {
    if (from === to) return 0;
    const queue: [string, number][] = [[from, 0]];
    const visited = new Set([from]);
    while (queue.length > 0) {
      const [sq, dist] = queue.shift()!;
      for (const next of getKnightMoves(sq)) {
        if (next === to) return dist + 1;
        if (!visited.has(next)) {
          visited.add(next);
          queue.push([next, dist + 1]);
        }
      }
    }
    return -1;
  }

  function generatePair(): { start: string; target: string; optimal: number } {
    for (;;) {
      const sf = Math.floor(Math.random() * 8);
      const sr = Math.floor(Math.random() * 8);
      const tf = Math.floor(Math.random() * 8);
      const tr = Math.floor(Math.random() * 8);
      if (sf === tf && sr === tr) continue;
      const start = String.fromCharCode(97 + sf) + (sr + 1);
      const target = String.fromCharCode(97 + tf) + (tr + 1);
      const dist = shortestPath(start, target);
      if (dist >= 2 && dist <= 4) return { start, target, optimal: dist };
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
  let result = $state<'playing' | 'won'>('playing');
  let newRouteButton = $state<Button>();

  let currentSquare = $derived(route.length > 0 ? route[route.length - 1] : puzzle.start);
  let moveCount = $derived(route.length);
  let stars = $derived(getStars(moveCount, puzzle.optimal));
  let allStops = $derived([puzzle.start, ...route]);

  // Once the route is done, Enter starts the next one.
  $effect(() => {
    if (result === 'won') newRouteButton?.focus();
  });

  function handleSubmit() {
    const sq = input.trim().toLowerCase();
    input = '';

    if (!isValidSquare(sq)) {
      error = 'Not a valid square.';
      playSound('wrong');
      return;
    }

    if (!isKnightMove(currentSquare, sq)) {
      error = `A knight can\u2019t reach ${sq} from ${currentSquare}.`;
      playSound('wrong');
      return;
    }

    error = null;
    route = [...route, sq];
    playSound('correct');

    if (sq === puzzle.target) {
      result = 'won';
      playSound('stars');
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

<div class="trainer">
  <header class="header">
    <h2>Knight Routes</h2>
    <p class="instructions">
      Find a knight route from <strong>{puzzle.start}</strong> to <strong>{puzzle.target}</strong>.
    </p>
  </header>

  <RouteTrail stops={allStops} target={puzzle.target} open={result === 'playing'} />

  {#if result === 'playing'}
    <AnswerInput bind:value={input} onsubmit={handleSubmit} label="Next square" placeholder="Next square..." {error} />
  {:else}
    <div class="result">
      <p class="result-title">Route complete!</p>
      <p class="instructions">{moveCount} moves (optimal: {puzzle.optimal})</p>
      <StarRating {stars} size="lg" />
      <div class="route-board">
        <Board
          board={EMPTY_BOARD}
          readOnly
          route={allStops as SquareId[]}
          highlights={highlight([puzzle.start, puzzle.target], MARK.note, 'solid')}
          label="Knight route on chess board"
        />
      </div>
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

  .result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
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
