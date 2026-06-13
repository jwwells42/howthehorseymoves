<script lang="ts">
  import type { BreathPhaseName } from '$lib/breathwork/engine';

  type Phase = BreathPhaseName | 'idle';

  interface Props {
    phase: Phase;
    /** Duration of the current phase in seconds — drives the animation tempo. */
    phaseSeconds: number;
    /** Optional label override; otherwise derived from the phase. */
    label?: string;
  }

  let { phase, phaseSeconds, label }: Props = $props();

  // Target scale per phase. The orb grows on inhale, pops a touch on the
  // top-off sip, settles small on exhale, and rests at a calm mid-size idle.
  const SCALE: Record<Phase, number> = {
    idle: 0.62,
    inhale: 1.0,
    topoff: 1.08,
    exhale: 0.55,
  };

  // Warm on the way in, cool and settling on the way out.
  const COLOR: Record<Phase, string> = {
    idle: '#c8d0b0',
    inhale: '#f0e6cc',
    topoff: '#ffe9a8',
    exhale: '#a8d0b8',
  };

  const DEFAULT_LABEL: Record<Phase, string> = {
    idle: 'Ready',
    inhale: 'Breathe in',
    topoff: 'Top off',
    exhale: 'Breathe out',
  };

  let scale = $derived(SCALE[phase]);
  let color = $derived(COLOR[phase]);
  let text = $derived(label ?? DEFAULT_LABEL[phase]);
  // Idle transitions use a gentle fixed duration; active phases match the pacer.
  let durationS = $derived(phase === 'idle' ? 0.8 : Math.max(0.1, phaseSeconds));
</script>

<div class="pacer" role="img" aria-label={text}>
  <div
    class="glow"
    style="transform: scale({scale * 1.6}); transition-duration: {durationS}s; --orb-color: {color};"
  ></div>
  <div
    class="orb"
    style="transform: scale({scale}); transition-duration: {durationS}s; --orb-color: {color};"
  >
    <span class="label">{text}</span>
  </div>
</div>

<style>
  .pacer {
    position: relative;
    width: 320px;
    height: 320px;
    max-width: 80vw;
    max-height: 80vw;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
  }

  .orb,
  .glow {
    position: absolute;
    border-radius: 50%;
    transition-property: transform, background, box-shadow;
    transition-timing-function: cubic-bezier(0.37, 0, 0.63, 1);
    will-change: transform;
  }

  .orb {
    width: 220px;
    height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(
      circle at 50% 42%,
      var(--orb-color) 0%,
      color-mix(in srgb, var(--orb-color) 55%, transparent) 70%,
      transparent 100%
    );
    box-shadow: 0 0 60px 10px color-mix(in srgb, var(--orb-color) 35%, transparent);
  }

  .glow {
    width: 220px;
    height: 220px;
    background: radial-gradient(
      circle,
      color-mix(in srgb, var(--orb-color) 30%, transparent) 0%,
      transparent 65%
    );
    filter: blur(24px);
    opacity: 0.8;
  }

  .label {
    font-size: 1.25rem;
    font-weight: bold;
    color: #2d4a22;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.3);
    letter-spacing: 0.02em;
  }

  @media (prefers-reduced-motion: reduce) {
    .orb,
    .glow {
      transition-duration: 0.2s !important;
    }
  }
</style>
