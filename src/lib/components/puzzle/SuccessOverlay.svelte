<script lang="ts">
  import StarRating from './StarRating.svelte';

  interface Props {
    stars: number;
    onNext?: () => void;
    onRetry: () => void;
    nextLabel?: string;
  }
  let { stars, onNext, onRetry, nextLabel }: Props = $props();
</script>

<div class="overlay">
  <div class="card">
    <div class="party">&#127881;</div>
    <h3 class="title">Puzzle Complete!</h3>
    <StarRating {stars} size="lg" />
    <div class="buttons">
      <button class="btn" onclick={onRetry}>Retry</button>
      {#if onNext}
        <button class="btn next-btn" onclick={onNext}>{nextLabel ?? 'Next Puzzle'}</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 0.5rem;
    animation: fade-in 0.3s ease-out;
  }
  .card {
    background: var(--background);
    border-radius: 0.75rem;
    padding: 2rem;
    text-align: center;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    max-width: 20rem;
    margin: 0 1rem;
    border: 1px solid var(--card-border);
  }
  .party { font-size: 3rem; margin-bottom: 0.5rem; }
  .title { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.75rem; }
  .buttons {
    margin-top: 1.5rem;
    display: flex;
    gap: 0.75rem;
    justify-content: center;
  }
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.15s;
    background: var(--btn-bg);
    color: inherit;
  }
  .btn:hover { background: var(--btn-hover); }
  .next-btn {
    background: #16a34a;
    color: white;
  }
  .next-btn:hover { background: #15803d; }
</style>
