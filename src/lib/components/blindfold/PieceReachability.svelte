<script lang="ts">
  import { createTimedRound } from '$lib/state/use-timed-round.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import TimedRound from './TimedRound.svelte';
  import ReviewCard from './ReviewCard.svelte';
  import ReviewGrid from './ReviewGrid.svelte';
  import { MARK, highlight } from '$lib/board-marks';

  type PieceType = 'N' | 'B';

  const PIECE_NAMES: Record<PieceType, string> = { N: 'Knight', B: 'Bishop' };

  interface Question {
    piece: PieceType;
    from: string;
    to: string;
    reachable: boolean;
    /** A knight question's move limit */
    moves?: number;
  }

  interface Attempt extends Question {
    correct: boolean;
  }

  function sameColor(sq1: string, sq2: string): boolean {
    const f1 = sq1.charCodeAt(0) - 97, r1 = parseInt(sq1[1]) - 1;
    const f2 = sq2.charCodeAt(0) - 97, r2 = parseInt(sq2[1]) - 1;
    return (f1 + r1) % 2 === (f2 + r2) % 2;
  }

  function knightCanReachInN(from: string, to: string, n: number): boolean {
    if (n === 0) return from === to;
    const visited = new Set([from]);
    let frontier = [from];
    for (let step = 0; step < n; step++) {
      const next: string[] = [];
      for (const sq of frontier) {
        const f = sq.charCodeAt(0) - 97;
        const r = parseInt(sq[1]) - 1;
        for (const [df, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
          const nf = f + df, nr = r + dr;
          if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
          const nsq = String.fromCharCode(97 + nf) + (nr + 1);
          if (visited.has(nsq)) continue;
          visited.add(nsq);
          next.push(nsq);
          if (nsq === to) return true;
        }
      }
      frontier = next;
    }
    return false;
  }

  function generateQuestion(): Question {
    const piece: PieceType = Math.random() < 0.5 ? 'N' : 'B';
    const forceYes = Math.random() < 0.5;

    for (;;) {
      const f1 = Math.floor(Math.random() * 8);
      const r1 = Math.floor(Math.random() * 8);
      const f2 = Math.floor(Math.random() * 8);
      const r2 = Math.floor(Math.random() * 8);
      if (f1 === f2 && r1 === r2) continue;
      const from = String.fromCharCode(97 + f1) + (r1 + 1);
      const to = String.fromCharCode(97 + f2) + (r2 + 1);

      if (piece === 'B') {
        const same = sameColor(from, to);
        if (forceYes && !same) continue;
        if (!forceYes && same) continue;
        return {
          piece: 'B',
          from, to,
          reachable: same,
        };
      } else {
        const moves = Math.floor(Math.random() * 3) + 2; // 2-4 moves
        const canReach = knightCanReachInN(from, to, moves);
        if (forceYes && !canReach) continue;
        if (!forceYes && canReach) continue;
        return {
          piece: 'N',
          from, to,
          reachable: canReach,
          moves,
        };
      }
    }
  }

  let question = $state<Question>(generateQuestion());

  const round = createTimedRound<Attempt>({
    key: 'blindfold-reachability',
    stars: [5, 10, 18],
    onStart: () => (question = generateQuestion()),
  });

  function handleAnswer(answeredYes: boolean) {
    round.answer({ ...question, correct: question.reachable === answeredYes });
    question = generateQuestion();
  }
</script>

{#snippet review(title: string, attempts: Attempt[])}
  <ReviewGrid {title}>
    {#each attempts as attempt}
      <ReviewCard
        correct={attempt.correct}
        highlights={[...highlight([attempt.from], MARK.note), ...highlight([attempt.to], MARK.note, 'ring')]}
      >
        <strong>{PIECE_NAMES[attempt.piece]}</strong><br />
        {attempt.from} &rarr; {attempt.to}<br />
        <span class={attempt.correct ? 'correct' : 'wrong'}>{attempt.reachable ? 'Yes' : 'No'}</span>
        {#if !attempt.correct}
          <span class="muted">(you: {attempt.reachable ? 'No' : 'Yes'})</span>
        {/if}
      </ReviewCard>
    {/each}
  </ReviewGrid>
{/snippet}

<TimedRound {round} title="Piece Reachability">
  {#snippet play()}
    <div class="question">
      <img src="/pieces/w{question.piece}.svg" alt={PIECE_NAMES[question.piece]} class="piece" />
      <div class={['squares', round.flash]}>{question.from} &rarr; {question.to}</div>
      {#if question.moves}
        <p class="instructions">&le;{question.moves} moves?</p>
      {/if}
    </div>

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

  .question {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .piece {
    width: 3rem;
    height: 3rem;
  }
  .squares {
    font-size: var(--size-title);
    font-weight: var(--weight-strong);
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
