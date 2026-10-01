<script lang="ts">
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Board from '$lib/components/board/Board.svelte';
  import AnswerInput from './AnswerInput.svelte';
  import RouteTrail from './RouteTrail.svelte';
  import { playSound } from '$lib/state/sound';
  import { createBoardState, type SquareId } from '$lib/logic/types';
  import { MARK, highlight } from '$lib/board-marks';

  function isValidSquare(sq: string): boolean {
    if (sq.length !== 2) return false;
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;
    return f >= 0 && f <= 7 && r >= 0 && r <= 7;
  }

  function isRookMove(from: string, to: string): boolean {
    return from[0] === to[0] || from[1] === to[1];
  }

  function isBlocked(from: string, to: string, obstacles: Set<string>): boolean {
    const f1 = from.charCodeAt(0) - 97, r1 = parseInt(from[1]) - 1;
    const f2 = to.charCodeAt(0) - 97, r2 = parseInt(to[1]) - 1;

    if (f1 === f2) {
      const step = r2 > r1 ? 1 : -1;
      for (let r = r1 + step; r !== r2; r += step) {
        if (obstacles.has(String.fromCharCode(97 + f1) + (r + 1))) return true;
      }
    } else {
      const step = f2 > f1 ? 1 : -1;
      for (let f = f1 + step; f !== f2; f += step) {
        if (obstacles.has(String.fromCharCode(97 + f) + (r1 + 1))) return true;
      }
    }
    return false;
  }

  function bfsRookMaze(from: string, to: string, obstacles: Set<string>): number {
    if (from === to) return 0;
    const visited = new Set([from]);
    const queue: [string, number][] = [[from, 0]];

    while (queue.length > 0) {
      const [sq, dist] = queue.shift()!;
      const f = sq.charCodeAt(0) - 97;
      const r = parseInt(sq[1]) - 1;

      for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let nf = f + df, nr = r + dr;
        while (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
          const nsq = String.fromCharCode(97 + nf) + (nr + 1);
          if (obstacles.has(nsq)) break;
          if (!visited.has(nsq)) {
            if (nsq === to) return dist + 1;
            visited.add(nsq);
            queue.push([nsq, dist + 1]);
          }
          nf += df;
          nr += dr;
        }
      }
    }
    return -1;
  }

  interface Puzzle {
    start: string;
    target: string;
    obstacles: Set<string>;
    optimal: number;
  }

  /** Squares between two squares on the same rank or file (exclusive). */
  function squaresBetween(a: string, b: string): string[] {
    const f1 = a.charCodeAt(0) - 97, r1 = parseInt(a[1]) - 1;
    const f2 = b.charCodeAt(0) - 97, r2 = parseInt(b[1]) - 1;
    const sqs: string[] = [];
    if (f1 === f2) {
      const step = r2 > r1 ? 1 : -1;
      for (let r = r1 + step; r !== r2; r += step) {
        sqs.push(String.fromCharCode(97 + f1) + (r + 1));
      }
    } else if (r1 === r2) {
      const step = f2 > f1 ? 1 : -1;
      for (let f = f1 + step; f !== f2; f += step) {
        sqs.push(String.fromCharCode(97 + f) + (r1 + 1));
      }
    }
    return sqs;
  }

  function generatePuzzle(): Puzzle {
    for (;;) {
      const sf = Math.floor(Math.random() * 8);
      const sr = Math.floor(Math.random() * 8);
      const tf = Math.floor(Math.random() * 8);
      const tr = Math.floor(Math.random() * 8);
      if (sf === tf && sr === tr) continue;
      if (sf === tf || sr === tr) continue;

      const start = String.fromCharCode(97 + sf) + (sr + 1);
      const target = String.fromCharCode(97 + tf) + (tr + 1);

      // The two direct 2-move corners
      const corner1 = String.fromCharCode(97 + tf) + (sr + 1); // same rank as start, same file as target
      const corner2 = String.fromCharCode(97 + sf) + (tr + 1); // same file as start, same rank as target

      // Squares along both direct L-shaped routes (through corner1 and corner2)
      const path1 = [...squaresBetween(start, corner1), corner1, ...squaresBetween(corner1, target)];
      const path2 = [...squaresBetween(start, corner2), corner2, ...squaresBetween(corner2, target)];
      const allPathSquares = [...new Set([...path1, ...path2])].filter(sq => sq !== start && sq !== target);

      if (allPathSquares.length === 0) continue;

      const obstacles = new Set<string>();

      // Place at least one obstacle on a direct path square
      const forced = allPathSquares[Math.floor(Math.random() * allPathSquares.length)];
      obstacles.add(forced);

      // Add 2-4 more random obstacles
      const numExtra = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < numExtra; i++) {
        let oSq: string;
        do {
          oSq = String.fromCharCode(97 + Math.floor(Math.random() * 8)) + (Math.floor(Math.random() * 8) + 1);
        } while (oSq === start || oSq === target || obstacles.has(oSq));
        obstacles.add(oSq);
      }

      const optimal = bfsRookMaze(start, target, obstacles);
      if (optimal >= 3 && optimal <= 4) {
        return { start, target, obstacles, optimal };
      }
    }
  }

  function getStars(moves: number, optimal: number): number {
    if (moves <= optimal) return 3;
    if (moves <= optimal + 1) return 2;
    return 1;
  }

  let puzzle = $state<Puzzle>(generatePuzzle());
  let route = $state<string[]>([]);
  let input = $state('');
  let error = $state<string | null>(null);
  let result = $state<'playing' | 'won'>('playing');
  let newRouteButton = $state<Button>();

  let currentSquare = $derived(route.length > 0 ? route[route.length - 1] : puzzle.start);
  let moveCount = $derived(route.length);
  let stars = $derived(getStars(moveCount, puzzle.optimal));
  let obstacles = $derived([...puzzle.obstacles].sort() as SquareId[]);
  let allStops = $derived([puzzle.start, ...route]);
  /** Obstacles stand on the board as pawns, drawn as walls like the route puzzles'. */
  let mazeBoard = $derived(createBoardState(obstacles.map((square) => ({ piece: 'P', color: 'w', square }))));

  // Once the maze is done, Enter starts the next one.
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

    if (!isRookMove(currentSquare, sq)) {
      error = `A rook can\u2019t reach ${sq} from ${currentSquare} \u2014 must share a rank or file.`;
      playSound('wrong');
      return;
    }

    if (puzzle.obstacles.has(sq)) {
      error = `${sq} is blocked by an obstacle!`;
      playSound('wrong');
      return;
    }

    if (isBlocked(currentSquare, sq, puzzle.obstacles)) {
      error = `An obstacle is in the way between ${currentSquare} and ${sq}.`;
      playSound('wrong');
      return;
    }

    error = null;
    route = [...route, sq];

    if (sq === puzzle.target) {
      playSound('stars');
      result = 'won';
    } else {
      playSound('correct');
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
    <h2>Rook Maze</h2>
    <p class="instructions">
      Navigate a rook from <strong>{puzzle.start}</strong> to <strong>{puzzle.target}</strong> around the obstacles.
    </p>
    <p class="hint">Obstacles: {obstacles.join(', ')} &mdash; Shortest: {puzzle.optimal} moves</p>
  </header>

  <RouteTrail stops={allStops} target={puzzle.target} open={result === 'playing'} />

  {#if result === 'playing'}
    <AnswerInput bind:value={input} onsubmit={handleSubmit} label="Next square" placeholder="Next square..." {error} />
  {:else}
    <div class="result">
      <p class="result-title">Route complete!</p>
      <p class="instructions">{moveCount} move{moveCount !== 1 ? 's' : ''} (optimal: {puzzle.optimal})</p>
      <StarRating {stars} size="lg" />
      <div class="route-board">
        <Board
          board={mazeBoard}
          readOnly
          {obstacles}
          route={allStops as SquareId[]}
          highlights={highlight([puzzle.start, puzzle.target], MARK.note, 'solid')}
          label="Rook route on chess board"
        />
      </div>
      <Button bind:this={newRouteButton} variant="primary" onclick={newPuzzle}>New Maze</Button>
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

  .hint {
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
