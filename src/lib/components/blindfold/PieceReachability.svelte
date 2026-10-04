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
  import { MARK, highlight } from '$lib/board-marks';

  const GAME_DURATION = 30;

  type PieceType = 'N' | 'B';

  const PIECE_NAMES: Record<PieceType, string> = { N: 'Knight', B: 'Bishop' };

  interface Question {
    piece: PieceType;
    from: string;
    to: string;
    reachable: boolean;
    reason: string;
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
          reason: same ? 'Same color squares' : 'Different color squares',
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
          reason: canReach ? `Reachable in \u2264${moves} moves` : `Not reachable in ${moves} moves`,
        };
      }
    }
  }

  function getStars(score: number): number {
    if (score >= 18) return 3;
    if (score >= 10) return 2;
    if (score >= 5) return 1;
    return 0;
  }

  let gameState = $state<'idle' | 'playing' | 'done'>('idle');
  let score = $state(0);
  let timeLeft = $state(GAME_DURATION);
  let question = $state<Question>(generateQuestion());
  let flash = $state<'correct' | 'wrong' | null>(null);
  let bestScore = $state(0);
  let bestStars = $state(0);
  let history = $state<Attempt[]>([]);

  let timerRef: ReturnType<typeof setInterval> | null = null;
  let flashTimeout: ReturnType<typeof setTimeout> | null = null;

  let stars = $derived(getStars(score));
  let mistakes = $derived(history.filter((a) => !a.correct));

  // Extract move count from question.reason for display
  let questionMoveCount = $derived(question.reason.match(/\d+/)?.[0] ?? '?');

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('blindfold-reachability-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('blindfold-reachability-best-stars') ?? '0', 10);

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
      localStorage.setItem('blindfold-reachability-best', String(score));
      bestScore = score;
    }
    if (s > bestStars) {
      localStorage.setItem('blindfold-reachability-best-stars', String(s));
      bestStars = s;
    }
  }

  function handleAnswer(answeredYes: boolean) {
    if (gameState !== 'playing') return;
    if (flashTimeout) clearTimeout(flashTimeout);

    const correct = question.reachable === answeredYes;
    history = [...history, { ...question, correct }];

    if (correct) {
      score += 1;
      flash = 'correct';
      playSound('correct');
    } else {
      flash = 'wrong';
      playSound('wrong');
    }
    question = generateQuestion();
    flashTimeout = setTimeout(() => { flash = null; }, 200);
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

<div class="trainer">
  {#if gameState === 'idle'}
    <div class="screen">
      <h2>Piece Reachability</h2>
      <p class="instructions">
        Can the piece reach the target square? Bishops need same-color squares. Knights need the right number of moves. You have 30 seconds!
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
      <FinishActions label="Play Again" onclick={startGame} />

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
      <img src="/pieces/w{question.piece}.svg" alt={PIECE_NAMES[question.piece]} class="piece" />
      <div class={['squares', flash]}>{question.from} &rarr; {question.to}</div>
      <p class="instructions">
        {#if question.piece === 'B'}
          Can a bishop reach it?
        {:else}
          Can a knight reach it in &le;{questionMoveCount} moves?
        {/if}
      </p>
    </div>

    <div class="answers">
      <Button size="large" onclick={() => handleAnswer(true)}>Yes</Button>
      <Button size="large" onclick={() => handleAnswer(false)}>No</Button>
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

  .final-score {
    font-size: var(--size-title);
    font-weight: var(--weight-strong);
  }

  .correct { color: var(--correct-text); }
  .wrong { color: var(--wrong-text); }
  .muted { color: var(--ink-muted); }
</style>
