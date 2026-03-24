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
    description: string;
    instruction: string;
    icon: string;
    piecesToPlace: { piece: PieceKind; square: SquareId }[];
  }

  export const SETUP_STAGES: SetupStage[] = [
    { slug: 'rooks', label: 'Rooks', description: 'Place the two rooks on their starting squares.', instruction: 'Place the white rooks!', icon: '/pieces/wR.svg', piecesToPlace: WHITE_PIECES.filter(p => p.piece === 'R') },
    { slug: 'knights', label: 'Knights', description: 'Place the two knights on their starting squares.', instruction: 'Place the white knights!', icon: '/pieces/wN.svg', piecesToPlace: WHITE_PIECES.filter(p => p.piece === 'N') },
    { slug: 'bishops', label: 'Bishops', description: 'Place the two bishops on their starting squares.', instruction: 'Place the white bishops!', icon: '/pieces/wB.svg', piecesToPlace: WHITE_PIECES.filter(p => p.piece === 'B') },
    { slug: 'king', label: 'King', description: 'Place the king on its starting square.', instruction: 'Place the white king!', icon: '/pieces/wK.svg', piecesToPlace: WHITE_PIECES.filter(p => p.piece === 'K') },
    { slug: 'queen', label: 'Queen', description: 'Place the queen on its starting square.', instruction: 'Place the white queen!', icon: '/pieces/wQ.svg', piecesToPlace: WHITE_PIECES.filter(p => p.piece === 'Q') },
    { slug: 'pawns', label: 'Pawns', description: 'Place all eight pawns on the second rank.', instruction: 'Place all the white pawns!', icon: '/pieces/wP.svg', piecesToPlace: WHITE_PIECES.filter(p => p.piece === 'P') },
    { slug: 'full', label: 'Full Setup', description: 'Set up all 16 white pieces from scratch.', instruction: 'Set up all the white pieces!', icon: '/pieces/wK.svg', piecesToPlace: [...WHITE_PIECES] },
  ];
</script>

<script lang="ts">
  import { onMount } from 'svelte';
  import { type BoardState, type PieceColor, RANKS } from '$lib/logic/types';
  import Board from '$lib/components/board/Board.svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { playSound } from '$lib/state/sound';

  function mistakesToStars(m: number): number {
    if (m === 0) return 3;
    if (m <= 2) return 2;
    return 1;
  }

  const noop = () => {};

  type Phase = 'idle' | 'playing' | 'done';

  interface TrayDrag {
    piece: PieceKind;
    x: number;
    y: number;
  }

  interface Props {
    /** If provided, play only this single stage (not sequential). */
    stageSlug?: string;
    /** Label for the "next" button on done screen in single-stage mode. */
    nextLabel?: string;
    /** URL for the "next" button on done screen in single-stage mode. */
    nextHref?: string;
  }

  let { stageSlug, nextLabel, nextHref }: Props = $props();

  let singleStageIndex = $derived(stageSlug ? SETUP_STAGES.findIndex(s => s.slug === stageSlug) : -1);
  let isSingleStage = $derived(singleStageIndex >= 0);
  let stages = $derived(isSingleStage ? [SETUP_STAGES[singleStageIndex]] : SETUP_STAGES);

  let phase = $state<Phase>('idle');
  let stageIndex = $state(0);
  let placed = $state<Set<SquareId>>(new Set());
  let mistakes = $state(0);
  let wrongSquare = $state<SquareId | null>(null);
  let selectedPiece = $state<PieceKind | null>(null);
  let bestStars = $state(0);
  let trayDrag = $state<TrayDrag | null>(null);
  let boardEl = $state<HTMLDivElement | undefined>(undefined);

  let storageKey = $derived(isSingleStage
    ? `setup-${stageSlug}-best-stars`
    : 'setup-best-stars');

  onMount(() => {
    bestStars = parseInt(localStorage.getItem(storageKey) ?? '0', 10);
  });

  let stage = $derived(stages[stageIndex]);

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
    const rect = svg.getBoundingClientRect();
    const fx = Math.floor((clientX - rect.left) / rect.width * 8);
    const fy = Math.floor((clientY - rect.top) / rect.height * 8);
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
      if (stageIndex < stages.length - 1) {
        setTimeout(() => {
          stageIndex += 1;
          placed = new Set();
          selectedPiece = null;
        }, 600);
      } else {
        setTimeout(() => {
          const stars = mistakesToStars(mistakes);
          const prev = parseInt(localStorage.getItem(storageKey) ?? '0', 10);
          if (stars > prev) {
            localStorage.setItem(storageKey, stars.toString());
            bestStars = stars;
          }
          phase = 'done';
          playSound('stars');
        }, 600);
      }
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

  function startGame() {
    phase = 'playing';
    stageIndex = 0;
    placed = new Set();
    mistakes = 0;
    selectedPiece = null;
    trayDrag = null;
  }

  let doneStars = $derived(mistakesToStars(mistakes));
</script>

