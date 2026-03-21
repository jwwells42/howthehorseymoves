<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';

  const GAME_DURATION = 30;
  const ALL_SQUARES: string[] = [];
  for (let f = 0; f < 8; f++) {
    for (let r = 1; r <= 8; r++) {
      ALL_SQUARES.push(String.fromCharCode(97 + f) + r);
    }
  }

  function isDark(sq: string): boolean {
    const file = sq.charCodeAt(0) - 97;
    const rank = parseInt(sq[1]) - 1;
    return (file + rank) % 2 === 0;
  }

  function randomSquare(): string {
    return ALL_SQUARES[Math.floor(Math.random() * ALL_SQUARES.length)];
  }

  function getStars(score: number): number {
    if (score >= 15) return 3;
    if (score >= 10) return 2;
    if (score >= 5) return 1;
    return 0;
  }

  const DARK_COLOR = '#2c2c2c';
  const LIGHT_COLOR = '#f0ead6';
  const BOARD_LIGHT = '#d4c4a0';
  const BOARD_DARK = '#7a9e6e';

  interface Attempt {
    square: string;
    dark: boolean;
    correct: boolean;
  }

  function miniHighlight(attempt: Attempt): string {
    if (attempt.dark && attempt.correct) return '#2a5a2a';
    if (attempt.dark && !attempt.correct) return '#5a2a2a';
    if (!attempt.dark && attempt.correct) return '#b8e0b8';
    return '#e0b8b8';
  }

  type GameState = 'idle' | 'playing' | 'done';

  let gameState = $state<GameState>('idle');
  let score = $state(0);
  let timeLeft = $state(GAME_DURATION);
  let target = $state(randomSquare());
  let flash = $state<'correct' | 'wrong' | null>(null);
  let bestScore = $state(0);
  let bestStars = $state(0);
  let history = $state<Attempt[]>([]);

  let timerRef: ReturnType<typeof setInterval> | null = null;
  let flashRef: ReturnType<typeof setTimeout> | null = null;

  let stars = $derived(getStars(score));
  let timerBarColor = $derived(
    timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#fb923c' : '#22c55e'
  );

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('blindfold-color-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('blindfold-color-best-stars') ?? '0', 10);

    return () => {
      if (timerRef) clearInterval(timerRef);
      if (flashRef) clearTimeout(flashRef);
    };
  });

  function startGame() {
    score = 0;
    timeLeft = GAME_DURATION;
    target = randomSquare();
    flash = null;
    history = [];
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

    const s = getStars(score);
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('blindfold-color-best', String(score));
    }
    if (s > bestStars) {
      bestStars = s;
      localStorage.setItem('blindfold-color-best-stars', String(s));
    }
  }

  function handleAnswer(answeredDark: boolean) {
    if (gameState !== 'playing') return;
    if (flashRef) clearTimeout(flashRef);

    const correct = isDark(target) === answeredDark;
    history = [...history, { square: target, dark: isDark(target), correct }];

    if (correct) {
      score += 1;
      flash = 'correct';
    } else {
      flash = 'wrong';
    }
    target = randomSquare();
    flashRef = setTimeout(() => { flash = null; }, 200);
  }

  const S = 10;
  const B = S * 8;

  function miniSquareCoords(sq: string): { f: number; svgR: number } {
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;
    return { f, svgR: 7 - r };
  }
</script>

