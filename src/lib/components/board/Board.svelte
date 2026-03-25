<script lang="ts">
  import { type BoardState, FILES, RANKS, type SquareId, type PieceKind, type PieceColor, squareToCoords } from '$lib/logic/types';
  import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';
  import type { Arrow } from '$lib/logic/pgn';
  import type { SquareHighlight } from '$lib/puzzles/parse-moves';

  const SQUARE_SIZE = 100;
  const BOARD_SIZE = SQUARE_SIZE * 8;

  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';
  const SELECTED_COLOR = '#f0e060';
  const VALID_MOVE_COLOR = '#00000033';
  const TARGET_COLOR = '#d4920a';
  const LAST_MOVE_COLOR = '#a8c4f0';
  const WRONG_MOVE_COLOR = '#ef4444';

  interface DragState {
    from: SquareId;
    piece: PieceKind;
    color: PieceColor;
    x: number;
    y: number;
  }

  interface Props {
    board: BoardState;
    selectedSquare: SquareId | null;
    validMoves: SquareId[];
    targets: SquareId[];
    reachedTargets: SquareId[];
    dragValidMoves: SquareId[];
    draggablePiece?: PieceKind;
    onSquareClick: (sq: SquareId) => void;
    onDrop: (from: SquareId, to: SquareId) => void;
    onDragStart: (sq: SquareId) => void;
    onDragEnd: () => void;
    pawnSlide?: { from: SquareId; to: SquareId };
    wrongMoveSquare?: SquareId | null;
    opponentSlide?: SlideAnimation | null;
    readOnly?: boolean;
    arrows?: Arrow[];
    playableColors?: PieceColor[];
    highlights?: SquareHighlight[];
    obstacles?: SquareId[];
    flipped?: boolean;
  }

  let {
    board,
    selectedSquare,
    validMoves,
    targets,
    reachedTargets,
    dragValidMoves,
    draggablePiece,
    onSquareClick,
    onDrop,
    onDragStart,
    onDragEnd,
    pawnSlide,
    wrongMoveSquare,
    opponentSlide,
    readOnly = false,
    arrows,
    playableColors,
    highlights,
    obstacles,
    flipped = false,
  }: Props = $props();

  let svgEl = $state<SVGSVGElement | undefined>(undefined);
  let drag = $state<DragState | null>(null);
  let clickSquare = $state<SquareId | null>(null);

  let displayRanks = $derived(flipped ? [...RANKS].reverse() : RANKS);
  let displayFiles = $derived(flipped ? [...FILES].reverse() : FILES);

  function sqToXY(sq: SquareId): [number, number] {
    const [fx, fy] = squareToCoords(sq);
    return flipped ? [7 - fx, 7 - fy] : [fx, fy];
  }

  let allHighlightedMoves = $derived(drag ? dragValidMoves : validMoves);

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
        onDragStart(sq);
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
          onDrop(drag.from, dropSq);
        } else {
          onSquareClick(drag.from);
        }
      }
      drag = null;
      onDragEnd();
    } else if (clickSquare) {
      const svgPt = pointerToSvg(e);
      if (svgPt) {
        const upSq = svgToSquare(svgPt.x, svgPt.y);
        if (upSq === clickSquare) {
          onSquareClick(clickSquare);
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
    const [fx, fy] = sqToXY(arrow.from);
    const [tx, ty] = sqToXY(arrow.to);
    const x1 = fx * SQUARE_SIZE + SQUARE_SIZE / 2;
    const y1 = fy * SQUARE_SIZE + SQUARE_SIZE / 2;
    const x2 = tx * SQUARE_SIZE + SQUARE_SIZE / 2;
    const y2 = ty * SQUARE_SIZE + SQUARE_SIZE / 2;
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
  viewBox="0 0 {BOARD_SIZE} {BOARD_SIZE}"
  class="board-svg"
  role="application"
  aria-label="Chess board"
  tabindex="-1"
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
>
  <!-- Squares -->
  {#each displayRanks as rank, ri}
    {#each displayFiles as file, fi}
      {@const sq = `${file}${rank}` as SquareId}
      {@const isLight = (fi + ri) % 2 === 0}
      {@const isSelected = sq === selectedSquare || (drag !== null && sq === drag.from)}
      {@const isTarget = targets.includes(sq) && !reachedTargets.includes(sq)}
      {@const isReached = reachedTargets.includes(sq)}
      {@const hasOccupant = board.pieces.has(sq)}
      {@const isPawnSlideSquare = pawnSlide && (sq === pawnSlide.from || sq === pawnSlide.to)}
      {@const isWrongMove = sq === wrongMoveSquare}
      {@const highlight = highlights?.find(h => h.square === sq)}
      {@const fill = isWrongMove ? WRONG_MOVE_COLOR : isSelected ? SELECTED_COLOR : isPawnSlideSquare ? LAST_MOVE_COLOR : isLight ? LIGHT : DARK}
      <g
        role="button"
        tabindex="-1"
        aria-label={sq}
        class="square"
      >
        <rect
          x={fi * SQUARE_SIZE}
          y={ri * SQUARE_SIZE}
          width={SQUARE_SIZE}
          height={SQUARE_SIZE}
          {fill}
        />
        {#if highlight}
          <rect
            x={fi * SQUARE_SIZE}
            y={ri * SQUARE_SIZE}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            fill={highlight.color + "99"}
            class="no-pointer"
          />
        {/if}
        {#if ri === 7}
          <text
            x={fi * SQUARE_SIZE + 5}
            y={ri * SQUARE_SIZE + SQUARE_SIZE - 5}
            font-size="14"
            fill={isLight ? DARK : LIGHT}
            font-weight="bold"
            class="no-pointer label"
          >{file}</text>
        {/if}
        {#if fi === 0}
          <text
            x={5}
            y={ri * SQUARE_SIZE + 16}
            font-size="14"
            fill={isLight ? DARK : LIGHT}
            font-weight="bold"
            class="no-pointer label"
          >{rank}</text>
        {/if}
        {#if isTarget && !hasOccupant}
          <text
            x={fi * SQUARE_SIZE + SQUARE_SIZE / 2}
            y={ri * SQUARE_SIZE + SQUARE_SIZE / 2 + 18}
            font-size="70"
            text-anchor="middle"
            fill="#f5c518"
            stroke="#8b6914"
            stroke-width="2"
            class="no-pointer label"
            style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
          >&#9733;</text>
        {/if}
        {#if isReached}
          <text
            x={fi * SQUARE_SIZE + SQUARE_SIZE / 2}
            y={ri * SQUARE_SIZE + SQUARE_SIZE / 2 + 8}
            font-size="36"
            text-anchor="middle"
            fill="#ffffff"
            stroke="#2d6a2e"
            stroke-width="1.5"
            class="no-pointer label"
            style="filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3))"
          >&#10003;</text>
        {/if}
      </g>
    {/each}
  {/each}

  <!-- Valid move indicators -->
  {#each allHighlightedMoves as sq}
    {@const [fx, fy] = sqToXY(sq)}
    {@const occupant = board.pieces.get(sq)}
    {@const isTarget = targets.includes(sq)}
    {#if occupant}
      <circle
        cx={fx * SQUARE_SIZE + SQUARE_SIZE / 2}
        cy={fy * SQUARE_SIZE + SQUARE_SIZE / 2}
        r={SQUARE_SIZE * 0.45}
        fill="none"
        stroke={isTarget ? TARGET_COLOR : VALID_MOVE_COLOR}
        stroke-width={4}
        class="no-pointer"
      />
    {:else}
      <circle
        cx={fx * SQUARE_SIZE + SQUARE_SIZE / 2}
        cy={fy * SQUARE_SIZE + SQUARE_SIZE / 2}
        r={isTarget ? SQUARE_SIZE * 0.25 : SQUARE_SIZE * 0.15}
        fill={isTarget ? `${TARGET_COLOR}88` : VALID_MOVE_COLOR}
        class="no-pointer"
      />
    {/if}
  {/each}

  <!-- Pieces -->
  {#each [...board.pieces.entries()] as [sq, { piece, color }]}
    {#if !(drag && sq === drag.from)}
      {@const [fx, fy] = sqToXY(sq)}
      {@const slideStyle = getSlideStyle(sq, piece)}
      {#if obstacles?.includes(sq)}
        {@const bx = fx * SQUARE_SIZE + 12}
        {@const by = fy * SQUARE_SIZE + 12}
        {@const bw = SQUARE_SIZE - 24}
        {@const bh = SQUARE_SIZE - 24}
        {@const rowH = bh / 3}
        {@const mortar = "#8b7355"}
        {@const brickColors = ["#b5543a", "#c4604a", "#a84e36", "#bf5c42", "#c96850", "#ab5038", "#be5a40", "#c26248", "#b05340"]}
        <g class="no-pointer">
          <!-- Mortar background -->
          <rect x={bx} y={by} width={bw} height={bh} rx="4" fill={mortar}/>
          <!-- Row 1: 3 bricks -->
          <rect x={bx + 1.5} y={by + 1.5} width={bw * 0.33 - 3} height={rowH - 3} rx="2" fill={brickColors[0]}/>
          <rect x={bx + bw * 0.33 + 1.5} y={by + 1.5} width={bw * 0.34 - 3} height={rowH - 3} rx="2" fill={brickColors[1]}/>
          <rect x={bx + bw * 0.67 + 1.5} y={by + 1.5} width={bw * 0.33 - 3} height={rowH - 3} rx="2" fill={brickColors[2]}/>
          <!-- Row 2: 3 bricks, offset -->
          <rect x={bx + 1.5} y={by + rowH + 1.5} width={bw * 0.17 - 2} height={rowH - 3} rx="2" fill={brickColors[3]}/>
          <rect x={bx + bw * 0.17 + 1.5} y={by + rowH + 1.5} width={bw * 0.33 - 3} height={rowH - 3} rx="2" fill={brickColors[4]}/>
          <rect x={bx + bw * 0.5 + 1.5} y={by + rowH + 1.5} width={bw * 0.33 - 3} height={rowH - 3} rx="2" fill={brickColors[5]}/>
          <rect x={bx + bw * 0.83 + 1.5} y={by + rowH + 1.5} width={bw * 0.17 - 2} height={rowH - 3} rx="2" fill={brickColors[6]}/>
          <!-- Row 3: 3 bricks -->
          <rect x={bx + 1.5} y={by + rowH * 2 + 1.5} width={bw * 0.33 - 3} height={rowH - 3} rx="2" fill={brickColors[7]}/>
          <rect x={bx + bw * 0.33 + 1.5} y={by + rowH * 2 + 1.5} width={bw * 0.34 - 3} height={rowH - 3} rx="2" fill={brickColors[8]}/>
          <rect x={bx + bw * 0.67 + 1.5} y={by + rowH * 2 + 1.5} width={bw * 0.33 - 3} height={rowH - 3} rx="2" fill={brickColors[0]}/>
          <!-- Outer border -->
          <rect x={bx} y={by} width={bw} height={bh} rx="4" fill="none" stroke="#6b5740" stroke-width="1.5"/>
        </g>
      {:else}
        <image
          href="/pieces/{color}{piece}.svg"
          x={fx * SQUARE_SIZE + 5}
          y={fy * SQUARE_SIZE + 5}
          width={SQUARE_SIZE - 10}
          height={SQUARE_SIZE - 10}
          class="no-pointer"
          style={slideStyle}
        />
      {/if}
    {/if}
  {/each}

  <!-- Stars on top of target pieces -->
  {#each targets as sq}
    {#if !reachedTargets.includes(sq) && board.pieces.has(sq)}
      {@const [fx, fy] = sqToXY(sq)}
      <text
        x={fx * SQUARE_SIZE + SQUARE_SIZE / 2}
        y={fy * SQUARE_SIZE + SQUARE_SIZE / 2 + 18}
        font-size="70"
        text-anchor="middle"
        fill="#f5c518"
        stroke="#8b6914"
        stroke-width="2"
        class="no-pointer label"
        style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
      >&#9733;</text>
    {/if}
  {/each}

  <!-- Arrows -->
  {#if arrows}
    {#each arrows as arrow, i}
      {@const a = getArrowPath(arrow)}
      <g class="no-pointer" opacity="0.75">
        <line
          x1={a.x1} y1={a.y1} x2={a.sx} y2={a.sy}
          stroke={a.color}
          stroke-width={a.shaftW}
          stroke-linecap="round"
        />
        <polygon
          points="{a.x2},{a.y2} {a.sx + a.px * a.hw},{a.sy + a.py * a.hw} {a.sx - a.px * a.hw},{a.sy - a.py * a.hw}"
          fill={a.color}
        />
      </g>
    {/each}
  {/if}

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
    width: 100%;
    max-width: min(90vw, calc(90vh - 8rem));
    aspect-ratio: 1;
    touch-action: none;
  }
  .square {
    cursor: pointer;
  }
  .no-pointer {
    pointer-events: none;
  }
  .label {
    user-select: none;
  }
</style>
