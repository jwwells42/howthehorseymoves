<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { playSound } from '$lib/state/sound';

  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';

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

  function sqXY(sq: string, S: number): [number, number] {
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;
    return [f * S + S / 2, (7 - r) * S + S / 2];
  }

  let puzzle = $state<Puzzle>(generatePuzzle());
  let route = $state<string[]>([]);
  let input = $state('');
  let error = $state<string | null>(null);
  let result = $state<'playing' | 'won'>('playing');
  let inputEl = $state<HTMLInputElement | undefined>(undefined);
  let newRouteEl = $state<HTMLButtonElement | undefined>(undefined);

  let currentSquare = $derived(route.length > 0 ? route[route.length - 1] : puzzle.start);
  let moveCount = $derived(route.length);
  let stars = $derived(getStars(moveCount, puzzle.optimal));
  let obstacleArray = $derived([...puzzle.obstacles]);
  let allStops = $derived([puzzle.start, ...route]);

  const RS = 36;
  const RB = RS * 8;

  $effect(() => {
    if (result === 'playing') {
      inputEl?.focus();
    } else {
      newRouteEl?.focus();
    }
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
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
  <div class="header">
    <h2 class="title">Rook Maze</h2>
    <p class="instructions">
      Navigate a rook from <span class="bold">{puzzle.start}</span> to
      <span class="bold">{puzzle.target}</span> around the obstacles.
    </p>
    <p class="hint-text">
      Obstacles: {obstacleArray.sort().join(', ')} &mdash; Shortest: {puzzle.optimal} moves
    </p>
  </div>

  <!-- Route display -->
  <div class="route-box">
    <span class="route-square">{puzzle.start}</span>
    {#each route as sq}
      <span class="route-step">
        <span class="route-arrow">&rarr;</span>
        <span class={['route-square', sq === puzzle.target && 'route-target']}>{sq}</span>
      </span>
    {/each}
    {#if result === 'playing'}
      <span class="route-arrow">&rarr; ?</span>
    {/if}
  </div>

  {#if result === 'playing'}
    <form onsubmit={handleSubmit} class="input-row">
      <input
        bind:this={inputEl}
        type="text"
        bind:value={input}
        placeholder="Next square..."
        maxlength={2}
        class="square-input"
        autocomplete="off"
        autocapitalize="off"
      />
      <button type="submit" class="btn-go">Go</button>
    </form>
    {#if error}
      <p class="error-msg">{error}</p>
    {/if}
  {:else}
    <div class="result-panel">
      <p class="result-title">Route complete!</p>
      <p class="result-info">{moveCount} move{moveCount !== 1 ? 's' : ''} (optimal: {puzzle.optimal})</p>
      <StarRating stars={stars} size="lg" />

      <!-- Route board -->
      <svg viewBox="-14 -2 {RB + 28} {RB + 16}" class="route-board">
        {#each Array(8) as _, i}
          <text x={-6} y={(7 - i) * RS + RS / 2 + 3}
            text-anchor="middle" font-size="8" fill="#888">{i + 1}</text>
        {/each}
        {#each Array(8) as _, i}
          <text x={i * RS + RS / 2} y={RB + 10}
            text-anchor="middle" font-size="8" fill="#888">{String.fromCharCode(97 + i)}</text>
        {/each}
        {#each Array(8) as _, row}
          {#each Array(8) as _, col}
            {@const sq = String.fromCharCode(97 + col) + (8 - row)}
            {@const isLight = (col + row) % 2 === 0}
            {@const fill = sq === puzzle.start || sq === puzzle.target ? '#4ade80' : puzzle.obstacles.has(sq) ? '#f59e0b' : isLight ? LIGHT : DARK}
            <rect x={col * RS} y={row * RS} width={RS} height={RS} {fill} />
          {/each}
        {/each}
        <!-- Obstacle pawn icons -->
        {#each obstacleArray as sq}
          {@const xy = sqXY(sq, RS)}
          <image href="/pieces/wP.svg"
            x={xy[0] - RS * 0.35} y={xy[1] - RS * 0.35} width={RS * 0.7} height={RS * 0.7} />
        {/each}
        <!-- Route lines -->
        {#each allStops.slice(1) as sq, i}
          {@const from = sqXY(allStops[i], RS)}
          {@const to = sqXY(sq, RS)}
          <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]}
            stroke="rgba(0,0,0,0.35)" stroke-width="2" stroke-linecap="round" />
        {/each}
        <!-- Route dots -->
        {#each allStops as sq, i}
          {@const xy = sqXY(sq, RS)}
          {@const isEnd = sq === puzzle.target}
          <g>
            <circle cx={xy[0]} cy={xy[1]} r={RS * 0.3}
              fill={i === 0 || isEnd ? '#166534' : '#1e40af'}
              stroke="white" stroke-width="1.5" />
            <text x={xy[0]} y={xy[1] + 1} text-anchor="middle" dominant-baseline="central"
              font-size="9" fill="white" font-weight="bold">
              {i === 0 ? 'S' : i}
            </text>
          </g>
        {/each}
      </svg>

      <button bind:this={newRouteEl} onclick={newPuzzle} class="btn-start">
        New Maze
      </button>
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

  .title {
    font-size: 1.25rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .instructions {
    color: var(--text-muted);
  }

  .bold {
    font-weight: bold;
  }

  .hint-text {
    font-size: 0.75rem;
    color: var(--text-faint);
    margin-top: 0.25rem;
  }

  .route-box {
    width: 100%;
    padding: 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--card-border);
    background: var(--card);
    min-height: 3rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
  }

  .route-square {
    font-family: monospace;
    font-weight: bold;
  }

  .route-target {
    color: #4ade80;
  }

  .route-step {
    font-family: monospace;
  }

  .route-arrow {
    color: var(--text-faint);
    margin: 0 0.25rem;
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }

  .square-input {
    flex: 1;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card);
    color: var(--foreground);
    font-family: monospace;
    font-size: 1.125rem;
    text-align: center;
  }

  .square-input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.4);
  }

  .btn-go {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    background: rgba(255, 248, 230, 0.15);
    color: var(--foreground);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-go:hover {
    background: rgba(255, 248, 230, 0.25);
  }

  .error-msg {
    color: #f87171;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .result-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .result-title {
    font-weight: bold;
    font-size: 1.125rem;
  }

  .result-info {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .route-board {
    width: 100%;
    max-width: 280px;
  }

  @media (min-width: 640px) {
    .route-board {
      max-width: 360px;
    }
  }

  .btn-start {
    padding: 0.5rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    background: rgba(255, 248, 230, 0.15);
    color: var(--foreground);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-start:hover {
    background: rgba(255, 248, 230, 0.25);
  }
</style>
