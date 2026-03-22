<script lang="ts">
  import type { PieceColor } from '$lib/logic/types';
  import type { Opening } from '$lib/openings';
  import { parseOpeningPgn, extractLines } from '$lib/openings';
  import OpeningTrainer from '$lib/components/opening/OpeningTrainer.svelte';

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
  <main class="page">
    <button class="back-btn" onclick={goBack}>&larr; Change PGN</button>
    {#key activeOpening.pgn + activeOpening.color}
      <OpeningTrainer opening={activeOpening} />
    {/key}
  </main>
{:else}
  <main class="page page-form">
    <a href="/openings" class="back-link">&larr; Back to openings</a>

    <h1>Paste your own PGN</h1>
    <p class="subtitle">Paste opening moves from your coach, a book, or Lichess.</p>

    <div class="form">
      <textarea
        class="pgn-input"
        placeholder="1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 (3...Nf6 4.Ng5 d5)"
        bind:value={pgnInput}
        rows="6"
      ></textarea>

      <div class="color-toggle">
        <span class="toggle-label">I'm playing as:</span>
        <button
          class={['toggle-btn', selectedColor === 'w' && 'active']}
          onclick={() => (selectedColor = 'w')}
        >
          White
        </button>
        <button
          class={['toggle-btn', selectedColor === 'b' && 'active']}
          onclick={() => (selectedColor = 'b')}
        >
          Black
        </button>
      </div>

      {#if error}
        <p class="error">{error}</p>
      {/if}

      <button class="btn start-btn" onclick={start}>Start drilling</button>
    </div>
  </main>
{/if}

<style>
  .page {
    min-height: 100vh;
    padding: 1rem;
  }

  .page-form {
    padding: 1.5rem;
    max-width: 42rem;
    margin: 0 auto;
  }

  .back-link, .back-btn {
    font-size: 0.875rem;
    color: var(--text-muted);
    display: inline-block;
    margin-bottom: 1rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-family: inherit;
  }

  .back-link:hover, .back-btn:hover {
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

  .form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .pgn-input {
    width: 100%;
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: inherit;
    font-family: monospace;
    font-size: 0.875rem;
    resize: vertical;
  }

  .pgn-input::placeholder {
    color: var(--text-faint);
  }

  .color-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle-label {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-right: 0.25rem;
  }

  .toggle-btn {
    padding: 0.375rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.15s;
  }

  .toggle-btn.active {
    background: var(--btn-bg);
    color: inherit;
    border-color: var(--foreground);
  }

  .toggle-btn:hover {
    background: var(--btn-hover);
  }

  .error {
    color: #ef4444;
    font-size: 0.875rem;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    background: var(--btn-bg);
    color: inherit;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.15s;
  }

  .btn:hover {
    background: var(--btn-hover);
  }

  .start-btn {
    align-self: flex-start;
  }
</style>
