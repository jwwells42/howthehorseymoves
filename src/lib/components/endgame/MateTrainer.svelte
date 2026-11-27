<script lang="ts">
  import { saveBest, readNumber } from '$lib/state/storage';
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import FinishActions from '$lib/components/curriculum/FinishActions.svelte';
  import { playSound } from '$lib/state/sound';
  import { type BoardState, type SquareId, createBoardState } from '$lib/logic/types';
  import { getLegalMoves } from '$lib/logic/attacks';
  import {
    type MateEndgameType,
    type MoveResult,
    ENDGAME_INFO,
    generatePosition,
    validateEndgameMove,
    applyEndgameMove,
    pickDefenseMove,
  } from '$lib/logic/endgame';
  import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';
  import { MARK, highlight, type SquareHighlight } from '$lib/board-marks';

  interface Props {
    type: MateEndgameType;
  }

  let { type }: Props = $props();

  /* A move that hangs a piece or stalemates is played, shown, then taken back. */
  /** How long the bot waits before it moves (or takes the hanging piece). */
  const BOT_DELAY_MS = 400;
  /** How long the capture, or the ✗s around the king, stay on the board. */
  const HOLD_MS = 1500;
  /** How long each step back takes. */
  const STEP_MS = 500;

  let info = $derived(ENDGAME_INFO[type]);
  let storageKey = $derived(`endings-${type}-best-stars`);

  /* ── State ────────────────────────────────────── */

  function newBoard() {
    return createBoardState(generatePosition(type));
  }

  let board = $state<BoardState>(newBoard());
  let selectedSquare = $state<SquareId | null>(null);
  let result = $state<'playing' | 'won'>('playing');
  let mistakes = $state(0);
  let feedback = $state<string | null>(null);
  let botSlide = $state<SlideAnimation | null>(null);
  let waitingForBot = $state(false);
  let dragFrom = $state<SquareId | null>(null);
  let bestStars = $state(0);
  /** A mistake being shown: no moves until it has been taken back. */
  let replaying = $state(false);
  /** ✗ on the squares the black king can't go to, after a stalemate. */
  let crosses = $state<SquareHighlight[]>([]);

  $effect(() => {
    bestStars = readNumber(storageKey);
  });

  let validMoves = $derived.by(() => {
    if (!selectedSquare) return [];
    return getLegalMoves(selectedSquare, board, 'w');
  });

  let dragValidMoves = $derived.by(() => {
    if (!dragFrom) return [];
    return getLegalMoves(dragFrom, board, 'w');
  });

  let stars = $derived(mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1);

  let statusText = $derived.by(() => {
    if (result === 'won') return '✓ Checkmate';
    if (waitingForBot) return '…';
    return '';
  });

  /* ── Bot move ─────────────────────────────────── */

  function makeBotMove(currentBoard: BoardState) {
    waitingForBot = true;
    setTimeout(() => {
      const move = pickDefenseMove(currentBoard);
      if (!move) {
        waitingForBot = false;
        return;
      }
      const piece = currentBoard.pieces.get(move.from)!;
      botSlide = {
        piece: piece.piece,
        color: piece.color,
        from: move.from,
        to: move.to,
      };
      const newBoard = applyEndgameMove(currentBoard, move.from, move.to);
      board = newBoard;
      playSound('move');
      setTimeout(() => {
        botSlide = null;
        waitingForBot = false;
      }, 500);
    }, BOT_DELAY_MS);
  }

  /* ── A mistake: show it, then take it back ────── */

  function showMistake(
    before: BoardState,
    after: BoardState,
    from: SquareId,
    to: SquareId,
    validation: MoveResult,
  ) {
    replaying = true;
    const moved = before.pieces.get(from)!;

    function takeBack() {
      board = before;
      botSlide = { piece: moved.piece, color: moved.color, from: to, to: from };
      setTimeout(() => {
        botSlide = null;
        replaying = false;
      }, STEP_MS);
    }

    setTimeout(() => {
      feedback = validation.reason ?? null;
      const capture = validation.capture;
      if (capture) {
        // The king takes the piece, then steps back off it.
        board = applyEndgameMove(after, capture.from, capture.to);
        botSlide = { piece: 'K', color: 'b', from: capture.from, to: capture.to };
        playSound('botCaptures');
        setTimeout(() => {
          board = after;
          botSlide = { piece: 'K', color: 'b', from: capture.to, to: capture.from };
          setTimeout(takeBack, STEP_MS);
        }, HOLD_MS);
      } else {
        crosses = highlight(validation.blocked ?? [], MARK.danger, 'cross');
        playSound('wrong');
        setTimeout(() => {
          crosses = [];
          takeBack();
        }, HOLD_MS);
      }
    }, BOT_DELAY_MS);
  }

  /* ── Execute player move ──────────────────────── */

  function executeMove(from: SquareId, to: SquareId) {
    const validation = validateEndgameMove(board, from, to);
    const before = board;
    const newBoard = applyEndgameMove(board, from, to);
    board = newBoard;
    selectedSquare = null;
    feedback = null;
    playSound('move');

    if (!validation.valid) {
      mistakes += 1;
      showMistake(before, newBoard, from, to, validation);
      return;
    }

    if (validation.checkmate) {
      result = 'won';
      playSound('stars');
      const s = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
      bestStars = saveBest(storageKey, s);
      return;
    }

    makeBotMove(newBoard);
  }

  /* ── Click handling ───────────────────────────── */

  function handleSquareClick(sq: SquareId) {
    if (result !== 'playing' || waitingForBot || replaying) return;

    if (!selectedSquare) {
      const p = board.pieces.get(sq);
      if (p && p.color === 'w') {
        selectedSquare = sq;
        feedback = null;
      }
      return;
    }

    if (sq === selectedSquare) {
      selectedSquare = null;
      return;
    }

    const target = board.pieces.get(sq);
    if (target && target.color === 'w') {
      selectedSquare = sq;
      return;
    }

    const legal = getLegalMoves(selectedSquare, board, 'w');
    if (!legal.includes(sq)) {
      selectedSquare = null;
      return;
    }

    executeMove(selectedSquare, sq);
  }

  /* ── Drag-and-drop handling ───────────────────── */

  function handleDrop(from: SquareId, to: SquareId) {
    if (result !== 'playing' || waitingForBot || replaying || from === to) return;
    const p = board.pieces.get(from);
    if (!p || p.color !== 'w') return;
    const legal = getLegalMoves(from, board, 'w');
    if (!legal.includes(to)) return;
    executeMove(from, to);
  }

  function onDragStart(sq: SquareId) {
    if (result !== 'playing' || waitingForBot || replaying) return;
    dragFrom = sq;
  }

  function onDragEnd() {
    dragFrom = null;
  }

  /* ── Reset ────────────────────────────────────── */

  function reset() {
    board = newBoard();
    selectedSquare = null;
    result = 'playing';
    mistakes = 0;
    feedback = null;
    botSlide = null;
    waitingForBot = false;
    dragFrom = null;
    replaying = false;
    crosses = [];
  }
