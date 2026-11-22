<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import BoardPage from '$lib/components/board/BoardPage.svelte';
  import GameViewer from '$lib/components/game/GameViewer.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import type { ModelGame } from '$lib/games/types';
  import type { GameSummary } from '$lib/library/summary';

  // One game from the library, with Stockfish. ‹ › step through the list as
  // the library page last filtered it (kept in sessionStorage).

  let id = $derived(page.params.id ?? '');
  let status = $state<'loading' | 'locked' | 'missing' | 'unavailable' | 'ready'>('loading');
  let game = $state<ModelGame | null>(null);
  let search = $state('');
  let list = $state<string[]>([]);

  let index = $derived(list.indexOf(id));
  let previous = $derived(index > 0 ? list[index - 1] : null);
  let next = $derived(index >= 0 && index < list.length - 1 ? list[index + 1] : null);

  $effect(() => {
    try {
      search = sessionStorage.getItem('library-search') ?? '';
      list = JSON.parse(sessionStorage.getItem('library-list') ?? '[]');
    } catch {}
  });

  $effect(() => {
    const wanted = id;
    let current = true;
    status = 'loading';
    void (async () => {
      const res = await fetch(`/api/library/${encodeURIComponent(wanted)}`);
      if (!current) return;
      if (res.status === 403) return (status = 'locked');
      if (res.status === 404) return (status = 'missing');
      if (!res.ok) return (status = 'unavailable');
      const data: { id: string; summary: GameSummary; body: string } = await res.json();
      if (!current) return;
      const s = data.summary;
      game = {
        id: data.id,
        white: s.white,
        black: s.black,
        event: s.event,
        year: parseInt(s.date, 10) || 0,
        result: s.result === '*' ? '' : s.result,
        pgn: data.body,
      };
      status = 'ready';
    })();
    return () => {
      current = false;
    };
  });
</script>

<BoardPage back={{ href: `/library${search}`, label: 'Back to library' }}>
  {#snippet action()}
    {#if list.length > 0 && index >= 0}
      <div class="step">
        <Button onclick={() => previous && goto(`/library/${previous}`)} disabled={!previous} aria-label="Previous game">‹</Button>
        <span class="where">{index + 1} / {list.length}</span>
        <Button onclick={() => next && goto(`/library/${next}`)} disabled={!next} aria-label="Next game">›</Button>
      </div>
    {/if}
  {/snippet}
  {#if status === 'ready' && game}
    {#key game.id}
      <GameViewer {game} analysis />
    {/key}
  {:else if status === 'loading'}
    <p class="note">…</p>
  {:else if status === 'locked'}
    <p class="note symbol" aria-label="Locked">🔒</p>
  {:else}
    <p class="note symbol wrong" role="alert">✗</p>
  {/if}
</BoardPage>

<style>
  .step {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .where {
    font-size: var(--size-small);
    color: var(--ink-muted);
    font-variant-numeric: tabular-nums;
  }
  .note {
    color: var(--ink-muted);
  }
  .symbol {
    font-size: var(--size-title);
  }
  .wrong {
    color: var(--wrong-text);
  }
</style>
