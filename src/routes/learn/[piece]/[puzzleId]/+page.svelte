<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { getPuzzle, getPuzzlesForPiece } from '$lib/puzzles';
  import PuzzleShell from '$lib/components/puzzle/PuzzleShell.svelte';
  import BoardPage from '$lib/components/board/BoardPage.svelte';
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
  <BoardPage back={{ href: withStop('/learn/pawn-endings-lesson', pathStop), label: 'Back to Pawn Endings' }}>
    {#key puzzleId}
      <PawnEndingsLesson stepSlug={puzzleId} />
    {/key}
  </BoardPage>
{:else if howToWinMatch}
  {@const section = howToWinMatch[1] as HowToWinSection}
  <BoardPage
    back={{
      href: withStop(`/learn/${piece}`, pathStop),
      label: `Back to ${section === 'check' ? 'Check' : section === 'checkmate' ? 'Checkmate' : 'Stalemate'}`
    }}
  >
    {#key puzzleId}
      <HowToWinLesson {section} stepSlug={puzzleId} />
    {/key}
  </BoardPage>
{:else if puzzle}
  <BoardPage back={{ href: withStop(`/learn/${piece}`, pathStop), label: `Back to ${puzzleSet?.name} Puzzles` }}>
    {#key puzzle.id}
      <PuzzleShell {puzzle} title="{puzzleSet?.name} {currentIdx + 1}" onNext={handleNext} {nextLabel} />
    {/key}
  </BoardPage>
{:else}
  <main class="center">
    <h1>Puzzle not found</h1>
    <a href="/" class="muted-link">Back to home</a>
  </main>
{/if}

<style>
  .center { text-align: center; padding: 1.5rem; max-width: 56rem; margin: 0 auto; overflow: auto; }
  .muted-link { color: var(--ink-muted); }
  .muted-link:hover { text-decoration: underline; }
</style>
