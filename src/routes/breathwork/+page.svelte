<script lang="ts">
  import { onMount } from 'svelte';
  import ResonanceTrainer from '$lib/components/breathwork/ResonanceTrainer.svelte';
  import SighTrainer from '$lib/components/breathwork/SighTrainer.svelte';
  import { loadMode, saveMode, type BreathMode } from '$lib/breathwork/prefs';

  let mode = $state<BreathMode>('resonance');

  onMount(() => {
    mode = loadMode();
  });

  function pick(m: BreathMode) {
    mode = m;
    saveMode(m);
  }
</script>

<svelte:head>
  <title>Breathwork — How The Horsey Moves</title>
</svelte:head>

<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>

  <h1>Breathwork</h1>

  <div class="tabs" role="tablist" aria-label="Breathing practice">
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'resonance'}
      class={['tab', mode === 'resonance' && 'active']}
      onclick={() => pick('resonance')}
    >
      <span class="tab-title">Resonance Breathing</span>
      <span class="tab-sub">Train parasympathetic</span>
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={mode === 'sigh'}
      class={['tab', mode === 'sigh' && 'active']}
      onclick={() => pick('sigh')}
    >
      <span class="tab-title">Physiological Sigh</span>
      <span class="tab-sub">Double inhale, long exhale, fast reset</span>
    </button>
  </div>

  <section class="stage">
    {#key mode}
      {#if mode === 'resonance'}
        <ResonanceTrainer />
      {:else}
        <SighTrainer />
      {/if}
    {/key}
  </section>

  <details class="safety">
    <summary>Safety &amp; disclaimer</summary>
    <ul>
      <li>This is a general wellness and education tool — not medical advice or treatment.</li>
      <li>Stop if you feel dizzy, lightheaded, or any chest pain, and sit down.</li>
      <li>Don't practice while driving or in or near water.</li>
      <li>For the physiological sigh, soften the second inhale if it makes you lightheaded.</li>
      <li>
        If you have a cardiac, respiratory, or anxiety condition, or are pregnant, check
        with a clinician before regular practice.
      </li>
    </ul>
  </details>
</main>

<style>
  .page {
    min-height: 100vh;
    padding: 1.5rem;
    max-width: 42rem;
    margin: 0 auto;
  }
  .back-link {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    display: inline-block;
    margin-bottom: 1rem;
  }
  .back-link:hover {
    color: var(--ink);
  }

  h1 {
    font-size: var(--size-title);
    font-weight: var(--weight-strong);
    margin-bottom: 1.5rem;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
  }
  .tab {
    flex: 1 1 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    text-align: left;
    cursor: pointer;
    transition: all 0.15s;
  }
  .tab:hover {
    background: var(--line);
  }
  .tab.active {
    border-color: var(--ink);
    box-shadow: 0 0 0 1px var(--ink) inset;
  }
  .tab-title {
    font-weight: var(--weight-strong);
  }
  .tab-sub {
    font-size: var(--size-small);
    color: var(--ink-muted);
  }

  .stage {
    margin-bottom: 2.5rem;
  }

  .safety {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    border-top: 1px solid var(--line);
    padding-top: 1rem;
  }
  .safety summary {
    cursor: pointer;
    font-weight: var(--weight-strong);
  }
  .safety ul {
    margin-top: 0.75rem;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    line-height: 1.45;
  }
</style>
