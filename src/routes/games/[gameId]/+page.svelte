<script lang="ts">
  import { page } from '$app/state';
  import { getGame } from '$lib/games';
  import GameViewer from '$lib/components/game/GameViewer.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import BoardPage from '$lib/components/board/BoardPage.svelte';
  import { doneHref, stopFromUrl } from '$lib/curriculum';

  // Opened from the path: there's no finish here, so Continue is always on offer
  let pathStop = $derived(stopFromUrl(page.url));

  let gameId = $derived(page.params.gameId ?? '');
  let game = $derived(getGame(gameId));
</script>

{#if game}
  <BoardPage back={{ href: '/games', label: 'Back to games' }}>
    {#snippet action()}
      {#if pathStop}
        <Button variant="primary" href={doneHref(pathStop)}>Continue <span aria-hidden="true">&rarr;</span></Button>
      {/if}
    {/snippet}
    <GameViewer {game} />
  </BoardPage>
{:else}
  <main class="center">
    <h1>Game not found</h1>
    <a href="/games" class="muted-link">Back to games</a>
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
