<script lang="ts">
  import { onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import { type SquareId } from '$lib/logic/types';
  import { getLegalMoves } from '$lib/logic/attacks';
  import type { Arrow } from '$lib/logic/pgn';
  import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';
  import {
    type Opening,
    type OpeningLine,
    parseOpeningPgn,
    extractLines,
    findBranchPoint,
  } from '$lib/openings';

  type Phase = 'learn' | 'practice';

  interface Props {
    opening: Opening;
  }

  let { opening }: Props = $props();

  let playerColor = $derived(opening.color);
  let flipped = $derived(playerColor === 'b');

  let parsed = $derived.by(() => {
    const tree = parseOpeningPgn(opening.pgn);
    const lines = extractLines(tree);
    return { tree, lines };
  });

  let startBoard = $derived(parsed.tree.startBoard);
  let lines = $derived(parsed.lines);

  let lineIdx = $state(0);
  let moveIdx = $state(0);
  function initialBoard() { return startBoard; }
  let board = $state(initialBoard());
  let phase = $state<Phase>('learn');
  let selectedSquare = $state<SquareId | null>(null);
  let wrongMoveSquare = $state<SquareId | null>(null);
  let showHint = $state(false);
  let opponentSlide = $state<SlideAnimation | null>(null);
  let waiting = $state(false);
  let lineComplete = $state(false);
  let allDone = $state(false);
  let dragFrom = $state<SquareId | null>(null);

  let currentLine = $derived(lines[lineIdx]);
  let isPlayerTurn = $derived(moveIdx < currentLine.length && currentLine[moveIdx].colorPlayed === playerColor);
  let atEnd = $derived(moveIdx >= currentLine.length);

  let currentComment = $derived.by(() => {
    if (moveIdx === 0 || waiting) return undefined;
    return currentLine[moveIdx - 1].comment;
  });

  let arrows = $derived.by((): Arrow[] | undefined => {
    if (atEnd || !isPlayerTurn || waiting) return undefined;
    if (phase === 'learn' || showHint) {
      const move = currentLine[moveIdx];
      return [{ from: move.from, to: move.to, color: '#15803d' }];
    }
    return undefined;
  });

  let validMoves = $derived.by(() => {
    if (!selectedSquare || waiting || atEnd || !isPlayerTurn) return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== playerColor) return [];
    return getLegalMoves(selectedSquare, board, playerColor);
  });

  let dragMoves = $derived.by(() => {
    if (!dragFrom || waiting || atEnd || !isPlayerTurn) return [];
    const p = board.pieces.get(dragFrom);
    if (!p || p.color !== playerColor) return [];
    return getLegalMoves(dragFrom, board, playerColor);
  });

  let moveDisplay = $derived.by(() => {
    const pairs: { num: number; white: string; black?: string; whiteIdx: number; blackIdx?: number }[] = [];
    for (let i = 0; i < currentLine.length; i += 2) {
      const w = currentLine[i];
      const b = currentLine[i + 1];
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: w.san,
        black: b?.san,
        whiteIdx: i,
        blackIdx: b ? i + 1 : undefined,
      });
    }
    return pairs;
  });

  function autoPlayOpponent(idx: number, line: OpeningLine) {
    if (idx >= line.length) return;
    const move = line[idx];
    const movedPiece = board.pieces.get(move.from);
    waiting = true;

    setTimeout(() => {
      opponentSlide = {
        piece: movedPiece?.piece ?? 'P',
        color: move.colorPlayed,
        from: move.from,
        to: move.to,
      };
      board = move.boardAfter;
      const nextIdx = idx + 1;
      moveIdx = nextIdx;

      setTimeout(() => {
        opponentSlide = null;
        waiting = false;
        if (nextIdx >= line.length) {
          lineComplete = true;
        }
      }, 400);
    }, 300);
  }

  function maybeAutoPlayOpponent() {
    const line = lines[lineIdx];
    if (moveIdx < line.length && line[moveIdx].colorPlayed !== playerColor) {
      setTimeout(() => autoPlayOpponent(moveIdx, line), 400);
    }
  }

  onMount(() => {
    maybeAutoPlayOpponent();
  });

  function advanceLine() {
    lineComplete = false;
    selectedSquare = null;

    if (lineIdx + 1 < lines.length) {
      const nextLine = lines[lineIdx + 1];
      const bp = findBranchPoint(currentLine, nextLine);
      const newBoard = bp > 0 ? nextLine[bp - 1].boardAfter : startBoard;

      lineIdx = lineIdx + 1;
      moveIdx = bp;
      board = newBoard;

      if (bp < nextLine.length && nextLine[bp].colorPlayed !== playerColor) {
        setTimeout(() => autoPlayOpponent(bp, nextLine), 400);
      }
    } else if (phase === 'learn') {
      phase = 'practice';
      lineIdx = 0;
      moveIdx = 0;
      board = startBoard;
      maybeAutoPlayOpponent();
    } else {
      allDone = true;
      if (opening.id !== 'custom') {
        try { localStorage.setItem(`opening-${opening.id}-complete`, 'true'); } catch {}
      }
    }
  }

  function executePlayerMove(from: SquareId, to: SquareId) {
    if (atEnd || !isPlayerTurn || waiting) return;

    const expected = currentLine[moveIdx];
    if (from === expected.from && to === expected.to) {
      board = expected.boardAfter;
      selectedSquare = null;
      showHint = false;
      wrongMoveSquare = null;
      const nextIdx = moveIdx + 1;
      moveIdx = nextIdx;

      if (nextIdx >= currentLine.length) {
        lineComplete = true;
      } else if (currentLine[nextIdx].colorPlayed !== playerColor) {
        autoPlayOpponent(nextIdx, currentLine);
      }
    } else {
      wrongMoveSquare = to;
      showHint = true;
      selectedSquare = null;
      setTimeout(() => (wrongMoveSquare = null), 600);
    }
  }

  function handleSquareClick(sq: SquareId) {
    if (waiting || atEnd || lineComplete) return;
    if (!isPlayerTurn) return;

    if (!selectedSquare) {
      const p = board.pieces.get(sq);
      if (p && p.color === playerColor) selectedSquare = sq;
      return;
    }

    if (sq === selectedSquare) {
      selectedSquare = null;
      return;
    }

    const target = board.pieces.get(sq);
    if (target && target.color === playerColor) {
      selectedSquare = sq;
      return;
    }

    const moves = getLegalMoves(selectedSquare, board, playerColor);
    if (!moves.includes(sq)) {
      selectedSquare = null;
      return;
    }

    executePlayerMove(selectedSquare, sq);
  }

  function handleDrop(from: SquareId, to: SquareId) {
    if (waiting || atEnd || lineComplete || !isPlayerTurn || from === to) return;
    const p = board.pieces.get(from);
    if (!p || p.color !== playerColor) return;
    const moves = getLegalMoves(from, board, playerColor);
    if (!moves.includes(to)) return;
    executePlayerMove(from, to);
  }

  function onDragStart(sq: SquareId) {
    dragFrom = sq;
  }

  function onDragEnd() {
    dragFrom = null;
  }

  function reset() {
    lineIdx = 0;
    moveIdx = 0;
    board = startBoard;
    phase = 'learn';
    selectedSquare = null;
    wrongMoveSquare = null;
    showHint = false;
    opponentSlide = null;
    waiting = false;
    lineComplete = false;
    allDone = false;
    maybeAutoPlayOpponent();
  }
