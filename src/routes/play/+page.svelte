<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import GameShell from '$lib/components/game/GameShell.svelte';
  import BackLink from '$lib/components/ui/BackLink.svelte';
  import { getCharacter } from '$lib/characters/bots';
  import { BOT_LADDER, BOT_SPECS, type BotLevel } from '$lib/logic/bot';

  // The URL is the single source of truth for which bot is being played.
  //
  // This used to be local state seeded from the URL by an $effect, which meant
  // neither exit worked once you arrived via ?level=: "Change opponent" set the
  // state to null, the effect saw the unchanged URL and immediately put it back,
  // and the nav's Play link went to /play without remounting the page, so the
  // stale state kept the game on screen. Both read as the button doing nothing.
  let level = $derived.by(() => {
    const p = page.url.searchParams.get('level');
    return BOT_LADDER.includes(p as BotLevel) ? (p as BotLevel) : null;
  });

  // Which bots the student has already beaten (trophy on the card). Read each
  // time the ladder shows, because the student may have just won a trophy.
  let beaten = $state<Record<string, boolean>>({});

  $effect(() => {
    if (level) return;
    const found: Record<string, boolean> = {};
    for (const l of BOT_LADDER) {
      found[l] = (parseInt(localStorage.getItem(`bot-beaten-${l}`) ?? '0', 10) || 0) > 0;
    }
    beaten = found;
  });

  function play(botLevel: BotLevel) {
    goto(`/play?level=${botLevel}`);
  }

  const MAX_RUNG = BOT_LADDER.length;
  const PIPS = BOT_LADDER.map((_, i) => i + 1);
</script>

{#if !level}
  <main class="page">
    <BackLink href="/">Back to home</BackLink>
    <header class="header">
      <h1>Play vs Computer</h1>
      <p class="subtitle">Choose your opponent</p>
    </header>
    <div class="level-list">
      {#each BOT_LADDER as botLevel (botLevel)}
        {@const char = getCharacter(botLevel)}
        {@const spec = BOT_SPECS[botLevel]}
        <button class="level-card" onclick={() => play(botLevel)}>
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
    <BackLink href="/play">Change opponent</BackLink>
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
  .header { text-align: center; margin-bottom: 2rem; }
  .subtitle { margin-top: 0.25rem; color: var(--ink-muted); }

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
    border: 1px solid var(--line); background: var(--surface);
    text-align: left; cursor: pointer;
    transition: background 0.15s;
  }
  .level-card:hover { background: var(--surface-raised); }
  .level-card:hover .level-desc { color: var(--ink); }
  .level-desc { font-size: var(--size-small); color: var(--ink-muted); line-height: 1.35; }
  .char-card { display: flex; align-items: center; gap: 0.75rem; }
  .char-text { min-width: 0; }
  .char-avatar { object-fit: contain; image-rendering: pixelated; flex-shrink: 0; }

  .name-row { display: flex; align-items: center; gap: 0.4rem; }
  .trophy { font-size: var(--size-body); line-height: 1; }

  /* Difficulty meter — readable without being able to read. */
  .pips { display: flex; gap: 3px; margin: 0.25rem 0 0.35rem; }
  .pip {
    width: 0.5rem; height: 0.5rem; border-radius: 50%;
    background: var(--line);
  }
</style>
