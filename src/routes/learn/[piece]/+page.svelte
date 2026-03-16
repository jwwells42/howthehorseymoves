<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { getPuzzlesForPiece, PIECES, getCategory } from '$lib/puzzles';
  import { progressState, isPuzzleUnlocked, getPuzzleProgress } from '$lib/state/progress-store';
  import EndgameShell from '$lib/components/endgame/EndgameShell.svelte';
  import MateTrainer from '$lib/components/endgame/MateTrainer.svelte';
  import type { MateEndgameType } from '$lib/logic/endgame';
  import type { PiecePlacement } from '$lib/logic/types';
  import { SECTIONS as HOW_TO_WIN_SECTIONS, getSectionSteps } from '$lib/components/lessons/how-to-win-data';
  import type { HowToWinSection } from '$lib/components/lessons/how-to-win-data';

  let piece = $derived(page.params.piece);

  // Endgame positions
  const ENDGAME_POSITIONS: Record<string, { title: string; instruction: string; placements: PiecePlacement[] }> = {
    'endings-kpk': {
      title: 'King + Pawn vs King',
      instruction: 'Promote the pawn! Every wrong move is a draw.',
      placements: [
        { piece: 'K', color: 'w', square: 'd6' },
        { piece: 'P', color: 'w', square: 'd4' },
        { piece: 'K', color: 'b', square: 'd8' },
      ],
    },
  };

  let endgame = $derived(ENDGAME_POSITIONS[piece]);
  let mateEndgameMatch = $derived(piece.match(/^endings-(kqk|krrk|krk|kbbk)$/));
  let howToWinMatch = $derived(piece.match(/^how-to-win-(check|checkmate|stalemate)$/));

  // Category page
  let category = $derived(getCategory(piece));

  // Puzzle list
  let puzzleSet = $derived(getPuzzlesForPiece(piece));
  let pieceInfo = $derived(PIECES.find((p) => p.key === piece));

  // How to Win section stars
  let sectionStars = $state<Record<string, number>>({});
  let hwStepStars = $state(0);
  onMount(() => {
    const s: Record<string, number> = {};
    for (const sec of HOW_TO_WIN_SECTIONS) {
      s[sec.key] = parseInt(localStorage.getItem(sec.storageKey) ?? '0', 10);
    }
    sectionStars = s;
    if (howToWinMatch) {
      const sectionInfo = HOW_TO_WIN_SECTIONS.find(s => s.key === howToWinMatch![1]);
      if (sectionInfo) {
        hwStepStars = parseInt(localStorage.getItem(sectionInfo.storageKey) ?? '0', 10);
      }
    }
  });

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

{#if endgame}
  <!-- Endgame trainer (e.g. KPK) -->
  <main class="page">
    <a href="/learn/endings" class="back-link">&larr; Back to endings</a>
    <EndgameShell title={endgame.title} instruction={endgame.instruction} placements={endgame.placements} />
  </main>
{:else if mateEndgameMatch}
  <!-- Mate conversion trainer (KQK, KRRK, etc.) -->
  <main class="page">
    <a href="/learn/endings" class="back-link">&larr; Back to endings</a>
    <MateTrainer type={mateEndgameMatch[1]} />
  </main>
{:else if piece === 'how-to-win'}
  <!-- How to Win hub page -->
  <main class="page">
    <a href="/" class="back-link">&larr; Back to home</a>

    <div class="page-header">
      <img src="/pieces/wK.svg" alt="How to Win" class="header-icon" />
      <div>
        <h1>How to Win</h1>
        <p class="muted">Learn check, checkmate, and stalemate.</p>
      </div>
    </div>

    <div class="subcategory-list">
      {#each HOW_TO_WIN_SECTIONS as sec}
        <a href="/learn/how-to-win-{sec.key}" class="sub-item">
          <div class="sub-left">
            <img src={sec.icon} alt={sec.title} class="sub-icon" />
            <div>
              <h3>{sec.title}</h3>
              <p class="sub-desc">{sec.description}</p>
            </div>
          </div>
          <div class="sub-right">
            {#if (sectionStars[sec.key] ?? 0) > 0}
              <StarRating stars={sectionStars[sec.key]} size="sm" />
            {/if}
          </div>
        </a>
      {/each}
    </div>
  </main>
{:else if howToWinMatch}
  <!-- How to Win section page (check/checkmate/stalemate) -->
  {@const section = howToWinMatch[1]}
  {@const sectionInfo = HOW_TO_WIN_SECTIONS.find(s => s.key === section)}
  {@const steps = getSectionSteps(section)}
  <main class="page">
    <a href="/learn/how-to-win" class="back-link">&larr; Back to How to Win</a>

    {#if sectionInfo && steps}
      <div class="page-header">
        <img src={sectionInfo.icon} alt={sectionInfo.title} class="header-icon" />
        <div>
          <h1>{sectionInfo.title}</h1>
          <p class="muted">{sectionInfo.description}</p>
        </div>
      </div>

      <a href="/learn/{piece}/{steps[0].slug}" class="start-btn">
        {hwStepStars > 0 ? 'Play Again' : 'Start'}
      </a>

      {#if hwStepStars > 0}
        <div class="stars-center">
          <StarRating stars={hwStepStars} size="sm" />
        </div>
      {/if}

      <div class="puzzle-list">
        {#each steps as step, idx}
          <a href="/learn/{piece}/{step.slug}" class="puzzle-item">
            <div class="puzzle-left">
              <span class="puzzle-num">{idx + 1}.</span>
              <div>
                <span class="puzzle-title">{step.title}</span>
                <p class="puzzle-instruction">{step.instruction}</p>
              </div>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </main>
{:else if category}
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

  /* How to Win section */
  .start-btn {
    display: block;
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: #16a34a;
    color: white;
    text-align: center;
    font-weight: bold;
    font-size: 1.125rem;
    text-decoration: none;
    transition: background 0.15s;
  }
  .start-btn:hover { background: #15803d; }
  .stars-center { margin-bottom: 1rem; text-align: center; }
</style>
