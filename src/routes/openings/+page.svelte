<script lang="ts">
  import { OPENINGS } from '$lib/openings';
</script>

<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>

  <h1>Opening Repertoire</h1>
  <p class="subtitle">Learn opening lines move by move.</p>

  <div class="list">
    {#each OPENINGS as opening}
      <a href="/openings/{opening.id}" class="card">
        <div>
          <h3>{opening.name}</h3>
          <p class="card-desc">{opening.description}</p>
        </div>
      </a>
    {/each}
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

  .list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
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
</style>
