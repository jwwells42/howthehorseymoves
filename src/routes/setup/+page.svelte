<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { SETUP_STAGES } from '$lib/components/board/SetupTrainer.svelte';

  let stageStars: Record<string, number> = $state({});

  onMount(() => {
    const stars: Record<string, number> = {};
    for (const stage of SETUP_STAGES) {
      stars[stage.slug] = parseInt(
        localStorage.getItem(`setup-${stage.slug}-best-stars`) ?? '0',
        10
      );
    }
    stageStars = stars;
  });
</script>

<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>

  <div class="page-header">
    <div class="header-icons">
      <img src="/pieces/wK.svg" alt="Setup" class="header-icon overlap-right" />
      <img src="/pieces/wQ.svg" alt="Setup" class="header-icon overlap-left" />
    </div>
    <div>
      <h1>Place the Pieces</h1>
      <p class="muted">Put each piece on its starting square.</p>
    </div>
  </div>

  <div class="stage-list">
    {#each SETUP_STAGES as stage, idx}
      {@const stars = stageStars[stage.slug] ?? 0}
      <a href="/setup/{stage.slug}" class="stage-item">
        <div class="stage-left">
          <img src={stage.icon} alt={stage.label} class="stage-icon" />
          <div>
            <h3 class="stage-label">{idx + 1}. {stage.label}</h3>
            <p class="stage-desc">{stage.description}</p>
          </div>
        </div>
        <div class="stage-right">
          {#if stars > 0}
            <StarRating {stars} size="sm" />
          {/if}
        </div>
      </a>
    {/each}
  </div>
</main>

<style>
  .page {
    min-height: 100vh;
    padding: 1.5rem;
    max-width: 42rem;
    margin: 0 auto;
  }
  .back-link {
    font-size: 0.875rem;
    color: var(--text-muted);
    display: inline-block;
    margin-bottom: 1rem;
  }
  .back-link:hover { color: var(--foreground); }
  .muted { color: var(--text-muted); }

  .page-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .page-header h1 {
    font-size: 1.875rem;
    font-weight: bold;
  }
  .header-icons {
    width: 4rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .header-icon {
    width: 2.5rem;
    height: 2.5rem;
  }
  .overlap-right { margin-right: -0.25rem; }
  .overlap-left { margin-left: -0.25rem; }

  .stage-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .stage-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem;
    border-radius: 0.75rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    transition: all 0.15s;
  }
  .stage-item:hover {
    border-color: rgba(240, 230, 204, 0.3);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
  .stage-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .stage-icon {
    width: 2.5rem;
    height: 2.5rem;
  }
  .stage-label {
    font-weight: bold;
  }
  .stage-desc {
    font-size: 0.875rem;
    color: var(--text-muted);
  }
  .stage-right {
    text-align: right;
  }
</style>
