<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import GameShell from '$lib/components/game/GameShell.svelte';
  import { getCharacter } from '$lib/characters/bots';
  import { BOT_LADDER, BOT_SPECS, type BotLevel } from '$lib/logic/bot';

  let paramLevel = $derived(page.url.searchParams.get('level'));
  let initialLevel = $derived(BOT_LADDER.includes(paramLevel as BotLevel) ? (paramLevel as BotLevel) : null);
  let level = $state<BotLevel | null>(null);

  // Which bots the student has already beaten (trophy on the card).
  let beaten = $state<Record<string, boolean>>({});

  onMount(() => {
    const found: Record<string, boolean> = {};
    for (const l of BOT_LADDER) {
      found[l] = (parseInt(localStorage.getItem(`bot-beaten-${l}`) ?? '0', 10) || 0) > 0;
    }
    beaten = found;
  });

  // Sync from URL param on first load
  $effect(() => {
    if (initialLevel && level === null) {
      level = initialLevel;
    }
  });

  const MAX_RUNG = BOT_LADDER.length;
  const PIPS = BOT_LADDER.map((_, i) => i + 1);
</script>

{#if !level}
  <main class="page">
    <a href="/" class="back-link">&larr; Back to home</a>
    <div class="header">
      <h1>Play vs Computer</h1>
      <p class="muted">Choose your opponent</p>
    </div>
    <div class="level-list">
      {#each BOT_LADDER as botLevel (botLevel)}
        {@const char = getCharacter(botLevel)}
        {@const spec = BOT_SPECS[botLevel]}
        <button class="level-card" onclick={() => level = botLevel}>
          <div class="char-card">
            {#if char}
              <img src={char.avatar} alt="" class="char-avatar" width="56" height="56" />
            {/if}
            <div class="char-text">
              <div class="name-row">
                <h3 style:color={char?.color}>{char?.name ?? botLevel}</h3>
                {#if beaten[botLevel]}
                  <span class="trophy" role="img" aria-label="You have beaten this opponent">&#127942;</span>
                {/if}
              </div>
              <div class="pips" role="img" aria-label={`Difficulty ${spec.rung} of ${MAX_RUNG}`}>
                {#each PIPS as pip (pip)}
                  <span class={['pip', pip <= spec.rung && 'filled']} style:background={pip <= spec.rung ? char?.color : undefined}></span>
                {/each}
              </div>
              <p class="level-desc">{char?.description ?? ''}</p>
            </div>
          </div>
        </button>
      {/each}
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
  .page {
    min-height: calc(100dvh - 3rem);
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
  }

  @media (min-height: 32rem) and (min-width: 32rem) {
    .page {
      height: calc(100dvh - 3rem);
      overflow: hidden;
    }
  }
  .back-link {
    font-size: 0.875rem; color: var(--text-muted); display: inline-block;
    margin-bottom: 1rem; background: none; border: none; cursor: pointer; padding: 0;
    flex-shrink: 0;
  }
  .back-link:hover { color: var(--foreground); }
  .muted { color: var(--text-muted); }

  .header { text-align: center; margin-bottom: 2rem; }
  .header h1 { font-size: 1.875rem; font-weight: bold; margin-bottom: 0.5rem; }

  /* Two columns where there's room — eight rungs don't fit in one column on a
     Chromebook (1366x768), and .page clips overflow at that size. */
  .level-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
    gap: 0.75rem;
    max-width: 44rem;
    margin: 0 auto;
    width: 100%;
    overflow-y: auto;
  }
  .level-card {
    width: 100%; padding: 0.875rem 1rem; border-radius: 0.75rem;
    border: 1px solid var(--card-border); background: var(--card-bg);
    text-align: left; cursor: pointer; color: inherit;
    transition: all 0.15s;
  }
  .level-card:hover { border-color: rgba(240, 230, 204, 0.3); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
  .level-card h3 { font-weight: bold; }
  .level-desc { font-size: 0.8125rem; color: var(--text-muted); line-height: 1.35; }
  .char-card { display: flex; align-items: center; gap: 0.75rem; }
  .char-text { min-width: 0; }
  .char-avatar { object-fit: contain; image-rendering: pixelated; flex-shrink: 0; }

  .name-row { display: flex; align-items: center; gap: 0.4rem; }
  .trophy { font-size: 1rem; line-height: 1; }

  /* Difficulty meter — readable without being able to read. */
  .pips { display: flex; gap: 3px; margin: 0.25rem 0 0.35rem; }
  .pip {
    width: 0.5rem; height: 0.5rem; border-radius: 50%;
    background: var(--card-border);
    opacity: 0.5;
  }
  .pip.filled { opacity: 1; }
</style>
