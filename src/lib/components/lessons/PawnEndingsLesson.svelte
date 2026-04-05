<script lang="ts">
  import { onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { createBoardState, parseFen } from '$lib/logic/types';
  import { parseSan, applyMove } from '$lib/logic/pgn';
  import type { BoardState, SquareId, PieceColor } from '$lib/logic/types';
  import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';
  import { playSound } from '$lib/state/sound';
  import { pawnEndingSteps, type LessonStep, type QuizStep } from './pawn-endings-data';

  interface Props {
    onNext?: () => void;
  }
  let { onNext }: Props = $props();

  let stepIndex = $state(0);
  let step = $derived(pawnEndingSteps[stepIndex]);
  let totalSteps = pawnEndingSteps.length;
  let quizCount = pawnEndingSteps.filter(s => s.type === 'quiz').length;

  // Quiz state
  let phase = $state<'diagram' | 'intro' | 'asking' | 'wrong' | 'animating' | 'result'>('diagram');
  let board = $state<BoardState>(createBoardState([]));
  let sideToMove = $state<PieceColor>('w');
  let opponentSlide = $state<SlideAnimation | null>(null);
  let wrongAnswer = $state<string | null>(null);
  let mistakes = $state(0);
  let totalMistakes = $state(0);
  let keySquares = $state<SquareId[]>([]);

  // Stars: 0 mistakes across all quizzes = 3, 1-2 = 2, 3+ = 1
  let stars = $derived.by(() => {
    if (totalMistakes === 0) return 3;
    if (totalMistakes <= 2) return 2;
    return 1;
  });

  function initStep(s: LessonStep) {
    opponentSlide = null;
    wrongAnswer = null;
    mistakes = 0;

    if (s.type === 'diagram') {
      const parsed = parseFen(s.fen);
      board = createBoardState(parsed.placements);
      keySquares = s.keySquares;
      sideToMove = 'w';
      phase = 'diagram';
    } else {
      const parsed = parseFen(s.startFen);
      board = createBoardState(parsed.placements);
      keySquares = [];
      sideToMove = s.startFen.split(' ')[1] === 'b' ? 'b' : 'w';
      phase = 'intro';
    }
  }

  onMount(() => {
    initStep(step);
    if (step.type === 'quiz') {
      setTimeout(() => animateIntro(), 500);
    }
  });

  async function animateIntro() {
    if (step.type !== 'quiz') return;
    for (const san of step.introMoves) {
      await animateMove(san);
    }
    phase = 'asking';
  }

  async function animateMove(san: string): Promise<void> {
    const parsed = parseSan(san, board, sideToMove);
    if (!parsed) return;

    const fromSq = parsed.from;
    const toSq = parsed.to;
    const piece = board.pieces.get(fromSq);
    if (!piece) return;

    const newBoard = applyMove(board, parsed.from, parsed.to, parsed.promotion);

    opponentSlide = {
      piece: piece.piece,
      color: piece.color,
      from: fromSq,
      to: toSq,
    };

    board = newBoard;
    sideToMove = sideToMove === 'w' ? 'b' : 'w';

    await new Promise(r => setTimeout(r, 500));
    opponentSlide = null;
  }

  function handleAnswer(answer: 'white' | 'draw' | 'black') {
    if (phase !== 'asking' || step.type !== 'quiz') return;

    if (answer === step.answer) {
      playSound('correct');
      phase = 'animating';
      animateProof();
    } else {
      playSound('wrong');
      wrongAnswer = answer;
      mistakes++;
      totalMistakes++;
      phase = 'wrong';
      setTimeout(() => {
        wrongAnswer = null;
        phase = 'asking';
      }, 800);
    }
  }

  async function animateProof() {
    if (step.type !== 'quiz') return;
    for (const san of step.proofMoves) {
      await new Promise(r => setTimeout(r, 600));
      await animateMove(san);
    }
    await new Promise(r => setTimeout(r, 300));
    playSound('stars');
    phase = 'result';
  }

  function nextStep() {
    if (stepIndex < totalSteps - 1) {
      stepIndex++;
      const s = pawnEndingSteps[stepIndex];
      initStep(s);
      if (s.type === 'quiz') {
        setTimeout(() => animateIntro(), 500);
      }
    } else if (onNext) {
      // Save stars
      const existing = parseInt(localStorage.getItem('pawn-endings-lesson-best-stars') ?? '0', 10);
      if (stars > existing) {
        localStorage.setItem('pawn-endings-lesson-best-stars', String(stars));
      }
      onNext();
    }
  }

  function restart() {
    stepIndex = 0;
    totalMistakes = 0;
    initStep(pawnEndingSteps[0]);
  }

  let allDone = $derived(phase === 'result' && stepIndex === totalSteps - 1);
  let isQuiz = $derived(step.type === 'quiz');
  let quizStep = $derived(step.type === 'quiz' ? step as QuizStep : null);
</script>

<div class="lesson">
  <div class="header">
    <h2 class="title">{step.title}</h2>
    <p class="instruction">{step.instruction}</p>
    <p class="progress">{stepIndex + 1} / {totalSteps}</p>
  </div>

  <div class="board-area">
    <div class="board-wrap">
      {#if isQuiz}
        <div class="side-indicator top" class:active={sideToMove === 'b'}>
          <div class="side-square black"></div>
        </div>
      {/if}

      <Board
        {board}
        selectedSquare={null}
        validMoves={[]}
        targets={keySquares}
        reachedTargets={[]}
        dragValidMoves={[]}
        onSquareClick={() => {}}
        onDrop={() => {}}
        onDragStart={() => {}}
        onDragEnd={() => {}}
        {opponentSlide}
        readOnly
      />

      {#if isQuiz}
        <div class="side-indicator bottom" class:active={sideToMove === 'w'}>
          <div class="side-square white"></div>
        </div>
      {/if}

      <!-- Result overlay -->
      {#if phase === 'result' && quizStep}
        <div class="result-overlay">
          {#if quizStep.endState === 'promotion'}
            <div class="trophy">&#127942;</div>
          {:else}
            <div class="draw-symbol">&#189;</div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Diagram: just a Next button -->
  {#if phase === 'diagram'}
    <button class="btn-primary" onclick={nextStep}>Next</button>
  {/if}

  <!-- Quiz: answer buttons -->
  {#if phase === 'asking' || phase === 'wrong'}
    <div class="question">
      <p class="question-text">What will be the result?</p>
      <div class="answer-buttons">
        <button
          class={['answer-btn', wrongAnswer === 'white' && 'wrong-flash']}
          onclick={() => handleAnswer('white')}
        >
          <div class="answer-square white"></div>
          <span>White wins</span>
        </button>
        <button
          class={['answer-btn draw-btn', wrongAnswer === 'draw' && 'wrong-flash']}
          onclick={() => handleAnswer('draw')}
        >
          <span class="draw-icon">&#189;</span>
          <span>Draw</span>
        </button>
        <button
          class={['answer-btn', wrongAnswer === 'black' && 'wrong-flash']}
          onclick={() => handleAnswer('black')}
        >
          <div class="answer-square black"></div>
          <span>Black wins</span>
        </button>
      </div>
    </div>
  {/if}

  {#if phase === 'animating'}
    <p class="animating-text">Watch the continuation...</p>
  {/if}

  {#if phase === 'result'}
    <div class="result-area">
      {#if allDone}
        <p class="result-text">Lesson complete!</p>
        <StarRating {stars} size="lg" />
        <div class="result-buttons">
          <button class="btn-secondary" onclick={restart}>Try Again</button>
          {#if onNext}
            <button class="btn-primary" onclick={nextStep}>Continue</button>
          {/if}
        </div>
      {:else}
        <button class="btn-primary" onclick={nextStep}>Next Position</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .lesson {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }

  .header { text-align: center; flex-shrink: 0; }
  .title { font-size: 1.25rem; font-weight: bold; margin-bottom: 0.25rem; }
  .instruction { color: var(--text-muted); font-size: 0.9rem; }
  .progress { color: var(--text-faint); font-size: 0.75rem; margin-top: 0.25rem; }

  .board-area {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .board-wrap {
    position: relative;
    width: 100%;
    max-width: 500px;
  }

  /* Side to move indicators */
  .side-indicator {
    position: absolute;
    z-index: 5;
    opacity: 0.3;
    transition: opacity 0.3s;
  }
  .side-indicator.active { opacity: 1; }
  .side-indicator.top { top: 0.25rem; left: 0.25rem; }
  .side-indicator.bottom { bottom: 0.25rem; left: 0.25rem; }

  .side-square {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 0.2rem;
    border: 2px solid rgba(255, 255, 255, 0.5);
  }
  .side-square.white { background: #e8e0d0; }
  .side-square.black { background: #2a2a2a; }

  /* Result overlay */
  .result-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 5;
  }
  .trophy {
    font-size: 6rem;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
    animation: pop 0.5s ease-out;
  }
  .draw-symbol {
    font-size: 8rem;
    font-weight: bold;
    color: #facc15;
    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    animation: pop 0.5s ease-out;
  }

  @keyframes pop {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); }
  }

  /* Question area */
  .question {
    text-align: center;
  }
  .question-text {
    font-weight: bold;
    margin-bottom: 0.75rem;
  }
  .answer-buttons {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }
  .answer-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-radius: 0.75rem;
    border: 2px solid var(--card-border);
    background: var(--card-bg);
    color: var(--foreground);
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: border-color 0.15s, background 0.15s;
    min-width: 5rem;
  }
  .answer-btn:hover {
    border-color: rgba(240, 230, 204, 0.4);
    background: var(--btn-bg);
  }
  .answer-btn.wrong-flash {
    border-color: #ef4444;
    background: rgba(239, 68, 68, 0.15);
    animation: shake 0.3s;
  }

  .answer-square {
    width: 2rem;
    height: 2rem;
    border-radius: 0.25rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }
  .answer-square.white { background: #e8e0d0; }
  .answer-square.black { background: #2a2a2a; }

  .draw-icon {
    font-size: 1.5rem;
    font-weight: bold;
    line-height: 2rem;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
  }

  .animating-text {
    color: var(--text-muted);
    font-style: italic;
  }

  /* Result area */
  .result-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
  .result-text {
    font-weight: bold;
    font-size: 1.125rem;
  }
  .result-buttons {
    display: flex;
    gap: 0.75rem;
  }
  .btn-primary {
    padding: 0.625rem 1.5rem;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-primary:hover { background: #15803d; }
  .btn-secondary {
    padding: 0.625rem 1.5rem;
    background: var(--btn-bg);
    color: var(--foreground);
    border: 1px solid var(--card-border);
    border-radius: 0.5rem;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-secondary:hover { background: var(--btn-hover); }
</style>
