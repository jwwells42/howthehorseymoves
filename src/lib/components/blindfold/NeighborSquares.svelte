<script lang="ts">
  import { createTimedRound } from '$lib/state/use-timed-round.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import TimedRound from './TimedRound.svelte';
  import AnswerInput from './AnswerInput.svelte';
  import ReviewCard from './ReviewCard.svelte';
  import ReviewGrid from './ReviewGrid.svelte';
  import { playSound } from '$lib/state/sound';
  import { MARK, highlight, type SquareHighlight } from '$lib/board-marks';

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

  /** The square asked about, and every answer square: found or missed. */
  function reviewMarks(attempt: Attempt): SquareHighlight[] {
    return [
      ...highlight([attempt.square], MARK.note),
      ...highlight(attempt.found, MARK.good),
      ...highlight(attempt.missed, MARK.danger),
    ];
  }

  let target = $state(randomSquare());
  let input = $state('');
  let entered = $state<string[]>([]);
  let error = $state<string | null>(null);

  let neighbors = $derived(getNeighbors(target));

  const round = createTimedRound<Attempt>({
    key: 'blindfold-neighbors',
    stars: [3, 5, 8],
    onStart: () => {
      target = randomSquare();
      entered = [];
      input = '';
      error = null;
    },
  });

  function advanceToNext(currentEntered: string[]) {
    const currentNeighbors = getNeighbors(target);
    const missed = currentNeighbors.filter((n) => !currentEntered.includes(n));
    const allCorrect = missed.length === 0;
    round.record({
      square: target,
      neighbors: currentNeighbors,
      found: currentEntered,
      missed,
      correct: allCorrect,
    });
    target = randomSquare();
    entered = [];
    error = null;
  }

  function handleSubmit() {
    if (!round.playing) return;
    const sq = input.trim().toLowerCase();
    input = '';

    if (!isValidSquare(sq)) {
      error = '✗';
      playSound('wrong');
      return;
    }

    if (entered.includes(sq)) {
      error = `${sq} ✓`;
      playSound('wrong');
      return;
    }

    if (!neighbors.includes(sq)) {
      error = `✗ ${sq}`;
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
    if (!round.playing) return;
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

<TimedRound {round} title="Neighbor Squares" counts="completed">
  {#snippet play()}
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
  {/snippet}

  {#snippet results()}
    {#if round.mistakes.length > 0}
      {@render review(`Incomplete (${round.mistakes.length})`, round.mistakes)}
    {/if}
    {#if round.history.length > 0}
      {@render review(`All squares (${round.history.length})`, round.history)}
    {/if}
  {/snippet}
</TimedRound>

<style>
  .progress {
    color: var(--ink-muted);
  }

  .target {
    font-size: 3rem;
    font-weight: var(--weight-strong);
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
    font-weight: var(--weight-strong);
  }

  .answer-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .correct { color: var(--correct-text); }
  .wrong { color: var(--wrong-text); }
  .muted { color: var(--ink-muted); }
</style>
