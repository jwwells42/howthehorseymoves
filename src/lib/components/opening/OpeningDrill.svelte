<script lang="ts">
  import { onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import BoardOverlay from '$lib/components/board/BoardOverlay.svelte';
  import NotationBoard from '$lib/components/board/NotationBoard.svelte';
  import AnswerInput from '$lib/components/blindfold/AnswerInput.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
  import { MARK } from '$lib/board-marks';
  import type { SquareId, BoardState } from '$lib/logic/types';
  import { getLegalMoves } from '$lib/logic/attacks';
  import { type Arrow, readTypedMove } from '$lib/logic/pgn';
  import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';
  import { playSound } from '$lib/state/sound';
  import { type Opening, type OpeningLine, findBranchPoint } from '$lib/openings';
  import { type MoveProgress, type MoveState, type PassKind, NEW, afterMove, buildPass, stateOf } from '$lib/openings/progress';

  /**
   * Playing an opening's lines from memory: learning (breadth or depth) or
   * review. A move not played before is shown with an arrow; one played
   * before is played from memory, and a mistake brings its arrow back. Every
   * move played is saved (see $lib/openings/progress), which is what decides
   * when it comes back for review.
   *
   * Blindfold: no board, only the moves written out, and the student types
   * each move. A new move is written out where its arrow would be.
   */

  interface Props {
    opening: Opening;
    startBoard: BoardState;
    /** The lines picked on the lobby */
    lines: OpeningLine[];
    order: PassKind;
    perVisit: number;
    progress: MoveProgress;
    onStates: (states: Record<string, MoveState>) => void;
    autoNext: boolean;
    blindfold: boolean;
    onExit: () => void;
  }

  let { opening, startBoard, lines, order, perVisit, progress, onStates, autoNext, blindfold, onExit }: Props = $props();

  let playerColor = $derived(opening.color);
  let flipped = $derived(playerColor === 'b');

  // The visits this pass makes, worked out when it starts so that what is
  // learned along the way doesn't change the lines mid-pass
  function newPass() {
    return buildPass(lines, playerColor, order, perVisit, progress);
  }
  let pass = $state.raw<OpeningLine[]>(newPass());

  function initialBoard() { return startBoard; }
  let lineIdx = $state(0);
  let moveIdx = $state(0);
  let maxReachedIdx = $state(0);
  let board = $state(initialBoard());
  let selectedSquare = $state<SquareId | null>(null);
  let wrongMoveSquare = $state<SquareId | null>(null);
  let showHint = $state(false);
  let opponentSlide = $state<SlideAnimation | null>(null);
  let waiting = $state(false);
  let lineComplete = $state(false);
  let passDone = $state(false);
  let dragFrom = $state<SquareId | null>(null);
  // Blindfold: the move being typed, and what was wrong with the last one
  let typed = $state('');
  let typedError = $state<string | null>(null);

  let currentLine = $derived(pass[lineIdx]);
  let linesDone = $derived(lineIdx + (lineComplete || passDone ? 1 : 0));
  let browsing = $derived(moveIdx < maxReachedIdx);
  let atFrontier = $derived(moveIdx >= maxReachedIdx);
  let isPlayerTurn = $derived(moveIdx < currentLine.length && currentLine[moveIdx].colorPlayed === playerColor);
  let atEnd = $derived(moveIdx >= currentLine.length);

  // A move of the student's not played yet: it gets an arrow
  function isNew(i: number) {
    const move = currentLine[i];
    return move !== undefined && move.colorPlayed === playerColor && stateOf(progress, move.key) === NEW;
  }

  let showArrow = $derived(!atEnd && isPlayerTurn && !waiting && !browsing && (isNew(moveIdx) || showHint));

  let currentComment = $derived.by(() => {
    // With an arrow up, show the comment for the upcoming move alongside it
    if (showArrow) {
      const upcoming = currentLine[moveIdx].comment;
      if (upcoming) return upcoming;
    }
    // Otherwise show the comment for the move just played
    if (moveIdx === 0) return undefined;
    return currentLine[moveIdx - 1].comment;
  });

  let arrows = $derived.by((): Arrow[] | undefined => {
    const all: Arrow[] = moveIdx > 0 ? [...(currentLine[moveIdx - 1].arrows ?? [])] : [];
    if (showArrow) {
      const move = currentLine[moveIdx];
      all.push({ from: move.from, to: move.to, color: MARK.good });
    }
    return all.length > 0 ? all : undefined;
  });

  let validMoves = $derived.by(() => {
    if (!selectedSquare || waiting || atEnd || !isPlayerTurn || browsing) return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== playerColor) return [];
    return getLegalMoves(selectedSquare, board, playerColor);
  });

  let dragMoves = $derived.by(() => {
    if (!dragFrom || waiting || atEnd || !isPlayerTurn || browsing) return [];
    const p = board.pieces.get(dragFrom);
    if (!p || p.color !== playerColor) return [];
    return getLegalMoves(dragFrom, board, playerColor);
  });

  // The move list shows what has been played, and the moves coming up while
  // they're new (the arrows will show them anyway). A move to play from
  // memory stays "…" until it's played.
  let revealedTo = $derived.by(() => {
    let i = maxReachedIdx;
    while (i < currentLine.length && (currentLine[i].colorPlayed !== playerColor || isNew(i))) i++;
    return i;
  });

  let moveRows = $derived.by(() => {
    const last = Math.max(maxReachedIdx, revealedTo - 1);
    const rows: { num: number; plies: number[] }[] = [];
    for (let i = 0; i < currentLine.length && i <= last; i += 2) {
      rows.push({ num: i / 2 + 1, plies: i + 1 < currentLine.length ? [i, i + 1] : [i] });
    }
    return rows;
  });

  // === Moving through the pass ===

  function resetLine(line: number, move: number, newBoard: BoardState) {
    lineIdx = line;
    moveIdx = move;
    maxReachedIdx = move;
    board = newBoard;
    lineComplete = false;
    selectedSquare = null;
    wrongMoveSquare = null;
    showHint = false;
    waiting = false;
    opponentSlide = null;
    typedError = null;
  }

  // Each line starts where it leaves the one before
  function goToLine(targetIdx: number) {
    if (targetIdx < 0 || targetIdx >= pass.length) return;
    const target = pass[targetIdx];
    const bp = findBranchPoint(currentLine, target);
    resetLine(targetIdx, bp, bp > 0 ? target[bp - 1].boardAfter : startBoard);
    maybeAutoPlayOpponent();
  }

  function advanceLine() {
    if (lineIdx + 1 < pass.length) goToLine(lineIdx + 1);
    else passDone = true;
  }

  function keepGoing() {
    pass = newPass();
    passDone = false;
    resetLine(0, 0, startBoard);
    maybeAutoPlayOpponent();
  }

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
      playSound('move');

      setTimeout(() => {
        opponentSlide = null;
        waiting = false;
        if (nextIdx >= line.length) {
          lineComplete = true;
          playSound('correct');
        }
      }, 400);
    }, 300);
  }

  function maybeAutoPlayOpponent() {
    const line = pass[lineIdx];
    if (moveIdx < line.length && line[moveIdx].colorPlayed !== playerColor) {
      const at = moveIdx;
      setTimeout(() => autoPlayOpponent(at, line), 400);
    }
  }

  // Start the first line
  onMount(() => {
    maybeAutoPlayOpponent();
  });

  function executePlayerMove(from: SquareId, to: SquareId) {
    if (atEnd || !isPlayerTurn || waiting) return;

    const expected = currentLine[moveIdx];
    if (from === expected.from && to === expected.to) {
      // Played with help (an arrow) it's seen; from memory when due, a box up
      const after = afterMove(progress, expected.key, showHint, Math.floor(Date.now() / 1000));
      if (after !== null) onStates({ [expected.key]: after });

      board = expected.boardAfter;
      selectedSquare = null;
      showHint = false;
      wrongMoveSquare = null;
      const nextIdx = moveIdx + 1;
      moveIdx = nextIdx;
      if (nextIdx > maxReachedIdx) maxReachedIdx = nextIdx;
      playSound('move');

      if (nextIdx >= currentLine.length) {
        lineComplete = true;
        playSound('correct');
      } else if (currentLine[nextIdx].colorPlayed !== playerColor) {
        autoPlayOpponent(nextIdx, currentLine);
      }
    } else {
      wrongMoveSquare = to;
      showHint = true;
      selectedSquare = null;
      playSound('wrong');
      setTimeout(() => (wrongMoveSquare = null), 600);
    }
  }

  function handleSquareClick(sq: SquareId) {
    if (waiting || atEnd || lineComplete) return;
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
    if (waiting || atEnd || lineComplete || from === to) return;
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

  // Blindfold: a typed move is played as if it were played on the board.
  // Text that isn't a legal move is only marked ✗, as the board wouldn't
  // have let it be played.
  function submitTyped() {
    if (waiting || lineComplete || passDone) return;
    if (browsing) navigateTo(maxReachedIdx);
    const text = typed.trim();
    typed = '';
    if (atEnd || !isPlayerTurn || !text) return;
    const move = readTypedMove(text, board, playerColor);
    const expected = currentLine[moveIdx];
    typedError = move && move.from === expected.from && move.to === expected.to ? null : `✗ ${text}`;
    if (move) executePlayerMove(move.from, move.to);
  }

  // === Move list navigation: back through what has been played ===

  function navigateTo(idx: number) {
    if (waiting || idx < 0 || idx > maxReachedIdx) return;
    moveIdx = idx;
    board = idx > 0 ? currentLine[idx - 1].boardAfter : startBoard;
    selectedSquare = null;
    wrongMoveSquare = null;
    showHint = false;
    opponentSlide = null;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (passDone) return;
    // The arrow keys move the cursor in the blindfold move box
    if ((e.target as HTMLElement | null)?.closest('input,textarea')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateTo(moveIdx - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateTo(moveIdx + 1);
    }
  }

  // Auto-scroll active move into view
  let moveListEl = $state<HTMLDivElement | null>(null);
  $effect(() => {
    void moveIdx;
    if (!moveListEl) return;
    const active = moveListEl.querySelector("[data-active='true']") as HTMLElement | null;
    if (!active) return;
    const top = active.offsetTop - moveListEl.offsetTop;
    const bottom = top + active.offsetHeight;
    if (top < moveListEl.scrollTop) {
      moveListEl.scrollTop = top;
    } else if (bottom > moveListEl.scrollTop + moveListEl.clientHeight) {
      moveListEl.scrollTop = bottom - moveListEl.clientHeight;
    }
  });

  // Blindfold: the keyboard goes to the button to press next, so Enter goes on
  let nextLineButton = $state<Button>();
  let keepGoingButton = $state<Button>();
  $effect(() => {
    if (!blindfold) return;
    if (passDone) keepGoingButton?.focus();
    else if (lineComplete) nextLineButton?.focus();
  });

  // Auto-advance to the next line
  $effect(() => {
    if (!autoNext || !lineComplete || passDone) return;
    const timer = setTimeout(() => advanceLine(), 800);
    return () => clearTimeout(timer);
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<BoardLayout>
  <!-- Where am I: above the board on a phone, top of the sidebar otherwise -->
  {#snippet headerArea()}
    <div class="drill-header">
      <h2 class="drill-title">{opening.name}</h2>
      <div class="line-nav">
        <button
          class="nav-btn"
          onclick={() => goToLine(lineIdx - 1)}
          disabled={lineIdx === 0 || waiting}
          aria-label="Previous line"
        >&lsaquo;</button>
        <span>Line {lineIdx + 1} of {pass.length}</span>
        <button
          class="nav-btn"
          onclick={() => goToLine(lineIdx + 1)}
          disabled={lineIdx >= pass.length - 1 || waiting}
          aria-label="Next line"
        >&rsaquo;</button>
      </div>
      <ProgressBar value={linesDone} max={pass.length} label="Lines done" />
    </div>
  {/snippet}

  {#snippet boardArea()}
    {#if blindfold}
      <NotationBoard
        moves={currentLine.slice(0, moveIdx)}
        ask={!atEnd && isPlayerTurn && !waiting && !browsing}
        label={opening.name}
      >
        <!-- Where the arrow would be: a new move, or the right one after a mistake -->
        <p class="hint">{#if showArrow}&rarr; {currentLine[moveIdx].san}{/if}</p>
        <AnswerInput
          bind:value={typed}
          onsubmit={submitTyped}
          label="Your move"
          maxlength={8}
          disabled={waiting || atEnd || lineComplete || passDone}
          error={typedError}
        />
      </NotationBoard>
    {:else}
      <Board
        {board}
        {selectedSquare}
        {validMoves}
        dragValidMoves={dragMoves}
        onSquareClick={handleSquareClick}
        onDrop={handleDrop}
        onDragStart={(sq) => (dragFrom = sq)}
        onDragEnd={() => (dragFrom = null)}
        {wrongMoveSquare}
        {opponentSlide}
        {arrows}
        {flipped}
        playableColors={[playerColor]}
      />
    {/if}
    {#if passDone}
      <BoardOverlay>
        <div class="done-check" aria-hidden="true">&#10003;</div>
        <Button bind:this={keepGoingButton} variant="primary" onclick={keepGoing}>Keep going</Button>
        <Button onclick={onExit}>Back to setup</Button>
      </BoardOverlay>
    {/if}
  {/snippet}

  {#snippet sidebarArea()}
    <!-- What to do now: always in this one place -->
    <div class="status">
      {#if lineComplete && !passDone}
        <span class="complete-text">✓</span>
        <Button bind:this={nextLineButton} variant="primary" onclick={advanceLine}>
          {lineIdx + 1 < pass.length ? 'Next line' : 'Finish'}
        </Button>
      {:else if !lineComplete && !passDone && atFrontier && !waiting && !atEnd && !isPlayerTurn}
        <span class="muted">…</span>
      {/if}
    </div>

    {#if currentComment}
      <div class="comment-area">
        <p class="comment-text">{currentComment}</p>
      </div>
    {/if}

    <div class="move-list" bind:this={moveListEl}>
      <div class="move-grid">
        {#each moveRows as row (row.num)}
          <span class="move-num">{row.num}.</span>
          {#each row.plies as ply (ply)}
            {@const move = currentLine[ply]}
            {@const shown = ply < maxReachedIdx || ply < revealedTo}
            {@const active = moveIdx === ply + 1}
            <button
              class={['move-btn', moveIdx > ply && 'move-played', active && 'move-active']}
              data-active={active}
              onclick={() => navigateTo(ply + 1)}
              disabled={ply >= maxReachedIdx}
            >
              {shown ? move.san + (move.nag ?? '') : '…'}
            </button>
          {/each}
          {#if row.plies.length === 1}<span></span>{/if}
        {/each}
      </div>
    </div>

    <div class="drill-footer">
      <Button onclick={onExit}>&larr; Setup</Button>
    </div>
  {/snippet}
</BoardLayout>

<style>
  .drill-header {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    width: 100%;
    text-align: center;
  }

  .drill-title {
    font-size: var(--size-secondary);
    font-weight: var(--weight-strong);
  }

  .line-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    font-size: var(--size-small);
    color: var(--ink-muted);
  }

  .nav-btn {
    background: var(--surface-raised);
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: var(--size-body);
    line-height: 1;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    transition: background 0.15s;
  }

  .nav-btn:hover:not(:disabled) {
    background: var(--line);
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  /* Keeps its height when empty, so the move box doesn't jump */
  .hint {
    min-height: 1.5em;
    margin: 0;
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
    color: var(--correct-text);
  }

  .done-check {
    font-size: 2.5rem;
    color: var(--correct-text);
  }

  /* Tall enough for the Next line button, so the sidebar doesn't jump */
  .status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    font-size: var(--size-secondary);
    min-height: 2.75rem;
    flex-shrink: 0;
  }

  .complete-text {
    color: var(--correct-text);
    font-weight: var(--weight-strong);
    font-size: var(--size-large);
  }

  .muted {
    color: var(--ink-muted);
  }

  .comment-area {
    width: 100%;
    max-height: 6rem;
    overflow-y: auto;
    border-radius: 0.5rem;
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 0.5rem 0.75rem;
    flex-shrink: 0;
  }

  .comment-text {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    text-align: center;
    margin: 0;
    line-height: 1.5;
  }

  .move-list {
    width: 100%;
    border-radius: 0.5rem;
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 0.75rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .move-grid {
    display: grid;
    grid-template-columns: 2rem minmax(0, 5rem) minmax(0, 5rem);
    column-gap: 0.25rem;
    row-gap: 0.125rem;
    font-size: var(--size-secondary);
  }

  .move-num {
    color: var(--ink-muted);
    text-align: right;
  }

  .move-btn {
    text-align: left;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    cursor: pointer;
    background: none;
    border: none;
    color: var(--ink-muted);
    font-family: inherit;
    font-size: inherit;
    transition: background-color 0.15s;
  }

  .move-btn:hover:not(:disabled) {
    background: var(--surface-raised);
  }

  .move-btn:disabled {
    cursor: default;
  }

  .move-btn.move-played {
    color: var(--ink);
  }

  .move-btn.move-active {
    background: var(--line);
    font-weight: var(--weight-strong);
  }

  .drill-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    width: 100%;
    flex-shrink: 0;
  }
</style>
