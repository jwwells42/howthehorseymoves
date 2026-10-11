<script lang="ts">
  import PuzzleEditor from '$lib/components/editor/PuzzleEditor.svelte';
</script>

<main class="page">
  <a href="/study" class="back-link">&larr; Back to study</a>
  <PuzzleEditor />
</main>

<style>
  /* The same column as every other page */
  .page {
    max-width: calc(var(--column) + 2 * var(--gutter));
    margin: 0 auto;
    padding: 1.5rem var(--gutter);
  }
  .back-link {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    display: inline-block;
    margin-bottom: 1rem;
  }
  .back-link:hover { color: var(--ink); }
</style>
