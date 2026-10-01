<script lang="ts">
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import PuzzleSetCard from '$lib/components/puzzle/PuzzleSetCard.svelte';
  import { CATEGORIES } from '$lib/puzzles';

  let checkmates = $derived(CATEGORIES.find((c) => c.key === 'checkmate')!);
</script>

<Page
  title="Checkmate Patterns"
  subtitle="Learn classic mating patterns!"
  back={{ href: '/', label: 'Back to home' }}
>
  <CardList>
    {#each checkmates.subcategories as set}
      <PuzzleSetCard {set} />
    {/each}
  </CardList>
</Page>
