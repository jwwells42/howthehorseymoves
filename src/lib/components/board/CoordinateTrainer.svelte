<script lang="ts">
  import { onMount } from 'svelte';
  import { FILES, RANKS, type SquareId } from '$lib/logic/types';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { playSound } from '$lib/state/sound';

  const SQUARE_SIZE = 100;
  const BOARD_SIZE = SQUARE_SIZE * 8;
  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';
  const CORRECT_COLOR = '#4ade80';
  const WRONG_COLOR = '#ef4444';
  const GAME_DURATION = 30;

  const ALL_SQUARES: SquareId[] = [];
  for (const f of FILES) {
    for (const r of RANKS) {
      ALL_SQUARES.push(`${f}${r}` as SquareId);
    }
  }

  function randomSquare(exclude?: SquareId): SquareId {
    let sq: SquareId;
    do {
      sq = ALL_SQUARES[Math.floor(Math.random() * 64)];
    } while (sq === exclude);
    return sq;
  }

  function scoreToStars(score: number): number {
    if (score >= 10) return 3;
    if (score >= 5) return 2;
    if (score >= 3) return 1;
    return 0;
  }

  type GameState = 'idle' | 'playing' | 'done';

  let gameState = $state<GameState>('idle');
  let target = $state<SquareId>(randomSquare());
  let score = $state(0);
  let timeLeft = $state(GAME_DURATION);
  let flashSquare = $state<SquareId | null>(null);
  let flashColor = $state('');
  let bestScore = $state(0);
  let bestStars = $state(0);

  let timerRef: ReturnType<typeof setInterval> | null = null;
  let flashRef: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('coord-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('coord-best-stars') ?? '0', 10);

    return () => {
      if (timerRef) clearInterval(timerRef);
      if (flashRef) clearTimeout(flashRef);
    };
  });

  function startGame() {
    score = 0;
    timeLeft = GAME_DURATION;
    target = randomSquare();
    flashSquare = null;
    gameState = 'playing';

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

    const stars = scoreToStars(score);
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('coord-best', String(score));
    }
    if (stars > bestStars) {
      bestStars = stars;
      localStorage.setItem('coord-best-stars', String(stars));
    }
    if (stars > 0) playSound('stars');
  }

  function handleSquareClick(sq: SquareId) {
    if (gameState !== 'playing') return;

    if (flashRef) clearTimeout(flashRef);

    if (sq === target) {
      flashSquare = sq;
      flashColor = CORRECT_COLOR;
      score += 1;
      target = randomSquare(target);
      playSound('correct');
    } else {
      flashSquare = sq;
      flashColor = WRONG_COLOR;
      playSound('wrong');
    }

    flashRef = setTimeout(() => {
      flashSquare = null;
    }, 200);
  }

  function squareColor(fileIdx: number, rankIdx: number): string {
    return (fileIdx + rankIdx) % 2 === 0 ? LIGHT : DARK;
  }

  function timerBarColor(t: number): string {
    if (t > 20) return '#4ade80';
    if (t > 10) return '#facc15';
    return '#ef4444';
  }

  const DISPLAY_RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
</script>

