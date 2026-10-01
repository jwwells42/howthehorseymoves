<script lang="ts">
  /** A brick wall filling one board square: an obstacle in a route puzzle. */

  interface Props {
    /** Top-left corner of the square, in the board's SVG units. */
    x: number;
    y: number;
    /** Width of the square. */
    size: number;
  }

  let { x, y, size }: Props = $props();

  /** The wall sits inside the square with this much space around it. */
  const INSET = 12;
  /** Gap between bricks, where the mortar shows. */
  const GAP = 1.5;

  let left = $derived(x + INSET);
  let top = $derived(y + INSET);
  let width = $derived(size - INSET * 2);
  let rowHeight = $derived(width / 3);

  /** Three courses of brick. Each brick is [start, width] as a share of the
      wall's width. The middle course is offset by half a brick. */
  const COURSES = [
    [[0, 0.33], [0.33, 0.34], [0.67, 0.33]],
    [[0, 0.17], [0.17, 0.33], [0.5, 0.33], [0.83, 0.17]],
    [[0, 0.33], [0.33, 0.34], [0.67, 0.33]],
  ];
</script>

<g class="wall">
  <rect x={left} y={top} width={width} height={width} rx="4" class="mortar" />
  {#each COURSES as course, row}
    {#each course as [start, share]}
      <rect
        x={left + width * start + GAP}
        y={top + rowHeight * row + GAP}
        width={width * share - GAP * 2}
        height={rowHeight - GAP * 2}
        rx="2"
        class="brick"
      />
    {/each}
  {/each}
  <rect x={left} y={top} width={width} height={width} rx="4" class="edge" />
</g>

<style>
  .wall { pointer-events: none; }
  .mortar { fill: var(--wall-mortar); }
  .brick { fill: var(--wall-brick); }
  .edge {
    fill: none;
    stroke: var(--wall-edge);
    stroke-width: 1.5;
  }
</style>
