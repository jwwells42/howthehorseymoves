<script lang="ts">
  import type { Snippet } from 'svelte';

  /**
   * Something shown over the board: a result, a choice, "tap to start".
   * It covers whatever holds the board, so that needs `position: relative`,
   * as BoardLayout's board area has.
   */

  interface Props {
    /** Darken the board underneath. Turn off for a symbol that should leave
        the position in view. */
    dim?: boolean;
    /** Makes the whole layer one button, e.g. to close it. */
    onclick?: () => void;
    children: Snippet;
  }

  let { dim = true, onclick, children }: Props = $props();

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onclick?.();
    }
  }
</script>

{#if onclick}
  <div class={['overlay', dim && 'dim', 'tappable']} role="button" tabindex="0" {onclick} onkeydown={handleKeydown}>
    {@render children()}
  </div>
{:else}
  <div class={['overlay', dim && 'dim']}>
    {@render children()}
  </div>
{/if}

<style>
  .overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 0.5rem;
    text-align: center;
    animation: fade-in 0.3s ease-out;
  }
  /* A layer that only shows a symbol lets taps through to the board. */
  .overlay:not(.dim, .tappable) {
    pointer-events: none;
  }
  .dim {
    background: var(--scrim);
  }
  .tappable {
    cursor: pointer;
  }
</style>
