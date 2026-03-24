<script lang="ts">
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { CATEGORIES, getPuzzlesForPiece, type CategoryInfo } from '$lib/puzzles';
  import { progressState, getPuzzleProgress } from '$lib/state/progress-store';

  const PRACTICE_KEYS = ['checkmate', 'tactics', 'endings', 'advanced-endings'];
  let cats = $derived(CATEGORIES.filter(c => PRACTICE_KEYS.includes(c.key)));

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
</script>

<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>

  <h1>Practice</h1>
  <p class="subtitle">Checkmate patterns, tactics, and endings.</p>

  {#each cats as cat}
    {@const stats = getCategoryStats(cat)}
    <div class="category">
      <div class="cat-header">
        <img src={cat.icon} alt={cat.name} class="cat-icon" />
        <div>
          <h2>{cat.name}</h2>
          <p class="cat-desc">{cat.description}</p>
        </div>
        <span class="cat-stat">{stats.completed}/{stats.total}</span>
      </div>

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

  .category { margin-bottom: 2.5rem; }
  .cat-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .cat-icon { width: 3rem; height: 3rem; }
  .cat-header h2 { font-size: 1.25rem; font-weight: bold; }
  .cat-desc { font-size: 0.875rem; color: var(--text-muted); }
  .cat-stat { font-size: 0.75rem; color: var(--text-faint); margin-left: auto; white-space: nowrap; }

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
