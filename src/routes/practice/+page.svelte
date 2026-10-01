<script lang="ts">
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import PuzzleSetCard from '$lib/components/puzzle/PuzzleSetCard.svelte';
  import { CATEGORIES, getPuzzlesForPiece, type CategoryInfo } from '$lib/puzzles';
  import { progressState } from '$lib/state/progress-store';

  const PRACTICE_KEYS = ['checkmate', 'tactics', 'endings', 'advanced-endings'];
  let categories = $derived(CATEGORIES.filter((c) => PRACTICE_KEYS.includes(c.key)));

  function countSolved(category: CategoryInfo) {
    const puzzles = category.subcategories.flatMap((sub) => getPuzzlesForPiece(sub.key)?.puzzles ?? []);
    const solved = puzzles.filter((p) => $progressState.puzzles[p.id]?.completed);
    return `${solved.length}/${puzzles.length}`;
  }
</script>

<Page
  title="Practice"
  subtitle="Checkmate patterns, tactics, and endings."
  back={{ href: '/', label: 'Back to home' }}
>
  {#each categories as category}
    <section class="category">
      <header class="category-header">
        <img src={category.icon} alt="" class="category-icon" />
        <div>
          <h2>{category.name}</h2>
          <p class="description">{category.description}</p>
        </div>
        <span class="count">{countSolved(category)}</span>
      </header>

      <CardList>
        {#each category.subcategories as set}
          <PuzzleSetCard {set} />
        {/each}
      </CardList>
    </section>
  {/each}
</Page>

<style>
  .category + .category {
    margin-top: 2.5rem;
  }
  .category-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .category-icon {
    width: 3rem;
    height: 3rem;
  }
  .description {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }
  .count {
    margin-left: auto;
    font-size: var(--size-small);
    color: var(--ink-muted);
    white-space: nowrap;
  }
</style>