</script>

<BoardLayout>
  {#snippet boardArea()}
    <Board
      {board}
      {selectedSquare}
      {validMoves}
      {dragValidMoves}
      onSquareClick={handleSquareClick}
      onDrop={handleDrop}
      {onDragStart}
      {onDragEnd}
      opponentSlide={botSlide}
      highlights={crosses}
    />
  {/snippet}

  {#snippet sidebarArea()}
    <div class="header">
      <h2 class="title">{info.name}</h2>
      <p class="status">{statusText}</p>
    </div>

    {#if feedback && result === 'playing'}
      <p class="feedback">✗ {feedback}</p>
    {/if}

    {#if result === 'won'}
      <div class="result">
        <StarRating {stars} size="lg" />
        <p class="result-text">
          {#if mistakes > 0}
            {mistakes} mistake{mistakes > 1 ? 's' : ''}
          {/if}
        </p>
        <p class="best-text">Best: <StarRating stars={bestStars} size="sm" /></p>
        <FinishActions label="New Position" onclick={reset} size="normal" />
      </div>
    {/if}
  {/snippet}
</BoardLayout>

<style>
  .header {
    text-align: center;
    flex-shrink: 0;
  }

  .title {
    font-size: var(--size-large);
    margin: 0 0 0.25rem;
  }

  .status {
    color: var(--ink-muted);
    margin: 0;
  }

  /* A move that was not good enough. */
  .feedback {
    color: var(--wrong-text);
    font-size: var(--size-secondary);
    font-weight: var(--weight-strong);
    margin: 0;
    flex-shrink: 0;
  }

  .result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    animation: fade-in 0.3s ease-out;
    flex-shrink: 0;
  }

  .result-text,
  .best-text {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    margin: 0;
  }
</style>
