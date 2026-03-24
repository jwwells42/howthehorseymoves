<script lang="ts">
  import { playSound, soundMuted, toggleMuted } from '$lib/state/sound';

  let log = $state<string[]>([]);

  function test(name: 'move' | 'correct' | 'wrong' | 'stars') {
    log = [...log, `Playing "${name}" at ${new Date().toLocaleTimeString()}`];
    playSound(name);
  }

  function testRaw() {
    log = [...log, 'Testing raw AudioContext...'];
    try {
      const ctx = new AudioContext();
      log = [...log, `  state: ${ctx.state}`];
      ctx.resume().then(() => {
        log = [...log, `  after resume: ${ctx.state}`];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 440;
        gain.gain.value = 0.5;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        log = [...log, '  Played 440Hz sine for 0.3s'];
      });
    } catch (e) {
      log = [...log, `  Error: ${e}`];
    }
  }
</script>

<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>
  <h1>Sound Test</h1>
  <p class="muted-state">Muted: {$soundMuted ? 'YES' : 'no'}</p>

  <div class="buttons">
    <button onclick={() => test('move')}>Move</button>
    <button onclick={() => test('correct')}>Correct</button>
    <button onclick={() => test('wrong')}>Wrong</button>
    <button onclick={() => test('stars')}>Stars</button>
    <button onclick={testRaw}>Raw AudioContext</button>
    <button onclick={toggleMuted}>Toggle Mute</button>
  </div>

  <div class="log">
    {#each log as entry}
      <p>{entry}</p>
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
    color: var(--text-muted);
    display: inline-block;
    margin-bottom: 1rem;
  }
  h1 { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
  .muted-state { margin-bottom: 1rem; color: var(--text-muted); }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 2rem;
  }
  button {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--btn-bg);
    color: var(--foreground);
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.15s;
  }
  button:hover { background: var(--btn-hover); }
  .log {
    font-size: 0.8125rem;
    color: var(--text-faint);
    font-family: monospace;
  }
  .log p { margin: 0.25rem 0; }
</style>
