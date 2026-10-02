<script lang="ts">
  import { onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import BoardOverlay from '$lib/components/board/BoardOverlay.svelte';
  import PgnExplorer from '$lib/components/game/PgnExplorer.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Choice from '$lib/components/ui/Choice.svelte';
  import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
  import { MARK } from '$lib/board-marks';
  import { type SquareId, type BoardState } from '$lib/logic/types';
  import { getLegalMoves } from '$lib/logic/attacks';
  import type { Arrow } from '$lib/logic/pgn';
  import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';
  import { playSound } from '$lib/state/sound';
  import {
    type Opening,
    type OpeningLine,
    parseOpeningPgn,
    extractLines,
    findBranchPoint,
    truncateLines,
  } from '$lib/openings';

  type Phase = 'setup' | 'learn' | 'practice' | 'explore';

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

  // === Order: one line at a time (depth) or STEP moves at a time (breadth) ===
  const STEP = 3;
  // The ways to learn, as shown on the setup screen. A new way = a row here,
  // plus its rules in startDrilling, drillLines and isNew.
  const ORDERS: { value: 'depth' | 'breadth'; label: string; description: string }[] = [
    { value: 'breadth', label: `${STEP} moves at a time`, description: 'Every line, a few moves deeper each round' },
    { value: 'depth', label: 'One line at a time', description: 'Each line from start to finish' },
  ];
  function initialOrder() { return opening.defaultOrder ?? 'depth'; }
  let order = $state<'depth' | 'breadth'>(initialOrder());
  // How many of your moves are learned in breadth order — saved per built-in opening
  let learnedDepth = $state(0);
  // Where the drilled lines stop. Set when a drill starts rather than derived
  // from phase, so flipping Learn/Practice mid-drill keeps the same lines.
  let stageDepth = $state(Infinity);
  let maxDepth = $derived(Math.max(0, ...activeLines.map(
    (line) => line.filter((m) => m.colorPlayed === playerColor).length,
  )));
  let fullDepth = $derived(stageDepth >= maxDepth);
  let stageCount = $derived(Math.ceil(maxDepth / STEP));
  let learnedStages = $derived(Math.ceil(Math.min(learnedDepth, maxDepth) / STEP));
  let currentStage = $derived(Math.ceil(Math.min(stageDepth, maxDepth) / STEP) - 1);
  let allLearned = $derived(order === 'breadth' && maxDepth > 0 && learnedDepth >= maxDepth);

  // Your moves in step i (counting from 0), e.g. "4–6"
  function stepRange(i: number) {
    const first = i * STEP + 1;
    const last = Math.min((i + 1) * STEP, maxDepth);
    return first === last ? `${first}` : `${first}–${last}`;
  }

  // The Start buttons say what they will drill (see startDrilling)
  let learnLabel = $derived(
    order !== 'breadth' ? 'Start learning' : allLearned ? 'Learn again' : `Learn moves ${stepRange(learnedStages)}`,
  );
  let practiceLabel = $derived(
    order !== 'breadth' ? 'Start practicing'
      : allLearned ? 'Practice all moves'
      : `Practice moves 1–${Math.min(Math.max(learnedDepth, STEP), maxDepth)}`,
  );
  let drillLines = $derived(
    order === 'breadth' ? truncateLines(activeLines, playerColor, stageDepth) : activeLines,
  );

  onMount(() => {
    try { autoNext = localStorage.getItem('opening-auto-next') === 'true'; } catch {}
    if (opening.id === 'custom') return;
    try {
      const saved = parseInt(localStorage.getItem(`opening-${opening.id}-learned-depth`) ?? '', 10);
      if (saved > 0) {
        learnedDepth = saved;
        order = 'breadth';
      }
    } catch {}
  });

  function saveLearnedDepth() {
    if (opening.id === 'custom') return;
    try {
      if (learnedDepth > 0) localStorage.setItem(`opening-${opening.id}-learned-depth`, String(learnedDepth));
      else localStorage.removeItem(`opening-${opening.id}-learned-depth`);
    } catch {}
  }

  function saveAutoNext() {
    try { localStorage.setItem('opening-auto-next', String(autoNext)); } catch {}
  }

  function startOver() {
    learnedDepth = 0;
    saveLearnedDepth();
  }

  // White's Nth move is ply 2N-2 and Black's is 2N-1 (lines start with White)
  function moveNumber(i: number) {
    return Math.floor(i / 2) + 1;
  }

  // Learn mode shows arrows only on new moves. In breadth order, moves from
  // earlier stages are recalled without help (a mistake still brings the hint back).
  function isNew(i: number) {
    return phase === 'learn' && (order === 'depth' || moveNumber(i) > learnedDepth);
  }

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
  let autoNext = $state(false);

  // Explore mode state
  let exploreBoardOverride = $state<BoardState | null>(null);
  let exploreBoard = $derived(exploreBoardOverride ?? startBoard);
  let exploreArrows = $state<Arrow[] | undefined>(undefined);

  function onExploreBoardChange(b: BoardState, a?: Arrow[]) {
    exploreBoardOverride = b;
    exploreArrows = a;
  }
  let linesDone = $derived(lineIdx + (lineComplete || allDone ? 1 : 0));
  let browsing = $derived(moveIdx < maxReachedIdx);
  let atFrontier = $derived(moveIdx >= maxReachedIdx);

  let currentLine = $derived(phase !== 'setup' && drillLines.length > 0 ? drillLines[lineIdx] : lines[0]);
  let isPlayerTurn = $derived(moveIdx < currentLine.length && currentLine[moveIdx].colorPlayed === playerColor);
  let atEnd = $derived(moveIdx >= currentLine.length);
  let showArrow = $derived(!atEnd && isPlayerTurn && !waiting && !browsing && (isNew(moveIdx) || showHint));

  let currentComment = $derived.by(() => {
    if (phase === 'setup') return undefined;
    // With an arrow up, show the comment for the upcoming move alongside it
    if (showArrow) {
      const upcoming = currentLine[moveIdx].comment;
      if (upcoming) return upcoming;
    }
    // Otherwise show the comment for the move just played
    if (moveIdx === 0) return undefined;
    return currentLine[moveIdx - 1].comment;
  });

  // Annotation arrows from the most recently played move
  let annotationArrows = $derived.by((): Arrow[] => {
    if (phase === 'setup' || moveIdx === 0) return [];
    return currentLine[moveIdx - 1].arrows ?? [];
  });

  let arrows = $derived.by((): Arrow[] | undefined => {
    if (phase === 'setup') return undefined;
    const hintArrows: Arrow[] = [];
    if (showArrow) {
      const move = currentLine[moveIdx];
      hintArrows.push({ from: move.from, to: move.to, color: MARK.good });
    }
    const all = [...annotationArrows, ...hintArrows];
    return all.length > 0 ? all : undefined;
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

  // Each line is shown from where it leaves the line above it. Shown from the
  // start, lines that share a long trunk all looked the same.
  let linePreviews = $derived(lines.map((line, i) => formatLinePreview(line, i > 0 ? findBranchPoint(lines[i - 1], line) : 0)));

  function formatLinePreview(line: OpeningLine, from: number): string {
    const start = Math.min(from, line.length - 1);
    const end = Math.min(line.length, start + 8);
    const parts: string[] = [];
    for (let i = start; i < end; i++) {
      if (line[i].colorPlayed === 'w') parts.push(`${moveNumber(i)}.`);
      else if (i === start) parts.push(`${moveNumber(i)}…`);
      parts.push(line[i].san + (line[i].nag ?? ''));
    }
    if (end < line.length) parts.push('…');
    return parts.join(' ');
  }

  // === Drill control ===

  function resetDrill(line: number, move: number, newBoard: BoardState) {
    lineIdx = line;
    moveIdx = move;
    maxReachedIdx = move;
    board = newBoard;
    lineComplete = false;
    allDone = false;
    selectedSquare = null;
    wrongMoveSquare = null;
    showHint = false;
    waiting = false;
    opponentSlide = null;
  }

  function startDrilling(mode: 'learn' | 'practice') {
    if (!canStart) return;
    if (order === 'depth') {
      stageDepth = Infinity;
    } else if (mode === 'learn') {
      // Everything learned already: learn it again from the top
      if (learnedDepth >= maxDepth) learnedDepth = 0;
      stageDepth = learnedDepth + STEP;
    } else {
      // Practice what has been learned so far
      stageDepth = Math.max(learnedDepth, STEP);
    }
    phase = mode;
    resetDrill(0, 0, startBoard);
    maybeAutoPlayOpponent();
  }

  // Next stage in breadth order: the same lines, STEP moves deeper
  function goDeeper() {
    stageDepth += STEP;
    resetDrill(0, 0, startBoard);
    maybeAutoPlayOpponent();
  }

  function backToSetup() {
    phase = 'setup';
    resetDrill(0, 0, startBoard);
  }

  function setMode(mode: 'learn' | 'practice') {
    if (mode === phase) return;
    phase = mode;
    showHint = false;
  }

  function jumpToLine(targetIdx: number) {
    if (targetIdx < 0 || targetIdx >= drillLines.length) return;
    const targetLine = drillLines[targetIdx];
    const bp = lineIdx < drillLines.length ? findBranchPoint(drillLines[lineIdx], targetLine) : 0;
    const newBoard = bp > 0 ? targetLine[bp - 1].boardAfter : startBoard;

    resetDrill(targetIdx, bp, newBoard);

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
    const line = drillLines[lineIdx];
    if (moveIdx < line.length && line[moveIdx].colorPlayed !== playerColor) {
      setTimeout(() => autoPlayOpponent(moveIdx, line), 400);
    }
  }

  function advanceLine() {
    lineComplete = false;
    selectedSquare = null;

    if (lineIdx + 1 < drillLines.length) {
      const nextLine = drillLines[lineIdx + 1];
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
      if (order === 'breadth') {
        learnedDepth = Math.min(stageDepth, maxDepth);
        saveLearnedDepth();
      }
    } else {
      allDone = true;
      // Only full-length lines count as mastered
      if (fullDepth && opening.id !== 'custom') {
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

  // Auto-advance to next variation
  $effect(() => {
    if (!autoNext || !lineComplete || allDone) return;
    const timer = setTimeout(() => advanceLine(), 800);
    return () => clearTimeout(timer);
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- One dot per step of STEP moves: filled = learned, ringed = the step being
     learned. Readable without reading; the move numbers are for those who can. -->
{#snippet stepTrack(current: number, withNumbers: boolean)}
  <ol class="steps" aria-label={`Learned ${learnedStages} of ${stageCount} steps`}>
    {#each { length: stageCount }, i}
      <li class={['step', i < learnedStages && 'learned', i === current && 'current']}>
        <span class="dot"></span>
        {#if withNumbers}{stepRange(i)}{/if}
      </li>
    {/each}
  </ol>
{/snippet}

{#if phase === 'setup'}
  <div class="trainer">
    <div class="header">
      <h2>{opening.name}</h2>
      {#if opening.description}
        <p class="description">{opening.description}</p>
      {/if}
    </div>

    <!-- The next thing to do comes first; the settings are underneath -->
    {#if order === 'breadth' && canStart}
      <div class="progress">
        {@render stepTrack(allLearned ? -1 : learnedStages, true)}
        {#if learnedDepth > 0}
          <Button onclick={startOver}>Start over</Button>
        {/if}
      </div>
    {/if}

    <div class="setup-actions">
      <Button variant={allLearned ? 'secondary' : 'primary'} onclick={() => startDrilling('learn')} disabled={!canStart}>
        {learnLabel}
      </Button>
      <Button variant={allLearned ? 'primary' : 'secondary'} onclick={() => startDrilling('practice')} disabled={!canStart}>
        {practiceLabel}
      </Button>
      <Button onclick={() => (phase = 'explore')}>Explore</Button>
    </div>

    <div class="options">
      <Choice label="How to learn" stacked options={ORDERS} bind:value={order} />

      <details class="lines">
        <summary>
          Lines: {activeLines.length === lines.length ? `all ${lines.length}` : `${activeLines.length} of ${lines.length}`}
        </summary>
        <div class="setup-controls">
          <Button onclick={selectAll}>All</Button>
          <Button onclick={selectNone}>None</Button>
        </div>
        <div class="line-list">
          {#each linePreviews as preview, i}
            <label class="line-item">
              <input
                type="checkbox"
                checked={!deselectedLines.has(i)}
                onchange={() => toggleLine(i)}
              />
              <span class="line-num">{i + 1}.</span>
              <span class="line-preview">{preview}</span>
            </label>
          {/each}
        </div>
      </details>

      <label class="toggle-label">
        <input type="checkbox" bind:checked={autoNext} onchange={saveAutoNext} />
        Go to the next line by itself
      </label>
    </div>
  </div>
{:else if phase === 'explore'}
  <BoardLayout>
    {#snippet boardArea()}
      <Board
        board={exploreBoard}
        readOnly
        arrows={exploreArrows}
        {flipped}
      />
    {/snippet}

    {#snippet sidebarArea()}
      <PgnExplorer pgn={opening.pgn} {flipped} noBoard onBoardChange={onExploreBoardChange} />
      <div class="drill-footer">
        <Button onclick={backToSetup}>&larr; Setup</Button>
      </div>
    {/snippet}
  </BoardLayout>
{:else}
  <BoardLayout>
    <!-- Where am I: above the board on a phone, top of the sidebar otherwise -->
    {#snippet headerArea()}
      <div class="drill-header">
        <h2 class="drill-title">{opening.name}</h2>
        <div class="line-nav">
          <button
            class="nav-btn"
            onclick={() => jumpToLine(lineIdx - 1)}
            disabled={lineIdx === 0 || waiting}
            aria-label="Previous line"
          >&lsaquo;</button>
          <span>Line {lineIdx + 1} of {drillLines.length}</span>
          <button
            class="nav-btn"
            onclick={() => jumpToLine(lineIdx + 1)}
            disabled={lineIdx >= drillLines.length - 1 || waiting}
            aria-label="Next line"
          >&rsaquo;</button>
          {#if order === 'breadth'}
            <span class="stage">Moves 1–{Math.min(stageDepth, maxDepth)}</span>
          {/if}
        </div>
        <ProgressBar value={linesDone} max={drillLines.length} label="Lines done" />
      </div>
    {/snippet}

    {#snippet boardArea()}
      <Board
        {board}
        {selectedSquare}
        {validMoves}
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
        <BoardOverlay>
          <div class="done-check" aria-hidden="true">&#10003;</div>
          {#if !fullDepth}
            <!-- A stage in breadth order is done, but the lines go deeper -->
            {@render stepTrack(currentStage, false)}
            <p class="done-title">Moves 1–{stageDepth} {phase === 'learn' ? 'learned' : 'practiced'}!</p>
            {#if phase === 'learn'}
              <Button variant="primary" onclick={goDeeper}>Keep going</Button>
            {:else}
              <Button variant="primary" onclick={() => startDrilling('learn')}>Keep learning</Button>
            {/if}
          {:else if phase === 'learn'}
            <p class="done-title">Lines learned!</p>
            <Button variant="primary" onclick={() => startDrilling('practice')}>Practice now</Button>
          {:else}
            <p class="done-title">Lines mastered!</p>
            <Button variant="primary" onclick={() => startDrilling('practice')}>Practice again</Button>
          {/if}
          <Button onclick={backToSetup}>Back to setup</Button>
        </BoardOverlay>
      {/if}
    {/snippet}

    {#snippet sidebarArea()}
      <!-- What to do now: always in this one place -->
      <div class="status">
        {#if lineComplete && !allDone}
          <span class="complete-text">✓ Line done</span>
          <Button variant="primary" onclick={advanceLine}>
            {lineIdx + 1 < drillLines.length ? 'Next line' : 'Finish'}
          </Button>
        {:else if !lineComplete && !allDone && atFrontier && !waiting && !atEnd}
          <span class="muted">
            {isPlayerTurn ? (showArrow ? 'Follow the arrow' : 'Your move') : 'Opponent is thinking...'}
          </span>
        {/if}
      </div>

      {#if currentComment}
        <div class="comment-area">
          <p class="comment-text">{currentComment}</p>
        </div>
      {/if}

      <div class="move-list" bind:this={moveListEl}>
        <div class="move-grid">
          {#each moveDisplay as pair}
            {@const whiteReached = maxReachedIdx > pair.whiteIdx}
            {@const blackReached = pair.blackIdx !== undefined && maxReachedIdx > pair.blackIdx}
            {@const whitePlayed = moveIdx > pair.whiteIdx}
            {@const blackPlayed = pair.blackIdx !== undefined && moveIdx > pair.blackIdx}
            {@const hideWhite = !whiteReached && !isNew(pair.whiteIdx)}
            {@const hideBlack = !blackReached && !isNew(pair.blackIdx ?? pair.whiteIdx)}
            {@const whiteActive = moveIdx === pair.whiteIdx + 1}
            {@const blackActive = pair.blackIdx !== undefined && moveIdx === pair.blackIdx + 1}
            <!-- Upcoming new moves are listed once the student is past the recalled ones -->
            {#if (isNew(pair.whiteIdx) && isNew(maxReachedIdx)) || whiteReached || maxReachedIdx === pair.whiteIdx || blackReached}
              <span class="move-num">{pair.num}.</span>
              <button
                class={['move-btn', whitePlayed && 'move-played', whiteActive && 'move-active']}
                data-active={whiteActive}
                onclick={() => navigateTo(pair.whiteIdx + 1)}
                disabled={hideWhite}
              >
                {hideWhite ? '...' : pair.white}
              </button>
              {#if pair.black}
                <button
                  class={['move-btn', blackPlayed && 'move-played', blackActive && 'move-active']}
                  data-active={blackActive}
                  onclick={() => pair.blackIdx !== undefined && navigateTo(pair.blackIdx + 1)}
                  disabled={hideBlack}
                >
                  {hideBlack ? '...' : pair.black}
                </button>
              {:else}
                <span></span>
              {/if}
            {/if}
          {/each}
        </div>
      </div>

      <div class="drill-footer">
        <!-- Read the mode from phase, and change it through setMode. -->
        <Choice
          label="Mode"
          hideLabel
          options={[
            { value: 'learn', label: 'Learn' },
            { value: 'practice', label: 'Practice' },
          ]}
          bind:value={() => phase as 'learn' | 'practice', setMode}
        />
        <Button onclick={backToSetup}>&larr; Setup</Button>
      </div>
    {/snippet}
  </BoardLayout>
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
    /* The opening page is one screen high and doesn't scroll, so on a screen
       too short for the setup, the setup scrolls rather than being cut off. */
    min-height: 0;
    overflow-y: auto;
  }

  .header {
    text-align: center;
  }

  .header h2 {
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
    margin-bottom: 0.25rem;
  }

  .description {
    color: var(--ink-muted);
  }

  /* === Setup === */

  .progress {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  /* Step dots, each with its move numbers underneath */
  .steps {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.25rem 0.75rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--size-small);
    color: var(--ink-muted);
  }

  .dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    background: var(--line);
  }

  .step.learned .dot {
    background: var(--correct);
  }

  .step.current {
    color: var(--ink);
    font-weight: var(--weight-strong);
  }

  .step.current .dot {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }

  .setup-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
  }

  /* Settings sit under the actions, set apart by a rule */
  .options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 32rem;
    margin-top: 0.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--line);
  }

  .lines summary {
    cursor: pointer;
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }

  .lines summary:hover {
    color: var(--ink);
  }

  .lines[open] summary {
    margin-bottom: 0.75rem;
  }

  .setup-controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .line-list {
    max-height: 16rem;
    overflow-y: auto;
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    background: var(--surface);
  }

  .line-item {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: var(--size-small);
    cursor: pointer;
    border-bottom: 1px solid var(--line);
    line-height: 1.4;
  }

  .line-item:last-child {
    border-bottom: none;
  }

  .line-item:hover {
    background: var(--surface-raised);
  }

  .line-item input[type="checkbox"] {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .line-num {
    color: var(--ink-muted);
    flex-shrink: 0;
    min-width: 1.5rem;
  }

  .line-preview {
    color: var(--ink-muted);
    word-break: break-word;
  }

  .toggle-label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }

  .toggle-label input[type="checkbox"] {
    margin: 0;
  }

  .done-check {
    font-size: 2.5rem;
    color: var(--correct-text);
  }

  .done-title {
    font-size: var(--size-body);
    font-weight: var(--weight-strong);
  }

  /* === Drill: where am I, what to do now, the moves, then the controls === */

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

  .stage {
    margin-left: 0.75rem;
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

  .drill-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    flex-shrink: 0;
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
  }

  .muted {
    color: var(--ink-muted);
  }

  /* === Move list === */

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

</style>
