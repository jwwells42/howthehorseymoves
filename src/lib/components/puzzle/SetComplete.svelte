<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import { playSound } from '$lib/state/sound';

  /**
   * Shown between a finished puzzle set and the next stop on the path: a
   * trophy, the set's stars, and the level's stops with the knight stepping on
   * to the next one. Like the puzzle card, it has one button.
   */

  interface LevelStop {
    id: string;
    name: string;
    icon: string;
    done: boolean;
  }

  interface Props {
    name: string;
    icon: string;
    stars: number;
    /** The level this set belongs to; `from` is this set's stop, `to` the next one. */
    level?: { title: string; stops: LevelStop[]; from: number; to: number };
    next: { href: string; label: string };
  }
  let { name, icon, stars, level, next }: Props = $props();

  let nextButton = $state<Button>();
  let walked = $state(false);
  let knightAt = $derived(level ? (walked ? level.to : level.from) : 0);

  onMount(() => {
    playSound('stars');
    nextButton?.focus();
    // The knight waits a beat on the finished stop, then steps to the next one
    const timer = setTimeout(() => (walked = true), 900);
    return () => clearTimeout(timer);
  });
</script>

<div class="set-complete">
  <div class="trophy" aria-hidden="true">&#127942;</div>
  <div class="title-row">
    <img src={icon} alt="" class="set-icon" />
    <h1>{name} Complete!</h1>
  </div>
  <StarRating {stars} size="lg" />

  {#if level}
    <div class="level">
      <h2 class="level-title">{level.title}</h2>
      <ol class="strip" style:grid-template-columns="repeat({level.stops.length}, 1fr)" aria-label={level.title}>
        {#each level.stops as stop, i (stop.id)}
          <li class={['stop', stop.done && 'done', i === level.to && i !== level.from && 'next']}>
            <span class="dot">
              <img src={stop.icon} alt="" />
            </span>
            {#if stop.done}
              <span class="badge" aria-hidden="true">&#10003;</span>
            {/if}
            <span class="sr-only">{stop.name}{stop.done ? ', done' : ''}{i === level.to && i !== level.from ? ', next' : ''}</span>
          </li>
        {/each}
        <img src="/pieces/wN.svg" alt="" class="knight" style:left="{((knightAt + 0.5) / level.stops.length) * 100}%" />
      </ol>
    </div>
  {/if}

  <div class="next-button">
    <Button bind:this={nextButton} variant="primary" size="large" href={next.href}>
      {next.label} <span aria-hidden="true">&rarr;</span>
    </Button>
  </div>
</div>

<style>
  .set-complete {
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
  .set-icon { width: 3rem; height: 3rem; }
  h1 { font-size: var(--size-title); }

  .level { width: 100%; margin-top: 0.5rem; }
  .level-title {
    font-size: var(--size-secondary);
    font-weight: var(--weight-regular);
    color: var(--ink-muted);
    margin-bottom: 0.25rem;
  }

  /* One column per stop; the knight stands above the row */
  .strip {
    position: relative;
    display: grid;
    padding: 2.25rem 0 0;
    margin: 0;
    list-style: none;
  }
  .stop {
    position: relative;
    display: flex;
    justify-content: center;
  }
  .dot {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 2px solid var(--line);
    background: var(--surface-raised);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dot img { width: 1.375rem; height: 1.375rem; }
  .stop.done .dot { border-color: var(--correct); }
  .stop.next .dot { border-color: var(--highlight); }
  .badge {
    position: absolute;
    top: -0.5rem;
    left: calc(50% + 0.5rem);
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 50%;
    background: var(--correct);
    color: var(--on-answer);
    font-size: var(--size-small);
    font-weight: var(--weight-strong);
    line-height: 1.125rem;
  }
  .knight {
    position: absolute;
    top: 0;
    width: 2rem;
    height: 2rem;
    transform: translateX(-50%);
    transition: left 0.8s ease-in-out;
  }
  @media (prefers-reduced-motion: reduce) {
    .knight { transition: none; }
  }
  /* Bigger stops where there's room (nine must fit a phone) */
  @media (min-width: 480px) {
    .strip { padding-top: 2.75rem; }
    .dot { width: 2.75rem; height: 2.75rem; }
    .dot img { width: 1.875rem; height: 1.875rem; }
    .badge { left: calc(50% + 0.75rem); }
    .knight { width: 2.5rem; height: 2.5rem; }
  }

  /* A grid stretches the button to the card's width: a big target */
  .next-button {
    width: 100%;
    display: grid;
    margin-top: 0.5rem;
  }
</style>
