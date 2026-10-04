<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import LevelStrip, { type LevelStop } from './LevelStrip.svelte';
  import { playSound } from '$lib/state/sound';

  /**
   * Shown after a level's bot is beaten: the finished level, its stops ticked
   * as they're done, and below it the next level, where the knight lands on
   * the first stop. One button. After the last level there's no next level.
   */

  interface Props {
    level: { title: string; stops: LevelStop[] };
    nextLevel?: { title: string; stops: LevelStop[] };
    next: { href: string; label: string };
  }
  let { level, nextLevel, next }: Props = $props();

  let nextButton = $state<Button>();
  let walked = $state(false);

  onMount(() => {
    playSound('stars');
    nextButton?.focus();
    // The knight waits a beat on the bot, then jumps down to the new level
    const timer = setTimeout(() => (walked = true), 900);
    return () => clearTimeout(timer);
  });
</script>

<div class="level-complete">
  <div class="trophy" aria-hidden="true">&#127942;</div>
  <h1>{level.title} Complete!</h1>

  <LevelStrip
    title={level.title}
    hideTitle
    stops={level.stops}
    knightAt={walked && nextLevel ? undefined : level.stops.length - 1}
  />

  {#if nextLevel}
    <div class="down" aria-hidden="true">&darr;</div>
    <div class="next-level">
      <LevelStrip title={nextLevel.title} stops={nextLevel.stops} knightAt={walked ? 0 : undefined} next={0} />
    </div>
  {/if}

  <div class="next-button">
    <Button bind:this={nextButton} variant="primary" size="large" href={next.href}>
      {next.label} <span aria-hidden="true">&rarr;</span>
    </Button>
  </div>
</div>

<style>
  .level-complete {
    width: 100%;
    max-width: 30rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem 1rem;
    border: 1px solid var(--line);
    border-radius: 0.75rem;
    background: var(--surface);
    text-align: center;
  }
  .trophy { font-size: 5rem; line-height: 1; }
  h1 { font-size: var(--size-title); }
  .down {
    font-size: var(--size-title);
    color: var(--highlight);
    line-height: 1;
  }
  /* The new level stands out from the finished one */
  .next-level {
    width: 100%;
    padding: 0.5rem 0.5rem 0.75rem;
    border: 2px solid var(--highlight);
    border-radius: 0.75rem;
  }

  /* A grid stretches the button to the card's width: a big target */
  .next-button {
    width: 100%;
    display: grid;
    margin-top: 0.5rem;
  }
</style>
