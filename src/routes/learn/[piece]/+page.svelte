<script lang="ts">
  import { page } from '$app/state';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { getPuzzlesForPiece, PIECES, getCategory } from '$lib/puzzles';
  import { progressState, isPuzzleUnlocked, getPuzzleProgress } from '$lib/state/progress-store';

  let piece = $derived(page.params.piece);

  // Category page
  let category = $derived(getCategory(piece));

  // Puzzle list
  let puzzleSet = $derived(getPuzzlesForPiece(piece));
  let pieceInfo = $derived(PIECES.find((p) => p.key === piece));

  let parentCategory = $derived(
    piece.startsWith('checkmate-') ? 'checkmate'
    : piece.startsWith('tactics-') ? 'tactics'
    : piece.startsWith('endings-') ? 'endings'
    : piece.startsWith('blindfold-') ? 'blindfold'
    : null
  );
  let backHref = $derived(parentCategory ? `/learn/${parentCategory}` : '/');
  let backLabel = $derived(parentCategory ? `Back to ${parentCategory}` : 'Back to home');

  let displayName = $derived(pieceInfo?.name ?? puzzleSet?.name ?? 'Puzzles');
  let displayDescription = $derived(pieceInfo?.description ?? '');
  let displayIcon = $derived(pieceInfo?.icon ?? '/pieces/wQ.svg');
  let puzzleIds = $derived(puzzleSet?.puzzles.map((p) => p.id) ?? []);
</script>

{#if category}
  <!-- Category page with subcategories -->
  <main class="page">
    <a href="/" class="back-link">&larr; Back to home</a>

    <div class="page-header">
      <img src={category.icon} alt={category.name} class="header-icon" />
      <div>
        <h1>{category.name}</h1>
        <p class="muted">{category.description}</p>
      </div>
    </div>

    <div class="subcategory-list">
      {#each category.subcategories as sub}
        {@const subSet = getPuzzlesForPiece(sub.key)}
        {@const total = subSet?.puzzles.length ?? 0}
        {@const completed = $progressState.loaded ? (subSet?.puzzles.filter(p => getPuzzleProgress(p.id)?.completed).length ?? 0) : 0}
        {@const bestStars = $progressState.loaded && subSet ? Math.max(0, ...subSet.puzzles.map(p => getPuzzleProgress(p.id)?.bestStars ?? 0)) : 0}
        {#if sub.comingSoon}
          <div class="sub-item disabled">
            <div class="sub-left">
              <img src={sub.icon} alt={sub.name} class="sub-icon" />
              <div>
                <h3>{sub.name}</h3>
                <p class="sub-desc">{sub.description}</p>
              </div>
            </div>
            <span class="coming-soon">Coming soon</span>
          </div>
        {:else}
          <a href="/learn/{sub.key}" class="sub-item">
            <div class="sub-left">
              <img src={sub.icon} alt={sub.name} class="sub-icon" />
              <div>
                <h3>{sub.name}</h3>
                <p class="sub-desc">{sub.description}</p>
              </div>
            </div>
            <div class="sub-right">
              <span class="stat">{completed}/{total}</span>
              {#if completed > 0 && completed === total}
                <StarRating stars={bestStars} size="sm" />
              {/if}
            </div>
          </a>
        {/if}
      {/each}
    </div>
  </main>
{:else if puzzleSet}
  <!-- Puzzle list page -->
  <main class="page">
    <a href={backHref} class="back-link">&larr; {backLabel}</a>

    <div class="page-header">
      <img src={displayIcon} alt={displayName} class="header-icon" />
      <div>
        <h1>{displayName} Puzzles</h1>
        {#if displayDescription}<p class="muted">{displayDescription}</p>{/if}
      </div>
    </div>

    <div class="puzzle-list">
      {#each puzzleSet.puzzles as puzz, idx}
        {@const unlocked = $progressState.loaded && isPuzzleUnlocked(puzz.id, puzzleIds)}
        {@const progress = getPuzzleProgress(puzz.id)}
        {#if unlocked}
          <a href="/learn/{piece}/{puzz.id}" class="puzzle-item">
            <div class="puzzle-left">
              <span class="puzzle-num">{idx + 1}.</span>
              <div>
                <span class="puzzle-title">{puzz.title}</span>
                <p class="puzzle-instruction">{puzz.instruction}</p>
              </div>
            </div>
            {#if progress?.completed}
              <StarRating stars={progress.bestStars} size="sm" />
            {/if}
          </a>
        {:else}
          <div class="puzzle-item locked">
            <div class="puzzle-left">
              <span class="puzzle-num">{idx + 1}.</span>
              <span class="puzzle-title">{puzz.title}</span>
            </div>
            <span class="locked-label">Locked</span>
          </div>
        {/if}
      {/each}
    </div>
  </main>
{:else}
  <main class="page center">
    <h1>Not found</h1>
    <a href="/" class="muted-link">Back to home</a>
  </main>
{/if}

<style>
  .page { min-height: 100vh; padding: 1.5rem; max-width: 42rem; margin: 0 auto; }
  .center { text-align: center; }
  .back-link { font-size: 0.875rem; color: var(--text-muted); display: inline-block; margin-bottom: 1rem; }
  .back-link:hover { color: var(--foreground); }
  .muted { color: var(--text-muted); }
  .muted-link { color: var(--text-muted); }
  .muted-link:hover { text-decoration: underline; }

  .page-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
  .page-header h1 { font-size: 1.875rem; font-weight: bold; }
  .header-icon { width: 4rem; height: 4rem; }

  /* Subcategory list */
  .subcategory-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .sub-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem;
    border-radius: 0.75rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    transition: all 0.15s;
  }
  .sub-item:not(.disabled):hover {
    border-color: rgba(240, 230, 204, 0.3);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
  .sub-item.disabled { opacity: 0.4; }
  .sub-left { display: flex; align-items: center; gap: 1rem; }
  .sub-icon { width: 2.5rem; height: 2.5rem; }
  .sub-left h3 { font-weight: bold; }
  .sub-desc { font-size: 0.875rem; color: var(--text-muted); }
  .sub-right { text-align: right; }
  .stat { font-size: 0.75rem; color: var(--text-faint); }
  .coming-soon { font-size: 0.75rem; color: var(--text-faint); }

  /* Puzzle list */
  .puzzle-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .puzzle-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    transition: all 0.15s;
  }
  .puzzle-item:not(.locked):hover {
    border-color: rgba(240, 230, 204, 0.3);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  .puzzle-item.locked { opacity: 0.4; }
  .puzzle-left { display: flex; align-items: center; gap: 0.75rem; }
  .puzzle-num { font-size: 0.875rem; color: var(--text-faint); width: 1.5rem; text-align: right; }
  .puzzle-title { font-weight: 500; }
  .puzzle-instruction { font-size: 0.75rem; color: var(--text-faint); }
  .locked-label { font-size: 0.75rem; color: var(--text-faint); }
</style>
