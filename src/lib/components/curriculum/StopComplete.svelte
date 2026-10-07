<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import JourneyBoard from './JourneyBoard.svelte';
  import { playSound } from '$lib/state/sound';

  /**
   * Shown between one stop on the path and the next: a trophy, the stop's
   * stars, and the journey board with the knight stepping on to the next stop.
   * One button.
   */

  interface Props {
    name: string;
    /** Left out for a stop that doesn't keep stars. */
    stars?: number;
    /** The level, and the ids of this stop (`from`) and the next one (`to`). */
    level: { title: string; from: string; to: string };
    next: { href: string; label: string };
  }
  let { name, stars, level, next }: Props = $props();

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
  <h1>{name} Complete!</h1>
  {#if stars !== undefined}
    <StarRating {stars} size="lg" />
  {/if}

  <p class="level-title">{level.title}</p>
  <JourneyBoard knightAt={walked ? level.to : level.from} />

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
    gap: 0.75rem;
    padding: 1.25rem 1rem;
    border: 1px solid var(--line);
    border-radius: 0.75rem;
    background: var(--surface);
    text-align: center;
  }
  .trophy { font-size: 3rem; line-height: 1; }
  .level-title { color: var(--ink-muted); }
  h1 { font-size: var(--size-title); }

  /* A grid stretches the button to the card's width: a big target */
  .next-button {
    width: 100%;
    display: grid;
    margin-top: 0.5rem;
  }
</style>
