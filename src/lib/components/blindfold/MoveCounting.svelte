<script lang="ts">
  import { createTimedRound } from '$lib/state/use-timed-round.svelte';
  import TimedRound from './TimedRound.svelte';
  import AnswerInput from './AnswerInput.svelte';
  import ReviewCard from './ReviewCard.svelte';
  import ReviewGrid from './ReviewGrid.svelte';
  import { MARK, highlight, type SquareHighlight } from '$lib/board-marks';

  type PieceType = 'N' | 'B' | 'R' | 'Q' | 'K';

  const PIECE_NAMES: Record<PieceType, string> = {
    N: 'Knight', B: 'Bishop', R: 'Rook', Q: 'Queen', K: 'King',
  };

  const PIECE_ICONS: Record<PieceType, string> = {
    N: '/pieces/wN.svg', B: '/pieces/wB.svg', R: '/pieces/wR.svg', Q: '/pieces/wQ.svg', K: '/pieces/wK.svg',
  };

  interface Attempt {
    piece: PieceType;
    square: string;
    correct: boolean;
    answer: number;
    expected: number;
  }

  function countAttacks(piece: PieceType, f: number, r: number): number {
    if (piece === 'N') {
      const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      return offsets.filter(([df, dr]) => {
        const nf = f + df, nr = r + dr;
        return nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7;
      }).length;
    }
    if (piece === 'K') {
      const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      return offsets.filter(([df, dr]) => {
        const nf = f + df, nr = r + dr;
        return nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7;
      }).length;
    }
    if (piece === 'R') {
      return 14;
    }
    if (piece === 'B') {
      return Math.min(f, r) + Math.min(7 - f, r) + Math.min(f, 7 - r) + Math.min(7 - f, 7 - r);
    }
    // Queen = Bishop + Rook
    const bishopCount = Math.min(f, r) + Math.min(7 - f, r) + Math.min(f, 7 - r) + Math.min(7 - f, 7 - r);
    return bishopCount + 14;
  }

  function getAttackedSquares(piece: PieceType, f: number, r: number): [number, number][] {
    const squares: [number, number][] = [];
    if (piece === 'N') {
      for (const [df, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nf = f + df, nr = r + dr;
        if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) squares.push([nf, nr]);
      }
    } else if (piece === 'K') {
      for (const [df, dr] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const nf = f + df, nr = r + dr;
        if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) squares.push([nf, nr]);
      }
    } else {
      const dirs: [number, number][] = [];
      if (piece === 'B' || piece === 'Q') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
      if (piece === 'R' || piece === 'Q') dirs.push([1,0],[-1,0],[0,1],[0,-1]);
      for (const [df, dr] of dirs) {
        let nf = f + df, nr = r + dr;
        while (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
          squares.push([nf, nr]);
          nf += df; nr += dr;
        }
      }
    }
    return squares;
  }

  const PIECE_POOL: PieceType[] = ['N', 'N', 'N', 'B', 'B', 'K', 'K', 'Q', 'R'];

  function generateQuestion(): { piece: PieceType; square: string; expected: number } {
    const piece = PIECE_POOL[Math.floor(Math.random() * PIECE_POOL.length)];
    const f = Math.floor(Math.random() * 8);
    const r = Math.floor(Math.random() * 8);
    const square = String.fromCharCode(97 + f) + (r + 1);
    return { piece, square, expected: countAttacks(piece, f, r) };
  }

  /** The piece's square, and every square it controls. */
  function reviewMarks(attempt: Attempt): SquareHighlight[] {
    const file = attempt.square.charCodeAt(0) - 97;
    const rank = parseInt(attempt.square[1]) - 1;
    const controlled = getAttackedSquares(attempt.piece, file, rank).map(([f, r]) => 'abcdefgh'[f] + (r + 1));
    return [
      ...highlight([attempt.square], MARK.note),
      ...highlight(controlled, attempt.correct ? MARK.good : MARK.danger),
    ];
  }

  let question = $state(generateQuestion());
  let input = $state('');

  const round = createTimedRound<Attempt>({
    key: 'blindfold-counting',
    stars: [3, 6, 10],
    onStart: () => {
      question = generateQuestion();
      input = '';
    },
  });

  function handleSubmit() {
    const answer = parseInt(input.trim());
    if (isNaN(answer)) return;
    round.answer({
      piece: question.piece,
      square: question.square,
      correct: answer === question.expected,
      answer,
      expected: question.expected,
    });
    input = '';
    question = generateQuestion();
  }
</script>

{#snippet review(title: string, attempts: Attempt[])}
  <ReviewGrid {title}>
    {#each attempts as attempt}
      <ReviewCard correct={attempt.correct} highlights={reviewMarks(attempt)}>
        <strong>{PIECE_NAMES[attempt.piece]} {attempt.square}</strong><br />
        <span class={attempt.correct ? 'correct' : 'wrong'}>{attempt.expected} squares</span>
        {#if !attempt.correct}
          <span class="muted">(you: {attempt.answer})</span>
        {/if}
      </ReviewCard>
    {/each}
  </ReviewGrid>
{/snippet}

<TimedRound {round} title="Move Counting">
  {#snippet play()}
    <div class="question">
      <img src={PIECE_ICONS[question.piece]} alt={PIECE_NAMES[question.piece]} class="piece" />
      <div class={['square', round.flash]}>{question.square}</div>
    </div>

    <AnswerInput bind:value={input} onsubmit={handleSubmit} label="Number of squares" placeholder="#" numeric />
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
    width: 4rem;
    height: 4rem;
  }
  .square {
    font-size: var(--size-title);
    font-weight: var(--weight-strong);
    transition: color 0.1s;
  }

  .correct { color: var(--correct-text); }
  .wrong { color: var(--wrong-text); }
  .muted { color: var(--ink-muted); }
</style>
