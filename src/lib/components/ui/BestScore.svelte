<script lang="ts">
  import StarRating from './StarRating.svelte';

  /** A student's best result on a trainer: 0 and grey stars until they have one, so nothing moves when they do. */

  interface Props {
    score: number;
    /** Leave out for no stars (a result screen, which shows the round's own above it) */
    stars?: number;
  }

  let { score, stars }: Props = $props();
</script>

<p class="best">
  Best: {score}
  {#if stars !== undefined}
    <StarRating {stars} size="sm" />
  {/if}
</p>

<style>
  .best {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }
</style>
