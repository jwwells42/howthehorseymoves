<script lang="ts">
  import type { PieceColor } from '$lib/logic/types';
  import type { Opening } from '$lib/openings';
  import { parseOpeningPgn, extractLines } from '$lib/openings';
  import OpeningTrainer from '$lib/components/opening/OpeningTrainer.svelte';
  import Page from '$lib/components/ui/Page.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Choice from '$lib/components/ui/Choice.svelte';

  let pgnInput = $state('');
  let selectedColor = $state<PieceColor>('w');
  let error = $state('');
  let activeOpening = $state<Opening | null>(null);

  function start() {
    error = '';
    const trimmed = pgnInput.trim();
    if (!trimmed) {
      error = 'Paste a PGN to get started.';
      return;
    }
    try {
      const tree = parseOpeningPgn(trimmed);
      const lines = extractLines(tree);
      if (lines.length === 0) {
        error = 'No moves found in this PGN.';
        return;
      }
    } catch (e) {
      error = `Could not parse this PGN: ${e instanceof Error ? e.message : String(e)}`;
      return;
    }
    activeOpening = {
      id: 'custom',
      name: 'Custom Opening',
      description: '',
      color: selectedColor,
      pgn: trimmed,
    };
  }

  function goBack() {
    activeOpening = null;
    error = '';
  }
</script>

{#if activeOpening}
  <main class="trainer-page">
    <div class="change">
      <Button onclick={goBack}>&larr; Change PGN</Button>
    </div>
    {#key activeOpening.pgn + activeOpening.color}
      <OpeningTrainer opening={activeOpening} />
    {/key}
  </main>
{:else}
  <Page
    title="Paste your own PGN"
    subtitle="Paste opening moves from your coach, a book, or Lichess."
    back={{ href: '/openings', label: 'Back to openings' }}
    width="narrow"
  >
    <div class="form">
      <textarea
        class="pgn-input"
        aria-label="PGN"
        placeholder="1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 (3...Nf6 4.Ng5 d5)"
        bind:value={pgnInput}
        rows="6"
      ></textarea>

      <Choice
        label="I'm playing as"
        options={[
          { value: 'w', label: 'White' },
          { value: 'b', label: 'Black' },
        ]}
        bind:value={selectedColor}
      />

      {#if error}
        <p class="error" role="alert">✗ {error}</p>
      {/if}

      <div>
        <Button variant="primary" onclick={start}>Start drilling</Button>
      </div>
    </div>
  </Page>
{/if}

<style>
  .trainer-page {
    min-height: 100vh;
    padding: 1rem;
  }

  .change {
    margin-bottom: 1rem;
  }

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

  .error {
    color: var(--wrong-text);
    font-size: var(--size-secondary);
    font-weight: var(--weight-strong);
  }
</style>
