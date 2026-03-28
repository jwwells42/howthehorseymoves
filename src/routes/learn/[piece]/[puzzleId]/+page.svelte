<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { getPuzzle, getPuzzlesForPiece, PIECES } from '$lib/puzzles';
  import PuzzleShell from '$lib/components/puzzle/PuzzleShell.svelte';
  import HowToWinLesson from '$lib/components/lessons/HowToWinLesson.svelte';
  import type { HowToWinSection } from '$lib/components/lessons/how-to-win-data';

  let piece = $derived(page.params.piece ?? '');
  let puzzleId = $derived(page.params.puzzleId ?? '');

  // How to Win step routes: /learn/how-to-win-checkmate/back-rank
  let howToWinMatch = $derived(piece.match(/^how-to-win-(check|checkmate|stalemate)$/));

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

{#if howToWinMatch}
  {@const section = howToWinMatch[1] as HowToWinSection}
  <main class="page lesson-page">
    <a href="/learn/{piece}" class="back-link">
      &larr; Back to {section === 'check' ? 'Check' : section === 'checkmate' ? 'Checkmate' : 'Stalemate'}
    </a>
    {#key puzzleId}
      <HowToWinLesson {section} stepSlug={puzzleId} />
    {/key}
  </main>
{:else if puzzle}
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
  .page {
    height: calc(100dvh - 3rem);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 1rem;
  }
  .lesson-page { padding: 1.5rem; max-width: 42rem; margin: 0 auto; overflow: auto; }
  .center { text-align: center; padding: 1.5rem; max-width: 56rem; margin: 0 auto; overflow: auto; }
  .back-link {
    font-size: 0.875rem;
    color: var(--text-muted);
    display: inline-block;
    margin-bottom: 0.5rem;
    margin-left: 1rem;
    flex-shrink: 0;
  }
  .back-link:hover { color: var(--foreground); }
  .muted-link { color: var(--text-muted); }
  .muted-link:hover { text-decoration: underline; }
</style>
