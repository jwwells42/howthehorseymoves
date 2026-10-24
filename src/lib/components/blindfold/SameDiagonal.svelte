<script lang="ts">
  import { createTimedRound } from '$lib/state/use-timed-round.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import TimedRound from './TimedRound.svelte';
  import ReviewCard from './ReviewCard.svelte';
  import ReviewGrid from './ReviewGrid.svelte';
  import { MARK, highlight, type SquareHighlight } from '$lib/board-marks';

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

  function sqToCoords(sq: string): [number, number] {
    return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
  }

  let pair = $state(generatePair());

  const round = createTimedRound<Attempt>({
    key: 'blindfold-diagonal',
    stars: [6, 12, 20],
    onStart: () => (pair = generatePair()),
  });

  function handleAnswer(answeredYes: boolean) {
    const correct = pair.same === answeredYes;
    round.answer({ sq1: pair.sq1, sq2: pair.sq2, same: pair.same, correct });
    pair = generatePair();
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

<TimedRound {round} title="Same Diagonal?">
  {#snippet play()}
    <div class={['target', round.flash]}>{pair.sq1} &mdash; {pair.sq2}</div>

    <div class="answers">
      <Button size="large" onclick={() => handleAnswer(true)}>Yes</Button>
      <Button size="large" onclick={() => handleAnswer(false)}>No</Button>
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

  .correct { color: var(--correct-text); }
  .wrong { color: var(--wrong-text); }
  .muted { color: var(--ink-muted); }
</style>
