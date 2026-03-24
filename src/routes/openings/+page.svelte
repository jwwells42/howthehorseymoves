<script lang="ts">
  import { onMount } from 'svelte';
  import { OPENINGS } from '$lib/openings';

  let whiteOpenings = $derived(OPENINGS.filter(o => o.color === 'w'));
  let blackOpenings = $derived(OPENINGS.filter(o => o.color === 'b'));

  let completedIds = $state<Set<string>>(new Set());

  onMount(() => {
    const completed = new Set<string>();
    for (const opening of OPENINGS) {
      if (localStorage.getItem(`opening-${opening.id}-complete`) === 'true') {
        completed.add(opening.id);
      }
    }
    completedIds = completed;
  });
</script>

<main class="page">
  <a href="/study" class="back-link">&larr; Back to study</a>

  <h1>Opening Repertoire</h1>
  <p class="subtitle">Learn opening lines move by move.</p>

  <h2 class="section-title">Play as White</h2>
  <div class="list">
    {#each whiteOpenings as opening}
      <a href="/openings/{opening.id}" class="card">
        <div>
          <h3>{opening.name}</h3>
          <p class="card-desc">{opening.description}</p>
        </div>
        {#if completedIds.has(opening.id)}
          <span class="check">&#10003;</span>
        {/if}
      </a>
    {/each}
  </div>

  <h2 class="section-title">Play as Black</h2>
  <div class="list">
    {#each blackOpenings as opening}
      <a href="/openings/{opening.id}" class="card">
        <div>
          <h3>{opening.name}</h3>
          <p class="card-desc">{opening.description}</p>
        </div>
        {#if completedIds.has(opening.id)}
          <span class="check">&#10003;</span>
        {/if}
      </a>
    {/each}
  </div>

  <h2 class="section-title">Custom</h2>
  <div class="list">
    <a href="/openings/custom" class="card">
      <div>
        <h3>Paste your own PGN</h3>
        <p class="card-desc">Drill any opening — paste PGN from your coach or from Lichess.</p>
      </div>
    </a>
  </div>
</main>

<style>
  .page {
    min-height: 100vh;
    padding: 1.5rem;
    max-width: 42rem;
    margin: 0 auto;
  }

  .back-link {
    font-size: 0.875rem;
    color: var(--text-muted);
    display: inline-block;
    margin-bottom: 1rem;
  }

  .back-link:hover {
    color: var(--foreground);
  }

  h1 {
    font-size: 1.875rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: var(--text-muted);
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 1.125rem;
    font-weight: bold;
    margin-bottom: 0.75rem;
    color: var(--text-muted);
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 2rem;
  }

  .card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem;
    border-radius: 0.75rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    transition: all 0.15s;
  }

  .card:hover {
    border-color: rgba(240, 230, 204, 0.3);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  .card h3 {
    font-weight: bold;
  }

  .card-desc {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .check {
    color: #4ade80;
    font-size: 1.25rem;
    flex-shrink: 0;
    margin-left: 1rem;
  }
</style>
