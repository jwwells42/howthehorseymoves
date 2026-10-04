<script lang="ts">
  import { fade } from 'svelte/transition';
  import { squareToCoords, type SquareId } from '$lib/logic/types';

  /**
   * A hand that taps a square, showing a student who can't read what to do.
   * Goes inside a Board, in board units (100 a square, White at the bottom).
   * Give it a new square and it glides there; `pressing` taps.
   */

  interface Props {
    square: SquareId;
    pressing: boolean;
  }
  let { square, pressing }: Props = $props();

  // The fingertip sits on the middle of the square.
  let [x, y] = $derived(squareToCoords(square).map((n) => n * 100 + 50));
</script>

<g class="hand" style:transform="translate({x}px, {y}px)" transition:fade={{ duration: 200 }}>
  {#if pressing}
    <circle r="40" class="ripple" />
  {/if}
  <text class={['finger', pressing && 'pressing']} x="-26" y="72" aria-hidden="true">&#128070;</text>
</g>

<style>
  .hand {
    pointer-events: none;
    transition: transform 0.6s ease-in-out;
  }
  .finger {
    font-size: 80px;
    transform-origin: 0 0;
    transition: transform 0.15s ease-out;
  }
  .finger.pressing {
    transform: scale(0.85);
  }
  .ripple {
    fill: none;
    stroke: var(--highlight);
    stroke-width: 6;
    animation: ripple 0.5s ease-out forwards;
  }
  @keyframes ripple {
    from { transform: scale(0.3); opacity: 1; }
    to { transform: scale(1.1); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .hand, .finger { transition: none; }
    .ripple { animation: none; opacity: 0; }
  }
</style>
