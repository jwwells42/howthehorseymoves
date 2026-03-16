<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { getPuzzle, getPuzzlesForPiece, PIECES } from '$lib/puzzles';
  import PuzzleShell from '$lib/components/puzzle/PuzzleShell.svelte';

  let piece = $derived(page.params.piece);
  let puzzleId = $derived(page.params.puzzleId);

  let puzzle = $derived(getPuzzle(piece, puzzleId));
  let puzzleSet = $derived(getPuzzlesForPiece(piece));

  let currentIdx = $derived(puzzleSet?.puzzles.findIndex((p) => p.id === puzzleId) ?? -1);
  let nextPuzzle = $derived(puzzleSet?.puzzles[currentIdx + 1]);

  let pieceIdx = $derived(PIECES.findIndex((p) => p.key === piece));
  let isBasicsPiece = $derived(pieceIdx !== -1);
  let isLastInSet = $derived(!nextPuzzle);
  let nextBasicsPiece = $derived(isBasicsPiece && isLastInSet ? PIECES[pieceIdx + 1] : null);

  let nextLabel = $derived.by(() => {
    if (nextPuzzle) return undefined;
    if (nextBasicsPiece) return `Continue to ${nextBasicsPiece.name}!`;
    if (isBasicsPiece && isLastInSet) return 'Continue to The Board!';
    return undefined;
  });

  function handleNext() {
    if (nextPuzzle) {
      goto(`/learn/${piece}/${nextPuzzle.id}`);
    } else if (nextBasicsPiece) {
      const nextSet = getPuzzlesForPiece(nextBasicsPiece.key);
      const firstPuzzleId = nextSet?.puzzles[0]?.id;
      goto(firstPuzzleId
        ? `/learn/${nextBasicsPiece.key}/${firstPuzzleId}`
        : `/learn/${nextBasicsPiece.key}`
      );
    } else if (isBasicsPiece && isLastInSet) {
      goto('/board');
    } else {
      goto(`/learn/${piece}`);
    }
  }
</script>

{#if puzzle}
  <main class="page">
    <a href="/learn/{piece}" class="back-link">
      &larr; Back to {piece} puzzles
    </a>
    {#key puzzle.id}
      <PuzzleShell {puzzle} onNext={handleNext} {nextLabel} />
    {/key}
  </main>
{:else}
  <main class="page center">
    <h1>Puzzle not found</h1>
    <a href="/" class="muted-link">Back to home</a>
  </main>
{/if}

<style>
  .page { min-height: 100vh; padding: 1rem; }
  .center { text-align: center; padding: 1.5rem; max-width: 56rem; margin: 0 auto; }
  .back-link {
    font-size: 0.875rem;
    color: var(--text-muted);
    display: inline-block;
    margin-bottom: 0.5rem;
    margin-left: 1rem;
  }
  .back-link:hover { color: var(--foreground); }
  .muted-link { color: var(--text-muted); }
  .muted-link:hover { text-decoration: underline; }
</style>
