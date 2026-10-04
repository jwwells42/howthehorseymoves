<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import BestScore from '$lib/components/ui/BestScore.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import FinishActions from '$lib/components/curriculum/FinishActions.svelte';
  import Countdown from '$lib/components/ui/Countdown.svelte';
  import ReviewCard from './ReviewCard.svelte';
  import ReviewGrid from './ReviewGrid.svelte';
  import { playSound } from '$lib/state/sound';
  import { MARK, highlight, type SquareHighlight } from '$lib/board-marks';

  const GAME_DURATION = 30;

  interface Attempt {
    sq1: string;
    sq2: string;
    same: boolean;
    correct: boolean;
  }

  function areSameDiagonal(sq1: string, sq2: string): boolean {
    const df = Math.abs(sq1.charCodeAt(0) - sq2.charCodeAt(0));
    const dr = Math.abs(parseInt(sq1[1]) - parseInt(sq2[1]));
    return df === dr;
  }

  function generatePair(): { sq1: string; sq2: string; same: boolean } {
    const forceSame = Math.random() < 0.5;

    for (;;) {
      const f1 = Math.floor(Math.random() * 8);
      const r1 = Math.floor(Math.random() * 8);

      if (forceSame) {
        const dir1 = Math.random() < 0.5 ? 1 : -1;
        const dir2 = Math.random() < 0.5 ? 1 : -1;
        const dist = Math.floor(Math.random() * 7) + 1;
        const f2 = f1 + dir1 * dist;
        const r2 = r1 + dir2 * dist;
        if (f2 < 0 || f2 > 7 || r2 < 0 || r2 > 7) continue;
        return {
          sq1: String.fromCharCode(97 + f1) + (r1 + 1),
          sq2: String.fromCharCode(97 + f2) + (r2 + 1),
          same: true,
        };
      } else {
        const f2 = Math.floor(Math.random() * 8);
        const r2 = Math.floor(Math.random() * 8);
        if (f1 === f2 && r1 === r2) continue;
        const sq1 = String.fromCharCode(97 + f1) + (r1 + 1);
        const sq2 = String.fromCharCode(97 + f2) + (r2 + 1);
        if (areSameDiagonal(sq1, sq2)) continue;
        return { sq1, sq2, same: false };
      }
    }
  }

  function getStars(score: number): number {
    if (score >= 20) return 3;
    if (score >= 12) return 2;
    if (score >= 6) return 1;
    return 0;
  }

  function sqToCoords(sq: string): [number, number] {
    return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
  }

  type GameState = 'idle' | 'playing' | 'done';

  let gameState = $state<GameState>('idle');
  let score = $state(0);
  let timeLeft = $state(GAME_DURATION);
  let pair = $state(generatePair());
  let flash = $state<'correct' | 'wrong' | null>(null);
  let bestScore = $state(0);
  let bestStars = $state(0);
  let history = $state<Attempt[]>([]);

  let timerRef: ReturnType<typeof setInterval> | null = null;
  let flashRef: ReturnType<typeof setTimeout> | null = null;

  let stars = $derived(getStars(score));
  let mistakes = $derived(history.filter((a) => !a.correct));

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('blindfold-diagonal-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('blindfold-diagonal-best-stars') ?? '0', 10);

    return () => {
      if (timerRef) clearInterval(timerRef);
      if (flashRef) clearTimeout(flashRef);
    };
  });

  function startGame() {
    score = 0;
    timeLeft = GAME_DURATION;
    pair = generatePair();
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
      localStorage.setItem('blindfold-diagonal-best', String(score));
    }
    if (s > bestStars) {
      bestStars = s;
      localStorage.setItem('blindfold-diagonal-best-stars', String(s));
    }
  }

  function handleAnswer(answeredYes: boolean) {
    if (gameState !== 'playing') return;
    if (flashRef) clearTimeout(flashRef);

    const correct = pair.same === answeredYes;
    history = [...history, { sq1: pair.sq1, sq2: pair.sq2, same: pair.same, correct }];

    if (correct) {
      score += 1;
      flash = 'correct';
      playSound('correct');
    } else {
      flash = 'wrong';
      playSound('wrong');
    }
    pair = generatePair();
    flashRef = setTimeout(() => { flash = null; }, 200);
  }

  function getDiagonalSquares(attempt: Attempt): [number, number][] {
    if (!attempt.same) return [];
    const [f1, r1] = sqToCoords(attempt.sq1);
    const [f2, r2] = sqToCoords(attempt.sq2);
    const squares: [number, number][] = [];
    const df = f2 > f1 ? 1 : -1;
    const dr = r2 > r1 ? 1 : -1;
    let f = f1, r = r1;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      squares.push([f, r]);
      f += df;
      r += dr;
    }
    f = f1 - df;
    r = r1 - dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      squares.push([f, r]);
      f -= df;
      r -= dr;
    }
    return squares;
  }

  const squareName = ([file, row]: [number, number]) => 'abcdefgh'[file] + (8 - row);

  /** The two squares asked about, and the line they share if they share one. */
  function reviewMarks(attempt: Attempt): SquareHighlight[] {
    return [
      ...highlight([attempt.sq1, attempt.sq2], MARK.note),
      ...highlight(getDiagonalSquares(attempt).map(squareName), attempt.correct ? MARK.good : MARK.danger),
    ];
  }
</script>

{#snippet review(title: string, attempts: Attempt[])}
  <ReviewGrid {title}>
    {#each attempts as attempt}
      <ReviewCard correct={attempt.correct} highlights={reviewMarks(attempt)}>
        <strong>{attempt.sq1} — {attempt.sq2}</strong><br />
        <span class={attempt.correct ? 'correct' : 'wrong'}>{attempt.same ? 'Yes' : 'No'}</span>
        {#if !attempt.correct}
          <span class="muted">(you: {attempt.same ? 'No' : 'Yes'})</span>
        {/if}
      </ReviewCard>
    {/each}
  </ReviewGrid>
{/snippet}

<div class="trainer">
  {#if gameState === 'idle'}
    <div class="screen">
      <h2>Same Diagonal?</h2>
      <p class="instructions">Two squares will appear. Are they on the same diagonal? You have 30 seconds!</p>
      <BestScore score={bestScore} stars={bestStars} />
      <Button variant="primary" size="large" onclick={startGame}>Start</Button>
    </div>

  {:else if gameState === 'playing'}
    <Countdown remaining={timeLeft} total={GAME_DURATION}>Score: {score}</Countdown>

    <div class={['target', flash]}>{pair.sq1} &mdash; {pair.sq2}</div>

    <div class="answers">
      <Button size="large" onclick={() => handleAnswer(true)}>Yes</Button>
      <Button size="large" onclick={() => handleAnswer(false)}>No</Button>
    </div>

  {:else}
    <div class="screen">
      <h2>Time's up!</h2>
      <p class="final-score">{score}/{history.length} correct</p>
      {#if stars > 0}
        <StarRating {stars} size="lg" />
      {/if}
      <BestScore score={bestScore} />
      <FinishActions label="Play Again" onclick={startGame} />

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

  .target {
    font-size: 3rem;
    font-weight: var(--weight-strong);
    padding: 2rem 0;
    transition: color 0.1s;
  }

  .answers {
    display: flex;
    gap: 1rem;
  }

  .final-score {
    font-size: var(--size-title);
    font-weight: var(--weight-strong);
  }

  .correct { color: var(--correct-text); }
  .wrong { color: var(--wrong-text); }
  .muted { color: var(--ink-muted); }
</style>
