<script lang="ts">
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

  type Phase = 'setup' | 'learn' | 'practice';

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

  // === Setup state ===
  let deselectedLines = $state<Set<number>>(new Set());
  let activeLines = $derived(lines.filter((_, i) => !deselectedLines.has(i)));
  let canStart = $derived(activeLines.length > 0);

  // === Drill state ===
  let lineIdx = $state(0);
  let moveIdx = $state(0);
  let maxReachedIdx = $state(0);
  function initialBoard() { return startBoard; }
  let board = $state(initialBoard());
  let phase = $state<Phase>('setup');
  let selectedSquare = $state<SquareId | null>(null);
  let wrongMoveSquare = $state<SquareId | null>(null);
  let showHint = $state(false);
  let opponentSlide = $state<SlideAnimation | null>(null);
  let waiting = $state(false);
  let lineComplete = $state(false);
  let allDone = $state(false);
  let dragFrom = $state<SquareId | null>(null);
  let browsing = $derived(moveIdx < maxReachedIdx);
  let atFrontier = $derived(moveIdx >= maxReachedIdx);

  let currentLine = $derived(phase !== 'setup' && activeLines.length > 0 ? activeLines[lineIdx] : lines[0]);
  let isPlayerTurn = $derived(moveIdx < currentLine.length && currentLine[moveIdx].colorPlayed === playerColor);
  let atEnd = $derived(moveIdx >= currentLine.length);

  let currentComment = $derived.by(() => {
    if (phase === 'setup' || moveIdx === 0) return undefined;
    return currentLine[moveIdx - 1].comment;
  });

  let arrows = $derived.by((): Arrow[] | undefined => {
    if (phase === 'setup' || atEnd || !isPlayerTurn || waiting || browsing) return undefined;
    if (phase === 'learn' || showHint) {
      const move = currentLine[moveIdx];
      return [{ from: move.from, to: move.to, color: '#15803d' }];
    }
    return undefined;
  });

  let validMoves = $derived.by(() => {
    if (phase === 'setup' || !selectedSquare || waiting || atEnd || !isPlayerTurn || browsing) return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== playerColor) return [];
    return getLegalMoves(selectedSquare, board, playerColor);
  });

  let dragMoves = $derived.by(() => {
    if (phase === 'setup' || !dragFrom || waiting || atEnd || !isPlayerTurn || browsing) return [];
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
        white: w.san + (w.nag ?? ''),
        black: b ? b.san + (b.nag ?? '') : undefined,
        whiteIdx: i,
        blackIdx: b ? i + 1 : undefined,
      });
    }
    return pairs;
  });

  // === Setup helpers ===

  function toggleLine(idx: number) {
    const next = new Set(deselectedLines);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    deselectedLines = next;
  }

  function selectAll() { deselectedLines = new Set(); }
  function selectNone() { deselectedLines = new Set(lines.map((_, i) => i)); }

  function formatLinePreview(line: OpeningLine): string {
    const parts: string[] = [];
    for (let i = 0; i < Math.min(line.length, 12); i++) {
      if (line[i].colorPlayed === 'w') {
        parts.push(`${Math.floor(i / 2) + 1}.`);
      }
      parts.push(line[i].san + (line[i].nag ?? ''));
    }
    if (line.length > 12) parts.push('...');
    return parts.join(' ');
  }

  // === Drill control ===

  function startDrilling(mode: 'learn' | 'practice') {
    if (!canStart) return;
    phase = mode;
    lineIdx = 0;
    moveIdx = 0;
    maxReachedIdx = 0;
    board = startBoard;
    lineComplete = false;
    allDone = false;
    selectedSquare = null;
    wrongMoveSquare = null;
    showHint = false;
    waiting = false;
    opponentSlide = null;
    maybeAutoPlayOpponent();
  }

  function backToSetup() {
    phase = 'setup';
    lineIdx = 0;
    moveIdx = 0;
    maxReachedIdx = 0;
    board = startBoard;
    lineComplete = false;
    allDone = false;
    selectedSquare = null;
    wrongMoveSquare = null;
    showHint = false;
    waiting = false;
    opponentSlide = null;
  }

  function toggleMode() {
    phase = phase === 'learn' ? 'practice' : 'learn';
    showHint = false;
  }

  function jumpToLine(targetIdx: number) {
    if (targetIdx < 0 || targetIdx >= activeLines.length) return;
    const targetLine = activeLines[targetIdx];
    const bp = lineIdx < activeLines.length ? findBranchPoint(activeLines[lineIdx], targetLine) : 0;
    const newBoard = bp > 0 ? targetLine[bp - 1].boardAfter : startBoard;

    lineIdx = targetIdx;
    moveIdx = bp;
    maxReachedIdx = bp;
    board = newBoard;
    lineComplete = false;
    allDone = false;
    selectedSquare = null;
    wrongMoveSquare = null;
    showHint = false;
    waiting = false;
    opponentSlide = null;

    if (bp < targetLine.length && targetLine[bp].colorPlayed !== playerColor) {
      setTimeout(() => autoPlayOpponent(bp, targetLine), 400);
    }
  }

  // === Drill logic ===

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
      if (nextIdx > maxReachedIdx) maxReachedIdx = nextIdx;

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
    const line = activeLines[lineIdx];
    if (moveIdx < line.length && line[moveIdx].colorPlayed !== playerColor) {
      setTimeout(() => autoPlayOpponent(moveIdx, line), 400);
    }
  }

  function advanceLine() {
    lineComplete = false;
    selectedSquare = null;

    if (lineIdx + 1 < activeLines.length) {
      const nextLine = activeLines[lineIdx + 1];
      const bp = findBranchPoint(currentLine, nextLine);
      const newBoard = bp > 0 ? nextLine[bp - 1].boardAfter : startBoard;

      lineIdx = lineIdx + 1;
      moveIdx = bp;
      maxReachedIdx = bp;
      board = newBoard;

      if (bp < nextLine.length && nextLine[bp].colorPlayed !== playerColor) {
        setTimeout(() => autoPlayOpponent(bp, nextLine), 400);
      }
    } else if (phase === 'learn') {
      allDone = true;
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
      if (nextIdx > maxReachedIdx) maxReachedIdx = nextIdx;

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
    if (phase === 'setup' || waiting || atEnd || lineComplete) return;
    // If browsing, snap back to frontier on any click
    if (browsing) {
      navigateTo(maxReachedIdx);
      return;
    }
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
    if (phase === 'setup' || waiting || atEnd || lineComplete || from === to) return;
    if (browsing) {
      navigateTo(maxReachedIdx);
      return;
    }
    if (!isPlayerTurn) return;
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

  // === Move list navigation ===

  function navigateTo(idx: number) {
    if (waiting || phase === 'setup') return;
    if (idx < 0 || idx > currentLine.length) return;
    // In practice mode, can only navigate to already-seen moves
    if (phase === 'practice' && idx > maxReachedIdx) return;

    moveIdx = idx;
    board = idx > 0 ? currentLine[idx - 1].boardAfter : startBoard;
    selectedSquare = null;
    wrongMoveSquare = null;
    showHint = false;
    opponentSlide = null;
  }

  function goBack() {
    navigateTo(moveIdx - 1);
  }

  function goForward() {
    if (moveIdx < maxReachedIdx) {
      navigateTo(moveIdx + 1);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (phase === 'setup') return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goBack();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goForward();
    }
  }

  // Auto-scroll active move into view
  let moveListEl = $state<HTMLDivElement | null>(null);
  $effect(() => {
    if (!moveListEl) return;
    const active = moveListEl.querySelector('.move.current');
    if (active) {
      active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if phase === 'setup'}
  <div class="trainer">
    <div class="header">
      <h2>{opening.name}</h2>
      {#if opening.description}
        <p class="description">{opening.description}</p>
      {/if}
    </div>

    <div class="setup-summary">
      {lines.length} line{lines.length === 1 ? '' : 's'} found
      {#if activeLines.length < lines.length}
        &middot; {activeLines.length} selected
      {/if}
    </div>

    <div class="setup-controls">
      <button class="btn btn-sm" onclick={selectAll}>All</button>
      <button class="btn btn-sm" onclick={selectNone}>None</button>
    </div>

    <div class="line-list">
      {#each lines as line, i}
        <label class="line-item">
          <input
            type="checkbox"
            checked={!deselectedLines.has(i)}
            onchange={() => toggleLine(i)}
          />
          <span class="line-num">{i + 1}.</span>
          <span class="line-preview">{formatLinePreview(line)}</span>
        </label>
      {/each}
    </div>

    <div class="setup-actions">
      <button class="btn" onclick={() => startDrilling('learn')} disabled={!canStart}>
        Start learning
      </button>
      <button class="btn btn-secondary" onclick={() => startDrilling('practice')} disabled={!canStart}>
        Start practicing
      </button>
    </div>
  </div>
{:else}
  <div class="trainer">
    <div class="header">
      <h2>{opening.name}</h2>
    </div>

    <div class="info-row">
      <button
        class="nav-btn"
        onclick={() => jumpToLine(lineIdx - 1)}
        disabled={lineIdx === 0 || waiting}
        aria-label="Previous line"
      >&lsaquo;</button>
      <span>Line {lineIdx + 1} of {activeLines.length}</span>
      <button
        class="nav-btn"
        onclick={() => jumpToLine(lineIdx + 1)}
        disabled={lineIdx >= activeLines.length - 1 || waiting}
        aria-label="Next line"
      >&rsaquo;</button>
      <span class="mode-sep">&middot;</span>
      <span class={['mode-badge', phase]}>{phase === 'learn' ? 'Learning' : 'Practicing'}</span>
      <button class="btn btn-sm" onclick={toggleMode}>
        {phase === 'learn' ? 'Practice' : 'Learn'}
      </button>
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
            {#if phase === 'learn'}
              <div class="done-check">&#10003;</div>
              <p class="done-title">Lines learned!</p>
              <button class="btn" onclick={() => startDrilling('practice')}>
                Practice now
              </button>
              <button class="btn btn-secondary done-btn" onclick={backToSetup}>
                Back to setup
              </button>
            {:else}
              <div class="done-check">&#10003;</div>
              <p class="done-title">Lines mastered!</p>
              <button class="btn" onclick={() => startDrilling('practice')}>
                Practice again
              </button>
              <button class="btn btn-secondary done-btn" onclick={backToSetup}>
                Back to setup
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <div class="status">
      {#if lineComplete && !allDone}
        <div class="line-complete">
          <span class="complete-text">Line complete!</span>
          <button class="btn btn-sm" onclick={advanceLine}>
            {#if lineIdx + 1 < activeLines.length}
              Next variation
            {:else}
              Finish
            {/if}
          </button>
        </div>
      {/if}
      {#if !lineComplete && !allDone && atFrontier && isPlayerTurn && !waiting}
        <span class="muted">
          {phase === 'learn' ? 'Follow the arrow' : 'Your move'}
        </span>
      {/if}
      {#if !lineComplete && !allDone && atFrontier && !isPlayerTurn && !waiting && !atEnd}
        <span class="muted">Opponent is thinking...</span>
      {/if}
    </div>

    {#if currentComment}
      <div class="comment-box">
        <p>{currentComment}</p>
      </div>
    {/if}

    <div class="move-list" bind:this={moveListEl}>
      <div class="moves">
        {#each moveDisplay as pair}
          {@const whiteReached = maxReachedIdx > pair.whiteIdx}
          {@const blackReached = pair.blackIdx !== undefined && maxReachedIdx > pair.blackIdx}
          {@const whitePlayed = moveIdx > pair.whiteIdx}
          {@const blackPlayed = pair.blackIdx !== undefined && moveIdx > pair.blackIdx}
          {@const hideWhite = phase === 'practice' && !whiteReached}
          {@const hideBlack = phase === 'practice' && !blackReached}
          {#if phase === 'learn' || whiteReached || maxReachedIdx === pair.whiteIdx || blackReached}
            <span class="move-pair">
              <span class="move-num">{pair.num}.</span>
              <button
                class={['move', whitePlayed && 'played', moveIdx === pair.whiteIdx + 1 && 'current']}
                onclick={() => navigateTo(pair.whiteIdx + 1)}
                disabled={hideWhite}
              >
                {hideWhite ? '...' : pair.white}
              </button>
              {#if pair.black}
                {' '}
                <button
                  class={['move', blackPlayed && 'played', pair.blackIdx !== undefined && moveIdx === pair.blackIdx + 1 && 'current']}
                  onclick={() => pair.blackIdx !== undefined && navigateTo(pair.blackIdx + 1)}
                  disabled={hideBlack}
                >
                  {hideBlack ? '...' : pair.black}
                </button>
              {/if}
            </span>
          {/if}
        {/each}
      </div>
    </div>

    <button class="btn btn-secondary" onclick={backToSetup}>
      Back to setup
    </button>
  </div>
{/if}

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

  /* === Setup === */

  .setup-summary {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .setup-controls {
    display: flex;
    gap: 0.5rem;
  }

  .line-list {
    width: 100%;
    max-width: 32rem;
    max-height: 20rem;
    overflow-y: auto;
    border: 1px solid var(--card-border);
    border-radius: 0.5rem;
    background: var(--card-bg);
  }

  .line-item {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: 0.8125rem;
    cursor: pointer;
    border-bottom: 1px solid var(--card-border);
    line-height: 1.4;
  }

  .line-item:last-child {
    border-bottom: none;
  }

  .line-item:hover {
    background: var(--btn-bg);
  }

  .line-item input[type="checkbox"] {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .line-num {
    color: var(--text-faint);
    flex-shrink: 0;
    min-width: 1.5rem;
  }

  .line-preview {
    color: var(--text-muted);
    word-break: break-word;
  }

  .setup-actions {
    display: flex;
    gap: 0.75rem;
  }

  /* === Drill info row === */

  .info-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-faint);
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-btn {
    background: var(--btn-bg);
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.125rem;
    line-height: 1;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    transition: background 0.15s;
  }

  .nav-btn:hover:not(:disabled) {
    background: var(--btn-hover);
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .mode-sep {
    color: var(--text-faint);
  }

  .mode-badge {
    font-weight: 500;
  }

  .mode-badge.learn {
    color: #60a5fa;
  }

  .mode-badge.practice {
    color: #fbbf24;
  }

  /* === Board === */

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
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
  }

  .done-check {
    font-size: 2.5rem;
  }

  .done-title {
    font-size: 1.125rem;
    font-weight: bold;
  }

  .done-btn {
    margin-top: 0.25rem;
  }

  /* === Status & comments === */

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

  /* === Move list === */

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
    background: none;
    border: none;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
  }

  .move:hover:not(:disabled) {
    background: var(--btn-bg);
  }

  .move:disabled {
    cursor: default;
  }

  .move.played {
    color: var(--foreground);
  }

  .move.current {
    color: var(--foreground);
    font-weight: bold;
    background: var(--btn-bg);
  }

  /* === Buttons === */

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

  .btn:hover:not(:disabled) {
    background: var(--btn-hover);
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .btn-secondary {
    background: transparent;
    border: 1px solid var(--card-border);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--btn-bg);
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }
</style>
