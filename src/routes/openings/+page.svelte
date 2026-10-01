<script lang="ts">
  import { onMount } from 'svelte';
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
  import { OPENINGS } from '$lib/openings';
  import type { Opening } from '$lib/openings';

  // Grouped openings (e.g. a repertoire from one study) get their own section
  let groups = $derived([...new Set(OPENINGS.flatMap(o => o.group ? [o.group] : []))]);
  let whiteOpenings = $derived(OPENINGS.filter(o => !o.group && o.color === 'w'));
  let blackOpenings = $derived(OPENINGS.filter(o => !o.group && o.color === 'b'));

  let completedIds = $state<Set<string>>(new Set());

  onMount(() => {
    const completed = new Set<string>();
    for (const opening of OPENINGS) {
      if (localStorage.getItem(`opening-${opening.id}-complete`) === 'true') {
        completed.add(opening.id);
      }
    }
    completedIds = completed;
  });
</script>

{#snippet openingCard(opening: Opening)}
  <LinkCard href="/openings/{opening.id}" title={opening.name} description={opening.description}>
    {#snippet aside()}
      {#if completedIds.has(opening.id)}
        <span class="done" role="img" aria-label="Learned">&#10003;</span>
      {/if}
    {/snippet}
  </LinkCard>
{/snippet}

<Page
  title="Opening Repertoire"
  subtitle="Learn opening lines move by move."
  back={{ href: '/study', label: 'Back to study' }}
  width="narrow"
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
      description="Drill any opening — paste PGN from your coach or from Lichess."
    />
  </CardList>
</Page>

<style>
  .done {
    color: var(--correct-text);
    font-size: var(--size-large);
  }
</style>
