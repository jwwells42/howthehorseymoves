<script lang="ts">
  import { onMount } from 'svelte';
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import { GAMES, gameOpening, testStarsKey } from '$lib/games';
  import type { ModelGame } from '$lib/games/types';
  import { parseOpeningPgn, extractLines } from '$lib/openings';
  import { loadProgress, playerMoves, tally } from '$lib/openings/progress';
  import { readNumber } from '$lib/state/storage';

  // The model games first, then each match (a PGN file) in its own section
  let modelGames = $derived(GAMES.filter((g) => !g.collection));
  let collections = $derived([...new Set(GAMES.flatMap((g) => (g.collection ? [g.collection] : [])))]);

  // How far each game is memorized: every move known, moves due, the best test
  let knownIds = $state<Set<string>>(new Set());
  let dueCounts = $state<Map<string, number>>(new Map());
  let bestStars = $state<Map<string, number>>(new Map());

  onMount(() => {
    const known = new Set<string>();
    const due = new Map<string, number>();
    const stars = new Map<string, number>();
    const now = Math.floor(Date.now() / 1000);
    for (const game of GAMES) {
      const opening = gameOpening(game);
      try {
        const lines = extractLines(parseOpeningPgn(opening.pgn));
        const counts = tally(playerMoves(lines, opening.color), loadProgress(opening.id), now);
        if (counts.total > 0 && counts.known === counts.total) known.add(game.id);
        if (counts.due > 0) due.set(game.id, counts.due);
      } catch {}
      const best = readNumber(testStarsKey(game));
      if (best > 0) stars.set(game.id, best);
    }
    knownIds = known;
    dueCounts = due;
    bestStars = stars;
  });
</script>

{#snippet gameCard(game: ModelGame, title: string, description: string)}
  <LinkCard href="/games/{game.id}" {title} {description}>
    {#snippet aside()}
      {#if dueCounts.has(game.id)}
        <span class="due">Review {dueCounts.get(game.id)}</span>
      {/if}
      <StarRating stars={bestStars.get(game.id) ?? 0} size="sm" />
      <!-- Its room is kept until it's learned, so the stars don't move -->
      <span class={['done', !knownIds.has(game.id) && 'not-yet']} role="img" aria-label="Learned">&#10003;</span>
      <span class="result">{game.result}</span>
    {/snippet}
  </LinkCard>
{/snippet}

<Page
  title="Model Games"
  back={{ href: '/study', label: 'Back to study' }}
>
  <CardList>
    {#each modelGames as game}
      {@render gameCard(game, `${game.white} vs ${game.black}`, `${game.event}, ${game.year}`)}
    {/each}
  </CardList>

  {#each collections as collection}
    <CardList title={collection}>
      {#each GAMES.filter((g) => g.collection === collection) as game}
        {@render gameCard(game, `Game ${game.round}`, `${game.white} vs ${game.black}`)}
      {/each}
    </CardList>
  {/each}
</Page>

<style>
  .done {
    color: var(--correct-text);
    font-size: var(--size-large);
  }

  .done.not-yet {
    visibility: hidden;
  }

  .due {
    color: var(--ink-muted);
    font-size: var(--size-secondary);
    white-space: nowrap;
  }

  .result {
    white-space: nowrap;
  }
</style>
