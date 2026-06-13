<script lang="ts">
  import { onMount } from 'svelte';
  import BreathPacer from './BreathPacer.svelte';
  import { BreathEngine, type BreathPhaseName } from '$lib/breathwork/engine';
  import { BreathDrone } from '$lib/breathwork/audio';
  import { loadRate, saveRate, loadSessionMins, saveSessionMins } from '$lib/breathwork/prefs';

  type Phase = BreathPhaseName | 'idle';

  // Height presets → resonance rate (bpm). Derived from the Hasuo et al. (2024)
  // formula, kept inside the 4.5–7.0 band. Direction is the reliable part.
  const HEIGHT_PRESETS = [
    { key: 'short', label: 'Shorter', sub: '5’2″ & under', rate: 6.5 },
    { key: 'avg', label: 'Average', sub: '5’3″–5’11″', rate: 5.5 },
    { key: 'tall', label: 'Taller', sub: '6’0″ & up', rate: 5.0 },
  ] as const;

  const SESSION_PRESETS = [
    { mins: 2, label: '2 min', sub: 'quick calm' },
    { mins: 10, label: '10 min', sub: 'focus dose' },
    { mins: 13, label: '13 min', sub: 'focus dose' },
    { mins: 17, label: '17 min', sub: 'full dose' },
  ];

  const INHALE_FRACTION = 0.4; // 40% inhale / 60% exhale (I:E ≈ 4:6)

  let rate = $state(5.5);
  let sessionMins = $state(10);
  let running = $state(false);
  let finished = $state(false);
  let phase = $state<Phase>('idle');
  let phaseSeconds = $state(0);
  let remaining = $state(0);

  let engine: BreathEngine | null = null;
  let drone: BreathDrone | null = null;

  onMount(() => {
    rate = loadRate(5.5);
    sessionMins = loadSessionMins(10);
    return () => stop();
  });

  let cycleS = $derived(60 / rate);
  let inhaleS = $derived(INHALE_FRACTION * cycleS);
  let exhaleS = $derived((1 - INHALE_FRACTION) * cycleS);

  function fmt(seconds: number): string {
    const s = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }

  function pickRate(r: number) {
    rate = r;
    saveRate(r);
  }

  function pickSession(m: number) {
    sessionMins = m;
    saveSessionMins(m);
  }

  function start() {
    finished = false;
    remaining = sessionMins * 60;
    drone = new BreathDrone();
    drone.start();
    engine = new BreathEngine({
      phases: [
        { name: 'inhale', seconds: inhaleS },
        { name: 'exhale', seconds: exhaleS },
      ],
      totalSeconds: sessionMins * 60,
      onPhase: (p) => {
        phase = p.name;
        phaseSeconds = p.seconds;
        drone?.setPhase(p.name);
      },
      onTick: (elapsed) => {
        remaining = sessionMins * 60 - elapsed;
      },
      onComplete: () => {
        stop();
        finished = true;
      },
    });
    running = true;
    engine.start();
  }

  function stop() {
    engine?.stop();
    drone?.stop();
    engine = null;
    drone = null;
    running = false;
    phase = 'idle';
  }
</script>

