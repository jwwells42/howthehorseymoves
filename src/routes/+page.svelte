<script lang="ts">
  import { onMount } from 'svelte';
  import { progressState } from '$lib/state/progress-store';
  import { CURRICULUM, getAllStopStars, getFirstIncompleteId, getFirstIncompleteStop } from '$lib/curriculum';
  import CurriculumPath from '$lib/components/curriculum/CurriculumPath.svelte';
  import Button from '$lib/components/ui/Button.svelte';

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
  <header class="hero">
    <h1>How The Horsey Moves</h1>
    <p class="subtitle">Learn how each chess piece moves through interactive puzzles</p>
  </header>

  {#if continueTarget}
    <div class="continue">
      <Button variant="primary" size="large" href={continueTarget.href}>
        <img src="/pieces/wN.svg" alt="" width="32" height="32" />
        Continue: {continueTarget.name}
      </Button>
    </div>
  {/if}

  <CurriculumPath chapters={CURRICULUM} {stopStars} {firstIncompleteId} />

  <div class="footer">
    <a href="/about">About &middot; Privacy &middot; Credits</a>
  </div>
</main>

<style>
  .page {
    padding: 1.5rem;
    max-width: 56rem;
    margin: 0 auto;
  }
  .hero {
    text-align: center;
    margin-bottom: 2rem;
  }
  .subtitle {
    margin-top: 0.5rem;
    color: var(--ink-muted);
  }

  .continue {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--line);
    text-align: center;
  }
  .footer a {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }
  .footer a:hover {
    color: var(--ink);
  }
</style>
