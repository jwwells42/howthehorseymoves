<script lang="ts">
  import { playSound, soundMuted, toggleMuted } from '$lib/state/sound';

  let log = $state<string[]>([]);

  function addLog(msg: string) {
    log = [...log, `${new Date().toLocaleTimeString()} — ${msg}`];
  }

  function test(name: 'move' | 'correct' | 'wrong' | 'stars') {
    addLog(`playSound("${name}")`);
    playSound(name);
  }

  function testDirect(name: string) {
    addLog(`Direct: new Audio("/sounds/${name}.wav")`);
    try {
      const audio = new Audio(`/sounds/${name}.wav`);
      audio.volume = 0.8;
      audio.play()
        .then(() => addLog('  play() resolved'))
        .catch((e) => addLog(`  play() rejected: ${e}`));
    } catch (e) {
      addLog(`  Error: ${e}`);
    }
  }
</script>

<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>
  <h1>Sound Test</h1>
  <p class="info">Muted: {$soundMuted ? 'YES' : 'no'}</p>

  <h2>Via playSound()</h2>
  <div class="buttons">
    <button onclick={() => test('move')}>Move</button>
    <button onclick={() => test('correct')}>Correct</button>
    <button onclick={() => test('wrong')}>Wrong</button>
    <button onclick={() => test('stars')}>Stars</button>
    <button onclick={toggleMuted}>Toggle Mute</button>
  </div>

  <h2>Direct Audio element</h2>
  <div class="buttons">
    <button onclick={() => testDirect('move')}>Move</button>
    <button onclick={() => testDirect('correct')}>Correct</button>
    <button onclick={() => testDirect('wrong')}>Wrong</button>
    <button onclick={() => testDirect('stars')}>Stars</button>
  </div>

  <h2>HTML audio tags (click play)</h2>
  <div class="audio-list">
    <div>move.wav: <audio controls src="/sounds/move.wav"></audio></div>
    <div>correct.wav: <audio controls src="/sounds/correct.wav"></audio></div>
    <div>wrong.wav: <audio controls src="/sounds/wrong.wav"></audio></div>
    <div>stars.wav: <audio controls src="/sounds/stars.wav"></audio></div>
  </div>

  <h2>Log</h2>
  <div class="log">
    {#each log as entry}
      <p>{entry}</p>
    {/each}
    {#if log.length === 0}
      <p class="empty">Click a button above...</p>
    {/if}
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
    color: var(--text-muted);
    display: inline-block;
    margin-bottom: 1rem;
  }
  h1 { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; }
  h2 { font-size: 1rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem; }
  .info { color: var(--text-muted); margin-bottom: 1rem; }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  button {
    padding: 0.625rem 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--btn-bg);
    color: var(--foreground);
    font-size: 0.875rem;
    font-weight: bold;
    cursor: pointer;
  }
  button:hover { background: var(--btn-hover); }
  .audio-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  .log {
    margin-top: 0.5rem;
    padding: 0.75rem;
    border-radius: 0.5rem;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    font-size: 0.75rem;
    color: var(--text-faint);
    font-family: monospace;
    max-height: 20rem;
    overflow-y: auto;
  }
  .log p { margin: 0.125rem 0; }
  .empty { color: var(--text-faint); }
</style>
