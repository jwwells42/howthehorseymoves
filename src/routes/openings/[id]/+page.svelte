<script lang="ts">
  import { page } from '$app/state';
  import { getOpening } from '$lib/openings';
  import OpeningTrainer, { backLink } from '$lib/components/opening/OpeningTrainer.svelte';
  import BoardPage from '$lib/components/board/BoardPage.svelte';
  import { stopFromUrl } from '$lib/curriculum';

  // Opened from the path: straight into play, with Continue at the end, and
  // back goes home rather than to the list of openings
  let pathStop = $derived(stopFromUrl(page.url));

  let id = $derived(page.params.id ?? '');
  let opening = $derived(getOpening(id));
</script>

{#if opening}
  <BoardPage back={pathStop ? { href: '/', label: 'Back to home' } : backLink()}>
    {#key opening.id}
      <OpeningTrainer {opening} path={!!pathStop} />
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
