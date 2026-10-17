<script lang="ts">
  import { page } from '$app/state';
  import { getOpening } from '$lib/openings';
  import OpeningTrainer, { backLink } from '$lib/components/opening/OpeningTrainer.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import BoardPage from '$lib/components/board/BoardPage.svelte';
  import { doneHref, stopFromUrl } from '$lib/curriculum';

  // Opened from the path: there's no finish here, so Continue is always on offer
  let pathStop = $derived(stopFromUrl(page.url));

  let id = $derived(page.params.id ?? '');
  let opening = $derived(getOpening(id));
</script>

{#if opening}
  <BoardPage back={backLink()}>
    {#snippet action()}
      {#if pathStop}
        <Button variant="primary" href={doneHref(pathStop)}>Continue <span aria-hidden="true">&rarr;</span></Button>
      {/if}
    {/snippet}
    {#key opening.id}
      <OpeningTrainer {opening} />
    {/key}
  </BoardPage>
{:else}
  <main class="center">
    <h1>Opening not found</h1>
    <a href="/openings" class="muted-link">Back to openings</a>
  </main>
{/if}

<style>
  .center {
    text-align: center;
    padding: 1.5rem;
    max-width: 56rem;
    margin: 0 auto;
  }
  .muted-link {
    color: var(--ink-muted);
  }
  .muted-link:hover {
    text-decoration: underline;
  }
</style>
