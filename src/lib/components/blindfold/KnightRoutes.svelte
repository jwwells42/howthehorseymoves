<script lang="ts">
  import { tick } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';

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

  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';
  const RS = 36; // route board square size
  const RB = RS * 8;

  function sqXY(sq: string): [number, number] {
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;
    return [f * RS + RS / 2, (7 - r) * RS + RS / 2];
  }

  let puzzle = $state(generatePair());
  let route: string[] = $state([]);
  let input = $state('');
  let error: string | null = $state(null);
  let result: 'playing' | 'won' = $state('playing');
  let inputEl: HTMLInputElement | null = $state(null);
  let newRouteEl: HTMLButtonElement | null = $state(null);

  let currentSquare = $derived(route.length > 0 ? route[route.length - 1] : puzzle.start);
  let moveCount = $derived(route.length);
  let stars = $derived(getStars(moveCount, puzzle.optimal));
  let allStops = $derived([puzzle.start, ...route]);
  let stopSet = $derived(new Set(allStops));

  $effect(() => {
    if (result === 'playing') {
      // Need to wait a tick for DOM to update after state change
      tick().then(() => inputEl?.focus());
    } else if (result === 'won') {
      tick().then(() => newRouteEl?.focus());
    }
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    const sq = input.trim().toLowerCase();
    input = '';

    if (!isValidSquare(sq)) {
      error = 'Not a valid square.';
      return;
    }

    if (!isKnightMove(currentSquare, sq)) {
      error = `A knight can\u2019t reach ${sq} from ${currentSquare}.`;
      return;
    }

    error = null;
    route = [...route, sq];

    if (sq === puzzle.target) {
      result = 'won';
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
  <div class="header">
    <h2 class="title">Knight Routes</h2>
    <p class="instructions">
      Find a knight route from <span class="bold">{puzzle.start}</span> to
      <span class="bold">{puzzle.target}</span>.
    </p>
    <p class="hint">Shortest path: {puzzle.optimal} moves</p>
  </div>

  <!-- Route display -->
  <div class="route-display">
    <span class="route-sq">{puzzle.start}</span>
    {#each route as sq}
      <span class="route-step">
        <span class="route-arrow">&rarr;</span>
        <span class="route-sq" class:route-target={sq === puzzle.target}>{sq}</span>
      </span>
    {/each}
    {#if result === 'playing'}
      <span class="route-arrow">&rarr; ?</span>
    {/if}
  </div>

  {#if result === 'playing'}
    <form class="input-row" onsubmit={handleSubmit}>
      <input
        bind:this={inputEl}
        bind:value={input}
        type="text"
        placeholder="Next square..."
        maxlength={2}
        class="square-input"
        autocomplete="off"
        autocapitalize="off"
      />
      <button type="submit" class="go-btn">Go</button>
    </form>
    {#if error}
      <p class="error">{error}</p>
    {/if}
  {:else}
    <div class="result-area">
      <p class="result-title">Route complete!</p>
      <p class="result-detail">{moveCount} moves (optimal: {puzzle.optimal})</p>
      <StarRating stars={stars} size="lg" />

      <!-- Route board SVG -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <svg viewBox="-14 -2 {RB + 28} {RB + 16}" class="route-svg">
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
            {@const isBoardTarget = sq === puzzle.start || sq === puzzle.target}
            {@const isStop = stopSet.has(sq)}
            <rect
              x={col * RS}
              y={row * RS}
              width={RS}
              height={RS}
              fill={isBoardTarget ? '#4ade80' : isStop ? '#60a5fa' : isLight ? LIGHT : DARK}
            />
          {/each}
        {/each}

        <!-- Lines connecting stops -->
        {#each allStops.slice(1) as sq, i}
          {@const [x1, y1] = sqXY(allStops[i])}
          {@const [x2, y2] = sqXY(sq)}
          <line {x1} {y1} {x2} {y2}
            stroke="rgba(0,0,0,0.35)" stroke-width="2" stroke-linecap="round" />
        {/each}

        <!-- Numbered dots at each stop -->
        {#each allStops as sq, i}
          {@const [x, y] = sqXY(sq)}
          {@const isEnd = sq === puzzle.target}
          <circle cx={x} cy={y} r={RS * 0.3}
            fill={i === 0 || isEnd ? '#166534' : '#1e40af'}
            stroke="white" stroke-width="1.5" />
          <text {x} y={y + 1} text-anchor="middle" dominant-baseline="central"
            font-size="9" fill="white" font-weight="bold" class="label">
            {i === 0 ? 'S' : i}
          </text>
        {/each}
      </svg>

      <button
        bind:this={newRouteEl}
        class="start-btn"
        onclick={newPuzzle}
      >
        New Route
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

  .hint {
    font-size: 0.75rem;
    color: var(--text-faint);
    margin-top: 0.25rem;
  }

  /* Route display */
  .route-display {
    width: 100%;
    padding: 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    min-height: 3rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
  }

  .route-sq {
    font-family: monospace;
    font-weight: bold;
  }

  .route-step {
    font-family: monospace;
  }

  .route-arrow {
    color: var(--text-faint);
    margin: 0 0.25rem;
  }

  .route-target {
    color: #4ade80;
  }

  /* Input form */
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
    background: var(--card-bg);
    color: var(--foreground);
    font-family: monospace;
    font-size: 1.125rem;
    text-align: center;
    outline: none;
  }

  .square-input:focus {
    border-color: rgba(255, 248, 230, 0.4);
  }

  .square-input::placeholder {
    color: var(--text-faint);
  }

  .go-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    background: #16a34a;
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .go-btn:hover {
    background: #15803d;
  }

  .error {
    color: #f87171;
    font-size: 0.875rem;
    font-weight: 500;
  }

  /* Result area */
  .result-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    animation: fade-in 0.3s ease;
  }

  .result-title {
    font-weight: bold;
    font-size: 1.125rem;
  }

  .result-detail {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  /* Route board SVG */
  .route-svg {
    width: 100%;
    max-width: 280px;
  }

  @media (min-width: 640px) {
    .route-svg {
      max-width: 360px;
    }
  }

  .label {
    pointer-events: none;
    user-select: none;
  }

  .start-btn {
    padding: 0.5rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    background: #16a34a;
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .start-btn:hover {
    background: #15803d;
  }
</style>
