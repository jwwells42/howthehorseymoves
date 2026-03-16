<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';

  let coordStars = $state(0);

  onMount(() => {
    coordStars = parseInt(localStorage.getItem('coord-best-stars') ?? '0', 10);
  });
</script>

<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>

  <div class="page-header">
    <div class="board-icon">e4</div>
    <div>
      <h1>The Board</h1>
      <p class="muted">Learn the board and set up the pieces.</p>
    </div>
  </div>

  <div class="item-list">
    <a href="/board/coordinates" class="item">
      <div class="item-left">
        <div class="board-icon-sm">e4</div>
        <div>
          <h3>Name the Square</h3>
          <p class="item-desc">Click the right square before time runs out!</p>
        </div>
      </div>
      <div class="item-right">
        {#if coordStars > 0}<StarRating stars={coordStars} size="sm" />{/if}
      </div>
    </a>

    <a href="/setup" class="item">
      <div class="item-left">
        <div class="setup-icons">
          <img src="/pieces/wK.svg" alt="Setup" class="setup-icon" />
          <img src="/pieces/wQ.svg" alt="Setup" class="setup-icon overlap" />
        </div>
        <div>
          <h3>Place the Pieces</h3>
          <p class="item-desc">Put each piece on its starting square.</p>
        </div>
      </div>
      <span class="stat">7 stages</span>
    </a>
  </div>
</main>

<style>
  .page { min-height: 100vh; padding: 1.5rem; max-width: 42rem; margin: 0 auto; }
  .back-link { font-size: 0.875rem; color: var(--text-muted); display: inline-block; margin-bottom: 1rem; }
  .back-link:hover { color: var(--foreground); }
  .muted { color: var(--text-muted); }

  .page-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
  .page-header h1 { font-size: 1.875rem; font-weight: bold; }

  .board-icon {
    width: 4rem; height: 4rem; border-radius: 0.25rem;
    background: #7a9e6e; border: 2px solid #d4c4a0;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.5rem; font-weight: bold; color: #d4c4a0;
  }
  .board-icon-sm {
    width: 2.5rem; height: 2.5rem; border-radius: 0.25rem;
    background: #7a9e6e; border: 2px solid #d4c4a0;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.875rem; font-weight: bold; color: #d4c4a0;
  }

  .setup-icons { width: 2.5rem; height: 2.5rem; display: flex; align-items: center; justify-content: center; }
  .setup-icon { width: 1.5rem; height: 1.5rem; }
  .setup-icon.overlap { margin-left: -0.25rem; }

  .item-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1.25rem; border-radius: 0.75rem;
    border: 1px solid var(--card-border); background: var(--card-bg);
    transition: all 0.15s;
  }
  .item:hover { border-color: rgba(240, 230, 204, 0.3); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
  .item-left { display: flex; align-items: center; gap: 1rem; }
  .item-left h3 { font-weight: bold; }
  .item-desc { font-size: 0.875rem; color: var(--text-muted); }
  .item-right { text-align: right; }
  .stat { font-size: 0.75rem; color: var(--text-faint); }
</style>
