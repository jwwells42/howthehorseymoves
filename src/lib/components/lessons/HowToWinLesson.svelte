<script lang="ts">
  import { goto } from '$app/navigation';
  import Board from '$lib/components/board/Board.svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { playSound } from '$lib/state/sound';
  import {
    type BoardState,
    type SquareId,
    type PieceColor,
    parseFen,
    createBoardState,
    squareToCoords,
  } from '$lib/logic/types';
  import { getLegalMoves, isCheckmate, isStalemate, isInCheck } from '$lib/logic/attacks';
  import {
    type HowToWinSection,
    SECTIONS,
    getStepsForSection,
    getStepIndex,
    mistakesToStars,
    updateCombinedStars,
  } from './how-to-win-data';

  /* ── Props ─────────────────────────────────────────────── */

  interface Props {
    section: HowToWinSection;
    stepSlug: string;
  }

  let { section, stepSlug }: Props = $props();

  /* ── Derived data ──────────────────────────────────────── */

  let sectionInfo = $derived(SECTIONS.find((s) => s.key === section)!);
  let steps = $derived(getStepsForSection(section));
  let storageKey = $derived(sectionInfo.storageKey);
  let mistakesKey = $derived(`how-to-win-${section}-mistakes`);
  let stepIndex = $derived(getStepIndex(section, stepSlug));
  let step = $derived(steps[stepIndex]);
  let progress = $derived(((stepIndex + 1) / steps.length) * 100);

  /* ── Move application (simplified, no en passant needed) ─ */

  function applyMove(board: BoardState, from: SquareId, to: SquareId): BoardState {
    const pieces = new Map(board.pieces);
    const piece = pieces.get(from);
    if (!piece) return board;

    pieces.delete(from);
    pieces.set(to, piece);

    // Castling: move the rook too
    if (piece.piece === 'K') {
      const [fx] = squareToCoords(from);
      const [tx] = squareToCoords(to);
      if (Math.abs(tx - fx) === 2) {
        if (tx > fx) {
          const rookFrom = `h${to[1]}` as SquareId;
          const rookTo = `f${to[1]}` as SquareId;
          const rook = pieces.get(rookFrom);
          if (rook) { pieces.delete(rookFrom); pieces.set(rookTo, rook); }
        } else {
          const rookFrom = `a${to[1]}` as SquareId;
          const rookTo = `d${to[1]}` as SquareId;
          const rook = pieces.get(rookFrom);
          if (rook) { pieces.delete(rookFrom); pieces.set(rookTo, rook); }
        }
      }
    }

    // Pawn promotion
    if (piece.piece === 'P') {
      const rank = to[1];
      if ((piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1')) {
        pieces.set(to, { piece: 'Q', color: piece.color });
      }
    }

    return { pieces };
  }

  /* ── Reactive state ────────────────────────────────────── */

  let board = $state<BoardState>({ pieces: new Map() });
  let selectedSquare = $state<SquareId | null>(null);
  let solved = $state(false);
  let wrongMoveSquare = $state<SquareId | null>(null);
  let feedbackMessage = $state<string | null>(null);
  let bestStars = $state(0);
  let done = $state(false);

  const playerColor: PieceColor = 'w';

  /* ── Reset board when step changes ─────────────────────── */

  $effect(() => {
    const { placements, castlingRights, enPassantSquare } = parseFen(step.fen);
    board = createBoardState(placements, { castlingRights, enPassantSquare });
    selectedSquare = null;
    solved = false;
    wrongMoveSquare = null;
    feedbackMessage = null;
    done = false;
    bestStars = parseInt(localStorage.getItem(storageKey) ?? '0', 10);
    // Reset mistakes at the start of a section
    if (stepIndex === 0) {
      localStorage.setItem(mistakesKey, '0');
    }
  });

  /* ── Derived valid moves ───────────────────────────────── */

  let validMoves: SquareId[] = $derived.by(() => {
    if (!selectedSquare || solved || step?.type === 'demo') return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== playerColor) return [];
    return getLegalMoves(selectedSquare, board, playerColor);
  });

  /* ── Navigation ────────────────────────────────────────── */

  function goToNext() {
    if (stepIndex + 1 >= steps.length) {
      // Section complete -- save stars
      const mistakes = parseInt(localStorage.getItem(mistakesKey) ?? '0', 10);
      const stars = mistakesToStars(mistakes);
      const prev = parseInt(localStorage.getItem(storageKey) ?? '0', 10);
      if (stars > prev) {
        localStorage.setItem(storageKey, stars.toString());
        bestStars = stars;
      }
      updateCombinedStars();
      done = true;
      playSound('stars');
    } else {
      goto(`/learn/how-to-win-${section}/${steps[stepIndex + 1].slug}`);
    }
  }

  /* ── Mistake tracking ──────────────────────────────────── */

  function addMistake() {
    const cur = parseInt(localStorage.getItem(mistakesKey) ?? '0', 10);
    localStorage.setItem(mistakesKey, (cur + 1).toString());
  }

  /* ── Move execution & validation ───────────────────────── */

  function executeMove(from: SquareId, to: SquareId) {
    if (solved || !step || step.type === 'demo') return;

    const newBoard = applyMove(board, from, to);
    const validation = step.validation ?? 'any';

    if (validation === 'capture') {
      const captured = board.pieces.get(to);
      if (!captured || captured.color === playerColor) {
        addMistake();
        wrongMoveSquare = to;
        selectedSquare = null;
        playSound('wrong');
        setTimeout(() => { wrongMoveSquare = null; }, 600);
        return;
      }
    } else if (validation === 'check') {
      if (!isInCheck('b', newBoard)) {
        addMistake();
        wrongMoveSquare = to;
        selectedSquare = null;
        playSound('wrong');
        setTimeout(() => { wrongMoveSquare = null; }, 600);
        return;
      }
    } else if (validation === 'checkmate') {
      if (!isCheckmate('b', newBoard)) {
        addMistake();
        wrongMoveSquare = to;
        selectedSquare = null;
        playSound('wrong');
        setTimeout(() => { wrongMoveSquare = null; }, 600);
        return;
      }
    } else if (validation === 'no-stalemate') {
      if (isStalemate('b', newBoard)) {
        addMistake();
        wrongMoveSquare = to;
        feedbackMessage = "That's stalemate \u2014 a draw!";
        selectedSquare = null;
        playSound('wrong');
        setTimeout(() => {
          wrongMoveSquare = null;
          feedbackMessage = null;
        }, 1500);
        return;
      }
      if (!isCheckmate('b', newBoard)) {
        addMistake();
        wrongMoveSquare = to;
        selectedSquare = null;
        playSound('wrong');
        setTimeout(() => { wrongMoveSquare = null; }, 600);
        return;
      }
    }

    board = newBoard;
    selectedSquare = null;
    solved = true;
    playSound('correct');
  }

  /* ── Click & drag handlers ─────────────────────────────── */

  function handleSquareClick(sq: SquareId) {
    if (solved || !step || step.type === 'demo') return;

    if (!selectedSquare) {
      const p = board.pieces.get(sq);
      if (p && p.color === playerColor) selectedSquare = sq;
      return;
    }

    if (sq === selectedSquare) { selectedSquare = null; return; }

    const p = board.pieces.get(sq);
    if (p && p.color === playerColor) { selectedSquare = sq; return; }

    const moves = getLegalMoves(selectedSquare, board, playerColor);
    if (!moves.includes(sq)) { selectedSquare = null; return; }

    executeMove(selectedSquare, sq);
  }

  function handleDrop(from: SquareId, to: SquareId) {
    if (solved || !step || step.type === 'demo' || from === to) return;
    const p = board.pieces.get(from);
    if (!p || p.color !== playerColor) return;
    const moves = getLegalMoves(from, board, playerColor);
    if (!moves.includes(to)) return;
    executeMove(from, to);
  }

  function handleDragStart(sq: SquareId) {
    selectedSquare = sq;
  }

  function handleDragEnd() {
    selectedSquare = null;
  }

  /* ── Done screen helpers ───────────────────────────────── */

  let doneMistakes = $derived(parseInt(
    (typeof localStorage !== 'undefined' ? localStorage.getItem(mistakesKey) : null) ?? '0',
    10,
  ));
  let doneStars = $derived(mistakesToStars(doneMistakes));
  let sectionIdx = $derived(SECTIONS.findIndex((s) => s.key === section));
  let nextSection = $derived(SECTIONS[sectionIdx + 1] ?? null);

  function playAgain() {
    goto(`/learn/how-to-win-${section}/${steps[0].slug}`);
  }

  function goToNextSection() {
    if (nextSection) {
      const nextSteps = getStepsForSection(nextSection.key);
      goto(`/learn/how-to-win-${nextSection.key}/${nextSteps[0].slug}`);
    } else {
      goto('/play?level=random');
    }
  }

  /* ── Victory overlay check ─────────────────────────────── */

  let showTrophy = $derived(
    step?.isVictory ||
    (solved && (step?.validation === 'checkmate' || step?.validation === 'no-stalemate')),
  );
