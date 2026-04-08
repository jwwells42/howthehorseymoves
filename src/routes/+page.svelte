<script lang="ts">
  import { onMount } from 'svelte';
  import { progressState } from '$lib/state/progress-store';
  import { CURRICULUM, getAllStopStars, getFirstIncompleteId, getFirstIncompleteStop } from '$lib/curriculum';
  import CurriculumPath from '$lib/components/curriculum/CurriculumPath.svelte';

  let stopStars = $state<Record<string, number>>({});
  let mounted = $state(false);

  // Re-read all stars whenever puzzle progress changes or on mount
  let _ = $derived.by(() => {
    // Touch progressState to trigger reactivity on puzzle-set changes
    void $progressState;
    if (mounted) {
      stopStars = getAllStopStars();
    }
    return null;
  });

  onMount(() => {
    mounted = true;
    stopStars = getAllStopStars();

    // Auto-scroll to the first incomplete stop
    const id = getFirstIncompleteId(stopStars);
    if (id) {
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  });

  let firstIncompleteId = $derived(getFirstIncompleteId(stopStars));
  let continueTarget = $derived(getFirstIncompleteStop(stopStars));
</script>

<main class="page">
  <div class="hero">
    <h1>How The Horsey Moves</h1>
    <p class="subtitle">Learn how each chess piece moves through interactive puzzles</p>
  </div>

  {#if continueTarget}
    <a href={continueTarget.href} class="continue-btn">
      <img src="/pieces/wN.svg" alt="" class="continue-icon" width="32" height="32" />
      Continue: {continueTarget.name}
    </a>
  {/if}

  <CurriculumPath chapters={CURRICULUM} {stopStars} {firstIncompleteId} />

  <div class="footer">
    <a href="/about">About &middot; Privacy &middot; Credits</a>
  </div>
</main>

<style>
  .page {
    min-height: 100vh;
    padding: 1.5rem;
    max-width: 56rem;
    margin: 0 auto;
  }
  .hero {
    text-align: center;
    margin-bottom: 2rem;
  }
  .hero h1 {
    font-size: 2.25rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  .subtitle { color: var(--text-muted); }

  .continue-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: #16a34a;
    color: white;
    text-align: center;
    font-weight: bold;
    font-size: 1.125rem;
    transition: background 0.15s;
    animation: pulse-glow 2s ease-in-out infinite;
  }
  .continue-btn:hover { background: #15803d; }
  .continue-icon { filter: brightness(0) invert(1); }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
    50% { box-shadow: 0 0 0 8px rgba(22, 163, 74, 0); }
  }

  .footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(240, 230, 204, 0.1);
    text-align: center;
  }
  .footer a {
    font-size: 0.75rem;
    color: var(--text-faint);
    transition: color 0.15s;
  }
  .footer a:hover { color: var(--text-muted); }
</style>
