<script lang="ts">
  import { onMount } from 'svelte';
  import BreathPacer from './BreathPacer.svelte';
  import { BreathEngine, type BreathPhaseName } from '$lib/breathwork/engine';
  import { BreathDrone } from '$lib/breathwork/audio';
  import { loadSighExhale, saveSighExhale } from '$lib/breathwork/prefs';

  type Phase = BreathPhaseName | 'idle';

  // Fixed by the protocol: a long first inhale, then a short sharp top-off sip.
  const INHALE1_S = 2;
  const TOPOFF_S = 1;
  const ACUTE_CYCLES = 3;
  const PRACTICE_SECONDS = 5 * 60;

  const PHASE_LABEL: Record<Phase, string> = {
    idle: 'Ready',
    inhale: 'Breathe in (nose)',
    topoff: 'Sip more — top off',
    exhale: 'Slow exhale (mouth)',
  };

  let exhaleS = $state(6);
  let dose = $state<'acute' | 'practice'>('practice');
  let running = $state(false);
  let finished = $state(false);
  let phase = $state<Phase>('idle');
  let phaseSeconds = $state(0);
  let cyclesDone = $state(0);
  let remaining = $state(0);

  let engine: BreathEngine | null = null;
  let drone: BreathDrone | null = null;

  onMount(() => {
    exhaleS = loadSighExhale(6);
    return () => stop();
  });

  function fmt(seconds: number): string {
    const s = Math.max(0, Math.ceil(seconds));
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }

  function start() {
    finished = false;
    cyclesDone = 0;
    remaining = PRACTICE_SECONDS;
    drone = new BreathDrone();
    drone.start();
    engine = new BreathEngine({
      phases: [
        { name: 'inhale', seconds: INHALE1_S },
        { name: 'topoff', seconds: TOPOFF_S },
        { name: 'exhale', seconds: exhaleS },
      ],
      totalSeconds: dose === 'practice' ? PRACTICE_SECONDS : undefined,
      onPhase: (p) => {
        phase = p.name;
        phaseSeconds = p.seconds;
        drone?.setPhase(p.name);
      },
      onCycle: (n) => {
        cyclesDone = n;
        if (dose === 'acute' && n >= ACUTE_CYCLES) {
          stop();
          finished = true;
        }
      },
      onTick: (elapsed) => {
        remaining = PRACTICE_SECONDS - elapsed;
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
    <BreathPacer {phase} {phaseSeconds} label={PHASE_LABEL[phase]} />
    {#if running}
      {#if dose === 'practice'}
        <p class="timer">{fmt(remaining)}</p>
      {:else}
        <p class="timer">Cycle {Math.min(cyclesDone + 1, ACUTE_CYCLES)} of {ACUTE_CYCLES}</p>
      {/if}
    {:else if finished}
      <p class="done">Nicely done. Notice how you feel.</p>
    {/if}
  </div>

  {#if !running}
    <div class="controls">
      <fieldset>
        <legend>How long</legend>
        <div class="preset-row">
          <button
            type="button"
            class={['preset', dose === 'acute' && 'active']}
            onclick={() => (dose = 'acute')}
          >
            <span class="preset-label">Quick reset</span>
            <span class="preset-sub">3 cycles &middot; ~30 s</span>
          </button>
          <button
            type="button"
            class={['preset', dose === 'practice' && 'active']}
            onclick={() => (dose = 'practice')}
          >
            <span class="preset-label">Daily practice</span>
            <span class="preset-sub">5 minutes</span>
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Exhale length</legend>
        <label class="slider">
          <span>Slow exhale: <strong>{exhaleS.toFixed(0)} s</strong></span>
          <input
            type="range"
            min="5"
            max="8"
            step="1"
            bind:value={exhaleS}
            oninput={() => saveSighExhale(exhaleS)}
          />
        </label>
        <p class="readout">2 s inhale &middot; 1 s top-off sip &middot; {exhaleS.toFixed(0)} s exhale</p>
      </fieldset>
    </div>

    <button type="button" class="start" onclick={start}>Begin</button>

    <details class="why">
      <summary>What</summary>
      <p>
        Inhale fully through the nose, then inhale again to top it off, still through
        the nose, then loooooong exhale.
      </p>
      <p class="tip">
        Feeling lightheaded? Soften the top-off sip and lengthen the exhale. Stop and
        sit if it continues.
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
    min-width: 7rem;
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
    font-size: 0.95rem;
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
  .why .tip {
    color: var(--text-faint);
    font-style: italic;
  }
</style>
