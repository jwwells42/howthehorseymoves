<script lang="ts">
  import { page } from '$app/state';
  import { getGame } from '$lib/games';
  import GameViewer from '$lib/components/game/GameViewer.svelte';

  let gameId = $derived(page.params.gameId);
  let game = $derived(getGame(gameId));
</script>

{#if game}
  <main class="page">
    <a href="/games" class="back-link">&larr; Back to games</a>
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
    min-height: 100vh;
    padding: 1rem;
  }

  .center {
    text-align: center;
    padding: 1.5rem;
    max-width: 56rem;
    margin: 0 auto;
  }

  .back-link {
    font-size: 0.875rem;
    color: var(--text-muted, #888);
    display: inline-block;
    margin-bottom: 1rem;
    margin-left: 1rem;
  }

  .back-link:hover {
    color: var(--foreground, #f0e6cc);
  }

  .muted-link {
    color: var(--text-muted, #888);
  }

  .muted-link:hover {
    text-decoration: underline;
  }
</style>