</script>

{#if done}
  <!-- Done screen -->
  <div class="container">
    <div class="done-center">
      <div class="celebration">&#127881;</div>
      <h2 class="done-title">Lesson Complete!</h2>
      <p class="done-subtitle">
        {#if doneMistakes === 0}
          Perfect — no mistakes!
        {:else}
          {doneMistakes} mistake{doneMistakes === 1 ? '' : 's'}
        {/if}
      </p>
    </div>
    <StarRating stars={doneStars} size="lg" />
    <div class="done-buttons">
      <button class="btn btn-secondary" onclick={playAgain}>
        Play Again
      </button>
      <button class="btn btn-primary" onclick={goToNextSection}>
        {#if nextSection}
          Continue to {nextSection.title}!
        {:else}
          Play vs Computer!
        {/if}
      </button>
    </div>
  </div>
{:else if step}
  <div class="container">
    <!-- Progress bar -->
    <div class="progress-wrapper">
      <div class="progress-track">
        <div class="progress-fill" style="width: {progress}%"></div>
      </div>
      <p class="progress-label">{stepIndex + 1} / {steps.length}</p>
    </div>

    <!-- Step info -->
    <div class="step-info">
      <h2 class="step-title">{step.title}</h2>
      <p class="step-instruction">{step.instruction}</p>
    </div>

    <!-- Board -->
    <div class="board-wrapper">
      {#if showTrophy}
        <div class="trophy-overlay">
          <div class="trophy">&#127942;</div>
        </div>
      {/if}
      <Board
        {board}
        {selectedSquare}
        {validMoves}
        targets={[]}
        reachedTargets={[]}
        dragValidMoves={validMoves}
        onSquareClick={handleSquareClick}
        onDrop={handleDrop}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        {wrongMoveSquare}
        arrows={step.arrows}
        highlights={step.highlights}
        readOnly={step.type === 'demo'}
        playableColors={['w']}
      />
    </div>

    <!-- Feedback message -->
    {#if feedbackMessage}
      <p class="feedback">{feedbackMessage}</p>
    {/if}

    <!-- Controls -->
    {#if step.type === 'demo'}
      <button class="btn btn-primary btn-large" onclick={goToNext}>
        Next
      </button>
    {:else if solved}
      <div class="solved-controls">
        <p class="correct-label">Correct!</p>
        <button class="btn btn-primary btn-large" onclick={goToNext}>
          Next
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    max-width: 42rem;
    margin: 0 auto;
  }

  /* Progress bar */
  .progress-wrapper {
    width: 100%;
    max-width: 28rem;
  }
  .progress-track {
    height: 0.5rem;
    border-radius: 9999px;
    background: var(--card-border, #374151);
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 9999px;
    background: #22c55e;
    transition: width 0.5s ease;
  }
  .progress-label {
    font-size: 0.75rem;
    color: var(--text-faint, #6b7280);
    margin-top: 0.25rem;
    text-align: center;
  }

  /* Step info */
  .step-info {
    text-align: center;
  }
  .step-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
  }
  .step-instruction {
    font-size: 0.875rem;
    color: var(--text-muted, #9ca3af);
    margin-top: 0.25rem;
  }

  /* Board wrapper */
  .board-wrapper {
    width: 100%;
    max-width: 28rem;
    position: relative;
  }

  /* Trophy overlay */
  .trophy-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    pointer-events: none;
  }
  .trophy {
    font-size: 8rem;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4));
  }

  /* Feedback */
  .feedback {
    color: #ef4444;
    font-weight: 700;
    font-size: 0.875rem;
    animation: pulse 1s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Solved controls */
  .solved-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .correct-label {
    color: #22c55e;
    font-weight: 700;
    margin: 0;
  }

  /* Buttons */
  .btn {
    border: none;
    border-radius: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .btn-large {
    padding: 0.75rem 2rem;
    font-size: 1.125rem;
  }
  .btn-primary {
    background: #16a34a;
    color: #fff;
    padding: 0.5rem 1.5rem;
  }
  .btn-primary:hover {
    background: #15803d;
  }
  .btn-secondary {
    background: var(--btn-bg, #374151);
    color: var(--foreground, #e5e7eb);
    padding: 0.5rem 1.5rem;
  }
  .btn-secondary:hover {
    background: var(--btn-hover, #4b5563);
  }

  /* Done screen */
  .done-center {
    text-align: center;
  }
  .celebration {
    font-size: 3rem;
    margin-bottom: 0.75rem;
  }
  .done-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
  }
  .done-subtitle {
    color: var(--text-muted, #9ca3af);
    margin: 0;
  }
  .done-buttons {
    display: flex;
    gap: 0.75rem;
  }
</style>
