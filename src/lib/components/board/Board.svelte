<script lang="ts">
  import type { Snippet } from 'svelte';
  import { type BoardState, FILES, RANKS, type SquareId, type PieceKind, type PieceColor, squareToCoords } from '$lib/logic/types';
  import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';
  import type { Arrow } from '$lib/logic/pgn';
  import type { SquareHighlight } from '$lib/board-marks';
  import Wall from './Wall.svelte';

  /**
   * Every chess board in the app. Given only `board`, it is a still picture,
   * and each other prop adds one thing. It fills the width of whatever holds
   * it, as a square.
   *
   * It is drawn 800 units across, 100 to a square, so anything inside it,
   * text included, is sized in those units.
   */

  const SQUARE_SIZE = 100;
  const BOARD_SIZE = SQUARE_SIZE * 8;

  /** How far a ring highlight sits inside its square. */
  const RING_INSET = 14;

  interface DragState {
    from: SquareId;
    piece: PieceKind;
    color: PieceColor;
    x: number;
    y: number;
  }

  interface Props {
    board: BoardState;
    /** Read out by screen readers. */
    label?: string;
    /** No moving pieces, no clicks, no animation: a picture. */
    readOnly?: boolean;
    /** Black at the bottom. */
    flipped?: boolean;
    /** Letters and numbers in the edge squares. Turn them off on a small board. */
    coordinates?: boolean;

    // Moving pieces
    selectedSquare?: SquareId | null;
    validMoves?: SquareId[];
    /** The moves to show while a piece is being dragged. */
    dragValidMoves?: SquareId[];
    /** Only pieces of this kind can be dragged. */
    draggablePiece?: PieceKind;
    /** The colours that can be dragged: white unless given. An empty list
        makes every tap a click, for placing pieces. */
    playableColors?: PieceColor[];
    onSquareClick?: (sq: SquareId) => void;
    onDrop?: (from: SquareId, to: SquareId) => void;
    onDragStart?: (sq: SquareId) => void;
    onDragEnd?: () => void;

    // Showing what just happened
    wrongMoveSquare?: SquareId | null;
    pawnSlide?: { from: SquareId; to: SquareId };
    opponentSlide?: SlideAnimation | null;

    // Drawn on the board
    /** Squares to reach, each marked with a star. */
    targets?: SquareId[];
    /** Targets already reached, marked with a tick. */
    reachedTargets?: SquareId[];
    highlights?: SquareHighlight[];
    arrows?: Arrow[];
    /** Squares whose piece is drawn as a brick wall. */
    obstacles?: SquareId[];
    /** A path to number, square by square: S, 1, 2, … joined by a line. */
    route?: SquareId[];
    /** Drawn on top of everything, in board units. */
    children?: Snippet;
  }

  let {
    board,
    label = 'Chess board',
    readOnly = false,
    flipped = false,
    coordinates = true,
    selectedSquare = null,
    validMoves = [],
    dragValidMoves = [],
    draggablePiece,
    playableColors,
    onSquareClick,
    onDrop,
    onDragStart,
    onDragEnd,
    wrongMoveSquare,
    pawnSlide,
    opponentSlide,
    targets = [],
    reachedTargets = [],
    highlights = [],
    arrows = [],
    obstacles = [],
    route = [],
    children,
  }: Props = $props();

  let svgEl = $state<SVGSVGElement | undefined>(undefined);
  let drag = $state<DragState | null>(null);
  let clickSquare = $state<SquareId | null>(null);

  // The board's size on screen, in pixels.
  let width = $state(0);
  let height = $state(0);

  /** Coordinates stay at least 14px on screen, however small the board is drawn. */
  let coordinateSize = $derived.by(() => {
    const drawn = Math.min(width, height);
    return drawn > 0 ? Math.max(24, (14 * BOARD_SIZE) / drawn) : 24;
  });

  let displayRanks = $derived(flipped ? [...RANKS].reverse() : RANKS);
  let displayFiles = $derived(flipped ? [...FILES].reverse() : FILES);

  let shownMoves = $derived(drag ? dragValidMoves : validMoves);

  /** A square's column and row on screen, counted from the top left. */
  function sqToXY(sq: SquareId): [number, number] {
    const [fx, fy] = squareToCoords(sq);
    return flipped ? [7 - fx, 7 - fy] : [fx, fy];
  }

  /** The middle of a square, in board units. */
  function centre(sq: SquareId): [number, number] {
    const [fx, fy] = sqToXY(sq);
    return [fx * SQUARE_SIZE + SQUARE_SIZE / 2, fy * SQUARE_SIZE + SQUARE_SIZE / 2];
  }

  function pointerToSvg(e: PointerEvent): { x: number; y: number } | null {
    if (!svgEl) return null;
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svgEl.getScreenCTM()!.inverse());
    return { x: svgPt.x, y: svgPt.y };
  }

  function svgToSquare(x: number, y: number): SquareId | null {
    let fi = Math.floor(x / SQUARE_SIZE);
    let ri = Math.floor(y / SQUARE_SIZE);
    if (fi < 0 || fi > 7 || ri < 0 || ri > 7) return null;
    if (flipped) { fi = 7 - fi; ri = 7 - ri; }
    return `${FILES[fi]}${RANKS[ri]}` as SquareId;
  }

  function handlePointerDown(e: PointerEvent) {
    if (readOnly) return;
    const svgPt = pointerToSvg(e);
    if (!svgPt) return;
    const sq = svgToSquare(svgPt.x, svgPt.y);
    if (!sq) return;

    const p = board.pieces.get(sq);
    if (p) {
      const canPlay = playableColors ? playableColors.includes(p.color) : p.color === 'w';
      if (canPlay && (!draggablePiece || p.piece === draggablePiece)) {
        (e.target as Element).setPointerCapture(e.pointerId);
        drag = { from: sq, piece: p.piece, color: p.color, x: svgPt.x, y: svgPt.y };
        onDragStart?.(sq);
        return;
      }
    }

    // Not a draggable piece — track square for click on pointerup
    clickSquare = sq;
  }

  function handlePointerMove(e: PointerEvent) {
    if (!drag) return;
    const svgPt = pointerToSvg(e);
    if (!svgPt) return;
    drag = { ...drag, x: svgPt.x, y: svgPt.y };
  }

  function handlePointerUp(e: PointerEvent) {
    if (drag) {
      const svgPt = pointerToSvg(e);
      if (svgPt) {
        const dropSq = svgToSquare(svgPt.x, svgPt.y);
        if (dropSq && dropSq !== drag.from) {
          // Snap the drag preview to the drop square so the piece
          // stays visible while the board state updates.
          const [x, y] = centre(dropSq);
          drag = { ...drag, x, y };
          onDrop?.(drag.from, dropSq);
          // Clear drag after a microtick so the new board state
          // renders before the preview disappears.
          queueMicrotask(() => { drag = null; onDragEnd?.(); });
          return;
        } else {
          onSquareClick?.(drag.from);
        }
      }
      drag = null;
      onDragEnd?.();
    } else if (clickSquare) {
      const svgPt = pointerToSvg(e);
      if (svgPt) {
        const upSq = svgToSquare(svgPt.x, svgPt.y);
        if (upSq === clickSquare) {
          onSquareClick?.(clickSquare);
        }
      }
      clickSquare = null;
    }
  }

  function getSlideStyle(sq: SquareId, piece: PieceKind): string | undefined {
    if (readOnly) return undefined;

    const [fx, fy] = sqToXY(sq);

    // En passant pawn slide
    if (pawnSlide && sq === pawnSlide.to && piece === 'P') {
      const [fromFx, fromFy] = sqToXY(pawnSlide.from);
      const dx = (fromFx - fx) * SQUARE_SIZE;
      const dy = (fromFy - fy) * SQUARE_SIZE;
      return `--slide-x: ${dx}px; --slide-y: ${dy}px; animation: pawn-slide 0.4s ease-out 0.3s backwards;`;
    }

    // Opponent response slide
    if (opponentSlide && sq === opponentSlide.to) {
      const [fromFx, fromFy] = sqToXY(opponentSlide.from);
      const dx = (fromFx - fx) * SQUARE_SIZE;
      const dy = (fromFy - fy) * SQUARE_SIZE;
      return `--slide-x: ${dx}px; --slide-y: ${dy}px; animation: pawn-slide 0.4s ease-out forwards;`;
    }

    return undefined;
  }

  function getArrowPath(arrow: Arrow) {
    const [x1, y1] = centre(arrow.from);
    const [x2, y2] = centre(arrow.to);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const headLen = 40;
    const headW = 55;
    const shaftW = 18;
    const ux = dx / len;
    const uy = dy / len;
    const sx = x2 - ux * headLen;
    const sy = y2 - uy * headLen;
    const px = -uy;
    const py = ux;
    const hw = headW / 2;
    return { x1, y1, sx, sy, x2, y2, px, py, hw, shaftW, color: arrow.color };
  }
