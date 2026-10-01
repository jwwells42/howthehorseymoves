<script lang="ts">
  import type { Snippet } from 'svelte';
  import ProgressBar from './ProgressBar.svelte';

  interface Props {
    /** Seconds left. */
    remaining: number;
    /** Seconds at the start. */
    total: number;
    /** Shown on the left, under the bar. Usually the score so far. */
    children?: Snippet;
  }

  let { remaining, total, children }: Props = $props();

  /** The bar turns to the highlight colour for the last few seconds. */
  const HURRY_SECONDS = 5;
</script>

<div class="countdown">
  <ProgressBar value={remaining} max={total} label="Time left" hurry={remaining <= HURRY_SECONDS} />
  <div class="row">
    <span>{@render children?.()}</span>
    <span>{remaining}s</span>
  </div>
</div>

<style>
  .countdown {
    width: 100%;
  }
  .row {
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }
</style>
