<script lang="ts">
  import { onMount } from 'svelte';
  import { Engine } from '$lib/engine/stockfish';
  import { formatScore, playLine, readUciMove, winChance, type EngineLine, type UciMove } from '$lib/engine/uci';
  import { boardToFen } from '$lib/logic/fen';
  import { hasLegalMoves, isInCheck } from '$lib/logic/attacks';
  import { MARK } from '$lib/board-marks';
  import type { Arrow } from '$lib/logic/pgn';
  import type { BoardState, PieceColor } from '$lib/logic/types';

  /**
   * Stockfish on the position on the board, for the sidebar: on/off, the eval
   * with a bar, and the best lines in SAN (tap a move to play the line up to
   * it). The best move comes back through `best`, for the board to draw.
   * Off by default; switched on, it stays on for this device (`engine-on`).
   */

  interface Props {
    board: BoardState;
    /** Side to move */
    color: PieceColor;
    fullMove: number;
    /** The best move as an arrow, for the board (bindable). */
    best?: Arrow | null;
    onPlay?: (moves: UciMove[]) => void;
  }

  let { board, color, fullMove, best = $bindable(null), onPlay }: Props = $props();

  const ON_KEY = 'engine-on';
  // Stops by itself at depth 20, or after 20 s on a slow machine
  const LIMITS = { depth: 20, movetime: 20_000, lines: 2 };
  const SHOWN_MOVES = 10;

  let on = $state(false);
  let visible = $state(true);
  let lines = $state.raw<EngineLine[]>([]);
  let engine: Engine | null = null;

  let fen = $derived(boardToFen(board, color, fullMove));
  let over = $derived(!hasLegalMoves(color, board));
  let mated = $derived(over && isInCheck(color, board));

  onMount(() => {
    try {
      on = localStorage.getItem(ON_KEY) === '1';
    } catch {}
    const onVisibility = () => (visible = !document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      engine?.quit();
      engine = null;
    };
  });

  $effect(() => {
    lines = [];
    best = null;
    if (!on || over || !visible) {
      engine?.stop();
      return;
    }
    const position = fen;
    const side = color;
    engine ??= new Engine();
    let current = true;
    void engine.analyse(position, side, LIMITS, (found) => {
      if (!current) return;
      lines = found;
      const move = readUciMove(found[0]?.pv[0] ?? '');
      best = move ? { from: move.from, to: move.to, color: MARK.other } : null;
    });
    return () => {
      current = false;
    };
  });

  function toggle() {
    on = !on;
    try {
      localStorage.setItem(ON_KEY, on ? '1' : '0');
    } catch {}
    if (!on) {
      engine?.quit();
      engine = null;
    }
  }

  let shown = $derived(
    lines.map((line) => ({ line, moves: playLine(board, color, line.pv).slice(0, SHOWN_MOVES) }))
  );

  let scoreText = $derived(
    over ? (mated ? (color === 'w' ? '0-1' : '1-0') : '½') : lines[0] ? formatScore(lines[0].score) : '…'
  );

  // White's share of the bar, 0–100
  let whiteShare = $derived.by(() => {
    if (over) return mated ? (color === 'w' ? 0 : 100) : 50;
    return lines[0] ? ((1 + winChance(lines[0].score)) / 2) * 100 : 50;
  });

  /** "12." before White's moves, and "12…" before a line that starts with Black's */
  function moveNumber(i: number): string {
    const ply = (color === 'w' ? 0 : 1) + i;
    const n = fullMove + Math.floor(ply / 2);
    if (ply % 2 === 0) return `${n}.`;
    return i === 0 ? `${n}…` : '';
  }
</script>

<div class="engine">
  <div class="top">
    <label class="toggle">
      <input type="checkbox" checked={on} onchange={toggle} />
      Stockfish
    </label>
    {#if on}
      <span class="score">{scoreText}</span>
      {#if lines[0] && !over}
        <span class="depth">depth {lines[0].depth}</span>
      {/if}
    {/if}
  </div>

  {#if on}
    <div class="bar" role="img" aria-label={scoreText}>
      <div class="bar-white" style:width="{whiteShare}%"></div>
    </div>

    {#each shown as { line, moves } (line.rank)}
      <div class="line">
        <span class="line-score">{formatScore(line.score)}</span>
        {#each moves as move, i}
          <button class="line-move" onclick={() => onPlay?.(moves.slice(0, i + 1))}
            >{moveNumber(i)}{move.san}</button
          >
        {/each}
      </div>
    {/each}
  {/if}
</div>

<style>
  /* The sidebar centres its children; the panel takes its full width, and a
     long line is cut at the edge rather than widening the sidebar */
  .engine {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    flex-shrink: 0;
    align-self: stretch;
    min-width: 0;
  }

  .top {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .toggle {
    font-size: var(--size-small);
    color: var(--ink-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .toggle input {
    cursor: pointer;
  }

  .score {
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
    font-variant-numeric: tabular-nums;
  }

  .depth {
    font-size: var(--size-small);
    color: var(--ink-muted);
    margin-left: auto;
  }

  .bar {
    height: 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid var(--line);
    background: var(--piece-black);
    overflow: hidden;
  }

  .bar-white {
    height: 100%;
    background: var(--piece-white);
    transition: width 0.3s;
  }

  .line {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    min-width: 0;
    font-size: var(--size-small);
  }

  .line-score {
    font-weight: var(--weight-strong);
    min-width: 3rem;
    font-variant-numeric: tabular-nums;
  }

  .line-move {
    background: none;
    border: none;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    color: var(--ink-muted);
    font-size: inherit;
    cursor: pointer;
  }

  .line-move:hover {
    background: var(--surface-raised);
    color: var(--ink);
  }

  @media (prefers-reduced-motion: reduce) {
    .bar-white {
      transition: none;
    }
  }
</style>
