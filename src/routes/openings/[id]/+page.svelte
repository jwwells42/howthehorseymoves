<script lang="ts">
  import { page } from '$app/state';
  import { getOpening } from '$lib/openings';
  import OpeningTrainer from '$lib/components/opening/OpeningTrainer.svelte';

  let id = $derived(page.params.id ?? '');
  let opening = $derived(getOpening(id));
</script>

{#if opening}
  <main class="page">
    <a href="/openings" class="back-link">&larr; Back to openings</a>
    {#key opening.id}
      <OpeningTrainer {opening} />
    {/key}
  </main>
{:else}
  <main class="page center">
    <h1>Opening not found</h1>
    <a href="/openings" class="muted-link">Back to openings</a>
  </main>
{/if}

<style>
  .page {
    min-height: 100vh;
    padding: 1rem;
  }

  .center {
    text-align: center;
  }

  .back-link {
    font-size: 0.875rem;
    color: var(--text-muted);
    display: inline-block;
    margin-bottom: 1rem;
    margin-left: 1rem;
  }

  .back-link:hover {
    color: var(--foreground);
  }

  .muted-link {
    color: var(--text-muted);
  }

  .muted-link:hover {
    text-decoration: underline;
  }
</style>
