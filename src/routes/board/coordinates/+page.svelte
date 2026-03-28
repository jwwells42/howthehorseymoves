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
  .page { height: calc(100dvh - 3rem); display: flex; flex-direction: column; padding: 1.5rem; max-width: 42rem; margin: 0 auto; overflow: hidden; }
  .back-link { flex-shrink: 0; font-size: 0.875rem; color: var(--text-muted); display: inline-block; margin-bottom: 1rem; }
  .back-link:hover { color: var(--foreground); }
  .header { text-align: center; margin-bottom: 1.5rem; }
  .header h1 { font-size: 1.5rem; font-weight: bold; }
</style>
