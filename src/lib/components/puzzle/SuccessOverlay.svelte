<script lang="ts">
  import BoardOverlay from '$lib/components/board/BoardOverlay.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';

  interface Props {
    stars: number;
    onNext?: () => void;
    onRetry: () => void;
    nextLabel?: string;
  }
  let { stars, onNext, onRetry, nextLabel }: Props = $props();
</script>

<BoardOverlay>
  <div class="card">
    <div class="party" aria-hidden="true">&#127881;</div>
    <h3 class="title">Puzzle Complete!</h3>
    <StarRating {stars} size="lg" />
    <div class="buttons">
      <Button onclick={onRetry}>Retry</Button>
      {#if onNext}
        <Button variant="primary" onclick={onNext}>{nextLabel ?? 'Next Puzzle'}</Button>
      {/if}
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
  .buttons {
    margin-top: 1.5rem;
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }
</style>