<div class="trainer">
  {#if gameState === 'idle'}
    <div class="start-screen">
      <p class="instructions">Click the correct square as fast as you can!</p>
      <div class="thresholds">
        <span class="threshold"><StarRating stars={1} size="sm" /> 3 correct</span>
        <span class="threshold"><StarRating stars={2} size="sm" /> 5 correct</span>
        <span class="threshold"><StarRating stars={3} size="sm" /> 10 correct</span>
      </div>
      {#if bestScore > 0}
        <p class="best">Best: {bestScore} <StarRating stars={bestStars} size="sm" /></p>
      {/if}
      <button class="start-btn" onclick={startGame}>Start</button>
    </div>
  {:else if gameState === 'playing'}
    <div class="hud">
      <div class="score">Score: {score}</div>
      <div class="timer">{timeLeft}s</div>
    </div>
    <div class="timer-bar-track">
      <div
        class="timer-bar-fill"
        style="width: {(timeLeft / GAME_DURATION) * 100}%; background: {timerBarColor(timeLeft)};"
      ></div>
    </div>
  {:else}
    <div class="done-screen">
      <div class="final-score">{score}</div>
      <StarRating stars={scoreToStars(score)} size="lg" />
      <div class="thresholds done-thresholds">
        <span class={['threshold', score >= 3 && 'achieved']}><StarRating stars={1} size="sm" /> 3</span>
        <span class={['threshold', score >= 5 && 'achieved']}><StarRating stars={2} size="sm" /> 5</span>
        <span class={['threshold', score >= 10 && 'achieved']}><StarRating stars={3} size="sm" /> 10</span>
      </div>
      {#if bestScore > 0}
        <p class="best">Best: {bestScore} <StarRating stars={bestStars} size="sm" /></p>
      {/if}
      <button class="start-btn" onclick={startGame}>Play Again</button>
      <a href="/setup" class="setup-link">Place the Pieces! &rarr;</a>
    </div>
  {/if}

  <div class="board-wrapper">
    <svg
      viewBox="0 0 {BOARD_SIZE} {BOARD_SIZE}"
      class="board-svg"
      xmlns="http://www.w3.org/2000/svg"
      role="application"
      aria-label="Chess board"
      tabindex="-1"
    >
      {#each FILES as file, fi}
        {#each DISPLAY_RANKS as rank, ri}
          {@const sq = `${file}${rank}` as SquareId}
          {@const x = fi * SQUARE_SIZE}
          {@const y = ri * SQUARE_SIZE}
          {@const fill =
            flashSquare === sq ? flashColor : squareColor(fi, ri)}
          <rect
            {x}
            {y}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            {fill}
            onclick={() => handleSquareClick(sq)}
            onkeydown={() => {}}
            role="button"
            tabindex="-1"
            aria-label={sq}
            style="cursor: {gameState === 'playing' ? 'pointer' : 'default'}"
          />
        {/each}
      {/each}

      <!-- File labels (a-h along bottom) -->
      {#each FILES as file, fi}
        <text
          x={fi * SQUARE_SIZE + SQUARE_SIZE / 2}
          y={BOARD_SIZE - 6}
          text-anchor="middle"
          font-size="14"
          font-weight="bold"
          fill={fi % 2 === 0 ? DARK : LIGHT}
          class="label"
        >{file}</text>
      {/each}

      <!-- Rank labels (1-8 along left) -->
      {#each DISPLAY_RANKS as rank, ri}
        <text
          x={6}
          y={ri * SQUARE_SIZE + 16}
          font-size="14"
          font-weight="bold"
          fill={ri % 2 === 0 ? DARK : LIGHT}
          class="label"
        >{rank}</text>
      {/each}

      <!-- Big coordinate text in center -->
      {#if gameState === 'playing'}
        <text
          x={BOARD_SIZE / 2}
          y={BOARD_SIZE / 2}
          text-anchor="middle"
          dominant-baseline="central"
          font-size="160"
          font-weight="bold"
          fill="white"
          opacity="0.85"
          class="label"
        >{target}</text>
      {/if}
    </svg>
  </div>
</div>

<style>
  .trainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    flex: 1;
    min-height: 0;
    width: 100%;
  }

  .board-wrapper {
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .board-svg {
    max-width: 100%;
    max-height: 100%;
    aspect-ratio: 1;
    display: block;
    border-radius: 4px;
    touch-action: none;
  }

  .label {
    pointer-events: none;
    user-select: none;
  }

  /* HUD */
  .hud {
    display: flex;
    justify-content: space-between;
    width: 100%;
    flex-shrink: 0;
    font-size: 1.25rem;
    font-weight: bold;
  }

  .timer-bar-track {
    width: 100%;
    flex-shrink: 0;
    height: 8px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    overflow: hidden;
  }

  .timer-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 1s linear, background 0.5s;
  }

  @media (max-height: 480px) {
    .trainer { gap: 0.25rem; }
  }

  /* Start / Done screens */
  .start-screen,
  .done-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .instructions {
    color: var(--text-muted);
    font-size: 1rem;
  }

  .thresholds {
    display: flex;
    gap: 1.25rem;
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .threshold {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .done-thresholds .threshold {
    opacity: 0.4;
  }

  .done-thresholds .threshold.achieved {
    opacity: 1;
    color: var(--foreground);
  }

  .best {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .final-score {
    font-size: 3rem;
    font-weight: bold;
  }

  .start-btn {
    padding: 0.75rem 2.5rem;
    font-size: 1.125rem;
    font-weight: bold;
    border: none;
    border-radius: 0.5rem;
    background: rgba(255, 248, 230, 0.15);
    color: var(--foreground);
    cursor: pointer;
    transition: background 0.15s;
  }

  .start-btn:hover {
    background: rgba(255, 248, 230, 0.25);
  }

  .setup-link {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .setup-link:hover {
    color: var(--foreground);
  }

  .score {
    color: var(--foreground);
  }

  .timer {
    color: var(--foreground);
  }
</style>
