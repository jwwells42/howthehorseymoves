<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import BestScore from '$lib/components/ui/BestScore.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Countdown from '$lib/components/ui/Countdown.svelte';
  import AnswerInput from './AnswerInput.svelte';
  import ReviewCard from './ReviewCard.svelte';
  import ReviewGrid from './ReviewGrid.svelte';
  import { playSound } from '$lib/state/sound';
  import { MARK, highlight, type SquareHighlight } from '$lib/board-marks';

  const GAME_DURATION = 30;

  interface Attempt {
    square: string;
    neighbors: string[];
    found: string[];
    missed: string[];
    correct: boolean;
  }

  function getNeighbors(sq: string): string[] {
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;
    const neighbors: string[] = [];
    for (const [df, dr] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const nf = f + df, nr = r + dr;
      if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
        neighbors.push(String.fromCharCode(97 + nf) + (nr + 1));
      }
    }
    return neighbors.sort();
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
    if (score >= 8) return 3;
    if (score >= 5) return 2;
    if (score >= 3) return 1;
    return 0;
  }

  /** The square asked about, and every answer square: found or missed. */
  function reviewMarks(attempt: Attempt): SquareHighlight[] {
    return [
      ...highlight([attempt.square], MARK.note),
      ...highlight(attempt.found, MARK.good),
      ...highlight(attempt.missed, MARK.danger),
    ];
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

  let timerRef: ReturnType<typeof setInterval> | null = null;

  let neighbors = $derived(getNeighbors(target));
  let stars = $derived(getStars(score));
  let mistakes = $derived(history.filter((a) => !a.correct));

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('blindfold-neighbors-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('blindfold-neighbors-best-stars') ?? '0', 10);

    return () => {
      if (timerRef) clearInterval(timerRef);
    };
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
    if (s > 0) playSound('stars');
    if (score > bestScore) {
      localStorage.setItem('blindfold-neighbors-best', String(score));
      bestScore = score;
    }
    if (s > bestStars) {
      localStorage.setItem('blindfold-neighbors-best-stars', String(s));
      bestStars = s;
    }
  }

  function advanceToNext(currentEntered: string[]) {
    const currentNeighbors = getNeighbors(target);
    const missed = currentNeighbors.filter((n) => !currentEntered.includes(n));
    const allCorrect = missed.length === 0;
    history = [...history, {
      square: target,
      neighbors: currentNeighbors,
      found: currentEntered,
      missed,
      correct: allCorrect,
    }];
    if (allCorrect) score += 1;
    target = randomSquare();
    entered = [];
    error = null;
  }

  function handleSubmit() {
    if (gameState !== 'playing') return;
    const sq = input.trim().toLowerCase();
    input = '';

    if (!isValidSquare(sq)) {
      error = 'Not a valid square.';
      playSound('wrong');
      return;
    }

    if (entered.includes(sq)) {
      error = 'Already entered.';
      playSound('wrong');
      return;
    }

    if (!neighbors.includes(sq)) {
      error = `${sq} is not adjacent to ${target}.`;
      playSound('wrong');
      return;
    }

    error = null;
    const newEntered = [...entered, sq];
    entered = newEntered;
    playSound('correct');

    if (newEntered.length === neighbors.length) {
      advanceToNext(newEntered);
    }
  }

  function handleSkip() {
    if (gameState !== 'playing') return;
    advanceToNext(entered);
  }
</script>

{#snippet review(title: string, attempts: Attempt[])}
  <ReviewGrid {title}>
    {#each attempts as attempt}
      <ReviewCard correct={attempt.correct} highlights={reviewMarks(attempt)}>
        <strong>{attempt.square}</strong><br />
        <span class={attempt.correct ? 'correct' : 'wrong'}>{attempt.found.length}/{attempt.neighbors.length}</span>
        {#if attempt.missed.length > 0}
          <span class="muted">missed: {attempt.missed.join(', ')}</span>
        {/if}
      </ReviewCard>
    {/each}
  </ReviewGrid>
{/snippet}

<div class="trainer">
  {#if gameState === 'idle'}
    <div class="screen">
      <h2>Neighbor Squares</h2>
      <p class="instructions">A square appears. Type all adjacent squares (where a king could move). Find them all, then the next square appears. You have 30 seconds!</p>
      <BestScore score={bestScore} stars={bestStars} />
      <Button variant="primary" size="large" onclick={startGame}>Start</Button>
    </div>

  {:else if gameState === 'done'}
    <div class="screen">
      <h2>Time's up!</h2>
      <p class="final-score">{score} completed</p>
      {#if stars > 0}
        <StarRating {stars} size="lg" />
      {/if}
      <BestScore score={bestScore} />
      <Button variant="primary" size="large" onclick={startGame}>Play Again</Button>

      {#if mistakes.length > 0}
        {@render review(`Incomplete (${mistakes.length})`, mistakes)}
      {/if}
      {#if history.length > 0}
        {@render review(`All squares (${history.length})`, history)}
      {/if}
    </div>

  {:else}
    <Countdown remaining={timeLeft} total={GAME_DURATION}>Completed: {score}</Countdown>

    <div class="target">{target}</div>
    <p class="progress">{entered.length}/{neighbors.length} neighbors found</p>

    {#if entered.length > 0}
      <ul class="entered">
        {#each entered as sq}
          <li>{sq}</li>
        {/each}
      </ul>
    {/if}

    <div class="answer-row">
      <AnswerInput bind:value={input} onsubmit={handleSubmit} label="Square" placeholder="Square..." {error} />
      <Button onclick={handleSkip}>Skip</Button>
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

  .instructions,
  .progress {
    color: var(--ink-muted);
  }

  .target {
    font-size: 3rem;
    font-weight: bold;
  }

  .entered {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    list-style: none;
  }
  .entered li {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    background: var(--correct-tint);
    color: var(--correct-text);
    font-weight: bold;
  }

  .answer-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .final-score {
    font-size: var(--size-title);
    font-weight: bold;
  }

  .correct { color: var(--correct-text); }
  .wrong { color: var(--wrong-text); }
  .muted { color: var(--ink-muted); }
</style>
