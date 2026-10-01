<script lang="ts">
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import { getPuzzlesForPiece, type SubcategoryInfo } from '$lib/puzzles';
  import { progressState } from '$lib/state/progress-store';

  interface Props {
    set: SubcategoryInfo;
  }

  let { set }: Props = $props();

  let puzzles = $derived(getPuzzlesForPiece(set.key)?.puzzles ?? []);
  let solved = $derived(puzzles.map((p) => $progressState.puzzles[p.id]).filter((p) => p?.completed));
  let mastered = $derived(puzzles.length > 0 && solved.length === puzzles.length);
  let bestStars = $derived(Math.max(0, ...solved.map((p) => p.bestStars)));
</script>

<LinkCard
  href={set.comingSoon ? undefined : `/learn/${set.key}`}
  icon={set.icon}
  title={set.name}
  description={set.description}
>
  {#snippet aside()}
    <span>{solved.length}/{puzzles.length}</span>
    <!-- Stars only once every puzzle in the set is solved. -->
    {#if mastered}
      <StarRating stars={bestStars} size="sm" />
    {/if}
  {/snippet}
</LinkCard>
