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
    height: calc(100dvh - 3rem);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 1.5rem;
  }
  .back-link { font-size: 0.875rem; color: var(--text-muted); display: inline-block; margin-bottom: 1rem; flex-shrink: 0; }
  .back-link:hover { color: var(--foreground); }
  .header { text-align: center; margin-bottom: 1.5rem; flex-shrink: 0; }
  .header h1 { font-size: 1.5rem; font-weight: bold; }
</style>
