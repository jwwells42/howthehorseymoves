<script lang="ts">
  import { page } from '$app/state';
  import { getPuzzlesForPiece } from '$lib/puzzles';
  import { progressState } from '$lib/state/progress-store';
  import {
    findPuzzleSetStop,
    getNextStopAfter,
    getPuzzleSetStars,
    getStopStars,
    getStopStartHref,
  } from '$lib/curriculum';
  import SetComplete from '$lib/components/puzzle/SetComplete.svelte';

  // The last puzzle of a set comes here. Next goes on to the following stop
  // on the path, or back to the set's list if the set isn't on the path.

  let piece = $derived(page.params.piece ?? '');
  let set = $derived(getPuzzlesForPiece(piece));
  let onPath = $derived(findPuzzleSetStop(piece));
  let nextStop = $derived(onPath ? getNextStopAfter(onPath.stop.id) : null);

  // Everything below reads saved progress, which loads in the browser after
  // the first render, so it's only shown once `loaded` is true.
  let stars = $derived.by(() => {
    void $progressState;
    return getPuzzleSetStars(piece);
  });

  let level = $derived.by(() => {
    void $progressState;
    if (!onPath) return undefined;
    const { chapter, stop } = onPath;
    const from = chapter.stops.indexOf(stop);
    const to = nextStop ? chapter.stops.indexOf(nextStop) : -1;
    return {
      title: chapter.title,
      stops: chapter.stops.map((s) => ({ id: s.id, name: s.name, icon: s.icon, done: getStopStars(s) > 0 })),
      from,
      to: to === -1 ? from : to,
    };
  });

  let next = $derived.by(() => {
    void $progressState;
    return nextStop
      ? { href: getStopStartHref(nextStop), label: `Next: ${nextStop.name}` }
      : { href: `/learn/${piece}`, label: 'Continue' };
  });
</script>

{#if set}
  <main class="page">
    {#if $progressState.loaded}
      <SetComplete
        name={onPath?.stop.name ?? set.name}
        icon={onPath?.stop.icon ?? `/pieces/w${set.piece}.svg`}
        {stars}
        {level}
        {next}
      />
    {/if}
  </main>
{:else}
  <main class="page">
    <h1>Puzzle set not found</h1>
    <a href="/" class="muted-link">Back to home</a>
  </main>
{/if}

<style>
  .page {
    min-height: calc(100dvh - 3rem);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 1rem;
  }
  .muted-link { color: var(--ink-muted); }
  .muted-link:hover { text-decoration: underline; }
</style>
