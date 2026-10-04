<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import LevelStrip, { type LevelStop } from './LevelStrip.svelte';
  import { playSound } from '$lib/state/sound';

  /**
   * Shown between one stop on the path and the next: a trophy, the stop's
   * stars, and the level's stops with the knight stepping on to the next one.
   * One button.
   */

  interface Props {
    name: string;
    icon: string;
    /** Left out for a stop that doesn't keep stars. */
    stars?: number;
    /** The level; `from` is this stop, `to` the next one. */
    level: { title: string; stops: LevelStop[]; from: number; to: number };
    next: { href: string; label: string };
  }
  let { name, icon, stars, level, next }: Props = $props();

  let nextButton = $state<Button>();
  let walked = $state(false);

  onMount(() => {
    playSound('stars');
    nextButton?.focus();
    // The knight waits a beat on the finished stop, then steps to the next one
    const timer = setTimeout(() => (walked = true), 900);
    return () => clearTimeout(timer);
  });
</script>

<div class="stop-complete">
  <div class="trophy" aria-hidden="true">&#127942;</div>
  <div class="title-row">
    <img src={icon} alt="" class="stop-icon" />
    <h1>{name} Complete!</h1>
  </div>
  {#if stars !== undefined}
    <StarRating {stars} size="lg" />
  {/if}

  <LevelStrip title={level.title} stops={level.stops} knightAt={walked ? level.to : level.from} next={level.to} />

  <div class="next-button">
    <Button bind:this={nextButton} variant="primary" size="large" href={next.href}>
      {next.label} <span aria-hidden="true">&rarr;</span>
    </Button>
  </div>
</div>

<style>
  .stop-complete {
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
  .trophy { font-size: 4rem; line-height: 1; }
  .title-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
  }
  .stop-icon { width: 3rem; height: 3rem; }
  h1 { font-size: var(--size-title); }

  /* A grid stretches the button to the card's width: a big target */
  .next-button {
    width: 100%;
    display: grid;
    margin-top: 0.5rem;
  }
</style>