</script>

<svg
  bind:this={svgEl}
  bind:clientWidth={width}
  bind:clientHeight={height}
  viewBox="0 0 {BOARD_SIZE} {BOARD_SIZE}"
  class={['board-svg', readOnly && 'still']}
  role={readOnly ? 'img' : 'application'}
  aria-label={label}
  tabindex="-1"
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
>
  <!-- Squares -->
  {#each displayRanks as rank, ri}
    {#each displayFiles as file, fi}
      {@const sq = `${file}${rank}` as SquareId}
      {@const x = fi * SQUARE_SIZE}
      {@const y = ri * SQUARE_SIZE}
      {@const isLight = (fi + ri) % 2 === 0}
      {@const isSelected = sq === selectedSquare || (drag !== null && sq === drag.from)}
      {@const isTarget = targets.includes(sq) && !reachedTargets.includes(sq)}
      {@const isReached = reachedTargets.includes(sq)}
      {@const hasOccupant = board.pieces.has(sq)}
      {@const isPawnSlideSquare = pawnSlide && (sq === pawnSlide.from || sq === pawnSlide.to)}
      <!-- If a square is highlighted twice, the first one wins. -->
      {@const highlight = highlights.find((h) => h.square === sq)}
      <g
        role="button"
        tabindex="-1"
        aria-label={sq}
      >
        <rect
          {x}
          {y}
          width={SQUARE_SIZE}
          height={SQUARE_SIZE}
          class={[
            isLight ? 'light' : 'dark',
            sq === wrongMoveSquare ? 'wrong' : isSelected ? 'selected' : isPawnSlideSquare && 'moved',
          ]}
        />
        {#if highlight?.look === 'ring'}
          <rect
            x={x + RING_INSET}
            y={y + RING_INSET}
            width={SQUARE_SIZE - 2 * RING_INSET}
            height={SQUARE_SIZE - 2 * RING_INSET}
            class="no-pointer ring-edge"
          />
          <rect
            x={x + RING_INSET}
            y={y + RING_INSET}
            width={SQUARE_SIZE - 2 * RING_INSET}
            height={SQUARE_SIZE - 2 * RING_INSET}
            style:stroke={highlight.color}
            class="no-pointer ring"
          />
        {:else if highlight}
          <rect
            {x}
            {y}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            style:fill={highlight.color}
            class={['no-pointer', highlight.look !== 'solid' && 'tint']}
          />
        {/if}
        {#if coordinates && ri === 7}
          <text
            x={x + 6}
            y={y + SQUARE_SIZE - 8}
            style:font-size="{coordinateSize}px"
            class={['no-pointer', 'label', 'coordinate', isLight ? 'on-light' : 'on-dark']}
          >{file}</text>
        {/if}
        {#if coordinates && fi === 0}
          <text
            x={x + 6}
            y={y + coordinateSize + 2}
            style:font-size="{coordinateSize}px"
            class={['no-pointer', 'label', 'coordinate', isLight ? 'on-light' : 'on-dark']}
          >{rank}</text>
        {/if}
        {#if isTarget && !hasOccupant}
          <text
            x={x + SQUARE_SIZE / 2}
            y={y + SQUARE_SIZE / 2 + 18}
            text-anchor="middle"
            class="no-pointer label star"
          >&#9733;</text>
        {/if}
        {#if isReached}
          <text
            x={x + SQUARE_SIZE / 2}
            y={y + SQUARE_SIZE / 2 + 14}
            text-anchor="middle"
            class="no-pointer label reached"
          >&#10003;</text>
        {/if}
      </g>
    {/each}
  {/each}

  <!-- Where the selected piece can go: a ring around a piece it can take, a dot on an empty square. -->
  {#each shownMoves as sq}
    {@const [cx, cy] = centre(sq)}
    {@const isTarget = targets.includes(sq)}
    {#if board.pieces.has(sq)}
      <circle {cx} {cy} r={SQUARE_SIZE * 0.45} class={['no-pointer', 'move-ring', isTarget && 'onto-target']} />
    {:else}
      <circle
        {cx}
        {cy}
        r={isTarget ? SQUARE_SIZE * 0.25 : SQUARE_SIZE * 0.15}
        class={['no-pointer', 'move-dot', isTarget && 'onto-target']}
      />
    {/if}
  {/each}

  <!-- Pieces -->
  {#each [...board.pieces.entries()] as [sq, { piece, color }]}
    {#if !(drag && sq === drag.from)}
      {@const [fx, fy] = sqToXY(sq)}
      {#if obstacles.includes(sq)}
        <Wall x={fx * SQUARE_SIZE} y={fy * SQUARE_SIZE} size={SQUARE_SIZE} />
      {:else}
        <image
          href="/pieces/{color}{piece}.svg"
          x={fx * SQUARE_SIZE + 5}
          y={fy * SQUARE_SIZE + 5}
          width={SQUARE_SIZE - 10}
          height={SQUARE_SIZE - 10}
          class="no-pointer"
          style={getSlideStyle(sq, piece)}
        />
      {/if}
    {/if}
  {/each}

  <!-- Stars on top of target pieces -->
  {#each targets as sq}
    {#if !reachedTargets.includes(sq) && board.pieces.has(sq)}
      {@const [cx, cy] = centre(sq)}
      <text x={cx} y={cy + 18} text-anchor="middle" class="no-pointer label star">&#9733;</text>
    {/if}
  {/each}

  <!-- Route: each stop numbered, joined by a line -->
  {#if route.length > 0}
    <g class="no-pointer">
      {#each route.slice(1) as sq, i}
        {@const [x1, y1] = centre(route[i])}
        {@const [x2, y2] = centre(sq)}
        <line {x1} {y1} {x2} {y2} class="route-leg" />
      {/each}
      {#each route as sq, i}
        {@const [cx, cy] = centre(sq)}
        <circle {cx} {cy} r={SQUARE_SIZE * 0.3} class="route-stop" />
        <text x={cx} y={cy} class="label route-number">{i === 0 ? 'S' : i}</text>
      {/each}
    </g>
  {/if}

  <!-- Arrows -->
  {#each arrows as arrow}
    {@const a = getArrowPath(arrow)}
    <g class="no-pointer arrow">
      <line
        x1={a.x1} y1={a.y1} x2={a.sx} y2={a.sy}
        style:stroke={a.color}
        stroke-width={a.shaftW}
        stroke-linecap="round"
      />
      <polygon
        points="{a.x2},{a.y2} {a.sx + a.px * a.hw},{a.sy + a.py * a.hw} {a.sx - a.px * a.hw},{a.sy - a.py * a.hw}"
        style:fill={a.color}
      />
    </g>
  {/each}

  {@render children?.()}

  <!-- Dragged piece following cursor -->
  {#if drag}
    <image
      href="/pieces/{drag.color}{drag.piece}.svg"
      x={drag.x - SQUARE_SIZE / 2}
      y={drag.y - SQUARE_SIZE / 2}
      width={SQUARE_SIZE}
      height={SQUARE_SIZE}
      class="no-pointer"
      opacity="0.9"
    />
  {/if}
</svg>

<style>
  .board-svg {
    display: block;
    width: 100%;
    max-height: 80dvh;
    aspect-ratio: 1;
    cursor: pointer;
    /* A drag moves a piece, not the page. */
    touch-action: none;
  }
  @media (min-height: 32rem) and (min-width: 32rem) {
    .board-svg {
      max-height: 100%;
    }
  }
  .still {
    cursor: auto;
    touch-action: auto;
  }

  .no-pointer {
    pointer-events: none;
  }
  .label {
    user-select: none;
  }

  .light { fill: var(--board-light); }
  .dark { fill: var(--board-dark); }
  .selected { fill: var(--highlight); }
  .moved { fill: var(--highlight); fill-opacity: 0.6; }
  .wrong { fill: var(--wrong); }

  .tint { fill-opacity: 0.6; }
  /* A dark edge either side, so a ring shows on light and dark squares. */
  .ring-edge {
    fill: none;
    stroke: var(--scrim);
    stroke-width: 28;
  }
  .ring {
    fill: none;
    stroke-width: 16;
  }

  /* Each coordinate takes the colour of the squares it is not on. Its size
     is set in the markup, from the board's size on screen. */
  .coordinate {
    font-weight: var(--weight-strong);
  }
  .coordinate.on-light { fill: var(--board-dark); }
  .coordinate.on-dark { fill: var(--board-light); }

  .star {
    font-size: 70px;
    fill: var(--star);
    stroke: var(--star-edge);
    stroke-width: 2;
  }
  .reached {
    font-size: 56px;
    font-weight: var(--weight-strong);
    fill: var(--correct);
    stroke: var(--on-answer);
    stroke-width: 3;
  }

  .move-dot { fill: var(--board-move-dot); }
  .move-ring {
    fill: none;
    stroke: var(--board-move-dot);
    stroke-width: 4;
  }
  .move-dot.onto-target { fill: var(--board-target); }
  .move-ring.onto-target { stroke: var(--board-target); }

  .route-leg {
    stroke: var(--page);
    stroke-opacity: 0.6;
    stroke-width: 6;
    stroke-linecap: round;
  }
  .route-stop {
    fill: var(--page);
    stroke: var(--ink);
    stroke-width: 4;
  }
  .route-number {
    font-size: 36px;
    font-weight: var(--weight-strong);
    fill: var(--ink);
    text-anchor: middle;
    dominant-baseline: central;
  }

  .arrow { opacity: 0.8; }
</style>
