<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import BestScore from '$lib/components/ui/BestScore.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Countdown from '$lib/components/ui/Countdown.svelte';
  import ReviewCard from './ReviewCard.svelte';
  import ReviewGrid from './ReviewGrid.svelte';
  import { playSound } from '$lib/state/sound';
  import { MARK, highlight } from '$lib/board-marks';

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

  interface Attempt {
    square: string;
    dark: boolean;
    correct: boolean;
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
  let mistakes = $derived(history.filter((a) => !a.correct));

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
    if (s > 0) playSound('stars');
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
      playSound('correct');
    } else {
      flash = 'wrong';
      playSound('wrong');
    }
    target = randomSquare();
    flashRef = setTimeout(() => { flash = null; }, 200);
  }

  const colourName = (dark: boolean) => (dark ? 'Dark' : 'Light');
</script>

{#snippet review(title: string, attempts: Attempt[])}
  <ReviewGrid {title}>
    {#each attempts as attempt}
      <!-- A ring, so the square's own colour shows: that is the answer. -->
      <ReviewCard correct={attempt.correct} highlights={highlight([attempt.square], MARK.note, 'ring')}>
        <strong>{attempt.square}</strong><br />
        <span class={attempt.correct ? 'correct' : 'wrong'}>{colourName(attempt.dark)}</span>
        {#if !attempt.correct}
          <span class="muted">(you: {colourName(!attempt.dark)})</span>
        {/if}
      </ReviewCard>
    {/each}
  </ReviewGrid>
{/snippet}

<div class="trainer">
  {#if gameState === 'idle'}
    <div class="screen">
      <h2>Color of Square</h2>
      <p class="instructions">
        A square will appear. Click the correct color — dark or light. You have 30 seconds!
      </p>
      <div class="swatches">
        <div class="swatch dark"></div>
        <div class="swatch light"></div>
      </div>
      <BestScore score={bestScore} stars={bestStars} />
      <Button variant="primary" size="large" onclick={startGame}>Start</Button>
    </div>

  {:else if gameState === 'playing'}
    <Countdown remaining={timeLeft} total={GAME_DURATION}>Score: {score}</Countdown>

    <div class={['target', flash]}>{target}</div>

    <div class="answers">
      <button class="swatch-button dark" onclick={() => handleAnswer(true)} aria-label="Dark square"></button>
      <button class="swatch-button light" onclick={() => handleAnswer(false)} aria-label="Light square"></button>
    </div>

  {:else}
    <div class="screen">
      <h2>Time's up!</h2>
      <p class="final-score">{score}/{history.length} correct</p>
      {#if stars > 0}
        <StarRating {stars} size="lg" />
      {/if}
      <BestScore score={bestScore} />
      <Button variant="primary" size="large" onclick={startGame}>Play Again</Button>

      {#if mistakes.length > 0}
        {@render review(`Mistakes (${mistakes.length})`, mistakes)}
      {/if}
      {#if history.length > 0}
        {@render review(`All answers (${history.length})`, history)}
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
  }

  .instructions {
    color: var(--ink-muted);
  }

  /* The answer buttons are the board's own two square colours. */
  .dark { background: var(--board-dark); }
  .light { background: var(--board-light); }

  .swatches {
    display: flex;
    gap: 1rem;
  }
  .swatch {
    width: 4rem;
    height: 4rem;
    border-radius: 0.5rem;
    border: 2px solid var(--line);
  }

  .target {
    font-size: 3.75rem;
    font-weight: var(--weight-strong);
    padding: 2rem 0;
    transition: color 0.1s;
  }
  .target.correct { color: var(--correct-text); }
  .target.wrong { color: var(--wrong-text); }

  .answers {
    display: flex;
    gap: 1.5rem;
  }
  .swatch-button {
    width: 7rem;
    height: 7rem;
    border-radius: 0.75rem;
    border: 4px solid var(--line);
    cursor: pointer;
    transition: border-color 0.15s, transform 0.1s;
  }
  .swatch-button:hover {
    border-color: var(--ink);
  }
  .swatch-button:active {
    transform: scale(0.95);
  }

  .final-score {
    font-size: var(--size-title);
    font-weight: var(--weight-strong);
  }

  .correct { color: var(--correct-text); }
  .wrong { color: var(--wrong-text); }
  .muted { color: var(--ink-muted); }
</style>
