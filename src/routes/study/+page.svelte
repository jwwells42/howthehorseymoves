<script lang="ts">
</script>

<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>

  <h1>Study</h1>
  <p class="subtitle">Endings, openings, model games, and puzzle creation.</p>

  <div class="grid">
    <a href="/endings" class="card">
      <div class="card-header">
        <img src="/pieces/wK.svg" alt="Endings" class="card-icon" />
        <h3>Endings</h3>
      </div>
      <p class="card-desc">Master essential endgame techniques.</p>
    </a>

    <a href="/openings" class="card">
      <div class="card-header">
        <img src="/pieces/wP.svg" alt="Openings" class="card-icon" />
        <h3>Openings</h3>
      </div>
      <p class="card-desc">Learn opening lines move by move.</p>
    </a>

    <a href="/games" class="card">
      <div class="card-header">
        <img src="/pieces/bK.svg" alt="Model Games" class="card-icon" />
        <h3>Model Games</h3>
      </div>
      <p class="card-desc">Study famous games move by move.</p>
    </a>

    <a href="/editor" class="card">
      <div class="card-header">
        <img src="/pieces/wQ.svg" alt="Puzzle Creator" class="card-icon" />
        <h3>Puzzle Creator</h3>
      </div>
      <p class="card-desc">Place pieces and generate FEN strings for new puzzles.</p>
    </a>
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

  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (min-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }

  .card {
    border-radius: 0.75rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    padding: 1.5rem;
    transition: all 0.15s;
    display: flex;
    flex-direction: column;
  }
  .card:hover {
    border-color: rgba(240, 230, 204, 0.3);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }
  .card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  .card-header h3 { font-size: 1.125rem; font-weight: bold; }
  .card-icon { width: 3rem; height: 3rem; }
  .card-desc { font-size: 0.875rem; color: var(--text-muted); }
</style>
