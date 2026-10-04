<script lang="ts">
  import { page } from '$app/state';
  import { getGame } from '$lib/games';
  import GameViewer from '$lib/components/game/GameViewer.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { doneHref, stopFromUrl } from '$lib/curriculum';

  // Opened from the path: there's no finish here, so Continue is always on offer
  let pathStop = $derived(stopFromUrl(page.url));

  let gameId = $derived(page.params.gameId ?? '');
  let game = $derived(getGame(gameId));
</script>

{#if game}
  <main class="page">
    <div class="top-row">
      <a href="/games" class="back-link">&larr; Back to games</a>
      {#if pathStop}
        <Button variant="primary" href={doneHref(pathStop)}>Continue <span aria-hidden="true">&rarr;</span></Button>
      {/if}
    </div>
    <GameViewer {game} />
  </main>
{:else}
  <main class="page center">
    <h1>Game not found</h1>
    <a href="/games" class="muted-link">Back to games</a>
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
    padding: 1.5rem;
    max-width: 56rem;
    margin: 0 auto;
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
