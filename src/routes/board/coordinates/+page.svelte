<script lang="ts">
  import CoordinateTrainer from '$lib/components/board/CoordinateTrainer.svelte';
</script>

<main class="page">
  <a href="/board" class="back-link">&larr; Back to The Board</a>
  <div class="header">
    <h1>Name the Square</h1>
  </div>
  <CoordinateTrainer />
</main>

<style>
  .page {
    min-height: calc(100dvh - 3rem);
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
  }

  @media (min-height: 32rem) and (min-width: 32rem) {
    .page {
      height: calc(100dvh - 3rem);
      overflow: hidden;
    }
  }
  .back-link { font-size: 0.875rem; color: var(--text-muted); display: inline-block; margin-bottom: 1rem; flex-shrink: 0; }
  .back-link:hover { color: var(--foreground); }
  .header { text-align: center; margin-bottom: 1.5rem; flex-shrink: 0; }
  .header h1 { font-size: 1.5rem; font-weight: bold; }
</style>
