<script lang="ts">
  /** The route so far, written out: e4 → f6 → g4 → ? */

  interface Props {
    /** Every square visited, the starting square first. */
    stops: string[];
    target: string;
    /** Still going: ends the trail with "→ ?". */
    open: boolean;
  }

  let { stops, target, open }: Props = $props();
</script>

<p class="trail">
  {#each stops as square, i}
    {#if i > 0}<span class="arrow">&rarr;</span>{/if}
    <strong class={[square === target && 'reached']}>{square}</strong>
  {/each}
  {#if open}
    <span class="arrow">&rarr; ?</span>
  {/if}
</p>

<style>
  .trail {
    width: 100%;
    min-height: 3rem;
    padding: 1rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.5rem;
    border-radius: 0.75rem;
    border: 1px solid var(--line);
    background: var(--surface);
    font-variant-numeric: tabular-nums;
  }
  .arrow {
    color: var(--ink-muted);
  }
  .reached {
    color: var(--correct-text);
  }
</style>
