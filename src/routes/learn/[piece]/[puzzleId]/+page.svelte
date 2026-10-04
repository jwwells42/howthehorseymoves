<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { getPuzzle, getPuzzlesForPiece } from '$lib/puzzles';
  import PuzzleShell from '$lib/components/puzzle/PuzzleShell.svelte';
  import HowToWinLesson from '$lib/components/lessons/HowToWinLesson.svelte';
  import PawnEndingsLesson from '$lib/components/lessons/PawnEndingsLesson.svelte';
  import { getStepById } from '$lib/components/lessons/pawn-endings-data';
  import { doneHref, stopFromUrl, withStop } from '$lib/curriculum';
  import type { HowToWinSection } from '$lib/components/lessons/how-to-win-data';

  let piece = $derived(page.params.piece ?? '');
  let puzzleId = $derived(page.params.puzzleId ?? '');

  // How to Win step routes: /learn/how-to-win-checkmate/back-rank
  let howToWinMatch = $derived(piece.match(/^how-to-win-(check|checkmate|stalemate)$/));

  // Pawn endings step
  let isPawnEndings = $derived(piece === 'pawn-endings-lesson');
  let pawnStep = $derived(isPawnEndings ? getStepById(puzzleId) : undefined);

  let puzzle = $derived(getPuzzle(piece, puzzleId));
  let puzzleSet = $derived(getPuzzlesForPiece(piece));

  let currentIdx = $derived(puzzleSet?.puzzles.findIndex((p) => p.id === puzzleId) ?? -1);
  let nextPuzzle = $derived(puzzleSet?.puzzles[currentIdx + 1]);

  // Opened from the path, the last puzzle of a set goes to the screen between
  // stops. Opened from a hub, it goes back to the set's list.
  let pathStop = $derived(stopFromUrl(page.url));
  let nextLabel = $derived(nextPuzzle ? undefined : 'Continue');

  function handleNext() {
    if (nextPuzzle) goto(withStop(`/learn/${piece}/${nextPuzzle.id}`, pathStop));
    else goto(pathStop ? doneHref(pathStop) : `/learn/${piece}`);
  }
</script>

{#if isPawnEndings && pawnStep}
  <main class="page lesson-page">
    <a href={withStop('/learn/pawn-endings-lesson', pathStop)} class="back-link">
      &larr; Back to Pawn Endings
    </a>
    {#key puzzleId}
      <PawnEndingsLesson stepSlug={puzzleId} />
    {/key}
  </main>
{:else if howToWinMatch}
  {@const section = howToWinMatch[1] as HowToWinSection}
  <main class="page lesson-page">
    <a href={withStop(`/learn/${piece}`, pathStop)} class="back-link">
      &larr; Back to {section === 'check' ? 'Check' : section === 'checkmate' ? 'Checkmate' : 'Stalemate'}
    </a>
    {#key puzzleId}
      <HowToWinLesson {section} stepSlug={puzzleId} />
    {/key}
  </main>
{:else if puzzle}
  <main class="page">
    <a href={withStop(`/learn/${piece}`, pathStop)} class="back-link">
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
    min-height: calc(100dvh - 3rem);
    display: flex;
    flex-direction: column;
    padding: 1rem;
  }

  @media (min-height: 32rem) and (min-width: 32rem) {
    .page {
      height: calc(100dvh - 3rem);
      overflow: hidden;
    }
  }
  .lesson-page { padding: 1.5rem; max-width: 42rem; margin: 0 auto; }
  @media (max-height: 480px) {
    .lesson-page { padding: 0.5rem 1rem; }
  }
  .center { text-align: center; padding: 1.5rem; max-width: 56rem; margin: 0 auto; overflow: auto; }
  .back-link {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    display: inline-block;
    margin-bottom: 0.5rem;
    margin-left: 1rem;
    flex-shrink: 0;
  }
  .back-link:hover { color: var(--ink); }
  .muted-link { color: var(--ink-muted); }
  .muted-link:hover { text-decoration: underline; }
</style>
