<script lang="ts">
  import { onMount } from 'svelte';
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import { CURRICULUM, getStopStars } from '$lib/curriculum';
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

  // A trainer listed with the puzzle sets (an endgame trainer) has no puzzles:
  // its stars are the ones its stop on the path shows. Read once in the
  // browser, where they're saved.
  let trainerStop = $derived(
    puzzles.length === 0 ? CURRICULUM.flatMap((c) => c.stops).find((s) => s.href === `/learn/${set.key}`) : undefined,
  );
  let trainerStars = $state(0);
  onMount(() => {
    if (trainerStop) trainerStars = getStopStars(trainerStop);
  });
</script>

<LinkCard
  href={set.comingSoon ? undefined : `/learn/${set.key}`}
  icon={set.icon}
  title={set.name}
>
  {#snippet aside()}
    {#if puzzles.length > 0}
      <span>{solved.length}/{puzzles.length}</span>
      <!-- Stars once every puzzle in the set is solved: grey until then -->
      <StarRating stars={mastered ? bestStars : 0} size="sm" />
    {:else if trainerStop}
      <StarRating stars={trainerStars} size="sm" />
    {/if}
  {/snippet}
</LinkCard>
