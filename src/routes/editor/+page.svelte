<script lang="ts">
  import PuzzleEditor from '$lib/components/editor/PuzzleEditor.svelte';
</script>

<main class="page">
  <a href="/study" class="back-link">&larr; Back to study</a>
  <PuzzleEditor />
</main>

<style>
  .page {
    min-height: 100vh;
    padding: 1.5rem;
    max-width: 56rem;
    margin: 0 auto;
  }
  .back-link {
    font-size: 0.875rem;
    color: var(--text-muted);
    display: inline-block;
    margin-bottom: 1rem;
  }
  .back-link:hover { color: var(--foreground); }
</style>
