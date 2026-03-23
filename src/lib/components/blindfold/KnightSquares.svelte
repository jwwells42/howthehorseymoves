<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';

  const GAME_DURATION = 30;
  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';

  interface Attempt {
    square: string;
    reachable: string[];
    found: string[];
    missed: string[];
    correct: boolean;
  }

  function getKnightSquares(sq: string): string[] {
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;
    const squares: string[] = [];
    for (const [df, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const nf = f + df, nr = r + dr;
      if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
        squares.push(String.fromCharCode(97 + nf) + (nr + 1));
      }
    }
    return squares.sort();
  }

  function randomSquare(): string {
    const f = Math.floor(Math.random() * 8);
    const r = Math.floor(Math.random() * 8);
    return String.fromCharCode(97 + f) + (r + 1);
  }

  function isValidSquare(sq: string): boolean {
    if (sq.length !== 2) return false;
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;
    return f >= 0 && f <= 7 && r >= 0 && r <= 7;
  }

  function getStars(score: number): number {
    if (score >= 6) return 3;
    if (score >= 4) return 2;
    if (score >= 2) return 1;
    return 0;
  }

  function sqToCoords(sq: string): [number, number] {
    return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
  }

  // Mini board constants
  const MB_S = 10;
  const MB_B = MB_S * 8;

  function getMiniBoardFill(attempt: Attempt, fi: number, ri: number): string {
    const [cf, cr] = sqToCoords(attempt.square);
    const sqName = String.fromCharCode(97 + fi) + (8 - ri);
    const isCenter = fi === cf && ri === cr;
    const isFound = attempt.found.includes(sqName);
    const isMissed = attempt.missed.includes(sqName);
    const isLight = (fi + ri) % 2 === 0;

    if (isCenter) return '#5b9bd5';
    if (isFound) return '#a3d9a3';
    if (isMissed) return '#f0a0a0';
    return isLight ? LIGHT : DARK;
  }

  let gameState = $state<'idle' | 'playing' | 'done'>('idle');
  let score = $state(0);
  let timeLeft = $state(GAME_DURATION);
  let target = $state(randomSquare());
  let input = $state('');
  let entered = $state<string[]>([]);
  let error = $state<string | null>(null);
  let bestScore = $state(0);
  let bestStars = $state(0);
  let history = $state<Attempt[]>([]);
  let inputEl = $state<HTMLInputElement | null>(null);

  let timerRef: ReturnType<typeof setInterval> | null = null;

  let reachable = $derived(getKnightSquares(target));
  let stars = $derived(getStars(score));
  let timerColor = $derived(timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#fb923c' : '#22c55e');
  let wrongOnes = $derived(history.filter((a) => !a.correct));

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('blindfold-knightsquares-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('blindfold-knightsquares-best-stars') ?? '0', 10);

    return () => {
      if (timerRef) clearInterval(timerRef);
    };
  });

  $effect(() => {
    if (gameState === 'playing') {
      inputEl?.focus();
    }
  });

  function startGame() {
    gameState = 'playing';
    score = 0;
    timeLeft = GAME_DURATION;
    target = randomSquare();
    entered = [];
    input = '';
    error = null;
    history = [];

    if (timerRef) clearInterval(timerRef);
    timerRef = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  function endGame() {
    if (timerRef) {
      clearInterval(timerRef);
      timerRef = null;
    }
    gameState = 'done';

    const s = getStars(score);
    if (score > bestScore) {
      localStorage.setItem('blindfold-knightsquares-best', String(score));
      bestScore = score;
    }
    if (s > bestStars) {
      localStorage.setItem('blindfold-knightsquares-best-stars', String(s));
      bestStars = s;
    }
  }

  function advanceToNext(currentEntered: string[]) {
    const currentReachable = getKnightSquares(target);
    const missed = currentReachable.filter((n) => !currentEntered.includes(n));
    const allCorrect = missed.length === 0;
    history = [...history, {
      square: target,
      reachable: currentReachable,
      found: currentEntered,
      missed,
      correct: allCorrect,
    }];
    if (allCorrect) score += 1;
    target = randomSquare();
    entered = [];
    error = null;
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (gameState !== 'playing') return;
    const sq = input.trim().toLowerCase();
    input = '';

    if (!isValidSquare(sq)) {
      error = 'Not a valid square.';
      return;
    }

    if (entered.includes(sq)) {
      error = 'Already entered.';
      return;
    }

    if (!reachable.includes(sq)) {
      error = `${sq} is not a knight move from ${target}.`;
      return;
    }

    error = null;
    const newEntered = [...entered, sq];
    entered = newEntered;

    if (newEntered.length === reachable.length) {
      advanceToNext(newEntered);
    }
  }

  function handleSkip() {
    if (gameState !== 'playing') return;
    advanceToNext(entered);
  }
</script>

<div class="container">
  {#if gameState === 'idle'}
    <div class="center-col">
      <h2 class="title">Knight Squares</h2>
      <p class="subtitle">
        A square appears. Type every square a knight could jump to from there. Find them all, then the next square appears. You have 30 seconds!
      </p>
      {#if bestScore > 0}
        <div class="best">
          Best: {bestScore}
          {#if bestStars > 0}
            <StarRating stars={bestStars} size="sm" />
          {/if}
        </div>
      {/if}
      <button class="start-btn" onclick={startGame}>Start</button>
    </div>
  {:else if gameState === 'done'}
    <div class="center-col">
      <h2 class="title">Time's up!</h2>
      <p class="big-score">{score} completed</p>
      {#if stars > 0}
        <StarRating {stars} size="lg" />
      {/if}
      {#if bestScore > 0}
        <p class="best-text">Personal best: {bestScore}</p>
      {/if}
      <button class="start-btn" onclick={startGame}>Play Again</button>

      {#if wrongOnes.length > 0}
        <div class="section-divider">
          <h3 class="section-title">Incomplete ({wrongOnes.length})</h3>
          <div class="mini-grid">
            {#each wrongOnes as attempt}
              <div class="mini-board-wrap">
                <svg
                  viewBox="0 0 {MB_B} {MB_B}"
                  class="mini-board"
                  style="border-color: {attempt.correct ? '#22c55e' : '#ef4444'};"
                >
                  {#each Array(8) as _, ri}
                    {#each Array(8) as _, fi}
                      <rect
                        x={fi * MB_S} y={ri * MB_S}
                        width={MB_S} height={MB_S}
                        fill={getMiniBoardFill(attempt, fi, ri)}
                      />
                    {/each}
                  {/each}
                </svg>
                <div class="mini-label">
                  <span class="mono bold">{attempt.square}</span>
                  <br />
                  <span class="text-red">
                    {attempt.found.length}/{attempt.reachable.length}
                    {#if attempt.missed.length > 0}
                      <span class="faint"> missed: {attempt.missed.join(', ')}</span>
                    {/if}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if history.length > 0}
        <div class="section-divider">
          <h3 class="section-title">All squares ({history.length})</h3>
          <div class="mini-grid">
            {#each history as attempt}
              <div class="mini-board-wrap">
                <svg
                  viewBox="0 0 {MB_B} {MB_B}"
                  class="mini-board"
                  style="border-color: {attempt.correct ? '#22c55e' : '#ef4444'};"
                >
                  {#each Array(8) as _, ri}
                    {#each Array(8) as _, fi}
                      <rect
                        x={fi * MB_S} y={ri * MB_S}
                        width={MB_S} height={MB_S}
                        fill={getMiniBoardFill(attempt, fi, ri)}
                      />
                    {/each}
                  {/each}
                </svg>
                <div class="mini-label">
                  <span class="mono bold">{attempt.square}</span>
                  <br />
                  <span class={attempt.correct ? 'text-green' : 'text-red'}>
                    {attempt.found.length}/{attempt.reachable.length}
                    {#if attempt.missed.length > 0}
                      <span class="faint"> missed: {attempt.missed.join(', ')}</span>
                    {/if}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Playing state -->
    <div class="timer-bar-track">
      <div
        class="timer-bar-fill"
        style="width: {(timeLeft / GAME_DURATION) * 100}%; background: {timerColor};"
      ></div>
    </div>

    <div class="hud">
      <span>Completed: {score}</span>
      <span>{timeLeft}s</span>
    </div>

    <div class="target-square">{target}</div>
    <div class="progress-label">
      {entered.length}/{reachable.length} knight moves found
    </div>

    {#if entered.length > 0}
      <div class="entered-list">
        {#each entered as sq}
          <span class="entered-tag">{sq}</span>
        {/each}
      </div>
    {/if}

    <div class="input-area">
      <form class="input-row" onsubmit={handleSubmit}>
        <input
          bind:this={inputEl}
          type="text"
          bind:value={input}
          placeholder="Square..."
          maxlength={2}
          class="text-input"
          autocomplete="off"
          autocapitalize="off"
        />
        <button type="submit" class="go-btn">Go</button>
      </form>
      <button class="skip-btn" onclick={handleSkip}>
        Skip
      </button>
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}
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

  .center-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    max-width: 42rem;
    margin: 0 auto;
  }

  .title {
    font-size: 1.25rem;
    font-weight: bold;
  }

  .subtitle {
    color: var(--text-muted);
  }

  .best {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .best-text {
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .big-score {
    font-size: 1.875rem;
    font-weight: bold;
  }

  .start-btn {
    padding: 0.75rem 2rem;
    font-size: 1.125rem;
    font-weight: bold;
    border: none;
    border-radius: 0.5rem;
    background: #16a34a;
    color: white;
    cursor: pointer;
    transition: background 0.15s;
  }

  .start-btn:hover {
    background: #15803d;
  }

  .timer-bar-track {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 9999px;
    overflow: hidden;
  }

  .timer-bar-fill {
    height: 100%;
    transition: width 1s linear, background 0.5s;
  }

  .hud {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .target-square {
    font-size: 3rem;
    font-weight: bold;
    padding: 1rem 0;
  }

  .progress-label {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .entered-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .entered-tag {
    padding: 0.25rem 0.5rem;
    background: rgba(22, 163, 74, 0.2);
    color: #4ade80;
    border-radius: 0.25rem;
    font-family: monospace;
    font-size: 0.875rem;
    font-weight: bold;
  }

  .input-area {
    display: flex;
    gap: 0.5rem;
    width: 100%;
    max-width: 240px;
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
    flex: 1;
  }

  .text-input {
    flex: 1;
    padding: 0.5rem 0.75rem;
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
    padding: 0.5rem 0.75rem;
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

  .skip-btn {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: transparent;
    color: var(--text-faint);
    font-size: 0.875rem;
    cursor: pointer;
    transition: color 0.15s;
  }

  .skip-btn:hover {
    color: var(--foreground);
  }

  .error {
    color: #f87171;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .section-divider {
    width: 100%;
    border-top: 1px solid rgba(255, 248, 230, 0.1);
    margin-top: 0.5rem;
    padding-top: 1rem;
  }

  .section-title {
    font-weight: bold;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
  }

  .mini-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    justify-items: center;
  }

  @media (min-width: 640px) {
    .mini-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .mini-board-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .mini-board {
    width: 5rem;
    height: 5rem;
    border: 3px solid;
    border-radius: 4px;
  }

  .mini-label {
    font-size: 0.75rem;
    text-align: center;
  }

  .mono {
    font-family: monospace;
  }

  .bold {
    font-weight: bold;
  }

  .text-green {
    color: #4ade80;
  }

  .text-red {
    color: #f87171;
  }

  .faint {
    color: var(--text-faint);
  }
</style>
