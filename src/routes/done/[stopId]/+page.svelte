<script lang="ts">
  import { page } from '$app/state';
  import { progressState } from '$lib/state/progress-store';
  import {
    findStop,
    getNextStopAfter,
    getStopStars,
    getStopStartHref,
    withStop,
  } from '$lib/curriculum';
  import StopComplete from '$lib/components/curriculum/StopComplete.svelte';
  import LevelComplete from '$lib/components/curriculum/LevelComplete.svelte';

  // A stop on the path was just finished. If the next stop is in the same
  // level, the knight steps on to it; if it's in the next level (the stop was
  // the level's bot), it's the level-up screen.

  let found = $derived(findStop(page.params.stopId ?? ''));
  let nextStop = $derived(found ? getNextStopAfter(found.stop.id) : null);
  let nextChapter = $derived(nextStop ? findStop(nextStop.id)?.chapter : undefined);

  // Stars are read from saved progress, which loads in the browser after the
  // first render, so everything waits for `loaded`.

  let next = $derived.by(() => {
    void $progressState;
    return nextStop
      ? { href: withStop(getStopStartHref(nextStop), nextStop), label: `Next: ${nextStop.name}` }
      : { href: '/', label: 'Home' };
  });
</script>

<main class="page">
  {#if !found}
    <h1>Not found</h1>
    <a href="/" class="muted-link">Back to home</a>
  {:else if $progressState.loaded}
    {@const { chapter, stop } = found}
    {#if nextChapter === chapter}
      <StopComplete
        name={stop.name}
        stars={stop.progress.type === 'none' ? undefined : getStopStars(stop)}
        level={{ title: chapter.title, from: stop.id, to: nextStop?.id ?? stop.id }}
        {next}
      />
    {:else}
      <LevelComplete
        level={{ title: chapter.title, bot: stop.id }}
        nextLevel={nextChapter && nextStop ? { title: nextChapter.title, first: nextStop.id } : undefined}
        {next}
      />
    {/if}
  {/if}
</main>

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
