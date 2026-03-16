<script lang="ts">
  import { GAMES } from '$lib/games';
</script>

<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>

  <h1 class="title">Model Games</h1>
  <p class="subtitle">Study famous games move by move.</p>

  <div class="game-list">
    {#each GAMES as game}
      <a href="/games/{game.id}" class="game-card">
        <div>
          <h3 class="game-name">{game.white} vs {game.black}</h3>
          <p class="game-meta">{game.event}, {game.year}</p>
        </div>
        <span class="game-result">{game.result}</span>
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
    color: var(--text-muted, #888);
    display: inline-block;
    margin-bottom: 1rem;
  }

  .back-link:hover {
    color: var(--foreground, #f0e6cc);
  }

  .title {
    font-size: 1.875rem;
    font-weight: bold;
    margin: 0 0 0.5rem;
  }

  .subtitle {
    color: var(--text-muted, #888);
    margin: 0 0 1.5rem;
  }

  .game-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .game-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem;
    border-radius: 0.75rem;
    border: 1px solid var(--card-border, #333);
    background: var(--card-bg, #1a1a1a);
    color: inherit;
    text-decoration: none;
    transition: all 0.15s;
  }

  .game-card:hover {
    border-color: rgba(255, 255, 255, 0.3);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  .game-name {
    font-weight: 700;
    margin: 0;
  }

  .game-meta {
    font-size: 0.875rem;
    color: var(--text-muted, #888);
    margin: 0;
  }

  .game-result {
    font-size: 0.875rem;
    color: var(--text-faint, #666);
  }
</style>
