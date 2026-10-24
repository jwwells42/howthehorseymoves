<script lang="ts">
  import { onDestroy } from 'svelte';
  import { createTimedRound } from '$lib/state/use-timed-round.svelte';
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import Countdown from '$lib/components/ui/Countdown.svelte';
  import TimedRound from './TimedRound.svelte';
  import AnswerInput from './AnswerInput.svelte';
  import ReviewCard from './ReviewCard.svelte';
  import ReviewGrid from './ReviewGrid.svelte';
  import { createBoardState, type PieceColor, type PieceKind, type PiecePlacement, type SquareId } from '$lib/logic/types';

  type QuestionType = 'white' | 'black' | 'total' | 'pawns' | 'knights' | 'bishops' | 'rooks';

  const QUESTION_LABELS: Record<QuestionType, string> = {
    white: 'White?',
    black: 'Black?',
    total: 'Total?',
    pawns: 'Pawns?',
    knights: 'Knights?',
    bishops: 'Bishops?',
    rooks: 'Rooks?',
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

  /** How long the position is shown before the question. */
  const FLASH_TIME = 3000;

  let challenge = $state<Challenge>(generateChallenge());
  /** The position is on the board, to be remembered. */
  let showing = $state(false);
  let input = $state('');
  let showTimer: ReturnType<typeof setTimeout> | null = null;

  const round = createTimedRound<Attempt>({
    key: 'blindfold-piececount',
    stars: [3, 5, 8],
    onStart: showNextChallenge,
    onEnd: () => {
      if (showTimer) clearTimeout(showTimer);
      showTimer = null;
    },
  });

  onDestroy(() => {
    if (showTimer) clearTimeout(showTimer);
  });

  function showNextChallenge() {
    challenge = generateChallenge();
    showing = true;
    showTimer = setTimeout(() => {
      showing = false;
    }, FLASH_TIME);
  }

  function handleSubmit() {
    if (!round.playing || showing) return;
    const answer = parseInt(input.trim());
    if (isNaN(answer)) return;
    round.answer({
      position: challenge.position,
      questionType: challenge.questionType,
      answer: challenge.answer,
      playerAnswer: answer,
      correct: answer === challenge.answer,
    });
    input = '';
    showNextChallenge();
  }
</script>

<!-- The position to remember is a full-size board -->
{#if round.playing && showing}
  <BoardLayout>
    {#snippet boardArea()}
      <Board board={createBoardState(challenge.position)} readOnly coordinates={false} label="Chess position to memorize" />
    {/snippet}
    {#snippet sidebarArea()}
      <Countdown remaining={round.timeLeft} total={round.seconds}>Score: {round.score}</Countdown>
      <div class="muted studying">Memorize...</div>
    {/snippet}
  </BoardLayout>
{:else}
  <TimedRound {round} title="Piece Count">
    {#snippet play()}
      <div class={['question', round.flash]}>
        {QUESTION_LABELS[challenge.questionType]}
      </div>
      <AnswerInput bind:value={input} onsubmit={handleSubmit} label="Number of pieces" placeholder="#" numeric />
    {/snippet}

    {#snippet results()}
      {#if round.mistakes.length > 0}
        <ReviewGrid title="Mistakes ({round.mistakes.length})">
          {#each round.mistakes as attempt}
            <ReviewCard correct={false} board={createBoardState(attempt.position)}>
              <span class="muted">{QUESTION_LABELS[attempt.questionType]}</span><br />
              <span class="correct">{attempt.answer}</span>
              <span class="muted">(you: {attempt.playerAnswer})</span>
            </ReviewCard>
          {/each}
        </ReviewGrid>
      {/if}
    {/snippet}
  </TimedRound>
{/if}

<style>
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

  .question {
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
    padding: 1rem 0;
    transition: color 0.1s;
  }

  .correct { color: var(--correct-text); }
  .wrong { color: var(--wrong-text); }
</style>
