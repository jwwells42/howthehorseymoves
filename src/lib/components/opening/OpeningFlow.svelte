<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import BoardOverlay from '$lib/components/board/BoardOverlay.svelte';
  import NotationBoard from '$lib/components/board/NotationBoard.svelte';
  import MoveNav from '$lib/components/board/MoveNav.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Choice from '$lib/components/ui/Choice.svelte';
  import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
  import { MARK, highlight } from '$lib/board-marks';
  import type { BoardState } from '$lib/logic/types';
  import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';
  import { playSound } from '$lib/state/sound';
  import { type Opening, type OpeningLine, findBranchPoint } from '$lib/openings';
  import { SPEED_OPTIONS } from './study-order';

  /**
   * Flow: the lines play themselves, one after another, to watch (after
   * qchess's Repertoire Flow). At the end of a line it holds a moment, then
   * steps back to where the next line leaves this one and plays on from
   * there. ◀ ▶ and the move list step by hand, which pauses it.
   * Blindfold: the moves are written out instead of played on a board.
   */

  interface Props {
    opening: Opening;
    startBoard: BoardState;
    lines: OpeningLine[];
    /** Milliseconds per move */
    speed: number;
    blindfold: boolean;
    onExit: () => void;
  }

  let { opening, startBoard, lines, speed = $bindable(), blindfold, onExit }: Props = $props();

  /** How fast it steps back to where the next line starts */
  const REWIND_MS = 120;

  let flipped = $derived(opening.color === 'b');

  function initialBoard() { return startBoard; }
  let lineIdx = $state(0);
  let moveIdx = $state(0);
  let board = $state(initialBoard());
  let opponentSlide = $state<SlideAnimation | null>(null);
  let playing = $state(false);
  let finished = $state(false);

  let line = $derived(lines[lineIdx]);
  let lastMove = $derived(moveIdx > 0 ? line[moveIdx - 1] : null);
  let comment = $derived(lastMove?.comment);
  let arrows = $derived(lastMove?.arrows);
  let highlights = $derived(lastMove ? highlight([lastMove.from, lastMove.to], MARK.note) : []);

  // Held at the end of a line: longer when the moves are slower
  let endPause = $derived(Math.max(1500, 2 * speed));

  function boardAt(l: OpeningLine, idx: number): BoardState {
    return idx > 0 ? l[idx - 1].boardAfter : startBoard;
  }

  // === The clock: one timer, whatever comes next ===

  let timer: ReturnType<typeof setTimeout> | null = null;
  let slideTimer: ReturnType<typeof setTimeout> | null = null;

  function stopTimer() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function after(ms: number, fn: () => void) {
    stopTimer();
    timer = setTimeout(() => {
      timer = null;
      fn();
    }, ms);
  }

  /** Plays the next move of this line, sliding. */
  function playForward() {
    const move = line[moveIdx];
    const piece = board.pieces.get(move.from);
    opponentSlide = { piece: piece?.piece ?? 'P', color: move.colorPlayed, from: move.from, to: move.to };
    board = move.boardAfter;
    moveIdx += 1;
    playSound('move');
    if (slideTimer) clearTimeout(slideTimer);
    slideTimer = setTimeout(() => (opponentSlide = null), 400);
  }

  function tick() {
    if (!playing) return;
    if (moveIdx < line.length) {
      playForward();
      after(moveIdx < line.length ? speed : endPause, tick);
      return;
    }
    // End of the line: on to the next, or done
    if (lineIdx + 1 < lines.length) {
      rewindTo(lineIdx + 1);
    } else {
      playing = false;
      finished = true;
      playSound('correct');
    }
  }

  /** Steps back, a move at a time, to where line `target` leaves this one, then plays on. */
  function rewindTo(target: number) {
    const bp = findBranchPoint(line, lines[target]);
    const step = () => {
      if (!playing) return;
      if (moveIdx > bp) {
        moveIdx -= 1;
        opponentSlide = null;
        board = boardAt(line, moveIdx);
        after(REWIND_MS, step);
      } else {
        // The boards are the same up to here, so the switch doesn't show
        lineIdx = target;
        after(speed, tick);
      }
    };
    after(REWIND_MS, step);
  }

  function play() {
    if (finished) {
      finished = false;
      lineIdx = 0;
      moveIdx = 0;
      board = startBoard;
    }
    playing = true;
    after(moveIdx === 0 ? 600 : speed / 2, tick);
  }

  function pause() {
    playing = false;
    stopTimer();
  }

  function togglePlay() {
    if (playing) pause();
    else play();
  }

  // === By hand: each of these pauses ===

  function goTo(idx: number) {
    pause();
    finished = false;
    moveIdx = Math.max(0, Math.min(idx, line.length));
    opponentSlide = null;
    board = boardAt(line, moveIdx);
  }

  function goToLine(target: number) {
    if (target < 0 || target >= lines.length) return;
    pause();
    finished = false;
    const bp = findBranchPoint(line, lines[target]);
    lineIdx = target;
    moveIdx = bp;
    opponentSlide = null;
    board = boardAt(lines[target], bp);
  }

  function handleKeydown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input,button,select,textarea')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(moveIdx - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(moveIdx + 1);
    } else if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
    }
  }

  onMount(play);
  onDestroy(() => {
    stopTimer();
    if (slideTimer) clearTimeout(slideTimer);
  });

  let moveRows = $derived.by(() => {
    const rows: { num: number; plies: number[] }[] = [];
    for (let i = 0; i < line.length; i += 2) {
      rows.push({ num: i / 2 + 1, plies: i + 1 < line.length ? [i, i + 1] : [i] });
    }
    return rows;
  });

  // Keep the move on the board in view in the list
  let moveListEl = $state<HTMLDivElement | null>(null);
  $effect(() => {
    void moveIdx;
    void lineIdx;
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
</script>

<svelte:window onkeydown={handleKeydown} />

<BoardLayout>
  {#snippet headerArea()}
    <div class="flow-header">
      <h2 class="flow-title">{opening.name}</h2>
      <div class="line-nav">
        <button class="nav-btn" onclick={() => goToLine(lineIdx - 1)} disabled={lineIdx === 0} aria-label="Previous line">&lsaquo;</button>
        <span>Line {lineIdx + 1} of {lines.length}</span>
        <button class="nav-btn" onclick={() => goToLine(lineIdx + 1)} disabled={lineIdx >= lines.length - 1} aria-label="Next line">&rsaquo;</button>
      </div>
      <ProgressBar value={lineIdx + (moveIdx >= line.length ? 1 : 0)} max={lines.length} label="Lines watched" />
    </div>
  {/snippet}

  {#snippet boardArea()}
    {#if blindfold}
      <NotationBoard moves={line.slice(0, moveIdx)} label={opening.name} />
    {:else}
      <Board {board} {opponentSlide} {arrows} {highlights} {flipped} playableColors={[]} label={opening.name} />
    {/if}
    {#if finished}
      <BoardOverlay>
        <div class="done-check" aria-hidden="true">&#10003;</div>
        <Button variant="primary" onclick={play}><span aria-hidden="true">&#8634;</span> Again</Button>
        <Button onclick={onExit}>Back to setup</Button>
      </BoardOverlay>
    {/if}
  {/snippet}

  {#snippet sidebarArea()}
    <MoveNav
      canGoBack={moveIdx > 0}
      canGoForward={moveIdx < line.length}
      onStart={() => goTo(0)}
      onBack={() => goTo(moveIdx - 1)}
      onForward={() => goTo(moveIdx + 1)}
      onEnd={() => goTo(line.length)}
      onTogglePlay={togglePlay}
      {playing}
    />

    <Choice label="Speed" hideLabel options={SPEED_OPTIONS} bind:value={speed} />

    {#if comment}
      <div class="comment-area">
        <p class="comment-text">{comment}</p>
      </div>
    {/if}

    <div class="move-list" bind:this={moveListEl}>
      <div class="move-grid">
        {#each moveRows as row (row.num)}
          <span class="move-num">{row.num}.</span>
          {#each row.plies as ply (ply)}
            {@const move = line[ply]}
            {@const active = moveIdx === ply + 1}
            <button
              class={['move-btn', moveIdx > ply && 'move-played', active && 'move-active']}
              data-active={active}
              onclick={() => goTo(ply + 1)}
            >
              {move.san}{move.nag ?? ''}
            </button>
          {/each}
          {#if row.plies.length === 1}<span></span>{/if}
        {/each}
      </div>
    </div>

    <div class="flow-footer">
      <Button onclick={onExit}>&larr; Setup</Button>
    </div>
  {/snippet}
</BoardLayout>

<style>
  .flow-header {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    width: 100%;
    text-align: center;
  }

  .flow-title {
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

  .done-check {
    font-size: 2.5rem;
    color: var(--correct-text);
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

  .move-btn:hover {
    background: var(--surface-raised);
  }

  .move-btn.move-played {
    color: var(--ink);
  }

  .move-btn.move-active {
    background: var(--line);
    font-weight: var(--weight-strong);
  }

  .flow-footer {
    display: flex;
    justify-content: flex-end;
    width: 100%;
    flex-shrink: 0;
  }
</style>