</script>

<div class="trainer">
  <div class="header">
    <h2>{opening.name}</h2>
    <p class="description">{opening.description}</p>
  </div>

  <div class="info-row">
    <span>Line {lineIdx + 1} of {lines.length}</span>
    <span>{phase === 'learn' ? 'Learning' : 'Practicing'}</span>
  </div>

  <div class="board-wrapper">
    <Board
      {board}
      {selectedSquare}
      {validMoves}
      targets={[]}
      reachedTargets={[]}
      dragValidMoves={dragMoves}
      onSquareClick={handleSquareClick}
      onDrop={handleDrop}
      {onDragStart}
      {onDragEnd}
      {wrongMoveSquare}
      {opponentSlide}
      {arrows}
      {flipped}
      playableColors={[playerColor]}
    />
    {#if allDone}
      <div class="done-overlay">
        <div class="done-content">
          <div class="done-check">&#10003;</div>
          <p class="done-title">Lines mastered!</p>
          <button class="btn" onclick={reset}>
            Practice again
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="status">
    {#if lineComplete && !allDone}
      <div class="line-complete">
        <span class="complete-text">Line complete!</span>
        <button class="btn btn-sm" onclick={advanceLine}>
          {#if lineIdx + 1 < lines.length}
            Next variation
          {:else if phase === 'learn'}
            Practice
          {:else}
            Finish
          {/if}
        </button>
      </div>
    {/if}
    {#if !lineComplete && !allDone && isPlayerTurn && !waiting}
      <span class="muted">
        {phase === 'learn' ? 'Follow the arrow' : 'Your move'}
      </span>
    {/if}
    {#if !lineComplete && !allDone && !isPlayerTurn && !waiting && !atEnd}
      <span class="muted">Opponent is thinking...</span>
    {/if}
  </div>

  {#if currentComment}
    <div class="comment-box">
      <p>{currentComment}</p>
    </div>
  {/if}

  <div class="move-list">
    <div class="moves">
      {#each moveDisplay as pair}
        <span class="move-pair">
          <span class="move-num">{pair.num}.</span>
          <span class={['move', moveIdx > pair.whiteIdx && 'played', moveIdx === pair.whiteIdx && 'current']}>
            {pair.white}
          </span>
          {#if pair.black}
            {' '}
            <span
              class={['move', pair.blackIdx !== undefined && moveIdx > pair.blackIdx && 'played', pair.blackIdx !== undefined && moveIdx === pair.blackIdx && 'current']}
            >
              {pair.black}
            </span>
          {/if}
        </span>
      {/each}
    </div>
  </div>

  <button class="btn" onclick={reset}>
    Start over
  </button>
</div>

<style>
  .trainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    max-width: 42rem;
    margin: 0 auto;
  }

  .header {
    text-align: center;
  }

  .header h2 {
    font-size: 1.25rem;
    font-weight: bold;
    margin-bottom: 0.25rem;
  }

  .description {
    color: var(--text-muted);
  }

  .info-row {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .comment-box {
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    padding: 0.75rem 1rem;
    width: 100%;
    max-width: 28rem;
    font-size: 0.875rem;
    color: var(--text-muted);
    line-height: 1.5;
    max-height: 8rem;
    overflow-y: auto;
  }

  .board-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .done-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 0.5rem;
  }

  .done-content {
    text-align: center;
  }

  .done-check {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .done-title {
    font-size: 1.125rem;
    font-weight: bold;
    margin-bottom: 0.75rem;
  }

  .status {
    font-size: 0.875rem;
    text-align: center;
    min-height: 2rem;
  }

  .line-complete {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    justify-content: center;
  }

  .complete-text {
    color: #4ade80;
    font-weight: 500;
  }

  .muted {
    color: var(--text-muted);
  }

  .move-list {
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    padding: 0.75rem 1rem;
    width: 100%;
    max-width: 28rem;
  }

  .moves {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1rem;
    font-size: 0.875rem;
  }

  .move-pair {
    white-space: nowrap;
  }

  .move-num {
    color: var(--text-faint);
  }

  .move {
    color: var(--text-faint);
  }

  .move.played {
    color: var(--foreground);
  }

  .move.current {
    color: var(--foreground);
    font-weight: bold;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    background: var(--btn-bg);
    color: inherit;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.15s;
  }

  .btn:hover {
    background: var(--btn-hover);
  }

  .btn-sm {
    padding: 0.375rem 1rem;
  }
</style>
