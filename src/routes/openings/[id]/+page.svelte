<script lang="ts">
  import { page } from '$app/state';
  import { getOpening } from '$lib/openings';
  import OpeningTrainer from '$lib/components/opening/OpeningTrainer.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { doneHref, stopFromUrl } from '$lib/curriculum';

  // Opened from the path: there's no finish here, so Continue is always on offer
  let pathStop = $derived(stopFromUrl(page.url));

  let id = $derived(page.params.id ?? '');
  let opening = $derived(getOpening(id));
</script>

{#if opening}
  <main class="page">
    <div class="top-row">
      <a href="/openings" class="back-link">&larr; Back to openings</a>
      {#if pathStop}
        <Button variant="primary" href={doneHref(pathStop)}>Continue <span aria-hidden="true">&rarr;</span></Button>
      {/if}
    </div>
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

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-shrink: 0;
  }
  /* The row keeps the back link's spacing below it */
  .top-row .back-link { margin-bottom: 0; }

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
