<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { PIECES, CATEGORIES, getPuzzlesForPiece, type CategoryInfo } from '$lib/puzzles';
  import { progressState, getPuzzleProgress } from '$lib/state/progress-store';

  let coordStars = $state(0);
  let howToWinStars = $state(0);
  let showBasics = $state(true);
  let showIntermediate = $state(false);
  let showAdvanced = $state(false);

  onMount(() => {
    coordStars = parseInt(localStorage.getItem('coord-best-stars') ?? '0', 10);
    howToWinStars = parseInt(localStorage.getItem('how-to-win-best-stars') ?? '0', 10);
  });

  const INTERMEDIATE_KEYS = ['checkmate', 'tactics', 'endings'];
  const ADVANCED_KEYS = ['blindfold'];

  let allBasicsDone = $derived($progressState.loaded && PIECES.every((piece) => {
    const puzzleSet = getPuzzlesForPiece(piece.key);
    if (!puzzleSet) return false;
    return puzzleSet.puzzles.every((p) => getPuzzleProgress(p.id)?.completed);
  }));

  let upNextPieceKey = $derived.by(() => {
    if (!$progressState.loaded) return null;
    for (const piece of PIECES) {
      const puzzleSet = getPuzzlesForPiece(piece.key);
      if (!puzzleSet) continue;
      const allDone = puzzleSet.puzzles.every((p) => getPuzzleProgress(p.id)?.completed);
      if (!allDone) return piece.key;
    }
    return null;
  });

  let continueTarget = $derived.by(() => {
    if (!$progressState.loaded) return null;
    for (const piece of PIECES) {
      const puzzleSet = getPuzzlesForPiece(piece.key);
      if (!puzzleSet) continue;
      const allDone = puzzleSet.puzzles.every((p) => getPuzzleProgress(p.id)?.completed);
      if (!allDone) {
        for (const p of puzzleSet.puzzles) {
          if (!getPuzzleProgress(p.id)?.completed) {
            return {
              piece: piece.key,
              puzzleId: p.id,
              label: `${piece.name} Puzzle ${puzzleSet.puzzles.indexOf(p) + 1}`,
            };
          }
        }
        break;
      }
    }
    return null;
  });

  let allPieces3Star = $derived($progressState.loaded && PIECES.every((piece) => {
    const puzzleSet = getPuzzlesForPiece(piece.key);
    if (!puzzleSet) return false;
    return puzzleSet.puzzles.every((p) => {
      const progress = getPuzzleProgress(p.id);
      return progress?.completed && progress.bestStars >= 3;
    });
  }));

  let dzStats = $derived(getPieceStats('danger-zones'));

  let intermediateCats = $derived(CATEGORIES.filter(c => INTERMEDIATE_KEYS.includes(c.key)));
  let advancedCats = $derived(CATEGORIES.filter(c => ADVANCED_KEYS.includes(c.key)));

  function getCategoryStats(cat: CategoryInfo) {
    let total = 0;
    let completed = 0;
    if ($progressState.loaded) {
      for (const sub of cat.subcategories) {
        const puzzleSet = getPuzzlesForPiece(sub.key);
        if (puzzleSet) {
          total += puzzleSet.puzzles.length;
          for (const p of puzzleSet.puzzles) {
            if (getPuzzleProgress(p.id)?.completed) completed++;
          }
        }
      }
    }
    return { total, completed };
  }

  function getPieceStats(pieceKey: string) {
    const puzzleSet = getPuzzlesForPiece(pieceKey);
    const totalPuzzles = puzzleSet?.puzzles.length ?? 0;
    let completedPuzzles = 0;
    let bestStars = 0;
    if (puzzleSet && $progressState.loaded) {
      for (const p of puzzleSet.puzzles) {
        const progress = getPuzzleProgress(p.id);
        if (progress?.completed) {
          completedPuzzles++;
          bestStars = Math.max(bestStars, progress.bestStars);
        }
      }
    }
    return { totalPuzzles, completedPuzzles, bestStars };
  }
</script>

