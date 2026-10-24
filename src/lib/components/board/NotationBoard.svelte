<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * In place of the board, for playing blind: the moves so far, written out
   * in large type ("1.e4 e5 2.Nf3 Nc6 3.?"). The same size and place as a
   * board, so nothing else on the screen moves. What goes under the moves
   * (a hint, a box to type the move in) is up to the screen using it.
   */

  interface Props {
    /** From the start position, White first */
    moves: { san: string; nag?: string }[];
    /** End with the move to play: "3.?" for White, "3…?" for Black */
    ask?: boolean;
    /** Read out by screen readers */
    label: string;
    children?: Snippet;
  }

  let { moves, ask = false, label, children }: Props = $props();

  function moveNumber(ply: number) {
    return Math.floor(ply / 2) + 1;
  }

  // The newest move is where the end of a long line is kept in view
  let movesEl = $state<HTMLParagraphElement | null>(null);
  $effect(() => {
    void moves.length;
    void ask;
    if (movesEl) movesEl.scrollTop = movesEl.scrollHeight;
  });
</script>

<div class="notation-board" role="group" aria-label={label}>
  <p class="moves" bind:this={movesEl} aria-live="polite">
    {#each moves as move, i (i)}
      <span class={['move', i === moves.length - 1 && 'last']}>
        {#if i % 2 === 0}<span class="num">{moveNumber(i)}.</span>{/if}{move.san}{move.nag ?? ''}
      </span>{' '}
    {/each}
    {#if ask}
      <span class="move ask">
        <span class="num">{moveNumber(moves.length)}{moves.length % 2 === 0 ? '.' : '…'}</span>?
      </span>
    {/if}
  </p>
  {#if children}
    <div class="below">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  /* The board's size, and no bigger than the space a board gets (see Board's
     .board-svg); where a board would shrink to fit, this only gets shorter */
  .notation-board {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: var(--board-size);
    max-width: 100%;
    max-height: 80dvh;
    aspect-ratio: 1;
    padding: 1.5rem;
    border-radius: 0.5rem;
    border: 1px solid var(--line);
    background: var(--surface);
  }
  @media (min-height: 32rem) and (min-width: 32rem) {
    .notation-board {
      max-height: 100%;
    }
  }

  .moves {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    margin: 0;
    font-size: var(--size-title);
    line-height: 1.5;
    color: var(--ink-muted);
    font-variant-numeric: tabular-nums;
  }

  .move {
    white-space: nowrap;
  }

  .num {
    color: var(--ink-muted);
  }

  .last {
    color: var(--ink);
    font-weight: var(--weight-strong);
  }

  .ask {
    color: var(--highlight);
    font-weight: var(--weight-strong);
  }

  .below {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }
</style>
