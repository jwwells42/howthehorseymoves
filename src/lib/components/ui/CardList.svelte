<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title?: string;
    children: Snippet;
  }

  let { title, children }: Props = $props();
</script>

<section class="card-list">
  {#if title}
    <h2 class="title">{title}</h2>
  {/if}
  <div class="cards">
    {@render children()}
  </div>
</section>

<style>
  .card-list {
    margin-bottom: 2rem;
  }
  .card-list:last-child {
    margin-bottom: 0;
  }
  .title {
    margin-bottom: 0.75rem;
    color: var(--ink-muted);
  }
  .cards {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>
