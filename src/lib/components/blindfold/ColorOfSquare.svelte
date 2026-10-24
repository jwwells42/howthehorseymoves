<script lang="ts">
  import { createTimedRound } from '$lib/state/use-timed-round.svelte';
  import TimedRound from './TimedRound.svelte';
  import ReviewCard from './ReviewCard.svelte';
  import ReviewGrid from './ReviewGrid.svelte';
  import { MARK, highlight } from '$lib/board-marks';

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

  interface Attempt {
    square: string;
    dark: boolean;
    correct: boolean;
  }

  let target = $state(randomSquare());

  const round = createTimedRound<Attempt>({
    key: 'blindfold-color',
    stars: [5, 10, 15],
    onStart: () => (target = randomSquare()),
  });

  function handleAnswer(answeredDark: boolean) {
    round.answer({ square: target, dark: isDark(target), correct: isDark(target) === answeredDark });
    target = randomSquare();
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

<TimedRound {round} title="Color of Square">
  {#snippet intro()}
    <div class="swatches">
      <div class="swatch dark"></div>
      <div class="swatch light"></div>
    </div>
  {/snippet}

  {#snippet play()}
    <div class={['target', round.flash]}>{target}</div>

    <div class="answers">
      <button class="swatch-button dark" onclick={() => handleAnswer(true)} aria-label="Dark square"></button>
      <button class="swatch-button light" onclick={() => handleAnswer(false)} aria-label="Light square"></button>
    </div>
  {/snippet}

  {#snippet results()}
    {#if round.mistakes.length > 0}
      {@render review(`Mistakes (${round.mistakes.length})`, round.mistakes)}
    {/if}
    {#if round.history.length > 0}
      {@render review(`All answers (${round.history.length})`, round.history)}
    {/if}
  {/snippet}
</TimedRound>

<style>
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

  .correct { color: var(--correct-text); }
  .wrong { color: var(--wrong-text); }
  .muted { color: var(--ink-muted); }
</style>