<div class="trainer">
  {#if gameState === 'idle'}
    <div class="screen">
      <h2 class="title">Color of Square</h2>
      <p class="instructions">
        A square will appear. Click the correct color — dark or light. You have 30 seconds!
      </p>
      <div class="color-preview">
        <div class="preview-swatch dark-swatch"></div>
        <div class="preview-swatch light-swatch"></div>
      </div>
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

  {:else if gameState === 'playing'}
    <div class="timer-bar-track">
      <div
        class="timer-bar-fill"
        style="width: {(timeLeft / GAME_DURATION) * 100}%; background: {timerBarColor};"
      ></div>
    </div>

    <div class="hud">
      <span>Score: {score}</span>
      <span>{timeLeft}s</span>
    </div>

    <div
      class={['target-square', flash === 'correct' && 'flash-correct', flash === 'wrong' && 'flash-wrong']}
    >
      {target}
    </div>

    <div class="answer-buttons">
      <button
        class="color-btn dark-btn"
        onclick={() => handleAnswer(true)}
        aria-label="Dark square"
      ></button>
      <button
        class="color-btn light-btn"
        onclick={() => handleAnswer(false)}
        aria-label="Light square"
      ></button>
    </div>

  {:else}
    {@const wrongOnes = history.filter((a) => !a.correct)}

    <div class="screen">
      <h2 class="title">Time's up!</h2>
      <p class="final-score">{score}/{history.length} correct</p>
      {#if stars > 0}
        <StarRating stars={stars} size="lg" />
      {/if}
      {#if bestScore > 0}
        <p class="best-small">Personal best: {bestScore}</p>
      {/if}
      <button class="start-btn" onclick={startGame}>Play Again</button>

      {#if wrongOnes.length > 0}
        <div class="review-section">
          <h3 class="review-heading">Mistakes ({wrongOnes.length})</h3>
          <div class="mini-grid">
            {#each wrongOnes as attempt}
              {@const coords = miniSquareCoords(attempt.square)}
              {@const highlight = miniHighlight(attempt)}
              {@const borderColor = attempt.correct ? '#22c55e' : '#ef4444'}
              <div class="mini-item">
                <svg
                  viewBox="0 0 {B} {B}"
                  class="mini-svg"
                  style="border: 3px solid {borderColor}; border-radius: 4px;"
                >
                  {#each Array(8) as _, ri}
                    {#each Array(8) as _, fi}
                      {@const isLight = (fi + ri) % 2 === 0}
                      {@const isTarget = fi === coords.f && ri === coords.svgR}
                      <rect
                        x={fi * S}
                        y={ri * S}
                        width={S}
                        height={S}
                        fill={isTarget ? highlight : isLight ? BOARD_LIGHT : BOARD_DARK}
                      />
                    {/each}
                  {/each}
                </svg>
                <div class="mini-label">
                  <span class="mini-square">{attempt.square}</span><br />
                  <span class="text-red">{attempt.dark ? 'Dark' : 'Light'}
                    <span class="text-faint"> (you: {attempt.dark ? 'Light' : 'Dark'})</span>
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if history.length > 0}
        <div class="review-section">
          <h3 class="review-heading">All answers ({history.length})</h3>
          <div class="mini-grid">
            {#each history as attempt}
              {@const coords = miniSquareCoords(attempt.square)}
              {@const highlight = miniHighlight(attempt)}
              {@const borderColor = attempt.correct ? '#22c55e' : '#ef4444'}
              <div class="mini-item">
                <svg
                  viewBox="0 0 {B} {B}"
                  class="mini-svg"
                  style="border: 3px solid {borderColor}; border-radius: 4px;"
                >
                  {#each Array(8) as _, ri}
                    {#each Array(8) as _, fi}
                      {@const isLight = (fi + ri) % 2 === 0}
                      {@const isTarget = fi === coords.f && ri === coords.svgR}
                      <rect
                        x={fi * S}
                        y={ri * S}
                        width={S}
                        height={S}
                        fill={isTarget ? highlight : isLight ? BOARD_LIGHT : BOARD_DARK}
                      />
                    {/each}
                  {/each}
                </svg>
                <div class="mini-label">
                  <span class="mini-square">{attempt.square}</span><br />
                  <span class={attempt.correct ? 'text-green' : 'text-red'}>
                    {attempt.dark ? 'Dark' : 'Light'}
                    {#if !attempt.correct}
                      <span class="text-faint"> (you: {attempt.dark ? 'Light' : 'Dark'})</span>
                    {/if}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
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

  .screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    max-width: 42rem;
  }

  .title {
    font-size: 1.25rem;
    font-weight: bold;
  }

  .instructions {
    color: var(--text-muted);
  }

  .color-preview {
    display: flex;
    gap: 1rem;
  }

  .preview-swatch {
    width: 4rem;
    height: 4rem;
    border-radius: 0.5rem;
    border: 2px solid rgba(255, 248, 230, 0.2);
  }

  .dark-swatch {
    background-color: #2c2c2c;
  }

  .light-swatch {
    background-color: #f0ead6;
  }

  .best {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .best-small {
    font-size: 0.875rem;
    color: var(--text-faint);
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

  /* Timer */
  .timer-bar-track {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 9999px;
    overflow: hidden;
  }

  .timer-bar-fill {
    height: 100%;
    border-radius: 9999px;
    transition: width 1s linear, background 0.5s;
  }

  .hud {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  /* Target */
  .target-square {
    font-size: 3.75rem;
    font-weight: bold;
    padding: 2rem 0;
    transition: color 0.1s;
  }

  .target-square.flash-correct {
    color: #4ade80;
  }

  .target-square.flash-wrong {
    color: #ef4444;
  }

  /* Answer buttons */
  .answer-buttons {
    display: flex;
    gap: 1.5rem;
  }

  .color-btn {
    width: 7rem;
    height: 7rem;
    border-radius: 0.75rem;
    border: 4px solid rgba(255, 248, 230, 0.2);
    cursor: pointer;
    transition: border-color 0.15s, transform 0.1s;
  }

  .color-btn:hover {
    border-color: rgba(255, 248, 230, 0.5);
  }

  .color-btn:active {
    transform: scale(0.95);
  }

  .dark-btn {
    background-color: #2c2c2c;
  }

  .light-btn {
    background-color: #f0ead6;
  }

  /* Final score */
  .final-score {
    font-size: 1.875rem;
    font-weight: bold;
  }

  /* Review */
  .review-section {
    width: 100%;
    border-top: 1px solid rgba(255, 248, 230, 0.1);
    margin-top: 0.5rem;
    padding-top: 1rem;
  }

  .review-heading {
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

  .mini-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .mini-svg {
    width: 5rem;
    height: 5rem;
  }

  .mini-label {
    font-size: 0.75rem;
    text-align: center;
  }

  .mini-square {
    font-family: monospace;
    font-weight: bold;
  }

  .text-green {
    color: #4ade80;
  }

  .text-red {
    color: #ef4444;
  }

  .text-faint {
    color: var(--text-faint);
  }
</style>
