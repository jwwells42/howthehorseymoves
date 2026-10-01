<script lang="ts">
  import StarRating from './StarRating.svelte';

  /** A student's best result on a trainer. Shows nothing until they have one. */

  interface Props {
    score: number;
    stars?: number;
  }

  let { score, stars = 0 }: Props = $props();
</script>

{#if score > 0}
  <p class="best">
    Best: {score}
    {#if stars > 0}
      <StarRating {stars} size="sm" />
    {/if}
  </p>
{/if}

<style>
  .best {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }
</style>
