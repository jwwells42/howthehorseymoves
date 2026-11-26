<script lang="ts">
  import { page } from '$app/state';
  import { getGame, gameOpening, testStarsKey } from '$lib/games';
  import GameViewer from '$lib/components/game/GameViewer.svelte';
  import OpeningTrainer, { backLink } from '$lib/components/opening/OpeningTrainer.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import BoardPage from '$lib/components/board/BoardPage.svelte';
  import { doneHref, stopFromUrl } from '$lib/curriculum';
  import { readNumber, saveBest } from '$lib/state/storage';

  // Opened from the path: the game to watch, and since there's no finish
  // here, Continue is always on offer. Otherwise it opens on its menu
  // (watch, learn, review, test) like an opening, with the viewer as Explore.
  let pathStop = $derived(stopFromUrl(page.url));

  let gameId = $derived(page.params.gameId ?? '');
  let game = $derived(getGame(gameId));
  let opening = $derived(game ? gameOpening(game) : undefined);

  // The best test, read in the browser (localStorage)
  let testBest = $state(0);
  $effect(() => {
    if (game) testBest = readNumber(testStarsKey(game));
  });

  function onTestDone(stars: number) {
    if (game) testBest = saveBest(testStarsKey(game), stars);
  }
</script>

{#if game && pathStop}
  <BoardPage back={{ href: '/games', label: 'Back to games' }}>
    {#snippet action()}
      <Button variant="primary" href={doneHref(pathStop)}>Continue <span aria-hidden="true">&rarr;</span></Button>
    {/snippet}
    <GameViewer {game} />
  </BoardPage>
{:else if game && opening}
  <BoardPage back={backLink({ href: '/games', label: 'Back to games' })}>
    {#key opening.id}
      <OpeningTrainer {opening} {testBest} {onTestDone}>
        {#snippet explore()}
          <GameViewer {game} />
        {/snippet}
      </OpeningTrainer>
    {/key}
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
