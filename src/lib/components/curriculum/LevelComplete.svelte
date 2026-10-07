<script lang="ts">
  import { onMount } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import JourneyBoard from './JourneyBoard.svelte';
  import { playSound } from '$lib/state/sound';

  /**
   * Shown after a level's bot is beaten: the journey board, with the knight
   * jumping from the bot up to the first stop of the next level's rank. One
   * button. After the last level there's no next level, and the knight stays.
   */

  interface Props {
    /** The finished level and the id of its bot. */
    level: { title: string; bot: string };
    /** The next level and the id of its first stop. */
    nextLevel?: { title: string; first: string };
    next: { href: string; label: string };
  }
  let { level, nextLevel, next }: Props = $props();

  let nextButton = $state<Button>();
  let walked = $state(false);

  onMount(() => {
    playSound('stars');
    nextButton?.focus();
    // The knight waits a beat on the bot, then jumps up to the new level
    const timer = setTimeout(() => (walked = true), 900);
    return () => clearTimeout(timer);
  });
</script>

<div class="level-complete">
  <div class="trophy" aria-hidden="true">&#127942;</div>
  <h1>{level.title} Complete!</h1>

  {#if nextLevel}
    <p class="level-title">Up to {nextLevel.title}</p>
  {/if}
  <JourneyBoard knightAt={walked && nextLevel ? nextLevel.first : level.bot} />

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
    gap: 0.75rem;
    padding: 1.25rem 1rem;
    border: 1px solid var(--line);
    border-radius: 0.75rem;
    background: var(--surface);
    text-align: center;
  }
  .trophy { font-size: 4rem; line-height: 1; }
  h1 { font-size: var(--size-title); }
  .level-title { color: var(--ink-muted); }

  /* A grid stretches the button to the card's width: a big target */
  .next-button {
    width: 100%;
    display: grid;
    margin-top: 0.5rem;
  }
</style>
