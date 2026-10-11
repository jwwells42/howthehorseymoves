<script lang="ts" module>
  import type { PieceKind, SquareId } from '$lib/logic/types';
  import { FILES } from '$lib/logic/types';

  /* ── Starting position data ─────────────────────────────── */

  const WHITE_PIECES: { piece: PieceKind; square: SquareId }[] = [
    { piece: 'R', square: 'a1' }, { piece: 'N', square: 'b1' },
    { piece: 'B', square: 'c1' }, { piece: 'Q', square: 'd1' },
    { piece: 'K', square: 'e1' }, { piece: 'B', square: 'f1' },
    { piece: 'N', square: 'g1' }, { piece: 'R', square: 'h1' },
    ...FILES.map(f => ({ piece: 'P' as PieceKind, square: `${f}2` as SquareId })),
  ];

  const BLACK_PIECES: { piece: PieceKind; square: SquareId }[] = [
    { piece: 'R', square: 'a8' }, { piece: 'N', square: 'b8' },
    { piece: 'B', square: 'c8' }, { piece: 'Q', square: 'd8' },
    { piece: 'K', square: 'e8' }, { piece: 'B', square: 'f8' },
    { piece: 'N', square: 'g8' }, { piece: 'R', square: 'h8' },
    ...FILES.map(f => ({ piece: 'P' as PieceKind, square: `${f}7` as SquareId })),
  ];

  /* ── Stages ──────────────────────────────────────────────── */

  export interface SetupStage {
    slug: string;
    label: string;
    icon: string;
    piecesToPlace: { piece: PieceKind; square: SquareId }[];
  }

  export const SETUP_STAGES: SetupStage[] = [
    { slug: 'rooks', label: 'Rooks', icon: '/pieces/wR.svg', piecesToPlace: WHITE_PIECES.filter(p => p.piece === 'R') },
    { slug: 'knights', label: 'Knights', icon: '/pieces/wN.svg', piecesToPlace: WHITE_PIECES.filter(p => p.piece === 'N') },
    { slug: 'bishops', label: 'Bishops', icon: '/pieces/wB.svg', piecesToPlace: WHITE_PIECES.filter(p => p.piece === 'B') },
    { slug: 'king', label: 'King', icon: '/pieces/wK.svg', piecesToPlace: WHITE_PIECES.filter(p => p.piece === 'K') },
    { slug: 'queen', label: 'Queen', icon: '/pieces/wQ.svg', piecesToPlace: WHITE_PIECES.filter(p => p.piece === 'Q') },
    { slug: 'pawns', label: 'Pawns', icon: '/pieces/wP.svg', piecesToPlace: WHITE_PIECES.filter(p => p.piece === 'P') },
    { slug: 'full', label: 'Full Setup', icon: '/pieces/wK.svg', piecesToPlace: [...WHITE_PIECES] },
  ];
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { stopFromUrl, withStop } from '$lib/curriculum';
  import FinishActions from '$lib/components/curriculum/FinishActions.svelte';
  import { type BoardState, type PieceColor, RANKS } from '$lib/logic/types';
  import Board from '$lib/components/board/Board.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import { playSound } from '$lib/state/sound';

  function mistakesToStars(m: number): number {
    if (m === 0) return 3;
    if (m <= 2) return 2;
    return 1;
  }

  interface TrayDrag {
    piece: PieceKind;
    x: number;
    y: number;
  }

  interface Props {
    stageSlug: string;
  }

  let { stageSlug }: Props = $props();

  let stageIndex = $derived(SETUP_STAGES.findIndex(s => s.slug === stageSlug));
  let stage = $derived(stageIndex >= 0 ? SETUP_STAGES[stageIndex] : SETUP_STAGES[0]);

  let phase = $state<'playing' | 'done'>('playing');
  let placed = $state<Set<SquareId>>(new Set());
  let mistakes = $state(0);
  let wrongSquare = $state<SquareId | null>(null);
  let selectedPiece = $state<PieceKind | null>(null);
  let trayDrag = $state<TrayDrag | null>(null);
  let boardEl = $state<HTMLDivElement | undefined>(undefined);

  // Per-stage stars from localStorage
  let allStageStars = $state<Record<string, number>>({});

  onMount(() => {
    const stars: Record<string, number> = {};
    for (const s of SETUP_STAGES) {
      stars[s.slug] = parseInt(
        localStorage.getItem(`setup-${s.slug}-best-stars`) ?? '0',
        10
      );
    }
    allStageStars = stars;
  });

  // Reset state when stage changes via URL
  $effect(() => {
    // Read stageSlug to track it
    void stageSlug;
    phase = 'playing';
    placed = new Set();
    mistakes = 0;
    selectedPiece = null;
    wrongSquare = null;
    trayDrag = null;
  });

  // Check if this stage has only one piece type
  let pieceTypes = $derived.by(() => {
    if (!stage) return [];
    const types = new Set(stage.piecesToPlace.map(p => p.piece));
    return Array.from(types);
  });
  let isSingleType = $derived(pieceTypes.length === 1);

  // Auto-select for single-type stages
  $effect(() => {
    if (phase === 'playing' && isSingleType) {
      selectedPiece = pieceTypes[0];
    }
  });

  // Remaining pieces for tray
  let remaining = $derived.by(() => {
    if (!stage) return [];
    return stage.piecesToPlace.filter(p => !placed.has(p.square));
  });

  // Build current board state
  let board: BoardState = $derived.by(() => {
    const pieces = new Map<SquareId, { piece: PieceKind; color: PieceColor }>();
    for (const p of BLACK_PIECES) {
      pieces.set(p.square, { piece: p.piece, color: 'b' });
    }
    if (stage) {
      const toPlaceSquares = new Set(stage.piecesToPlace.map(p => p.square));
      for (const p of WHITE_PIECES) {
        if (!toPlaceSquares.has(p.square)) {
          pieces.set(p.square, { piece: p.piece, color: 'w' });
        }
      }
      for (const sq of placed) {
        const target = stage.piecesToPlace.find(p => p.square === sq);
        if (target) {
          pieces.set(sq, { piece: target.piece, color: 'w' });
        }
      }
    }
    return { pieces };
  });

  let hasBackRankRemaining = $derived(remaining.some(p => p.piece !== 'P'));
  let hasPawnRemaining = $derived(remaining.some(p => p.piece === 'P'));
  let backRankRemaining = $derived(remaining.filter(p => p.piece !== 'P'));
  let pawnRemaining = $derived(remaining.filter(p => p.piece === 'P'));

  // Convert client coordinates to board square
  function clientToSquare(clientX: number, clientY: number): SquareId | null {
    const svg = boardEl?.querySelector('svg');
    if (!svg) return null;
    // When height is short the svg box is wider than the board, which is
    // drawn square in the middle of it.
    const rect = svg.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    const left = rect.left + (rect.width - size) / 2;
    const top = rect.top + (rect.height - size) / 2;
    const fx = Math.floor((clientX - left) / size * 8);
    const fy = Math.floor((clientY - top) / size * 8);
    if (fx < 0 || fx > 7 || fy < 0 || fy > 7) return null;
    return `${FILES[fx]}${RANKS[fy]}` as SquareId;
  }

  // Attempt to place a piece on a square
  function attemptPlacement(sq: SquareId, pieceType: PieceKind) {
    if (phase !== 'playing' || !stage) return;
    if (board.pieces.has(sq)) return;

    const target = stage.piecesToPlace.find(p => p.square === sq && !placed.has(sq));
    if (!target || target.piece !== pieceType) {
      mistakes += 1;
      wrongSquare = sq;
      playSound('wrong');
      setTimeout(() => { wrongSquare = null; }, 400);
      return;
    }

    // Correct placement
    const newPlaced = new Set(placed);
    newPlaced.add(sq);
    placed = newPlaced;
    playSound('correct');

    // Clear selection if no more of this type remain
    const remainingOfType = stage.piecesToPlace.filter(
      p => p.piece === pieceType && !newPlaced.has(p.square)
    );
    if (remainingOfType.length === 0 && !isSingleType) {
      selectedPiece = null;
    }

    // Stage complete?
    if (newPlaced.size === stage.piecesToPlace.length) {
      setTimeout(() => {
        const stars = mistakesToStars(mistakes);
        const key = `setup-${stage.slug}-best-stars`;
        const prev = parseInt(localStorage.getItem(key) ?? '0', 10);
        if (stars > prev) {
          localStorage.setItem(key, stars.toString());
        }
        allStageStars = { ...allStageStars, [stage.slug]: Math.max(stars, prev) };
        playSound('stars');

        // Advance to next stage or show done
        if (stageIndex < SETUP_STAGES.length - 1) {
          goto(withStop(`/setup/${SETUP_STAGES[stageIndex + 1].slug}`, pathStop));
        } else {
          phase = 'done';
        }
      }, 600);
    }
  }

  // Handle board square click
  function handleSquareClick(sq: SquareId) {
    if (!selectedPiece) return;
    attemptPlacement(sq, selectedPiece);
  }

  // Tray drag handlers
  function handleTrayPointerDown(e: PointerEvent, piece: PieceKind) {
    if (phase !== 'playing') return;
    (e.target as Element).setPointerCapture(e.pointerId);
    selectedPiece = piece;
    trayDrag = { piece, x: e.clientX, y: e.clientY };
  }

  function handleContainerPointerMove(e: PointerEvent) {
    if (!trayDrag) return;
    trayDrag = { ...trayDrag, x: e.clientX, y: e.clientY };
  }

  function handleContainerPointerUp(e: PointerEvent) {
    if (!trayDrag) return;
    const sq = clientToSquare(e.clientX, e.clientY);
    if (sq) {
      attemptPlacement(sq, trayDrag.piece);
    }
    trayDrag = null;
  }

  // Opened from the path: stage links pass the stop along
  let pathStop = $derived(stopFromUrl(page.url));

  function restart() {
    goto(withStop('/setup/rooks', pathStop));
  }

  let doneStars = $derived(mistakesToStars(mistakes));
