<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { CATEGORIES, getPuzzlesForPiece } from '$lib/puzzles';
  import { progressState, getPuzzleProgress } from '$lib/state/progress-store';

  let cats = $derived(CATEGORIES.filter(c => c.key === 'endings' || c.key === 'advanced-endings'));

  // Extra endings not in CATEGORIES (standalone trainers)
  const EXTRA_ENDINGS = [
    { name: 'Pawn Endings', desc: 'Key squares, opposition, and essential pawn patterns.', icon: '/pieces/wK.svg', href: '/learn/pawn-endings-lesson', storageKey: 'pawn-endings-lesson-best-stars' },
    { name: 'KPK: Defend', desc: 'Hold the draw with opposition against perfect play.', icon: '/pieces/bK.svg', href: '/learn/endings-kpk-draw', storageKey: 'draw-kpk-best-stars' },
  ];

  let extraStars = $state<Record<string, number>>({});

  onMount(() => {
    const s: Record<string, number> = {};
    for (const e of EXTRA_ENDINGS) {
      s[e.storageKey] = parseInt(localStorage.getItem(e.storageKey) ?? '0', 10);
    }
    extraStars = s;
  });

  function getSubStats(subKey: string) {
    const puzzleSet = getPuzzlesForPiece(subKey);
    const total = puzzleSet?.puzzles.length ?? 0;
    let completed = 0;
    let allStars = 0;
    if ($progressState.loaded && puzzleSet) {
      for (const p of puzzleSet.puzzles) {
        const prog = getPuzzleProgress(p.id);
        if (prog?.completed) {
          completed++;
          allStars = Math.max(allStars, prog.bestStars);
        }
      }
    }
    return { total, completed, allStars };
  }
</script>

<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>

  <h1>Endings</h1>
  <p class="subtitle">Master essential endgame techniques!</p>

  {#each cats as cat}
    <div class="category">
      <h2 class="cat-title">{cat.name}</h2>

      <div class="sub-list">
        {#each cat.subcategories as sub}
          {@const s = getSubStats(sub.key)}
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
                <span class="stat">{s.completed}/{s.total}</span>
                {#if s.completed > 0 && s.completed === s.total}
                  <StarRating stars={s.allStars} size="sm" />
                {/if}
              </div>
            </a>
          {/if}
        {/each}
      </div>
    </div>
  {/each}

  <div class="category">
    <h2 class="cat-title">Pawn Endings</h2>
    <div class="sub-list">
      {#each EXTRA_ENDINGS as extra}
        {@const stars = extraStars[extra.storageKey] ?? 0}
        <a href={extra.href} class="sub-item">
          <div class="sub-left">
            <img src={extra.icon} alt={extra.name} class="sub-icon" />
            <div>
              <h3>{extra.name}</h3>
              <p class="sub-desc">{extra.desc}</p>
            </div>
          </div>
          <div class="sub-right">
            {#if stars > 0}
              <StarRating {stars} size="sm" />
            {/if}
          </div>
        </a>
      {/each}
    </div>
  </div>
</main>

<style>
  .page {
    min-height: 100vh;
    padding: 1.5rem;
    max-width: 48rem;
    margin: 0 auto;
  }
  .back-link {
    font-size: 0.875rem;
    color: var(--text-muted);
    display: inline-block;
    margin-bottom: 1rem;
  }
  .back-link:hover { color: var(--foreground); }

  h1 { font-size: 1.875rem; font-weight: bold; margin-bottom: 0.25rem; }
  .subtitle { color: var(--text-muted); margin-bottom: 2rem; }

  .category { margin-bottom: 2rem; }
  .cat-title {
    font-size: 1.125rem;
    font-weight: bold;
    margin-bottom: 0.75rem;
  }

  .sub-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .sub-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-radius: 0.75rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    transition: all 0.15s;
    color: var(--foreground);
    text-decoration: none;
  }
  .sub-item:not(.disabled):hover {
    border-color: rgba(240, 230, 204, 0.3);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
  .sub-item.disabled { opacity: 0.4; }
  .sub-left { display: flex; align-items: center; gap: 1rem; }
  .sub-icon { width: 2.25rem; height: 2.25rem; }
  .sub-left h3 { font-weight: bold; }
  .sub-desc { font-size: 0.875rem; color: var(--text-muted); }
  .sub-right { text-align: right; }
  .stat { font-size: 0.75rem; color: var(--text-faint); }
  .coming-soon { font-size: 0.75rem; color: var(--text-faint); }
</style>
