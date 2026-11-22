<script lang="ts">
  import GameViewer from '$lib/components/game/GameViewer.svelte';
  import BoardPage from '$lib/components/board/BoardPage.svelte';
  import Page from '$lib/components/ui/Page.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { parseGamePgn } from '$lib/logic/pgn';
  import type { ModelGame } from '$lib/games/types';

  // An analysis board, off the nav: play moves or paste a PGN, with Stockfish
  // in the sidebar. Nothing is saved.

  let pasting = $state(false);
  let pgnInput = $state('');
  /** null = no error; otherwise the parser's message (may be empty) */
  let error = $state<string | null>(null);
  let game = $state<ModelGame>({ id: 'analysis', white: '', black: '', event: '', year: 0, result: '', pgn: '' });

  function header(pgn: string, tag: string): string {
    return pgn.match(new RegExp(`\\[${tag} "([^"]*)"\\]`))?.[1] ?? '';
  }

  function load() {
    error = null;
    const pgn = pgnInput.trim();
    try {
      parseGamePgn(pgn);
    } catch (e) {
      error = e instanceof Error ? e.message : '';
      return;
    }
    const year = parseInt(header(pgn, 'Date'), 10);
    game = {
      id: 'analysis',
      white: header(pgn, 'White'),
      black: header(pgn, 'Black'),
      event: header(pgn, 'Event'),
      year: Number.isFinite(year) ? year : 0,
      result: header(pgn, 'Result').replace('*', ''),
      pgn,
    };
    pasting = false;
  }
</script>

{#if pasting}
  <Page title="PGN" back={{ href: '/analysis', label: 'Back to board' }}>
    <div class="form">
      <textarea
        class="pgn-input"
        aria-label="PGN"
        placeholder="1.e4 e5 2.Nf3 Nc6 3.Bb5"
        bind:value={pgnInput}
        rows="10"
      ></textarea>
      {#if error !== null}
        <p class="error" role="alert">✗ {error}</p>
      {/if}
      <div class="buttons">
        <Button variant="primary" onclick={load}>&check;</Button>
        <Button onclick={() => ((pasting = false), (error = null))}>&cross;</Button>
      </div>
    </div>
  </Page>
{:else}
  <BoardPage back={{ href: '/', label: 'Back to home' }}>
    {#snippet action()}
      <Button onclick={() => (pasting = true)}>PGN</Button>
    {/snippet}
    {#key game.pgn}
      <GameViewer {game} analysis />
    {/key}
  </BoardPage>
{/if}

<style>
  .form {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .pgn-input {
    width: 100%;
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--line);
    background: var(--surface);
    font-variant-numeric: tabular-nums;
    font-size: var(--size-secondary);
    resize: vertical;
  }

  .pgn-input::placeholder {
    color: var(--ink-muted);
  }

  .buttons {
    display: flex;
    gap: 0.75rem;
  }

  .error {
    color: var(--wrong-text);
    font-size: var(--size-secondary);
    font-weight: var(--weight-strong);
  }
</style>