</script>

{#if phase === 'done'}
  <div class="screen">
    <div class="screen-text">
      <div class="tada">&#127881;</div>
      {#if mistakes > 0}
        <p class="muted">{mistakes} mistake{mistakes === 1 ? '' : 's'}</p>
      {/if}
    </div>
    <StarRating stars={doneStars} size="lg" />
    <FinishActions label="Play Again" onclick={restart} />
  </div>
{:else}
  <div
    class="setup-layout"
    role="application"
    aria-label="Piece placement area"
    tabindex="-1"
    onpointermove={handleContainerPointerMove}
    onpointerup={handleContainerPointerUp}
  >
    <BoardLayout>
      {#snippet headerArea()}
        <div class="stage-info">
          <h2 class="stage-title">{stage.label}</h2>
          <p class="faint small">
            {#if mistakes > 0}{mistakes} mistake{mistakes === 1 ? '' : 's'} &middot; {/if}
            {placed.size}/{stage.piecesToPlace.length} placed
          </p>
        </div>
      {/snippet}

      {#snippet boardArea()}
        <div bind:this={boardEl} class="board-wrapper">
          <Board
            {board}
            playableColors={[]}
            onSquareClick={handleSquareClick}
            wrongMoveSquare={wrongSquare}
          />
        </div>
      {/snippet}

      {#snippet sidebarArea()}
        <!-- Piece tray -->
        <div class="tray">
          {#if hasBackRankRemaining}
            <div class="tray-grid">
              {#each backRankRemaining as p (p.square)}
                <button
                  class={['tray-piece', selectedPiece === p.piece && 'selected']}
                  onclick={() => { selectedPiece = p.piece; }}
                  onpointerdown={(e) => handleTrayPointerDown(e, p.piece)}
                >
                  <img src="/pieces/w{p.piece}.svg" alt={p.piece} class="tray-img" />
                </button>
              {/each}
            </div>
          {/if}
          {#if hasPawnRemaining}
            <div class="tray-grid">
              {#each pawnRemaining as p (p.square)}
                <button
                  class={['tray-piece', selectedPiece === p.piece && 'selected']}
                  onclick={() => { selectedPiece = p.piece; }}
                  onpointerdown={(e) => handleTrayPointerDown(e, p.piece)}
                >
                  <img src="/pieces/w{p.piece}.svg" alt={p.piece} class="tray-img" />
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Stage list -->
        <div class="stage-list">
          {#each SETUP_STAGES as s, idx}
            {@const stars = allStageStars[s.slug] ?? 0}
            {@const isCurrent = s.slug === stageSlug}
            <a
              href={withStop(`/setup/${s.slug}`, pathStop)}
              class={['stage-item', isCurrent && 'active']}
            >
              <span class="stage-num">{idx + 1}.</span>
              <img src={s.icon} alt={s.label} class="stage-icon" />
              <span class="stage-name">{s.label}</span>
              {#if stars > 0}
                <span class="stage-stars">
                  <StarRating {stars} size="sm" />
                </span>
              {/if}
            </a>
          {/each}
        </div>
      {/snippet}
    </BoardLayout>

    <!-- Drag ghost -->
    {#if trayDrag}
      <img
        src="/pieces/w{trayDrag.piece}.svg"
        alt=""
        class="drag-ghost"
        style="left: {trayDrag.x - 30}px; top: {trayDrag.y - 30}px;"
      />
    {/if}
  </div>
{/if}

<style>
  /* ── Done screen ─── */
  /* Where the board was */
  .screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 1rem;
    width: var(--board-size);
    max-width: 100%;
  }
  .screen-text {
    text-align: center;
  }
  .muted { color: var(--ink-muted); }
  .faint { color: var(--ink-muted); }
  .small { font-size: var(--size-secondary); }
  .tada { font-size: 3rem; margin-bottom: 0.75rem; }



  /* ── Layout: passes the page's height on to the BoardLayout ─── */
  .setup-layout {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }

  .stage-info {
    text-align: center;
    flex-shrink: 0;
  }
  .stage-title {
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
  }

  .board-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  /* Piece tray: a row under the board on a phone, four across in the
     sidebar */
  .tray {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }
  .tray-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.375rem;
  }
  @media (min-width: 900px) {
    .tray-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
    }
  }
  .tray-piece {
    width: 3rem;
    height: 3rem;
    border-radius: 0.5rem;
    border: 2px solid var(--line);
    background: var(--surface);
    cursor: pointer;
    touch-action: none;
    transition: border-color 0.15s, background 0.15s;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  @media (min-width: 640px) {
    .tray-piece {
      width: 3.5rem;
      height: 3.5rem;
    }
  }
  .tray-piece:hover {
    border-color: var(--ink-muted);
  }
  /* The chosen piece is the one to look at. */
  .tray-piece.selected {
    border-color: var(--highlight);
    background: var(--highlight-tint);
  }
  .tray-img {
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  /* ── Stage list ─── */
  .stage-list {
    width: 100%;
    border-radius: 0.5rem;
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .stage-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border-radius: 0.375rem;
    font-size: var(--size-secondary);
    transition: background 0.1s;
  }
  .stage-item:hover {
    background: var(--surface-raised);
  }
  .stage-item.active {
    background: var(--highlight-tint);
  }

  .stage-num {
    color: var(--ink-muted);
    font-size: var(--size-small);
    min-width: 1.25rem;
  }
  .stage-icon {
    width: 1.5rem;
    height: 1.5rem;
  }
  .stage-name {
    flex: 1;
  }
  .stage-stars {
    margin-left: auto;
  }

  /* Drag ghost */
  .drag-ghost {
    position: fixed;
    width: 60px;
    height: 60px;
    opacity: 0.8;
    z-index: 50;
    pointer-events: none;
  }
</style>
