<script lang="ts">
  import { type BoardState, FILES, RANKS, type SquareId, type PieceKind, type PieceColor, squareToCoords } from '$lib/logic/types';
  import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';
  import type { Arrow } from '$lib/logic/pgn';

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
    dangerSquares?: SquareId[];
    safeSquares?: SquareId[];
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
    dangerSquares,
    safeSquares,
  }: Props = $props();

  let svgEl = $state<SVGSVGElement | undefined>(undefined);
  let drag = $state<DragState | null>(null);

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
    const file = Math.floor(x / SQUARE_SIZE);
    const rank = Math.floor(y / SQUARE_SIZE);
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return `${FILES[file]}${RANKS[rank]}` as SquareId;
  }

  function handlePointerDown(e: PointerEvent, sq: SquareId) {
    if (readOnly) return;
    const p = board.pieces.get(sq);
    if (!p) return;
    const canPlay = playableColors ? playableColors.includes(p.color) : p.color === 'w';
    if (!canPlay || (draggablePiece && p.piece !== draggablePiece)) return;
    const svgPt = pointerToSvg(e);
    if (!svgPt) return;

    (e.target as Element).setPointerCapture(e.pointerId);
    drag = { from: sq, piece: p.piece, color: p.color, x: svgPt.x, y: svgPt.y };
    onDragStart(sq);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!drag) return;
    const svgPt = pointerToSvg(e);
    if (!svgPt) return;
    drag = { ...drag, x: svgPt.x, y: svgPt.y };
  }

  function handlePointerUp(e: PointerEvent) {
    if (!drag) return;
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
  }

  function handleSquareClick(sq: SquareId) {
    if (!drag) onSquareClick(sq);
  }

  function getSlideStyle(sq: SquareId, piece: PieceKind): string | undefined {
    if (readOnly) return undefined;

    const [fx, fy] = squareToCoords(sq);

    // En passant pawn slide
    if (pawnSlide && sq === pawnSlide.to && piece === 'P') {
      const [fromFx, fromFy] = squareToCoords(pawnSlide.from);
      const dx = (fromFx - fx) * SQUARE_SIZE;
      const dy = (fromFy - fy) * SQUARE_SIZE;
      return `--slide-x: ${dx}px; --slide-y: ${dy}px; animation: pawn-slide 0.4s ease-out 0.3s backwards;`;
    }

    // Opponent response slide
    if (opponentSlide && sq === opponentSlide.to) {
      const [fromFx, fromFy] = squareToCoords(opponentSlide.from);
      const dx = (fromFx - fx) * SQUARE_SIZE;
      const dy = (fromFy - fy) * SQUARE_SIZE;
      return `--slide-x: ${dx}px; --slide-y: ${dy}px; animation: pawn-slide 0.4s ease-out forwards;`;
    }

    return undefined;
  }

  function getArrowPath(arrow: Arrow) {
    const [fx, fy] = squareToCoords(arrow.from);
    const [tx, ty] = squareToCoords(arrow.to);
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
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
>
  <!-- Squares -->
  {#each RANKS as rank, ri}
    {#each FILES as file, fi}
      {@const sq = `${file}${rank}` as SquareId}
      {@const isLight = (fi + ri) % 2 === 0}
      {@const isSelected = sq === selectedSquare || (drag !== null && sq === drag.from)}
      {@const isTarget = targets.includes(sq) && !reachedTargets.includes(sq)}
      {@const isReached = reachedTargets.includes(sq)}
      {@const hasOccupant = board.pieces.has(sq)}
      {@const isPawnSlideSquare = pawnSlide && (sq === pawnSlide.from || sq === pawnSlide.to)}
      {@const isWrongMove = sq === wrongMoveSquare}
      {@const isDanger = dangerSquares?.includes(sq)}
      {@const fill = isWrongMove ? WRONG_MOVE_COLOR : isSelected ? SELECTED_COLOR : isPawnSlideSquare ? LAST_MOVE_COLOR : isLight ? LIGHT : DARK}
      <g
        onclick={() => handleSquareClick(sq)}
        onkeydown={() => {}}
        onpointerdown={(e) => handlePointerDown(e, sq)}
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
        {#if isDanger}
          <rect
            x={fi * SQUARE_SIZE}
            y={ri * SQUARE_SIZE}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            fill="rgba(220, 38, 38, 0.35)"
            class="no-pointer"
          />
        {/if}
        {#if safeSquares?.includes(sq)}
          <rect
            x={fi * SQUARE_SIZE}
            y={ri * SQUARE_SIZE}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            fill="rgba(34, 197, 94, 0.35)"
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
    {@const [fx, fy] = squareToCoords(sq)}
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
      {@const [fx, fy] = squareToCoords(sq)}
      {@const slideStyle = getSlideStyle(sq, piece)}
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
  {/each}

  <!-- Stars on top of target pieces -->
  {#each targets as sq}
    {#if !reachedTargets.includes(sq) && board.pieces.has(sq)}
      {@const [fx, fy] = squareToCoords(sq)}
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