<div class="trainer">
  <div class="pacer-wrap">
    <BreathPacer {phase} {phaseSeconds} />
    {#if running}
      <p class="timer">{fmt(remaining)}</p>
    {:else if finished}
      <p class="done">Nicely done. Notice how you feel.</p>
    {/if}
  </div>

  {#if !running}
    <div class="controls">
      <fieldset>
        <legend>Pick your starting rate by height</legend>
        <div class="preset-row">
          {#each HEIGHT_PRESETS as p}
            <button
              type="button"
              class={['preset', rate === p.rate && 'active']}
              onclick={() => pickRate(p.rate)}
            >
              <span class="preset-label">{p.label}</span>
              <span class="preset-sub">{p.sub}</span>
              <span class="preset-val">{p.rate} bpm</span>
            </button>
          {/each}
        </div>
        <label class="slider">
          <span>Fine-tune: <strong>{rate.toFixed(1)} breaths/min</strong></span>
          <input
            type="range"
            min="4.5"
            max="7"
            step="0.1"
            bind:value={rate}
            oninput={() => saveRate(rate)}
          />
        </label>
        <p class="readout">
          {inhaleS.toFixed(1)} s in &middot; {exhaleS.toFixed(1)} s out
        </p>
        <p class="hint">An estimate, not a measurement — pick what feels smoothest.</p>
      </fieldset>

      <fieldset>
        <legend>Session length</legend>
        <div class="preset-row">
          {#each SESSION_PRESETS as p}
            <button
              type="button"
              class={['preset', sessionMins === p.mins && 'active']}
              onclick={() => pickSession(p.mins)}
            >
              <span class="preset-label">{p.label}</span>
              <span class="preset-sub">{p.sub}</span>
            </button>
          {/each}
        </div>
      </fieldset>
    </div>

    <button type="button" class="start" onclick={start}>Begin</button>

    <details class="why">
      <summary>Why this works</summary>
      <p>
        Slow breathing near your <em>resonance frequency</em> (about 4.5&ndash;7
        breaths/min) makes heart rate swing in large, easy waves with each breath,
        strengthening the body's calming brake (the vagus nerve). Making the
        <strong>exhale longer than the inhale</strong> raises that calming activity
        further. No breath holds — they add nothing here. A 10&ndash;17 minute
        session is the dose linked to better focus and composure under pressure.
      </p>
    </details>
  {:else}
    <button type="button" class="stop" onclick={stop}>Stop</button>
  {/if}
</div>

<style>
  .trainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }
  .pacer-wrap {
    position: relative;
    text-align: center;
  }
  .timer {
    margin-top: 0.5rem;
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .done {
    margin-top: 0.5rem;
    font-size: 1.125rem;
    color: var(--foreground);
  }

  .controls {
    width: 100%;
    max-width: 32rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  fieldset {
    border: 1px solid var(--card-border);
    border-radius: 0.75rem;
    background: var(--card-bg);
    padding: 1rem 1.25rem 1.25rem;
  }
  legend {
    padding: 0 0.5rem;
    font-size: 0.9rem;
    color: var(--text-muted);
    font-weight: bold;
  }
  .preset-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .preset {
    flex: 1 1 0;
    min-width: 5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.75rem 0.5rem;
    border-radius: 0.6rem;
    border: 1px solid var(--card-border);
    background: var(--btn-bg);
    color: var(--foreground);
    cursor: pointer;
    transition: all 0.15s;
  }
  .preset:hover {
    background: var(--btn-hover);
  }
  .preset.active {
    border-color: var(--foreground);
    background: var(--btn-hover);
    box-shadow: 0 0 0 1px var(--foreground) inset;
  }
  .preset-label {
    font-weight: bold;
  }
  .preset-sub {
    font-size: 0.75rem;
    color: var(--text-faint);
  }
  .preset-val {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .slider {
    display: block;
    margin-top: 1rem;
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  .slider input {
    width: 100%;
    margin-top: 0.4rem;
    accent-color: var(--foreground);
  }
  .readout {
    margin-top: 0.5rem;
    text-align: center;
    font-size: 1rem;
    color: var(--foreground);
  }
  .hint {
    margin-top: 0.25rem;
    text-align: center;
    font-size: 0.8rem;
    color: var(--text-faint);
  }

  .start,
  .stop {
    padding: 0.85rem 3rem;
    font-size: 1.1rem;
    font-weight: bold;
    border-radius: 999px;
    border: 1px solid var(--card-border);
    background: var(--btn-bg);
    color: var(--foreground);
    cursor: pointer;
    transition: all 0.15s;
  }
  .start:hover,
  .stop:hover {
    background: var(--btn-hover);
  }

  .why {
    width: 100%;
    max-width: 32rem;
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  .why summary {
    cursor: pointer;
    font-weight: bold;
    color: var(--text-muted);
  }
  .why p {
    margin-top: 0.5rem;
    line-height: 1.5;
  }
</style>
