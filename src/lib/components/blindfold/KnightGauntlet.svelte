<script lang="ts">
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Board from '$lib/components/board/Board.svelte';
  import AnswerInput from './AnswerInput.svelte';
  import RouteTrail from './RouteTrail.svelte';
  import { playSound } from '$lib/state/sound';
  import { createBoardState, type SquareId } from '$lib/logic/types';
  import { MARK, highlight } from '$lib/board-marks';

  const KNIGHT_OFFSETS: [number, number][] = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];

  function sqToFR(sq: string): [number, number] {
    return [sq.charCodeAt(0) - 97, parseInt(sq[1]) - 1];
  }

  function frToSq(f: number, r: number): string {
    return String.fromCharCode(97 + f) + (r + 1);
  }

  function isOnBoard(f: number, r: number): boolean {
    return f >= 0 && f <= 7 && r >= 0 && r <= 7;
  }

  function isValidSquare(sq: string): boolean {
    if (sq.length !== 2) return false;
    const [f, r] = sqToFR(sq);
    return isOnBoard(f, r);
  }

  function isKnightMove(from: string, to: string): boolean {
    const df = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
    const dr = Math.abs(parseInt(from[1]) - parseInt(to[1]));
    return (df === 1 && dr === 2) || (df === 2 && dr === 1);
  }

  function getQueenDanger(sq: string): Set<string> {
    const [qf, qr] = sqToFR(sq);
    const danger = new Set<string>();
    danger.add(sq);
    for (const [df, dr] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      let f = qf + df, r = qr + dr;
      while (isOnBoard(f, r)) {
        danger.add(frToSq(f, r));
        f += df;
        r += dr;
      }
    }
    return danger;
  }

  function getKnightMoves(sq: string): string[] {
    const [f, r] = sqToFR(sq);
    return KNIGHT_OFFSETS
      .map(([df, dr]) => [f + df, r + dr] as [number, number])
      .filter(([nf, nr]) => isOnBoard(nf, nr))
      .map(([nf, nr]) => frToSq(nf, nr));
  }

  function shortestSafePath(from: string, to: string, danger: Set<string>): number {
    if (from === to) return 0;
    if (danger.has(from) || danger.has(to)) return -1;
    const visited = new Set([from]);
    const queue: [string, number][] = [[from, 0]];
    while (queue.length > 0) {
      const [sq, dist] = queue.shift()!;
      for (const next of getKnightMoves(sq)) {
        if (danger.has(next)) continue;
        if (next === to) return dist + 1;
        if (!visited.has(next)) {
          visited.add(next);
          queue.push([next, dist + 1]);
        }
      }
    }
    return -1;
  }

  interface Puzzle {
    queenSq: string;
    start: string;
    target: string;
    danger: Set<string>;
    optimal: number;
  }

  function generatePuzzle(): Puzzle {
    for (;;) {
      const qf = Math.floor(Math.random() * 8);
      const qr = Math.floor(Math.random() * 8);
      const queenSq = frToSq(qf, qr);
      const danger = getQueenDanger(queenSq);

      const safe: string[] = [];
      for (let f = 0; f < 8; f++) {
        for (let r = 0; r < 8; r++) {
          const sq = frToSq(f, r);
          if (!danger.has(sq)) safe.push(sq);
        }
      }

      if (safe.length < 8) continue;

      for (let attempt = 0; attempt < 50; attempt++) {
        const start = safe[Math.floor(Math.random() * safe.length)];
        const target = safe[Math.floor(Math.random() * safe.length)];
        if (start === target) continue;

        const dist = shortestSafePath(start, target, danger);
        if (dist >= 3 && dist <= 7) {
          return { queenSq, start, target, danger, optimal: dist };
        }
      }
    }
  }

  function getStars(moves: number, optimal: number): number {
    if (moves <= optimal) return 3;
    if (moves <= optimal + 1) return 2;
    return 1;
  }

  /* ── State ─────────────────────────────────────── */

  let puzzle = $state(generatePuzzle());
  let route = $state<string[]>([]);
  let input = $state('');
  let error = $state<string | null>(null);
  let result = $state<'playing' | 'won'>('playing');
  let newRouteButton = $state<Button>();

  let currentSquare = $derived(route.length > 0 ? route[route.length - 1] : puzzle.start);
  let moveCount = $derived(route.length);
  let stars = $derived(getStars(moveCount, puzzle.optimal));
  let allStops = $derived([puzzle.start, ...route]);
  /** The queen's own square is where she stands, not a square she attacks. */
  let attacked = $derived([...puzzle.danger].filter((sq) => sq !== puzzle.queenSq));
  let queenBoard = $derived(createBoardState([{ piece: 'Q', color: 'b', square: puzzle.queenSq as SquareId }]));

  // Once through the gauntlet, Enter starts the next one.
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

    if (puzzle.danger.has(sq)) {
      error = `${sq} is attacked by the queen! \u2620`;
      playSound('wrong');
      return;
    }

    error = null;
    route = [...route, sq];

    if (sq === puzzle.target) {
      result = 'won';
      playSound('stars');
    } else {
      playSound('move');
    }
  }

  function newPuzzle() {
    puzzle = generatePuzzle();
    route = [];
    input = '';
    error = null;
    result = 'playing';
  }

</script>

<div class="trainer">
  <header class="header">
    <h2>Knight Gauntlet</h2>
    <p class="instructions">
      Move the knight from <strong>{puzzle.start}</strong> to <strong>{puzzle.target}</strong>
      without landing on any square the queen on <strong>{puzzle.queenSq}</strong> attacks.
    </p>
    <p class="optimal">Shortest safe path: {puzzle.optimal} moves</p>
  </header>

  <RouteTrail stops={allStops} target={puzzle.target} open={result === 'playing'} />

  {#if result === 'playing'}
    <AnswerInput bind:value={input} onsubmit={handleSubmit} label="Next square" placeholder="Next square..." {error} />
  {:else}
    <div class="result">
      <p class="result-title">Safe passage!</p>
      <p class="instructions">{moveCount} moves (optimal: {puzzle.optimal})</p>
      <StarRating {stars} size="lg" />
      <div class="route-board">
        <Board
          board={queenBoard}
          readOnly
          route={allStops as SquareId[]}
          highlights={[
            ...highlight([puzzle.start, puzzle.target], MARK.note, 'solid'),
            ...highlight(attacked, MARK.danger),
          ]}
          label="Knight route on chess board"
        />
      </div>
      <Button bind:this={newRouteButton} variant="primary" onclick={newPuzzle}>New Gauntlet</Button>
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

  .optimal {
    margin-top: 0.25rem;
    font-size: var(--size-secondary);
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
