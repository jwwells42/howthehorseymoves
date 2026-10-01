<script lang="ts">
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import PuzzleSetCard from '$lib/components/puzzle/PuzzleSetCard.svelte';
  import { CATEGORIES } from '$lib/puzzles';

  let tactics = $derived(CATEGORIES.find((c) => c.key === 'tactics')!);
  let checkmates = $derived(CATEGORIES.find((c) => c.key === 'checkmate')!);
</script>

<Page
  title="Tactics"
  subtitle="Spot winning moves and combinations!"
  back={{ href: '/', label: 'Back to home' }}
>
  <CardList title="Checkmate Patterns">
    {#each checkmates.subcategories as set}
      <PuzzleSetCard {set} />
    {/each}
  </CardList>

  <CardList title="Tactical Motifs">
    {#each tactics.subcategories as set}
      <PuzzleSetCard {set} />
    {/each}
  </CardList>
</Page>
