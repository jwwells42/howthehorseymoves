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

  function getStars(score: number): number {
    if (score >= 10) return 3;
    if (score >= 6) return 2;
    if (score >= 3) return 1;
    return 0;
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

  let gameState = $state<'idle' | 'playing' | 'done'>('idle');
  let score = $state(0);
  let timeLeft = $state(GAME_DURATION);
  let question = $state(generateQuestion());
  let input = $state('');
  let flash = $state<'correct' | 'wrong' | null>(null);
  let bestScore = $state(0);
  let bestStars = $state(0);
  let history = $state<Attempt[]>([]);

  let timerRef: ReturnType<typeof setInterval> | null = null;
  let flashTimeout: ReturnType<typeof setTimeout> | null = null;

  let stars = $derived(getStars(score));
  let mistakes = $derived(history.filter((a) => !a.correct));

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('blindfold-counting-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('blindfold-counting-best-stars') ?? '0', 10);

    return () => {
      if (timerRef) clearInterval(timerRef);
      if (flashTimeout) clearTimeout(flashTimeout);
    };
  });

  function startGame() {
    gameState = 'playing';
    score = 0;
    timeLeft = GAME_DURATION;
    question = generateQuestion();
    input = '';
    flash = null;
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
      localStorage.setItem('blindfold-counting-best', String(score));
      bestScore = score;
    }
    if (s > bestStars) {
      localStorage.setItem('blindfold-counting-best-stars', String(s));
      bestStars = s;
    }
  }

  function handleSubmit() {
    if (gameState !== 'playing') return;
    const answer = parseInt(input.trim());
    if (isNaN(answer)) return;
    if (flashTimeout) clearTimeout(flashTimeout);

    const correct = answer === question.expected;
    history = [...history, {
      piece: question.piece,
      square: question.square,
      correct,
      answer,
      expected: question.expected,
    }];

    if (correct) {
      score += 1;
      flash = 'correct';
      playSound('correct');
    } else {
      flash = 'wrong';
      playSound('wrong');
    }
    input = '';
    question = generateQuestion();
    flashTimeout = setTimeout(() => { flash = null; }, 200);
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

<div class="trainer">
  {#if gameState === 'idle'}
    <div class="screen">
      <h2>Move Counting</h2>
      <p class="instructions">
        A piece appears on a square. How many squares does it control on an empty board? You have 30 seconds!
      </p>
      <BestScore score={bestScore} stars={bestStars} />
      <Button variant="primary" size="large" onclick={startGame}>Start</Button>
    </div>

  {:else if gameState === 'done'}
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

  {:else}
    <Countdown remaining={timeLeft} total={GAME_DURATION}>Score: {score}</Countdown>

    <div class="question">
      <img src={PIECE_ICONS[question.piece]} alt={PIECE_NAMES[question.piece]} class="piece" />
      <div class={['square', flash]}>{question.square}</div>
      <p class="instructions">How many squares?</p>
    </div>

    <AnswerInput bind:value={input} onsubmit={handleSubmit} label="Number of squares" placeholder="#" numeric />
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
    font-weight: bold;
    transition: color 0.1s;
  }

  .final-score {
    font-size: var(--size-title);
    font-weight: bold;
  }

  .correct { color: var(--correct-text); }
  .wrong { color: var(--wrong-text); }
  .muted { color: var(--ink-muted); }
</style>
