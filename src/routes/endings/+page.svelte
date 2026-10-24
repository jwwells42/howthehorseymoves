<script lang="ts">
  import { readNumber } from '$lib/state/storage';
  import { onMount } from 'svelte';
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import PuzzleSetCard from '$lib/components/puzzle/PuzzleSetCard.svelte';
  import { CATEGORIES } from '$lib/puzzles';

  let categories = $derived(CATEGORIES.filter((c) => c.key === 'endings' || c.key === 'advanced-endings'));

  // Endings trainers that are not puzzle sets, so are not in CATEGORIES.
  const PAWN_ENDINGS = [
    { name: 'Pawn Endings', icon: '/pieces/wK.svg', href: '/learn/pawn-endings-lesson', storageKey: 'pawn-endings-lesson-best-stars' },
    { name: 'KPK: Defend', icon: '/pieces/bK.svg', href: '/learn/endings-kpk-draw', storageKey: 'draw-kpk-best-stars' },
  ];

  let pawnEndingStars = $state<Record<string, number>>({});

  onMount(() => {
    pawnEndingStars = Object.fromEntries(
      PAWN_ENDINGS.map((e) => [e.storageKey, readNumber(e.storageKey)])
    );
  });
</script>

<Page
  title="Endings"
  back={{ href: '/', label: 'Back to home' }}
>
  {#each categories as category}
    <CardList title={category.name}>
      {#each category.subcategories as set}
        <PuzzleSetCard {set} />
      {/each}
    </CardList>
  {/each}

  <CardList title="Pawn Endings">
    {#each PAWN_ENDINGS as ending}
      {@const stars = pawnEndingStars[ending.storageKey] ?? 0}
      <LinkCard href={ending.href} icon={ending.icon} title={ending.name}>
        {#snippet aside()}
          {#if stars > 0}
            <StarRating {stars} size="sm" />
          {/if}
        {/snippet}
      </LinkCard>
    {/each}
  </CardList>
</Page>
