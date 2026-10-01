<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * The buttons for stepping through a game: to the start, back a move,
   * forward a move, to the end. Symbols, not words, so a student who cannot
   * read can still use them.
   */

  interface Props {
    canGoBack: boolean;
    canGoForward: boolean;
    onStart: () => void;
    onBack: () => void;
    onForward: () => void;
    onEnd: () => void;
    /** Adds a play/pause button in the middle, for watching a game play out. */
    onTogglePlay?: () => void;
    playing?: boolean;
    playDisabled?: boolean;
    /** Shown in the middle, e.g. the move on the board. */
    children?: Snippet;
  }

  let {
    canGoBack,
    canGoForward,
    onStart,
    onBack,
    onForward,
    onEnd,
    onTogglePlay,
    playing = false,
    playDisabled = false,
    children,
  }: Props = $props();
</script>

<div class="move-nav">
  <button onclick={onStart} disabled={!canGoBack} aria-label="Start">&#x23EE;</button>
  <button onclick={onBack} disabled={!canGoBack} aria-label="Back">&#x25C0;</button>
  {#if onTogglePlay}
    <button class="wide" onclick={onTogglePlay} disabled={playDisabled} aria-label={playing ? 'Pause' : 'Play'}>
      {playing ? '⏸' : '▶'}
    </button>
  {/if}
  {@render children?.()}
  <button onclick={onForward} disabled={!canGoForward} aria-label="Forward">&#x25B6;</button>
  <button onclick={onEnd} disabled={!canGoForward} aria-label="End">&#x23ED;</button>
</div>

<style>
  .move-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  button {
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 0.5rem;
    background: var(--surface-raised);
    font-size: var(--size-body);
    cursor: pointer;
    transition: background-color 0.15s;
  }
  button:hover:not(:disabled) {
    background: var(--line);
  }
  button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .wide {
    padding-inline: 1.5rem;
  }
</style>