<main class="page">
  <div class="hero">
    <h1>How The Horsey Moves</h1>
    <p class="subtitle">Learn how each chess piece moves through interactive puzzles</p>
  </div>

  <!-- Basics -->
  <div class="section-header">
    <button class="section-toggle" onclick={() => showBasics = !showBasics}>
      <h2>Basics</h2>
      <div class="divider"></div>
      <span class="toggle-label">{showBasics ? 'Hide' : 'Show'}</span>
    </button>
    <p class="section-subtitle">Learn how each piece moves</p>
  </div>

  {#if showBasics && continueTarget}
    <a href="/learn/{continueTarget.piece}/{continueTarget.puzzleId}" class="continue-btn">
      Continue: {continueTarget.label}
    </a>
  {/if}

  <div class={['grid', !showBasics && 'hidden']}>
    {#each PIECES as piece, idx}
      {@const stats = getPieceStats(piece.key)}
      <a href="/learn/{piece.key}" class={['card', piece.key === upNextPieceKey && 'up-next']}>
        <div class={['step-badge', stats.completedPuzzles > 0 && stats.completedPuzzles === stats.totalPuzzles && 'complete']}>
          {#if stats.completedPuzzles > 0 && stats.completedPuzzles === stats.totalPuzzles}
            &#10003;
          {:else}
            {idx + 1}
          {/if}
        </div>
        <div class="card-header">
          <img src={piece.icon} alt={piece.name} class="card-icon" />
          <h3>{piece.name}</h3>
        </div>
        <p class="card-desc">{piece.description}</p>
        <div class="card-footer">
          {#if stats.completedPuzzles > 0 && stats.completedPuzzles === stats.totalPuzzles}
            <StarRating stars={stats.bestStars} size="sm" />
          {/if}
        </div>
      </a>
    {/each}

    <!-- Danger Zones card -->
    <a href="/learn/danger-zones" class="card">
      <div class={['step-badge', dzStats.completedPuzzles > 0 && dzStats.completedPuzzles === dzStats.totalPuzzles && 'complete']}>
        {#if dzStats.completedPuzzles > 0 && dzStats.completedPuzzles === dzStats.totalPuzzles}
          &#10003;
        {:else}
          {PIECES.length + 1}
        {/if}
      </div>
      <div class="card-header">
        <div class="danger-icon">
          <img src="/pieces/bN.svg" alt="Danger" class="danger-piece" />
        </div>
        <h3>Danger Zones</h3>
      </div>
      <p class="card-desc">Dodge enemy pieces — reach the star without getting eaten!</p>
      <div class="card-footer">
        {#if dzStats.completedPuzzles > 0 && dzStats.completedPuzzles === dzStats.totalPuzzles}
          <StarRating stars={dzStats.bestStars} size="sm" />
        {/if}
      </div>
    </a>

    <!-- The Board card -->
    <a href="/board" class="card">
      <div class={['step-badge', coordStars > 0 && 'complete']}>
        {#if coordStars > 0}&#10003;{:else}{PIECES.length + 2}{/if}
      </div>
      <div class="card-header">
        <div class="board-icon">e4</div>
        <h3>The Board</h3>
      </div>
      <p class="card-desc">Learn squares, coordinates, and set up the pieces.</p>
      <div class="card-footer">
        {#if coordStars > 0}<StarRating stars={coordStars} size="sm" />{/if}
      </div>
    </a>

    <!-- How to Win card -->
    <a href="/learn/how-to-win" class="card">
      <div class={['step-badge', howToWinStars > 0 && 'complete']}>
        {#if howToWinStars > 0}&#10003;{:else}{PIECES.length + 3}{/if}
      </div>
      <div class="card-header">
        <img src="/pieces/wK.svg" alt="How to Win" class="card-icon" />
        <h3>How to Win</h3>
      </div>
      <p class="card-desc">Learn check, checkmate, and stalemate.</p>
      <div class="card-footer">
        {#if howToWinStars > 0}<StarRating stars={howToWinStars} size="sm" />{/if}
      </div>
    </a>

    <!-- Play a Game card -->
    <a href="/play?level=random" class={['card', !allBasicsDone && upNextPieceKey === null && 'up-next']}>
      <div class={['step-badge', allBasicsDone && 'complete']}>
        {#if allBasicsDone}&#10003;{:else}{PIECES.length + 4}{/if}
      </div>
      <div class="card-header">
        <img src="/pieces/wK.svg" alt="Play" class="card-icon" />
        <h3>Play a Game!</h3>
      </div>
      <p class="card-desc">Use everything you've learned against the Random Bot.</p>
      <div class="card-footer">&nbsp;</div>
    </a>
  </div>

  <!-- Celebration banner -->
  {#if showBasics && allPieces3Star && coordStars >= 3}
    <div class="celebration">
      <div class="horsey-x">
        <div class="horsey-y">
          <img src="/pieces/wN.svg" alt="Knight" class="horsey-img" />
        </div>
      </div>
      <p class="celebration-title">The horsey is proud of you!</p>
      <p class="celebration-sub">You earned 3 stars on every basic. Now go use those pieces!</p>
    </div>
  {/if}

  <!-- Intermediate -->
  {#if allBasicsDone}
    <div class="section-header">
      <div class="section-title-row">
        <h2>Intermediate</h2>
        <div class="divider"></div>
      </div>
      <p class="section-subtitle">Practice checkmates, tactics, and endings</p>
    </div>
  {:else}
    <div class="section-header">
      <button class="section-toggle" onclick={() => showIntermediate = !showIntermediate}>
        <h2 class="faint">Intermediate</h2>
        <div class="divider"></div>
        <span class="toggle-label">{showIntermediate ? 'Hide' : 'Show more'}</span>
      </button>
      <p class="section-subtitle">Complete the basics first, or peek ahead</p>
    </div>
  {/if}

  <div class={['grid', !allBasicsDone && !showIntermediate && 'hidden']}>
    {#each intermediateCats as cat}
      {@const stats = getCategoryStats(cat)}
      <a href="/learn/{cat.key}" class="card">
        <div class="card-header">
          <img src={cat.icon} alt={cat.name} class="card-icon" />
          <h3>{cat.name}</h3>
        </div>
        <p class="card-desc">{cat.description}</p>
        <div class="card-footer-split">
          <span class="stat">{stats.completed}/{stats.total} puzzles</span>
          <span class="stat">{cat.subcategories.length} {cat.subcategories.length === 1 ? 'topic' : 'topics'}</span>
        </div>
      </a>
    {/each}
  </div>

  <!-- Advanced -->
  {#if allBasicsDone}
    <div class="section-header">
      <div class="section-title-row">
        <h2>Advanced</h2>
        <div class="divider"></div>
      </div>
      <p class="section-subtitle">Openings, model games, and board vision</p>
    </div>
  {:else}
    <div class="section-header">
      <button class="section-toggle" onclick={() => showAdvanced = !showAdvanced}>
        <h2 class="faint">Advanced</h2>
        <div class="divider"></div>
        <span class="toggle-label">{showAdvanced ? 'Hide' : 'Show more'}</span>
      </button>
      <p class="section-subtitle">Complete the basics first, or peek ahead</p>
    </div>
  {/if}

  <div class={['grid', !allBasicsDone && !showAdvanced && 'hidden']}>
    {#each advancedCats as cat}
      {@const stats = getCategoryStats(cat)}
      <a href="/learn/{cat.key}" class="card">
        <div class="card-header">
          <img src={cat.icon} alt={cat.name} class="card-icon" />
          <h3>{cat.name}</h3>
        </div>
        <p class="card-desc">{cat.description}</p>
        <div class="card-footer-split">
          <span class="stat">{stats.completed}/{stats.total} puzzles</span>
          <span class="stat">{cat.subcategories.length} {cat.subcategories.length === 1 ? 'topic' : 'topics'}</span>
        </div>
      </a>
    {/each}

    <a href="/play" class="card">
      <div class="card-header">
        <img src="/pieces/wK.svg" alt="Play" class="card-icon" />
        <h3>Play vs Computer</h3>
      </div>
      <p class="card-desc">Practice everything you've learned in a full game!</p>
      <div class="card-footer">&nbsp;</div>
    </a>

    <a href="/openings" class="card">
      <div class="card-header">
        <img src="/pieces/wP.svg" alt="Openings" class="card-icon" />
        <h3>Openings</h3>
      </div>
      <p class="card-desc">Learn opening lines move by move.</p>
      <div class="card-footer">&nbsp;</div>
    </a>

    <a href="/games" class="card">
      <div class="card-header">
        <img src="/pieces/bK.svg" alt="Model Games" class="card-icon" />
        <h3>Model Games</h3>
      </div>
      <p class="card-desc">Study famous games move by move.</p>
      <div class="card-footer">&nbsp;</div>
    </a>

    <a href="/editor" class="card">
      <div class="card-header">
        <img src="/pieces/wQ.svg" alt="Puzzle Creator" class="card-icon" />
        <h3>Puzzle Creator</h3>
      </div>
      <p class="card-desc">Place pieces and generate FEN strings for new puzzles.</p>
      <div class="card-footer">&nbsp;</div>
    </a>
  </div>

  <!-- Footer -->
  <div class="footer">
    <a href="/about">About &middot; Privacy &middot; Credits</a>
  </div>
</main>

<style>
  .page {
    min-height: 100vh;
    padding: 1.5rem;
    max-width: 56rem;
    margin: 0 auto;
  }
  .hero {
    text-align: center;
    margin-bottom: 2.5rem;
  }
  .hero h1 {
    font-size: 2.25rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  .subtitle { color: var(--text-muted); }

  /* Section headers */
  .section-header {
    margin-top: 2.5rem;
    margin-bottom: 1rem;
  }
  .section-header:first-of-type { margin-top: 0; }
  .section-title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.25rem;
  }
  .section-title-row h2 { font-size: 1.125rem; font-weight: bold; white-space: nowrap; }
  .section-subtitle { font-size: 0.875rem; color: var(--text-faint); }
  .divider { flex: 1; border-top: 1px solid rgba(240, 230, 204, 0.15); }

  .section-toggle {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
  }
  .faint { color: var(--text-faint); }
  .toggle-label { font-size: 0.75rem; color: var(--text-faint); white-space: nowrap; }

  /* Continue button */
  .continue-btn {
    display: block;
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    background: #16a34a;
    color: white;
    text-align: center;
    font-weight: bold;
    font-size: 1.125rem;
    transition: background 0.15s;
  }
  .continue-btn:hover { background: #15803d; }

  /* Grid */
  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (min-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .grid { grid-template-columns: repeat(3, 1fr); } }
  .hidden { display: none; }

  /* Cards */
  .card {
    border-radius: 0.75rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    padding: 1.5rem;
    transition: all 0.15s;
    display: flex;
    flex-direction: column;
    position: relative;
    height: 100%;
  }
  .card:hover {
    border-color: rgba(240, 230, 204, 0.3);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
  .card.up-next {
    animation: up-next-glow 2s ease-in-out infinite;
  }
  .card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  .card-header h3 { font-size: 1.125rem; font-weight: bold; }
  .card-icon { width: 3rem; height: 3rem; }
  .card-desc {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
    flex: 1;
  }
  .card-footer { font-size: 0.75rem; color: var(--text-faint); }
  .card-footer-split {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .stat { font-size: 0.75rem; color: var(--text-faint); }

  .danger-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 0.25rem;
    background: rgba(220, 38, 38, 0.2);
    border: 2px solid rgba(220, 38, 38, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .danger-piece {
    width: 2rem;
    height: 2rem;
  }

  .board-icon {
    width: 3rem;
    height: 3rem;
    border-radius: 0.25rem;
    background: #7a9e6e;
    border: 2px solid #d4c4a0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: bold;
    color: #d4c4a0;
  }

  /* Step badges */
  .step-badge {
    position: absolute;
    top: -0.625rem;
    left: -0.625rem;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: bold;
    border: 2px solid var(--card-border);
    background: var(--card-bg);
    color: var(--text-faint);
  }
  .step-badge.complete {
    background: #16a34a;
    border-color: #22c55e;
    color: white;
  }

  /* Celebration */
  .celebration {
    margin-top: 1rem;
    padding: 2rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid rgba(234, 179, 8, 0.3);
    background: rgba(234, 179, 8, 0.1);
    text-align: center;
    animation: fade-in 0.3s ease-out;
    position: relative;
    overflow: hidden;
  }
  .celebration-title { font-weight: bold; font-size: 1.125rem; position: relative; pointer-events: none; }
  .celebration-sub { font-size: 0.875rem; color: var(--text-muted); position: relative; pointer-events: none; }
  .horsey-x {
    position: absolute;
    inset: 0;
    animation: horsey-x 4.7s linear infinite alternate;
  }
  .horsey-y {
    position: absolute;
    inset: 0;
    animation: horsey-y 3.1s linear infinite alternate;
  }
  .horsey-img {
    width: 4rem;
    height: 4rem;
    animation: horsey-spin 3s linear infinite;
  }

  /* Footer */
  .footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(240, 230, 204, 0.1);
    text-align: center;
  }
  .footer a {
    font-size: 0.75rem;
    color: var(--text-faint);
    transition: color 0.15s;
  }
  .footer a:hover { color: var(--text-muted); }
</style>
