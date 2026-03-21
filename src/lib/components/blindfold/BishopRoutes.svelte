<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';

  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';

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

  function shortestPath(from: string, to: string): number {
    if (!sameColor(from, to)) return -1;
    if (from === to) return 0;
    if (isBishopMove(from, to)) return 1;
    return 2;
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

  function sqXY(sq: string, S: number): [number, number] {
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;
    return [f * S + S / 2, (7 - r) * S + S / 2];
  }

  let puzzle = $state(generatePair());
  let route = $state<string[]>([]);
  let input = $state('');
  let error = $state<string | null>(null);
  let result = $state<'playing' | 'won' | 'correct-impossible'>('playing');
  let inputEl = $state<HTMLInputElement | null>(null);
  let newRouteEl = $state<HTMLButtonElement | null>(null);

  let currentSquare = $derived(route.length > 0 ? route[route.length - 1] : puzzle.start);
  let moveCount = $derived(route.length);
  let stars = $derived(result === 'correct-impossible' ? 3 : getStars(moveCount, puzzle.optimal));

  // RouteBoard constants
  const RB_S = 36;
  const RB_B = RB_S * 8;

  let allStops = $derived([puzzle.start, ...route]);
  let stopSet = $derived(new Set(allStops));

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
      return;
    }

    if (!isBishopMove(currentSquare, sq)) {
      error = `A bishop can\u2019t reach ${sq} from ${currentSquare}.`;
      return;
    }

    error = null;
    route = [...route, sq];

    if (sq === puzzle.target) {
      result = 'won';
    }
  }

  function handleImpossible() {
    if (!puzzle.possible) {
      result = 'correct-impossible';
    } else {
      error = "It IS possible! They\u2019re on the same color squares.";
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

<div class="container">
  <div class="header">
    <h2 class="title">Bishop Routes</h2>
    <p class="subtitle">
      Find a bishop path from <span class="bold">{puzzle.start}</span> to
      <span class="bold">{puzzle.target}</span> — or spot when it's impossible!
    </p>
    {#if puzzle.possible}
      <p class="hint">
        Shortest path: {puzzle.optimal} move{puzzle.optimal !== 1 ? 's' : ''}
      </p>
    {/if}
  </div>

  <!-- Route display -->
  <div class="route-display">
    <span class="route-sq">{puzzle.start}</span>
    {#each route as sq, i}
      <span class="route-step">
        <span class="route-arrow">&rarr;</span>
        <span class={['route-sq', sq === puzzle.target && 'route-sq-target']}>{sq}</span>
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
        type="text"
        bind:value={input}
        placeholder="Next square..."
        maxlength={2}
        class="text-input"
        autocomplete="off"
        autocapitalize="off"
      />
      <button type="submit" class="go-btn">Go</button>
    </form>
    <button class="impossible-btn" onclick={handleImpossible}>
      Can't reach!
    </button>
    {#if error}
      <p class="error">{error}</p>
    {/if}
  {:else}
    <div class="result-area">
      {#if result === 'correct-impossible'}
        <p class="result-title">Correct! Impossible!</p>
        <p class="result-detail">
          {puzzle.start} and {puzzle.target} are on different color squares — a bishop can never reach it.
        </p>
      {:else}
        <p class="result-title">Route complete!</p>
        <p class="result-detail">{moveCount} move{moveCount !== 1 ? 's' : ''} (optimal: {puzzle.optimal})</p>
      {/if}
      <StarRating {stars} size="lg" />
      {#if result === 'won'}
        <!-- RouteBoard inline -->
        <svg viewBox="-14 -2 {RB_B + 28} {RB_B + 16}" class="route-board" role="img" aria-label="Bishop route on chess board">
          {#each Array(8) as _, i}
            <text x={-6} y={(7 - i) * RB_S + RB_S / 2 + 3}
              text-anchor="middle" font-size="8" fill="#888">{i + 1}</text>
          {/each}
          {#each Array(8) as _, i}
            <text x={i * RB_S + RB_S / 2} y={RB_B + 10}
              text-anchor="middle" font-size="8" fill="#888">{String.fromCharCode(97 + i)}</text>
          {/each}
          {#each Array(8) as _, row}
            {#each Array(8) as _, col}
              {@const sq = String.fromCharCode(97 + col) + (8 - row)}
              {@const isLight = (col + row) % 2 === 0}
              {@const fill = sq === puzzle.start || sq === puzzle.target ? '#4ade80' : stopSet.has(sq) ? '#60a5fa' : isLight ? LIGHT : DARK}
              <rect x={col * RB_S} y={row * RB_S} width={RB_S} height={RB_S} {fill} />
            {/each}
          {/each}
          {#each allStops.slice(1) as sq, i}
            {@const [x1, y1] = sqXY(allStops[i], RB_S)}
            {@const [x2, y2] = sqXY(sq, RB_S)}
            <line {x1} {y1} {x2} {y2}
              stroke="rgba(0,0,0,0.35)" stroke-width="2" stroke-linecap="round" />
          {/each}
          {#each allStops as sq, i}
            {@const [x, y] = sqXY(sq, RB_S)}
            {@const isEnd = sq === puzzle.target}
            <circle cx={x} cy={y} r={RB_S * 0.3}
              fill={i === 0 || isEnd ? '#166534' : '#1e40af'}
              stroke="white" stroke-width="1.5" />
            <text x={x} y={y + 1} text-anchor="middle" dominant-baseline="central"
              font-size="9" fill="white" font-weight="bold" class="label">
              {i === 0 ? 'S' : i}
            </text>
          {/each}
        </svg>
      {/if}
      <button
        bind:this={newRouteEl}
        class="go-btn"
        onclick={newPuzzle}
      >
        New Route
      </button>
    </div>
  {/if}
</div>

<style>
  .container {
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

  .subtitle {
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

  .route-sq-target {
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

  .text-input {
    flex: 1;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--foreground);
    font-family: monospace;
    font-size: 1.125rem;
    text-align: center;
  }

  .text-input:focus {
    outline: none;
    border-color: rgba(255, 248, 230, 0.4);
  }

  .text-input::placeholder {
    color: var(--text-faint);
  }

  .go-btn {
    padding: 0.5rem 1rem;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .go-btn:hover {
    background: #15803d;
  }

  .impossible-btn {
    padding: 0.5rem 1.5rem;
    border-radius: 0.5rem;
    border: 2px solid #ef4444;
    background: transparent;
    color: #f87171;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .impossible-btn:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .error {
    color: #f87171;
    font-size: 0.875rem;
    font-weight: 500;
  }

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

  .route-board {
    width: 100%;
    max-width: 280px;
  }

  @media (min-width: 640px) {
    .route-board {
      max-width: 360px;
    }
  }

  .label {
    pointer-events: none;
    user-select: none;
  }
</style>
