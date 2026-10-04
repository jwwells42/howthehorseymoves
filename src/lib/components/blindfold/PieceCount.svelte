<script lang="ts">
  import { onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import BestScore from '$lib/components/ui/BestScore.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import FinishActions from '$lib/components/curriculum/FinishActions.svelte';
  import Countdown from '$lib/components/ui/Countdown.svelte';
  import AnswerInput from './AnswerInput.svelte';
  import ReviewCard from './ReviewCard.svelte';
  import ReviewGrid from './ReviewGrid.svelte';
  import { playSound } from '$lib/state/sound';
  import { createBoardState, type PieceColor, type PieceKind, type PiecePlacement, type SquareId } from '$lib/logic/types';

  const GAME_DURATION = 30;

  type QuestionType = 'white' | 'black' | 'total' | 'pawns' | 'knights' | 'bishops' | 'rooks';

  const QUESTION_LABELS: Record<QuestionType, string> = {
    white: 'White pieces?',
    black: 'Black pieces?',
    total: 'Total pieces?',
    pawns: 'How many pawns?',
    knights: 'How many knights?',
    bishops: 'How many bishops?',
    rooks: 'How many rooks?',
  };

  const PIECE_POOL: { piece: PieceKind; color: PieceColor }[] = [
    { piece: 'Q', color: 'w' }, { piece: 'R', color: 'w' }, { piece: 'R', color: 'w' },
    { piece: 'B', color: 'w' }, { piece: 'B', color: 'w' }, { piece: 'N', color: 'w' },
    { piece: 'N', color: 'w' }, { piece: 'P', color: 'w' }, { piece: 'P', color: 'w' },
    { piece: 'P', color: 'w' },
    { piece: 'Q', color: 'b' }, { piece: 'R', color: 'b' }, { piece: 'R', color: 'b' },
    { piece: 'B', color: 'b' }, { piece: 'B', color: 'b' }, { piece: 'N', color: 'b' },
    { piece: 'N', color: 'b' }, { piece: 'P', color: 'b' }, { piece: 'P', color: 'b' },
    { piece: 'P', color: 'b' },
  ];

  function randomSquare(): SquareId {
    const f = Math.floor(Math.random() * 8);
    const r = Math.floor(Math.random() * 8);
    return (String.fromCharCode(97 + f) + (r + 1)) as SquareId;
  }

  function generatePosition(): PiecePlacement[] {
    const numPieces = Math.floor(Math.random() * 8) + 5; // 5-12 pieces
    const usedSquares = new Set<string>();
    const placements: PiecePlacement[] = [];

    // Always include both kings
    let sq: SquareId;
    do { sq = randomSquare(); } while (usedSquares.has(sq));
    usedSquares.add(sq);
    placements.push({ piece: 'K', color: 'w', square: sq });

    do { sq = randomSquare(); } while (usedSquares.has(sq));
    usedSquares.add(sq);
    placements.push({ piece: 'K', color: 'b', square: sq });

    for (let i = 2; i < numPieces; i++) {
      do { sq = randomSquare(); } while (usedSquares.has(sq));
      usedSquares.add(sq);
      const p = PIECE_POOL[Math.floor(Math.random() * PIECE_POOL.length)];
      placements.push({ ...p, square: sq });
    }

    return placements;
  }

  function getAnswer(position: PiecePlacement[], qType: QuestionType): number {
    switch (qType) {
      case 'white': return position.filter((p) => p.color === 'w').length;
      case 'black': return position.filter((p) => p.color === 'b').length;
      case 'total': return position.length;
      case 'pawns': return position.filter((p) => p.piece === 'P').length;
      case 'knights': return position.filter((p) => p.piece === 'N').length;
      case 'bishops': return position.filter((p) => p.piece === 'B').length;
      case 'rooks': return position.filter((p) => p.piece === 'R').length;
    }
  }

  const Q_TYPES: QuestionType[] = ['white', 'black', 'total', 'pawns', 'knights', 'bishops', 'rooks'];

  interface Challenge {
    position: PiecePlacement[];
    questionType: QuestionType;
    answer: number;
  }

  function generateChallenge(): Challenge {
    const position = generatePosition();
    const qType = Q_TYPES[Math.floor(Math.random() * Q_TYPES.length)];
    return { position, questionType: qType, answer: getAnswer(position, qType) };
  }

  interface Attempt {
    position: PiecePlacement[];
    questionType: QuestionType;
    answer: number;
    playerAnswer: number;
    correct: boolean;
  }

  function getStars(score: number): number {
    if (score >= 8) return 3;
    if (score >= 5) return 2;
    if (score >= 3) return 1;
    return 0;
  }

  const FLASH_TIME = 3000;

  type Phase = 'idle' | 'flash' | 'answer' | 'done';

  let phase = $state<Phase>('idle');
  let challenge = $state<Challenge>(generateChallenge());
  let score = $state(0);
  let timeLeft = $state(GAME_DURATION);
  let input = $state('');
  let flash = $state<'correct' | 'wrong' | null>(null);
  let bestScore = $state(0);
  let bestStars = $state(0);
  let history = $state<Attempt[]>([]);

  let flashTimeout: ReturnType<typeof setTimeout> | null = null;
  let showTimerRef: ReturnType<typeof setTimeout> | null = null;
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('blindfold-piececount-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('blindfold-piececount-best-stars') ?? '0', 10);

    return () => {
      if (showTimerRef) clearTimeout(showTimerRef);
      if (flashTimeout) clearTimeout(flashTimeout);
      if (timerInterval) clearInterval(timerInterval);
    };
  });

  $effect(() => {
    if (phase !== 'done') return;
    const stars = getStars(score);
    if (score > bestScore) {
      localStorage.setItem('blindfold-piececount-best', String(score));
      bestScore = score;
    }
    if (stars > bestStars) {
      localStorage.setItem('blindfold-piececount-best-stars', String(stars));
      bestStars = stars;
    }
    if (stars > 0) playSound('stars');
  });

  function showNextChallenge() {
    const ch = generateChallenge();
    challenge = ch;
    phase = 'flash';
    showTimerRef = setTimeout(() => {
      phase = 'answer';
    }, FLASH_TIME);
  }

  function startGame() {
    score = 0;
    timeLeft = GAME_DURATION;
    history = [];
    flash = null;

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        if (showTimerRef) clearTimeout(showTimerRef);
        showTimerRef = null;
        phase = 'done';
      }
    }, 1000);

    showNextChallenge();
  }

  function handleSubmit() {
    if (phase !== 'answer') return;
    const answer = parseInt(input.trim());
    if (isNaN(answer)) return;
    if (flashTimeout) clearTimeout(flashTimeout);

    const correct = answer === challenge.answer;
    history = [...history, {
      position: challenge.position,
      questionType: challenge.questionType,
      answer: challenge.answer,
      playerAnswer: answer,
      correct,
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
    flashTimeout = setTimeout(() => { flash = null; }, 200);
    showNextChallenge();
  }

  let wrongOnes = $derived(history.filter((a) => !a.correct));
</script>

<div class="trainer">
  {#if phase === 'idle'}
    <div class="screen">
      <h2>Piece Count</h2>
      <p class="muted">
        A position flashes for 3 seconds, then a question appears. Count the pieces! You have 30 seconds total.
      </p>
      <BestScore score={bestScore} stars={bestStars} />
      <Button variant="primary" size="large" onclick={startGame}>Start</Button>
    </div>

  {:else if phase === 'done'}
    <div class="screen">
      <h2>Time&apos;s up!</h2>
      <p class="final-score">{score}/{history.length} correct</p>
      {#if getStars(score) > 0}
        <StarRating stars={getStars(score)} size="lg" />
      {/if}
      <BestScore score={bestScore} />
      <FinishActions label="Play Again" onclick={startGame} />

      {#if wrongOnes.length > 0}
        <ReviewGrid title="Mistakes ({wrongOnes.length})">
          {#each wrongOnes as attempt}
            <ReviewCard correct={false} board={createBoardState(attempt.position)}>
              <span class="muted">{QUESTION_LABELS[attempt.questionType]}</span><br />
              <span class="correct">{attempt.answer}</span>
              <span class="muted">(you: {attempt.playerAnswer})</span>
            </ReviewCard>
          {/each}
        </ReviewGrid>
      {/if}
    </div>

  {:else if phase === 'flash'}
    <Countdown remaining={timeLeft} total={GAME_DURATION}>Score: {score}</Countdown>
    <div class="muted studying">Memorize...</div>
    <div class="board">
      <Board board={createBoardState(challenge.position)} readOnly coordinates={false} label="Chess position to memorize" />
    </div>

  {:else}
    <!-- answer phase -->
    <Countdown remaining={timeLeft} total={GAME_DURATION}>Score: {score}</Countdown>
    <div class={['question', flash]}>
      {QUESTION_LABELS[challenge.questionType]}
    </div>
    <AnswerInput bind:value={input} onsubmit={handleSubmit} label="Number of pieces" placeholder="#" numeric />
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
    width: 100%;
    text-align: center;
  }

  .muted {
    color: var(--ink-muted);
  }

  .studying {
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .board {
    width: 100%;
    max-width: 24rem;
  }

  .question {
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
    padding: 1rem 0;
    transition: color 0.1s;
  }

  .final-score {
    font-size: var(--size-title);
    font-weight: var(--weight-strong);
  }

  .correct { color: var(--correct-text); }
  .wrong { color: var(--wrong-text); }
</style>
