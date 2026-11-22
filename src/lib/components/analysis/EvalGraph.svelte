<script lang="ts">
  import type { Score } from '$lib/logic/pgn';
  import { whiteChance, moverOf, type Mark } from '$lib/engine/review';

  // A whole game's evals, as on Lichess: White's winning chances in
  // --piece-white rising from the bottom, Black's in --piece-black, a dot on
  // each ?! ? ?? move (the move list shows the symbol too), and a line where
  // the board is. Clicking goes to that move; the keyboard has the move list.

  interface Props {
    /** One per position, the start first, from White's side */
    evals: Score[];
    /** marks[i] is move i + 1's */
    marks: (Mark | null)[];
    /** The position on the board (0 = the start), null when off the game's moves */
    at: number | null;
    onPick: (position: number) => void;
  }

  let { evals, marks, at, onPick }: Props = $props();

  const HEIGHT = 56;
  let width = $state(280);

  let step = $derived(evals.length > 1 ? width / (evals.length - 1) : 0);
  let ys = $derived(evals.map((s, i) => HEIGHT / 2 - whiteChance(s, moverOf(i)) * (HEIGHT / 2 - 3)));
  let line = $derived(ys.map((y, i) => `${(i * step).toFixed(1)},${y.toFixed(1)}`).join(' '));
  let area = $derived(`0,${HEIGHT} ${line} ${width},${HEIGHT}`);
  let dots = $derived(
    marks.flatMap((mark, i) => (mark ? [{ mark, x: (i + 1) * step, y: ys[i + 1] }] : [])),
  );

  function pick(e: MouseEvent) {
    if (e.detail === 0 || evals.length < 2) return; // Enter or Space: the move list does that
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    onPick(Math.round(f * (evals.length - 1)));
  }
</script>

<button class="graph" onclick={pick} aria-label="Eval graph" tabindex="-1" bind:clientWidth={width}>
  <svg viewBox="0 0 {width} {HEIGHT}" width={width} height={HEIGHT} aria-hidden="true">
    <rect width={width} height={HEIGHT} style:fill="var(--piece-black)" />
    <polygon points={area} style:fill="var(--piece-white)" />
    <line x1="0" x2={width} y1={HEIGHT / 2} y2={HEIGHT / 2} style:stroke="var(--result-draw)" stroke-dasharray="3 3" />
    {#if at !== null}
      <!-- Dark under light, so it shows on either side's area -->
      <line x1={at * step} x2={at * step} y1="0" y2={HEIGHT} style:stroke="var(--piece-black)" stroke-width="3" />
      <line x1={at * step} x2={at * step} y1="0" y2={HEIGHT} style:stroke="var(--piece-white)" stroke-width="1" />
    {/if}
    {#each dots as dot}
      <circle
        cx={dot.x}
        cy={dot.y}
        r="3.5"
        style:fill={dot.mark === '??' ? 'var(--wrong)' : dot.mark === '?' ? 'var(--highlight)' : 'var(--mark-other)'}
        style:stroke="var(--piece-black)"
      />
    {/each}
  </svg>
</button>

<style>
  .graph {
    display: block;
    width: 100%;
    height: 56px;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 0.375rem;
    overflow: hidden;
    background: none;
    cursor: pointer;
    flex-shrink: 0;
  }
  svg {
    display: block;
  }
</style>