{#if phase === 'idle'}
  <!-- Idle screen -->
  <div class="screen">
    <div class="screen-text">
      <h2>Place the Pieces</h2>
      <p class="muted">Put each piece on its starting square.</p>
      {#if !isSingleStage}
        <p class="faint small">7 stages — from individual pieces to the full setup!</p>
      {/if}
    </div>
    {#if bestStars > 0}
      <div class="best-row">
        <span class="faint small">Best:</span>
        <StarRating stars={bestStars} size="sm" />
      </div>
    {/if}
    <button class="start-btn" onclick={startGame}>Start</button>
  </div>
{:else if phase === 'done'}
  <!-- Done screen -->
  <div class="screen">
    <div class="screen-text">
      <div class="tada">&#127881;</div>
      <h2>Board Complete!</h2>
      <p class="muted">
        {mistakes === 0
          ? 'Perfect — no mistakes!'
          : `${mistakes} mistake${mistakes === 1 ? '' : 's'}`}
      </p>
    </div>
    <StarRating stars={doneStars} size="lg" />
    <div class="btn-row">
      <button class="btn-secondary" onclick={startGame}>Play Again</button>
      <a href={nextHref ?? '/play?level=random'} class="btn-primary">
        {nextLabel ?? (isSingleStage ? 'Back to Stages' : 'Play a Game!')}
      </a>
    </div>
  </div>
{:else}
  <!-- Playing -->
  <div
    class="playing-container"
    role="application"
    aria-label="Piece placement area"
    tabindex="-1"
    onpointermove={handleContainerPointerMove}
    onpointerup={handleContainerPointerUp}
  >
    <!-- Stage info -->
    <div class="stage-info">
      {#if !isSingleStage}
        <div class="faint stage-count">
          Stage {stageIndex + 1} of {stages.length}
        </div>
      {/if}
      <h2 class="stage-title">{stage.instruction}</h2>
      <p class="faint small">
        {#if mistakes > 0}{mistakes} mistake{mistakes === 1 ? '' : 's'} &middot; {/if}
        {placed.size}/{stage.piecesToPlace.length} placed
      </p>
    </div>

    <!-- Board + Tray side by side -->
    <div class="board-tray-row">
      <!-- Board -->
      <div bind:this={boardEl} class="board-wrapper">
        <Board
          {board}
          selectedSquare={null}
          validMoves={[]}
          targets={[]}
          reachedTargets={[]}
          dragValidMoves={[]}
          onSquareClick={handleSquareClick}
          onDrop={noop as (from: SquareId, to: SquareId) => void}
          onDragStart={noop as (sq: SquareId) => void}
          onDragEnd={noop}
          wrongMoveSquare={wrongSquare}
          readOnly
        />
      </div>

      <!-- Piece tray -->
      <div class="tray">
        <div class="tray-label">
          {isSingleType ? 'Click or drag' : 'Pick & place'}
        </div>
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
    </div>

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
  /* ── Screens (idle / done) ─── */
  .screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 1rem;
    max-width: 42rem;
    margin: 0 auto;
  }
  .screen-text {
    text-align: center;
  }
  .screen-text h2 {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  .muted { color: var(--text-muted); }
  .faint { color: var(--text-faint); }
  .small { font-size: 0.875rem; }
  .tada { font-size: 3rem; margin-bottom: 0.75rem; }

  .best-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .start-btn {
    padding: 0.75rem 2rem;
    border-radius: 0.75rem;
    background: #16a34a;
    color: white;
    font-weight: bold;
    font-size: 1.125rem;
    border: none;
    cursor: pointer;
    transition: background 0.15s;
  }
  .start-btn:hover { background: #15803d; }

  .btn-row {
    display: flex;
    gap: 0.75rem;
  }
  .btn-secondary {
    padding: 0.5rem 1.5rem;
    border-radius: 0.5rem;
    background: var(--btn-bg);
    color: var(--foreground);
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-secondary:hover { background: var(--btn-hover); }
  .btn-primary {
    padding: 0.5rem 1.5rem;
    border-radius: 0.5rem;
    background: #16a34a;
    color: white;
    font-weight: 500;
    transition: background 0.15s;
  }
  .btn-primary:hover { background: #15803d; }

  /* ── Playing ─── */
  .playing-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    max-width: 48rem;
    margin: 0 auto;
  }
  .stage-info {
    text-align: center;
  }
  .stage-count {
    font-size: 0.75rem;
    margin-bottom: 0.25rem;
  }
  .stage-title {
    font-size: 1.25rem;
    font-weight: bold;
  }

  /* Board + Tray row */
  .board-tray-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
  }
  @media (min-width: 640px) {
    .board-tray-row {
      flex-direction: row;
      align-items: flex-start;
    }
  }
  .board-wrapper {
    flex: 1;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  /* Piece tray */
  .tray {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }
  @media (min-width: 640px) {
    .tray {
      flex-direction: column;
      justify-content: flex-start;
      padding-top: 0.5rem;
      min-width: 7.5rem;
    }
  }
  .tray-label {
    font-size: 0.75rem;
    color: var(--text-faint);
    text-align: center;
    display: none;
  }
  @media (min-width: 640px) {
    .tray-label { display: block; }
  }
  .tray-grid {
    display: flex;
    gap: 0.375rem;
  }
  @media (min-width: 640px) {
    .tray-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.375rem;
    }
  }
  .tray-piece {
    width: 3rem;
    height: 3rem;
    border-radius: 0.5rem;
    border: 2px solid var(--card-border);
    background: var(--card-bg);
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
    border-color: rgba(240, 230, 204, 0.3);
  }
  .tray-piece.selected {
    border-color: #facc15;
    background: rgba(250, 204, 21, 0.2);
  }
  .tray-img {
    width: 100%;
    height: 100%;
    pointer-events: none;
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
