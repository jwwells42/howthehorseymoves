<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { PIECES, getPuzzlesForPiece } from '$lib/puzzles';
  import { progressState, getPuzzleProgress } from '$lib/state/progress-store';

  let coordStars = $state(0);
  let howToWinStars = $state(0);
  let endingsStars = $state(0);
  let showLearn = $state(true);

  const ENDINGS_KEYS = ['endings-kqk-best-stars', 'endings-krrk-best-stars', 'endings-krk-best-stars'];

  onMount(() => {
    coordStars = parseInt(localStorage.getItem('coord-best-stars') ?? '0', 10);
    howToWinStars = parseInt(localStorage.getItem('how-to-win-best-stars') ?? '0', 10);
    const eStars = ENDINGS_KEYS.map(k => parseInt(localStorage.getItem(k) ?? '0', 10));
    if (eStars.every(s => s > 0)) endingsStars = Math.min(...eStars);
  });

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
  let m1Stats = $derived(getPieceStats('checkmate-mate-in-1'));

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

  <!-- Learn -->
  <div class="section-header">
    <button class="section-toggle" onclick={() => showLearn = !showLearn}>
      <h2>Learn</h2>
      <div class="divider"></div>
      <span class="toggle-label">{showLearn ? 'Hide' : 'Show'}</span>
    </button>
    <p class="section-subtitle">Learn how each piece moves</p>
  </div>

  {#if showLearn && continueTarget}
    <a href="/learn/{continueTarget.piece}/{continueTarget.puzzleId}" class="continue-btn">
      Continue: {continueTarget.label}
    </a>
  {/if}

  <div class={['grid', !showLearn && 'hidden']}>
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

    <!-- Mate in 1 card -->
    <a href="/learn/checkmate-mate-in-1" class="card">
      <div class={['step-badge', m1Stats.completedPuzzles > 0 && m1Stats.completedPuzzles === m1Stats.totalPuzzles && 'complete']}>
        {#if m1Stats.completedPuzzles > 0 && m1Stats.completedPuzzles === m1Stats.totalPuzzles}
          &#10003;
        {:else}
          {PIECES.length + 4}
        {/if}
      </div>
      <div class="card-header">
        <img src="/pieces/wQ.svg" alt="Mate in 1" class="card-icon" />
        <h3>Mate in 1</h3>
      </div>
      <p class="card-desc">Find the single move that delivers checkmate.</p>
      <div class="card-footer">
        {#if m1Stats.completedPuzzles > 0 && m1Stats.completedPuzzles === m1Stats.totalPuzzles}
          <StarRating stars={m1Stats.bestStars} size="sm" />
        {/if}
      </div>
    </a>

    <!-- Basic Endings card -->
    <a href="/learn/endings" class="card">
      <div class={['step-badge', endingsStars > 0 && 'complete']}>
        {#if endingsStars > 0}&#10003;{:else}{PIECES.length + 5}{/if}
      </div>
      <div class="card-header">
        <img src="/pieces/wK.svg" alt="Endings" class="card-icon" />
        <h3>Basic Endings</h3>
      </div>
      <p class="card-desc">Checkmate with Queen, Rooks, and promote your pawns.</p>
      <div class="card-footer">
        {#if endingsStars > 0}<StarRating stars={endingsStars} size="sm" />{/if}
      </div>
    </a>

    <!-- Play a Game card -->
    <a href="/play?level=random" class={['card', !allBasicsDone && upNextPieceKey === null && 'up-next']}>
      <div class={['step-badge', allBasicsDone && 'complete']}>
        {#if allBasicsDone}&#10003;{:else}{PIECES.length + 6}{/if}
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
  {#if showLearn && allPieces3Star && coordStars >= 3}
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

  <!-- Hub links -->
  <div class="hub-grid">
    <a href="/practice" class="card hub-card">
      <div class="card-header">
        <img src="/pieces/wQ.svg" alt="Practice" class="card-icon" />
        <h3>Practice</h3>
      </div>
      <p class="card-desc">Checkmate patterns, tactics, and endings.</p>
      <div class="card-footer">&nbsp;</div>
    </a>

    <a href="/study" class="card hub-card">
      <div class="card-header">
        <img src="/pieces/bK.svg" alt="Study" class="card-icon" />
        <h3>Study</h3>
      </div>
      <p class="card-desc">Openings, model games, and puzzle creation.</p>
      <div class="card-footer">&nbsp;</div>
    </a>

    <a href="/vision" class="card hub-card">
      <div class="card-header">
        <img src="/pieces/wN.svg" alt="Vision" class="card-icon" />
        <h3>Vision</h3>
      </div>
      <p class="card-desc">Blindfold and visualization trainers.</p>
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

  /* Hub links */
  .hub-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-top: 2.5rem;
  }
  @media (max-width: 639px) { .hub-grid { grid-template-columns: 1fr; } }

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
