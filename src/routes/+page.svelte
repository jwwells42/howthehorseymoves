<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { PIECES, getPuzzlesForPiece } from '$lib/puzzles';
  import { progressState, getPuzzleProgress } from '$lib/state/progress-store';

  let coordStars = $state(0);
  let howToWinStars = $state(0);
  let showLearn = $state(true);

  onMount(() => {
    coordStars = parseInt(localStorage.getItem('coord-best-stars') ?? '0', 10);
    howToWinStars = parseInt(localStorage.getItem('how-to-win-best-stars') ?? '0', 10);
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
  <!-- Hero -->
  <div class="hero">
    <div class="hero-pattern"></div>
    <img src="/pieces/wN.svg" alt="" class="hero-knight" />
    <h1>How The Horsey Moves</h1>
    <p class="subtitle">Learn how each chess piece moves through interactive puzzles</p>
  </div>

  <!-- Learn section -->
  <div class="section-header">
    <button class="section-toggle" onclick={() => showLearn = !showLearn}>
      <h2>Learn</h2>
      <div class="divider"></div>
      <span class="toggle-label">{showLearn ? 'Hide' : 'Show'}</span>
    </button>
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
        <div class="card-piece">
          <img src={piece.icon} alt={piece.name} class="piece-img" />
        </div>
        <h3 class="card-title">{piece.name}</h3>
        <p class="card-desc">{piece.description}</p>
        <div class="card-footer">
          {#if stats.completedPuzzles > 0 && stats.completedPuzzles === stats.totalPuzzles}
            <StarRating stars={stats.bestStars} size="sm" />
          {/if}
        </div>
      </a>
    {/each}

    <!-- Danger Zones -->
    <a href="/learn/danger-zones" class="card">
      <div class={['step-badge', dzStats.completedPuzzles > 0 && dzStats.completedPuzzles === dzStats.totalPuzzles && 'complete']}>
        {#if dzStats.completedPuzzles > 0 && dzStats.completedPuzzles === dzStats.totalPuzzles}
          &#10003;
        {:else}
          {PIECES.length + 1}
        {/if}
      </div>
      <div class="card-piece danger">
        <img src="/pieces/bN.svg" alt="Danger" class="piece-img" />
      </div>
      <h3 class="card-title">Danger Zones</h3>
      <p class="card-desc">Dodge enemy pieces — reach the star without getting eaten!</p>
      <div class="card-footer">
        {#if dzStats.completedPuzzles > 0 && dzStats.completedPuzzles === dzStats.totalPuzzles}
          <StarRating stars={dzStats.bestStars} size="sm" />
        {/if}
      </div>
    </a>

    <!-- The Board -->
    <a href="/board" class="card">
      <div class={['step-badge', coordStars > 0 && 'complete']}>
        {#if coordStars > 0}&#10003;{:else}{PIECES.length + 2}{/if}
      </div>
      <div class="card-piece board">
        <span class="board-text">e4</span>
      </div>
      <h3 class="card-title">The Board</h3>
      <p class="card-desc">Learn squares, coordinates, and set up the pieces.</p>
      <div class="card-footer">
        {#if coordStars > 0}<StarRating stars={coordStars} size="sm" />{/if}
      </div>
    </a>

    <!-- How to Win -->
    <a href="/learn/how-to-win" class="card">
      <div class={['step-badge', howToWinStars > 0 && 'complete']}>
        {#if howToWinStars > 0}&#10003;{:else}{PIECES.length + 3}{/if}
      </div>
      <div class="card-piece win">
        <img src="/pieces/wK.svg" alt="How to Win" class="piece-img" />
      </div>
      <h3 class="card-title">How to Win</h3>
      <p class="card-desc">Learn check, checkmate, and stalemate.</p>
      <div class="card-footer">
        {#if howToWinStars > 0}<StarRating stars={howToWinStars} size="sm" />{/if}
      </div>
    </a>

    <!-- Play a Game -->
    <a href="/play?level=random" class={['card', !allBasicsDone && upNextPieceKey === null && 'up-next']}>
      <div class={['step-badge', allBasicsDone && 'complete']}>
        {#if allBasicsDone}&#10003;{:else}{PIECES.length + 4}{/if}
      </div>
      <div class="card-piece play">
        <span class="play-triangle"></span>
      </div>
      <h3 class="card-title">Play a Game!</h3>
      <p class="card-desc">Use everything you've learned against the Random Bot.</p>
      <div class="card-footer">&nbsp;</div>
    </a>
  </div>

  <!-- Celebration -->
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
    <a href="/practice" class="hub-card hub-practice">
      <img src="/pieces/wQ.svg" alt="" class="hub-icon" />
      <div class="hub-info">
        <h3>Practice</h3>
        <p class="hub-desc">Checkmate patterns, tactics, and endings.</p>
      </div>
    </a>

    <a href="/study" class="hub-card hub-study">
      <img src="/pieces/bK.svg" alt="" class="hub-icon" />
      <div class="hub-info">
        <h3>Study</h3>
        <p class="hub-desc">Openings, model games, and puzzle creation.</p>
      </div>
    </a>

    <a href="/vision" class="hub-card hub-vision">
      <img src="/pieces/wN.svg" alt="" class="hub-icon" />
      <div class="hub-info">
        <h3>Vision</h3>
        <p class="hub-desc">Blindfold and visualization trainers.</p>
      </div>
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

  /* ===== Hero ===== */
  .hero {
    text-align: center;
    padding: 2.5rem 1rem 3rem;
    position: relative;
    margin-bottom: 1rem;
  }
  .hero-pattern {
    position: absolute;
    inset: 0;
    border-radius: 1.5rem;
    pointer-events: none;
    background-image: conic-gradient(
      rgba(240, 230, 204, 0.04) 0.25turn,
      transparent 0.25turn 0.5turn,
      rgba(240, 230, 204, 0.04) 0.5turn 0.75turn,
      transparent 0.75turn
    );
    background-size: 40px 40px;
  }
  .hero-knight {
    width: 7rem;
    height: 7rem;
    filter: drop-shadow(0 6px 20px rgba(212, 165, 74, 0.4));
    animation: hero-float 3s ease-in-out infinite;
    position: relative;
  }
  .hero h1 {
    font-size: 2.5rem;
    font-weight: bold;
    letter-spacing: -0.02em;
    text-shadow: 0 2px 16px rgba(0, 0, 0, 0.15);
    margin-bottom: 0.5rem;
    position: relative;
  }
  .subtitle {
    color: var(--text-muted);
    font-size: 1.05rem;
    position: relative;
  }
  @keyframes hero-float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }

  /* ===== Section header ===== */
  .section-header {
    margin-top: 0.5rem;
    margin-bottom: 1rem;
  }
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
  .divider {
    flex: 1;
    border-top: 1px solid rgba(240, 230, 204, 0.15);
  }
  .toggle-label {
    font-size: 0.75rem;
    color: var(--text-faint);
    white-space: nowrap;
  }

  /* ===== Continue button ===== */
  .continue-btn {
    display: block;
    margin-bottom: 1.25rem;
    padding: 0.875rem 1.25rem;
    border-radius: 0.75rem;
    background: linear-gradient(135deg, #16a34a, #15803d);
    color: white;
    text-align: center;
    font-weight: bold;
    font-size: 1.1rem;
    box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .continue-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(22, 163, 74, 0.4);
  }

  /* ===== Grid ===== */
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  @media (min-width: 640px) {
    .grid { grid-template-columns: repeat(3, 1fr); }
  }
  .hidden { display: none; }

  /* ===== Cards ===== */
  .card {
    border-radius: 1rem;
    border: 1px solid rgba(255, 248, 230, 0.1);
    background: linear-gradient(
      180deg,
      rgba(255, 248, 230, 0.08) 0%,
      rgba(255, 248, 230, 0.03) 100%
    );
    padding: 1.75rem 1rem 1.25rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .card:hover {
    transform: translateY(-4px);
    box-shadow:
      0 12px 28px rgba(0, 0, 0, 0.2),
      0 0 0 1px rgba(212, 165, 74, 0.12);
    border-color: rgba(212, 165, 74, 0.3);
  }
  .card.up-next {
    animation: up-next-glow 2s ease-in-out infinite;
  }
  .card.up-next .step-badge {
    background: #facc15;
    color: #1a2e12;
    border-color: #facc15;
  }

  /* ===== Piece medallion ===== */
  .card-piece {
    width: 5rem;
    height: 5rem;
    border-radius: 50%;
    background: radial-gradient(
      circle at 35% 35%,
      rgba(212, 165, 74, 0.18),
      rgba(212, 165, 74, 0.05)
    );
    border: 2px solid rgba(212, 165, 74, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.75rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .card:hover .card-piece {
    border-color: rgba(212, 165, 74, 0.4);
    box-shadow: 0 0 16px rgba(212, 165, 74, 0.15);
  }
  .piece-img {
    width: 3.25rem;
    height: 3.25rem;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  }

  /* Danger Zones — red medallion */
  .card-piece.danger {
    background: radial-gradient(
      circle at 35% 35%,
      rgba(220, 38, 38, 0.2),
      rgba(220, 38, 38, 0.05)
    );
    border-color: rgba(220, 38, 38, 0.3);
  }
  .card:hover .card-piece.danger {
    border-color: rgba(220, 38, 38, 0.5);
    box-shadow: 0 0 16px rgba(220, 38, 38, 0.15);
  }

  /* The Board — chess square split */
  .card-piece.board {
    background: linear-gradient(135deg, #7a9e6e 50%, #d4c4a0 50%);
    border-color: rgba(212, 196, 160, 0.4);
  }
  .card:hover .card-piece.board {
    box-shadow: 0 0 16px rgba(212, 196, 160, 0.2);
  }
  .board-text {
    font-size: 1.5rem;
    font-weight: bold;
    color: #2a4a1e;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  /* How to Win — gold medallion */
  .card-piece.win {
    background: radial-gradient(
      circle at 35% 35%,
      rgba(250, 204, 21, 0.2),
      rgba(250, 204, 21, 0.05)
    );
    border-color: rgba(250, 204, 21, 0.3);
  }
  .card:hover .card-piece.win {
    border-color: rgba(250, 204, 21, 0.5);
    box-shadow: 0 0 16px rgba(250, 204, 21, 0.15);
  }

  /* Play a Game — green medallion with play triangle */
  .card-piece.play {
    background: radial-gradient(
      circle at 35% 35%,
      rgba(22, 163, 74, 0.2),
      rgba(22, 163, 74, 0.05)
    );
    border-color: rgba(22, 163, 74, 0.3);
  }
  .card:hover .card-piece.play {
    border-color: rgba(22, 163, 74, 0.5);
    box-shadow: 0 0 16px rgba(22, 163, 74, 0.15);
  }
  .play-triangle {
    display: block;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 1rem 0 1rem 1.75rem;
    border-color: transparent transparent transparent #22c55e;
    margin-left: 0.25rem;
  }

  .card-title {
    font-size: 1rem;
    font-weight: bold;
    margin-bottom: 0.25rem;
  }
  .card-desc {
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.4;
    flex: 1;
  }
  .card-footer {
    margin-top: 0.5rem;
    min-height: 1.25rem;
  }

  /* ===== Step badges ===== */
  .step-badge {
    position: absolute;
    top: -0.5rem;
    left: -0.5rem;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: bold;
    border: 2px solid rgba(255, 248, 230, 0.15);
    background: rgba(42, 74, 30, 0.9);
    color: var(--text-faint);
    z-index: 1;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }
  .step-badge.complete {
    background: #16a34a;
    border-color: #22c55e;
    color: white;
    box-shadow: 0 2px 8px rgba(22, 197, 94, 0.3);
  }

  /* ===== Celebration ===== */
  .celebration {
    margin-top: 1.5rem;
    padding: 2rem 1rem;
    border-radius: 1rem;
    border: 2px solid rgba(250, 204, 21, 0.4);
    background: linear-gradient(
      135deg,
      rgba(250, 204, 21, 0.12),
      rgba(212, 165, 74, 0.06)
    );
    text-align: center;
    animation: fade-in 0.3s ease-out;
    position: relative;
    overflow: hidden;
  }
  .celebration-title {
    font-weight: bold;
    font-size: 1.25rem;
    position: relative;
    pointer-events: none;
  }
  .celebration-sub {
    font-size: 0.9rem;
    color: var(--text-muted);
    position: relative;
    pointer-events: none;
  }
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

  /* ===== Hub grid ===== */
  .hub-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-top: 3rem;
  }
  @media (max-width: 639px) {
    .hub-grid { grid-template-columns: 1fr; }
  }

  .hub-card {
    border-radius: 1rem;
    border: 1px solid rgba(255, 248, 230, 0.1);
    background: linear-gradient(
      180deg,
      rgba(255, 248, 230, 0.06) 0%,
      rgba(255, 248, 230, 0.02) 100%
    );
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  }
  .hub-card::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: 0 2px 2px 0;
  }
  .hub-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.15);
  }
  .hub-icon {
    width: 3rem;
    height: 3rem;
    flex-shrink: 0;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
  }
  .hub-info h3 {
    font-size: 1.125rem;
    font-weight: bold;
    margin-bottom: 0.25rem;
  }
  .hub-desc {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  /* Hub accent colors */
  .hub-practice::before { background: #d4a54a; }
  .hub-practice:hover { border-color: rgba(212, 165, 74, 0.3); }
  .hub-study::before { background: #7aa0c4; }
  .hub-study:hover { border-color: rgba(122, 160, 196, 0.3); }
  .hub-vision::before { background: #b07ac4; }
  .hub-vision:hover { border-color: rgba(176, 122, 196, 0.3); }

  /* ===== Footer ===== */
  .footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid rgba(240, 230, 204, 0.08);
    text-align: center;
  }
  .footer a {
    font-size: 0.75rem;
    color: var(--text-faint);
    transition: color 0.15s;
  }
  .footer a:hover { color: var(--text-muted); }
</style>
