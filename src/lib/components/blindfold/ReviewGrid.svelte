<script lang="ts">
  import type { Snippet } from 'svelte';

  /** The mini boards a trainer shows after it ends, under a heading. */

  interface Props {
    title: string;
    /** One MiniBoard per answer. */
    children: Snippet;
  }

  let { title, children }: Props = $props();
</script>

<section class="review">
  <h3 class="title">{title}</h3>
  <div class="grid">
    {@render children()}
  </div>
</section>

<style>
  .review {
    width: 100%;
    margin-top: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
  }
  .title {
    margin-bottom: 0.75rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    justify-items: center;
  }
  @media (min-width: 640px) {
    .grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }
</style>
