<script lang="ts">
  import BoardOverlay from '$lib/components/board/BoardOverlay.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';

  /**
   * Next is the main action: first, large, full width, with an arrow. Retry
   * stays below it, smaller, on every card (it's how a student goes back for
   * three stars), so the card looks the same however the puzzle went.
   */

  interface Props {
    stars: number;
    onNext?: () => void;
    onRetry: () => void;
    nextLabel?: string;
  }
  let { stars, onNext, onRetry, nextLabel }: Props = $props();

  let nextButton = $state<Button>();

  // Enter goes to the next puzzle.
  $effect(() => {
    nextButton?.focus();
  });
</script>

<BoardOverlay>
  <div class="card">
    <div class="party" aria-hidden="true">&#127881;</div>
    <h3 class="title">Puzzle Complete!</h3>
    <StarRating {stars} size="lg" />
    <div class="buttons">
      {#if onNext}
        <Button bind:this={nextButton} variant="primary" size="large" onclick={onNext}>
          {nextLabel ?? 'Next Puzzle'} <span aria-hidden="true">&rarr;</span>
        </Button>
      {/if}
      <div class="retry">
        <Button onclick={onRetry}><span aria-hidden="true">&#8634;</span> Retry</Button>
      </div>
    </div>
  </div>
</BoardOverlay>

<style>
  .card {
    max-width: 20rem;
    padding: 2rem;
    border: 1px solid var(--line);
    border-radius: 0.75rem;
    background: var(--page);
    box-shadow: var(--shadow);
  }
  .party { font-size: 3rem; margin-bottom: 0.5rem; }
  .title { font-size: var(--size-large); margin-bottom: 0.75rem; }
  /* A grid stretches Next to the card's width: a big target. Retry keeps its
     own size underneath, so it reads as the lesser choice. */
  .buttons {
    margin-top: 1.5rem;
    display: grid;
    gap: 0.75rem;
  }
  .retry {
    display: flex;
    justify-content: center;
  }
</style>
