<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';

  const KNIGHT_OFFSETS: [number, number][] = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];

  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';

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

  /* ── Board SVG helpers ─────────────────────────── */

  const S = 36;
  const B = S * 8;

  function sqXY(sq: string): [number, number] {
    const [f, r] = sqToFR(sq);
    return [f * S + S / 2, (7 - r) * S + S / 2];
  }

  /* ── State ─────────────────────────────────────── */

  let puzzle = $state(generatePuzzle());
  let route = $state<string[]>([]);
  let input = $state('');
  let error = $state<string | null>(null);
  let result = $state<'playing' | 'won'>('playing');
  let inputEl = $state<HTMLInputElement | null>(null);
  let newRouteEl = $state<HTMLButtonElement | null>(null);

  let currentSquare = $derived(route.length > 0 ? route[route.length - 1] : puzzle.start);
  let moveCount = $derived(route.length);
  let stars = $derived(getStars(moveCount, puzzle.optimal));
  let allStops = $derived([puzzle.start, ...route]);

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

    if (!isKnightMove(currentSquare, sq)) {
      error = `A knight can\u2019t reach ${sq} from ${currentSquare}.`;
      return;
    }

    if (puzzle.danger.has(sq)) {
      error = `${sq} is attacked by the queen! \u2620`;
      return;
    }

    error = null;
    route = [...route, sq];

    if (sq === puzzle.target) {
      result = 'won';
    }
  }

  function newPuzzle() {
    puzzle = generatePuzzle();
    route = [];
    input = '';
    error = null;
    result = 'playing';
  }

  function boardFill(sq: string, col: number, row: number): string {
    const isLight = (col + row) % 2 === 0;
    if (sq === puzzle.start || sq === puzzle.target) return '#4ade80';
    if (allStops.includes(sq)) return '#60a5fa';
    if (puzzle.danger.has(sq) && sq !== puzzle.queenSq) {
      return isLight ? '#e8c0c0' : '#b06060';
    }
    return isLight ? LIGHT : DARK;
  }
</script>

<div class="gauntlet">
  <div class="header">
    <h2 class="title">Knight Gauntlet</h2>
    <p class="description">
      Move the knight from <span class="bold">{puzzle.start}</span> to
      <span class="bold">{puzzle.target}</span> without landing on any square
      the queen on <span class="bold queen-sq">{puzzle.queenSq}</span> attacks.
    </p>
    <p class="optimal-info">
      Shortest safe path: {puzzle.optimal} moves
    </p>
  </div>

  <!-- Route display -->
  <div class="route-box">
    <span class="route-sq">{puzzle.start}</span>
    {#each route as sq, i}
      <span class="route-step">
        <span class="route-arrow">&rarr;</span>
        <span class={['route-sq', sq === puzzle.target && 'target-reached']}>{sq}</span>
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
        class="sq-input"
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
      <p class="result-text">Safe passage!</p>
      <p class="result-detail">{moveCount} moves (optimal: {puzzle.optimal})</p>
      <StarRating {stars} size="lg" />

      <!-- Post-game board -->
      <svg viewBox="{-14} {-2} {B + 28} {B + 16}" class="gauntlet-board" role="img" aria-label="Knight route on chess board">
        {#each Array(8) as _, i}
          <text x={-6} y={(7 - i) * S + S / 2 + 3}
            text-anchor="middle" font-size="8" fill="#888" class="label">{i + 1}</text>
        {/each}
        {#each Array(8) as _, i}
          <text x={i * S + S / 2} y={B + 10}
            text-anchor="middle" font-size="8" fill="#888" class="label">{String.fromCharCode(97 + i)}</text>
        {/each}
        {#each Array(8) as _, row}
          {#each Array(8) as _, col}
            {@const sq = frToSq(col, 7 - row)}
            <rect x={col * S} y={row * S} width={S} height={S} fill={boardFill(sq, col, row)} />
          {/each}
        {/each}
        <!-- Queen -->
        {#if puzzle.queenSq}
          {@const qxy = sqXY(puzzle.queenSq)}
          <image href="/pieces/bQ.svg"
            x={qxy[0] - S * 0.4} y={qxy[1] - S * 0.4}
            width={S * 0.8} height={S * 0.8} />
        {/if}
        <!-- Lines connecting stops -->
        {#each allStops.slice(1) as sq, i}
          {@const p1 = sqXY(allStops[i])}
          {@const p2 = sqXY(sq)}
          <line x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]}
            stroke="rgba(0,0,0,0.35)" stroke-width="2" stroke-linecap="round" />
        {/each}
        <!-- Numbered dots -->
        {#each allStops as sq, i}
          {@const xy = sqXY(sq)}
          {@const isEnd = sq === puzzle.target}
          <circle cx={xy[0]} cy={xy[1]} r={S * 0.3}
            fill={i === 0 || isEnd ? '#166534' : '#1e40af'}
            stroke="white" stroke-width="1.5" />
          <text x={xy[0]} y={xy[1] + 1} text-anchor="middle" dominant-baseline="central"
            font-size="9" fill="white" font-weight="bold" class="label">
            {i === 0 ? 'S' : i}
          </text>
        {/each}
      </svg>

      <button bind:this={newRouteEl} class="go-btn new-btn" onclick={newPuzzle}>
        New Gauntlet
      </button>
    </div>
  {/if}
</div>

<style>
  .gauntlet {
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
    font-weight: 700;
    margin: 0 0 0.5rem;
  }

  .description {
    color: var(--text-muted);
    margin: 0;
  }

  .bold {
    font-weight: 700;
  }

  .queen-sq {
    color: #f87171;
  }

  .optimal-info {
    font-size: 0.75rem;
    color: var(--text-faint);
    margin: 0.25rem 0 0;
  }

  .route-box {
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
    font-weight: 700;
  }

  .route-step {
    font-family: monospace;
  }

  .route-arrow {
    color: var(--text-faint);
    margin: 0 0.25rem;
  }

  .target-reached {
    color: #4ade80;
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }

  .sq-input {
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

  .sq-input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.4);
  }

  .go-btn {
    padding: 0.5rem 1rem;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .go-btn:hover {
    background: #15803d;
  }

  .new-btn {
    padding: 0.5rem 1.5rem;
  }

  .error {
    color: #f87171;
    font-size: 0.875rem;
    font-weight: 500;
    margin: 0;
  }

  .result-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    animation: fade-in 0.3s ease-out;
  }

  .result-text {
    font-weight: 700;
    font-size: 1.125rem;
    margin: 0;
  }

  .result-detail {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0;
  }

  .gauntlet-board {
    width: 100%;
    max-width: 280px;
  }

  @media (min-width: 640px) {
    .gauntlet-board {
      max-width: 360px;
    }
  }

  .label {
    pointer-events: none;
    user-select: none;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(0.5rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
