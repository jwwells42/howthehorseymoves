<script lang="ts">
  import { readNumber } from '$lib/state/storage';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import GameShell from '$lib/components/game/GameShell.svelte';
  import Page from '$lib/components/ui/Page.svelte';
  import BoardPage from '$lib/components/board/BoardPage.svelte';
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
      found[l] = readNumber(`bot-beaten-${l}`) > 0;
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
  <Page title="Play vs Computer" subtitle="Choose your opponent" back={{ href: '/', label: 'Back to home' }}>
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
                  <span class="trophy" role="img" aria-label="Beaten">&#127942;</span>
                {/if}
              </div>
              <div class="pips" role="img" aria-label={`Difficulty ${spec.rung} of ${MAX_RUNG}`}>
                {#each PIPS as pip (pip)}
                  <span class={['pip', pip <= spec.rung && 'filled']} style:background={pip <= spec.rung ? char?.color : undefined}></span>
                {/each}
              </div>
            </div>
          </div>
        </button>
      {/each}
    </div>
  </Page>
{:else}
  <BoardPage back={{ href: '/play', label: 'Change opponent' }}>
    {#key level}
      <GameShell botLevel={level} />
    {/key}
  </BoardPage>
{/if}

<style>
  /* Two columns where there's room, so all eight rungs fit on a Chromebook
     (1366x768) without scrolling */
  .level-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 0.75rem;
  }
  .level-card {
    width: 100%; padding: 0.875rem 1rem; border-radius: 0.75rem;
    border: 1px solid var(--line); background: var(--surface);
    text-align: left; cursor: pointer;
    transition: background 0.15s;
  }
  .level-card:hover { background: var(--surface-raised); }
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
