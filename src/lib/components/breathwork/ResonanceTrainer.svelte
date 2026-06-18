<script lang="ts">
  import { onMount } from 'svelte';
  import BreathPacer from './BreathPacer.svelte';
  import { BreathEngine, type BreathPhaseName } from '$lib/breathwork/engine';
  import { BreathDrone } from '$lib/breathwork/audio';
  import { loadRate, saveRate, loadSessionMins, saveSessionMins } from '$lib/breathwork/prefs';

  type Phase = BreathPhaseName | 'idle';

  // Read-only reference: resonance rate by height & sex, from Hasuo et al. (2024).
  // ♀ = 15.88 − 0.06×cm, ♂ = 17.90 − 0.07×cm, rounded to 0.1 and clamped to the
  // 4.5–7.0 band (* = clamped). Shown as a guide; nothing is entered.
  const RATE_TABLE = [
    { ht: '5′0″', cm: 152, f: '6.7', m: '7.0*' },
    { ht: '5′2″', cm: 157, f: '6.4', m: '6.9' },
    { ht: '5′4″', cm: 163, f: '6.1', m: '6.5' },
    { ht: '5′6″', cm: 168, f: '5.8', m: '6.2' },
    { ht: '5′8″', cm: 173, f: '5.5', m: '5.8' },
    { ht: '5′10″', cm: 178, f: '5.2', m: '5.5' },
    { ht: '6′0″', cm: 183, f: '4.9', m: '5.1' },
    { ht: '6′2″', cm: 188, f: '4.6', m: '4.7' },
    { ht: '6′4″', cm: 193, f: '4.5*', m: '4.5*' },
  ] as const;

  const INHALE_FRACTION = 0.4; // 40% inhale / 60% exhale (I:E ≈ 4:6)

  let rate = $state(5.5);
  let sessionMins = $state(15);
  let running = $state(false);
  let finished = $state(false);
  let phase = $state<Phase>('idle');
  let phaseSeconds = $state(0);
  let remaining = $state(0);

  let engine: BreathEngine | null = null;
  let drone: BreathDrone | null = null;

  onMount(() => {
    rate = loadRate(5.5);
    sessionMins = loadSessionMins(15);
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
    <button
      type="button"
      class="orb-button"
      onclick={running ? stop : start}
      aria-label={running ? 'Stop session' : 'Begin session'}
    >
      <BreathPacer {phase} {phaseSeconds} />
    </button>
    {#if running}
      <p class="timer">{fmt(remaining)}</p>
    {:else if finished}
      <p class="done">Nicely done. Notice how you feel.</p>
    {/if}
  </div>

  {#if !running}
    <div class="controls">
      <fieldset>
        <legend>Your breathing rate</legend>
        <label class="slider">
          <span>Rate: <strong>{rate.toFixed(1)} breaths/min</strong></span>
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
      </fieldset>

      <fieldset>
        <legend>The science: resonance rate by height</legend>
        <table class="science">
          <thead>
            <tr><th>Height</th><th>&#9792; women</th><th>&#9794; men</th></tr>
          </thead>
          <tbody>
            {#each RATE_TABLE as row}
              <tr>
                <td>{row.ht} <span class="cm">({row.cm} cm)</span></td>
                <td>{row.f}</td>
                <td>{row.m}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </fieldset>

      <fieldset>
        <legend>Session length</legend>
        <label class="slider">
          <span>Length: <strong>{sessionMins} min</strong></span>
          <input
            type="range"
            min="2"
            max="20"
            step="1"
            bind:value={sessionMins}
            oninput={() => saveSessionMins(sessionMins)}
          />
        </label>
      </fieldset>
    </div>

    <button type="button" class="start" onclick={start}>Begin</button>

    <details class="why">
      <summary>Why this works</summary>
      <p>
        Something to do with the vagus nerve &amp; this practice helping
        parasympathetic nervous system chill mode as opposed to sympathetic nervous
        system battle mode. Will rewrite when I understand better.
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
  .orb-button {
    display: block;
    margin: 0 auto;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
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
  .science {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }
  .science th,
  .science td {
    padding: 0.3rem 0.5rem;
    text-align: right;
    border-bottom: 1px solid var(--card-border);
  }
  .science th:first-child,
  .science td:first-child {
    text-align: left;
  }
  .science th {
    color: var(--text-muted);
    font-weight: bold;
  }
  .science .cm {
    color: var(--text-faint);
    font-size: 0.8rem;
  }
  .slider {
    display: block;
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
