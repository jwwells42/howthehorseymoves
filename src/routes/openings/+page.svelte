<script lang="ts">
  import { onMount } from 'svelte';
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
  import { OPENINGS, parseOpeningPgn, extractLines } from '$lib/openings';
  import type { Opening } from '$lib/openings';
  import { loadProgress, migrateOldProgress, playerMoves, tally } from '$lib/openings/progress';

  // Grouped openings (e.g. a repertoire from one study) get their own section
  let groups = $derived([...new Set(OPENINGS.flatMap(o => o.group ? [o.group] : []))]);
  let whiteOpenings = $derived(OPENINGS.filter(o => !o.group && o.color === 'w'));
  let blackOpenings = $derived(OPENINGS.filter(o => !o.group && o.color === 'b'));

  let completedIds = $state<Set<string>>(new Set());
  // How many moves of each opening are due for review
  let dueCounts = $state<Map<string, number>>(new Map());

  onMount(() => {
    // Learned = every move of yours known
    const completed = new Set<string>();
    const due = new Map<string, number>();
    const now = Math.floor(Date.now() / 1000);
    for (const opening of OPENINGS) {
      try {
        const lines = extractLines(parseOpeningPgn(opening.pgn));
        migrateOldProgress(opening, lines);
        const counts = tally(playerMoves(lines, opening.color), loadProgress(opening.id), now);
        if (counts.known === counts.total) completed.add(opening.id);
        if (counts.due > 0) due.set(opening.id, counts.due);
      } catch {}
    }
    completedIds = completed;
    dueCounts = due;
  });
</script>

{#snippet openingCard(opening: Opening)}
  <LinkCard href="/openings/{opening.id}" title={opening.name} description={opening.description}>
    {#snippet aside()}
      {#if dueCounts.has(opening.id)}
        <span class="due">Review {dueCounts.get(opening.id)}</span>
      {/if}
      {#if completedIds.has(opening.id)}
        <span class="done" role="img" aria-label="Learned">&#10003;</span>
      {/if}
    {/snippet}
  </LinkCard>
{/snippet}

<Page
  title="Opening Repertoire"
  back={{ href: '/study', label: 'Back to study' }}
>
  {#each groups as group}
    <CardList title={group}>
      {#each OPENINGS.filter(o => o.group === group) as opening}
        {@render openingCard(opening)}
      {/each}
    </CardList>
  {/each}

  <CardList title="Play as White">
    {#each whiteOpenings as opening}
      {@render openingCard(opening)}
    {/each}
  </CardList>

  <CardList title="Play as Black">
    {#each blackOpenings as opening}
      {@render openingCard(opening)}
    {/each}
  </CardList>

  <CardList title="Custom">
    <LinkCard
      href="/openings/custom"
      title="Paste your own PGN"
    />
  </CardList>
</Page>

<style>
  .done {
    color: var(--correct-text);
    font-size: var(--size-large);
  }

  .due {
    color: var(--ink-muted);
    font-size: var(--size-secondary);
    white-space: nowrap;
  }
</style>
