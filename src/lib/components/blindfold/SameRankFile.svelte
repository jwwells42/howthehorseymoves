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
    sharedType: 'rank' | 'file' | null;
    correct: boolean;
  }

  function generatePair(): { sq1: string; sq2: string; same: boolean; sharedType: 'rank' | 'file' | null } {
    const forceSame = Math.random() < 0.5;

    for (;;) {
      const f1 = Math.floor(Math.random() * 8);
      const r1 = Math.floor(Math.random() * 8);

      if (forceSame) {
        const useRank = Math.random() < 0.5;
        if (useRank) {
          const f2 = Math.floor(Math.random() * 8);
          if (f2 === f1) continue;
          return {
            sq1: String.fromCharCode(97 + f1) + (r1 + 1),
            sq2: String.fromCharCode(97 + f2) + (r1 + 1),
            same: true,
            sharedType: 'rank',
          };
        } else {
          const r2 = Math.floor(Math.random() * 8);
          if (r2 === r1) continue;
          return {
            sq1: String.fromCharCode(97 + f1) + (r1 + 1),
            sq2: String.fromCharCode(97 + f1) + (r2 + 1),
            same: true,
            sharedType: 'file',
          };
        }
      } else {
        const f2 = Math.floor(Math.random() * 8);
        const r2 = Math.floor(Math.random() * 8);
        if (f1 === f2 && r1 === r2) continue;
        if (f1 === f2 || r1 === r2) continue;
        return {
          sq1: String.fromCharCode(97 + f1) + (r1 + 1),
          sq2: String.fromCharCode(97 + f2) + (r2 + 1),
          same: false,
          sharedType: null,
        };
      }
    }
  }

  function sqToCoords(sq: string): [number, number] {
    return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
  }

  function getHighlightSquares(attempt: Attempt): [number, number][] {
    const [f1, r1] = sqToCoords(attempt.sq1);
    const squares: [number, number][] = [];
    if (attempt.sharedType === 'rank') {
      for (let f = 0; f < 8; f++) squares.push([f, r1]);
    } else if (attempt.sharedType === 'file') {
      for (let r = 0; r < 8; r++) squares.push([f1, r]);
    }
    return squares;
  }

  let pair = $state(generatePair());

  const round = createTimedRound<Attempt>({
    key: 'blindfold-rankfile',
    stars: [6, 12, 20],
    onStart: () => (pair = generatePair()),
  });

  function handleAnswer(answeredYes: boolean) {
    const correct = pair.same === answeredYes;
    round.answer({ sq1: pair.sq1, sq2: pair.sq2, same: pair.same, sharedType: pair.sharedType, correct });
    pair = generatePair();
  }

  const squareName = ([file, row]: [number, number]) => 'abcdefgh'[file] + (8 - row);

  /** The two squares asked about, and the line they share if they share one. */
  function reviewMarks(attempt: Attempt): SquareHighlight[] {
    return [
      ...highlight([attempt.sq1, attempt.sq2], MARK.note),
      ...highlight(getHighlightSquares(attempt).map(squareName), attempt.correct ? MARK.good : MARK.danger),
    ];
  }
</script>

{#snippet review(title: string, attempts: Attempt[])}
  <ReviewGrid {title}>
    {#each attempts as attempt}
      <ReviewCard correct={attempt.correct} highlights={reviewMarks(attempt)}>
        <strong>{attempt.sq1} — {attempt.sq2}</strong><br />
        <span class={attempt.correct ? 'correct' : 'wrong'}>{attempt.same ? `Yes (${attempt.sharedType})` : 'No'}</span>
        {#if !attempt.correct}
          <span class="muted">(you: {attempt.same ? 'No' : 'Yes'})</span>
        {/if}
      </ReviewCard>
    {/each}
  </ReviewGrid>
{/snippet}

<TimedRound {round} title="Same Rank or File?">
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
