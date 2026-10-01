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
    min-height: calc(100dvh - 3rem);
    display: flex;
    flex-direction: column;
    padding: 1rem;
  }

  @media (min-height: 32rem) and (min-width: 32rem) {
    .page {
      height: calc(100dvh - 3rem);
      overflow: hidden;
    }
  }

  .center {
    text-align: center;
  }

  .back-link {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    display: inline-block;
    margin-bottom: 1rem;
    margin-left: 1rem;
    flex-shrink: 0;
  }

  .back-link:hover {
    color: var(--ink);
  }

  .muted-link {
    color: var(--ink-muted);
  }

  .muted-link:hover {
    text-decoration: underline;
  }
</style>
