<script lang="ts">
  /** A bar that fills from left to right: steps done, or time left. */

  interface Props {
    value: number;
    max: number;
    /** Read out by screen readers, e.g. "Lesson progress". */
    label: string;
    /** Turns the bar the highlight colour, to say "nearly out of time". */
    hurry?: boolean;
  }

  let { value, max, label, hurry = false }: Props = $props();
</script>

<div
  class="track"
  role="progressbar"
  aria-label={label}
  aria-valuemin={0}
  aria-valuemax={max}
  aria-valuenow={value}
>
  <div class={['fill', hurry && 'hurry']} style:width="{(value / max) * 100}%"></div>
</div>

<style>
  .track {
    width: 100%;
    height: 0.5rem;
    border-radius: 9999px;
    background: var(--surface);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: 9999px;
    background: var(--ink);
    /* One second, so a countdown that ticks each second moves smoothly. */
    transition: width 1s linear, background 0.5s;
  }
  .fill.hurry {
    background: var(--highlight);
  }
</style>
