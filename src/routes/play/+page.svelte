<script lang="ts">
  import { page } from '$app/state';
  import GameShell from '$lib/components/game/GameShell.svelte';
  import type { BotLevel } from '$lib/logic/bot';

  const VALID_LEVELS: BotLevel[] = ['random', 'basic'];

  let paramLevel = $derived(page.url.searchParams.get('level'));
  let initialLevel = $derived(VALID_LEVELS.includes(paramLevel as BotLevel) ? (paramLevel as BotLevel) : null);
  let level = $state<BotLevel | null>(null);

  // Sync from URL param on first load
  $effect(() => {
    if (initialLevel && level === null) {
      level = initialLevel;
    }
  });
</script>

{#if !level}
  <main class="page">
    <a href="/" class="back-link">&larr; Back to home</a>
    <div class="header">
      <h1>Play vs Computer</h1>
      <p class="muted">Choose your opponent</p>
    </div>
    <div class="level-list">
      <button class="level-card" onclick={() => level = 'random'}>
        <h3>Random Bot</h3>
        <p class="level-desc">Plays completely random legal moves. Great for beginners.</p>
      </button>
      <button class="level-card" onclick={() => level = 'basic'}>
        <h3>Basic Bot</h3>
        <p class="level-desc">Captures pieces, avoids blunders, and controls the center.</p>
      </button>
    </div>
  </main>
{:else}
  <main class="page">
    <button class="back-link" onclick={() => level = null}>&larr; Change opponent</button>
    {#key level}
      <GameShell botLevel={level} />
    {/key}
  </main>
{/if}

<style>
  .page { min-height: 100vh; padding: 1.5rem; max-width: 42rem; margin: 0 auto; }
  .back-link {
    font-size: 0.875rem; color: var(--text-muted); display: inline-block;
    margin-bottom: 1rem; background: none; border: none; cursor: pointer; padding: 0;
  }
  .back-link:hover { color: var(--foreground); }
  .muted { color: var(--text-muted); }

  .header { text-align: center; margin-bottom: 2rem; }
  .header h1 { font-size: 1.875rem; font-weight: bold; margin-bottom: 0.5rem; }

  .level-list { display: flex; flex-direction: column; gap: 0.75rem; max-width: 24rem; margin: 0 auto; }
  .level-card {
    width: 100%; padding: 1.25rem; border-radius: 0.75rem;
    border: 1px solid var(--card-border); background: var(--card-bg);
    text-align: left; cursor: pointer; color: inherit;
    transition: all 0.15s;
  }
  .level-card:hover { border-color: rgba(240, 230, 204, 0.3); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
  .level-card h3 { font-weight: bold; margin-bottom: 0.25rem; }
  .level-desc { font-size: 0.875rem; color: var(--text-muted); }
</style>
