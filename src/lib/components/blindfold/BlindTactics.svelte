<script lang="ts">
  import { onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { parseFen, createBoardState } from '$lib/logic/types';
  import { isCheckmate, getLegalMoves } from '$lib/logic/attacks';
  import type { BoardState, SquareId, PieceKind, PieceColor } from '$lib/logic/types';

  const noop = () => {};
  const noopSq = noop as (sq: SquareId) => void;
  const noopDrop = noop as (from: SquareId, to: SquareId) => void;

  // Curated mate-in-1 positions where white delivers checkmate
  const PUZZLES = [
    { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1', answer: 'f7' },
    { fen: 'rnbqkbnr/ppppp2p/6p1/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 1', answer: 'e8' },
    { fen: 'r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQR1K1 w kq - 0 1', answer: 'd5' },
    { fen: 'rnbqk2r/pppp1Bpp/5n2/2b1p3/4P3/8/PPPP1PPP/RNBQK1NR w KQkq - 0 1', answer: 'f7' },
    { fen: 'r2qk2r/ppp2ppp/2np1n2/2b1p1B1/2B1P1b1/3P1N2/PPP2PPP/RN1Q1RK1 w kq - 0 1', answer: 'f7' },
    { fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1', answer: 'f7' },
    { fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 1', answer: 'e1' },
    { fen: 'r1bqk2r/ppppbppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 1', answer: 'c6' },
  ];

  interface DelayedMove {
    from: SquareId;
    to: SquareId;
    piece: PieceKind;
    color: PieceColor;
  }

  function applyMove(board: BoardState, from: SquareId, to: SquareId): BoardState {
    const newPieces = new Map(board.pieces);
    const piece = newPieces.get(from);
    if (!piece) return board;
    newPieces.delete(from);
    newPieces.set(to, piece);
    return { pieces: newPieces };
  }

  const SHOW_TIME = 5000;

  type Phase = 'idle' | 'sighted' | 'blind' | 'solved' | 'wrong';

  let phase = $state<Phase>('idle');
  let puzzleIdx = $state(0);
  let delayMoves = $state(0);
  let originalBoard = $state<BoardState | null>(null);
  let currentBoard = $state<BoardState | null>(null);
  let answer = $state('');
  let delayedMoves = $state<DelayedMove[]>([]);
  let correct = $state(0);
  let total = $state(0);
  let bestStars = $state(0);
  let selectedSquare = $state<SquareId | null>(null);

  let showTimerRef: ReturnType<typeof setTimeout> | null = null;

  let puzzle = $derived(PUZZLES[puzzleIdx % PUZZLES.length]);
  let emptyBoard = $derived(createBoardState([]));

  let validMoves = $derived.by(() => {
    if (!selectedSquare || !currentBoard) return [];
    const p = currentBoard.pieces.get(selectedSquare);
    if (!p || p.color !== 'w') return [];
    return getLegalMoves(selectedSquare, currentBoard, 'w');
  });

  onMount(() => {
    bestStars = parseInt(localStorage.getItem('blindfold-blindtactics-best-stars') ?? '0', 10);

    return () => {
      if (showTimerRef) clearTimeout(showTimerRef);
    };
  });

  function startPuzzle() {
    const p = PUZZLES[puzzleIdx % PUZZLES.length];
    const { placements } = parseFen(p.fen);
    const board = createBoardState(placements);
    originalBoard = board;
    answer = p.answer;

    // Apply delayed moves
    let b = board;
    const moves: DelayedMove[] = [];
    let turn: PieceColor = 'b';

    for (let i = 0; i < delayMoves; i++) {
      const allMoves: { from: SquareId; to: SquareId; piece: PieceKind; color: PieceColor }[] = [];
      for (const [sq, pc] of b.pieces) {
        if (pc.color !== turn) continue;
        const legal = getLegalMoves(sq as SquareId, b, turn);
        for (const target of legal) {
          allMoves.push({ from: sq as SquareId, to: target, piece: pc.piece, color: pc.color });
        }
      }
      if (allMoves.length === 0) break;
      const move = allMoves[Math.floor(Math.random() * allMoves.length)];
      b = applyMove(b, move.from, move.to);
      moves.push(move);
      turn = turn === 'w' ? 'b' : 'w';
    }

    currentBoard = b;
    delayedMoves = moves;
    selectedSquare = null;
    phase = 'sighted';

    showTimerRef = setTimeout(() => {
      phase = 'blind';
    }, SHOW_TIME);
  }

  function startGame() {
    puzzleIdx = 0;
    correct = 0;
    total = 0;
    startPuzzle();
  }

  function handleSquareClick(sq: SquareId) {
    if (phase !== 'blind' || !currentBoard) return;

    if (!selectedSquare) {
      const p = currentBoard.pieces.get(sq);
      if (p && p.color === 'w') selectedSquare = sq;
      return;
    }

    if (sq === selectedSquare) {
      selectedSquare = null;
      return;
    }

    const moves = getLegalMoves(selectedSquare, currentBoard, 'w');
    if (!moves.includes(sq)) {
      const p = currentBoard.pieces.get(sq);
      if (p && p.color === 'w') selectedSquare = sq;
      else selectedSquare = null;
      return;
    }

    // Make the move
    const newBoard = applyMove(currentBoard, selectedSquare, sq);
    selectedSquare = null;

    if (isCheckmate('b', newBoard)) {
      correct += 1;
      total += 1;
      currentBoard = newBoard;
      phase = 'solved';
    } else {
      total += 1;
      currentBoard = newBoard;
      phase = 'wrong';
    }
  }

  function nextPuzzle() {
    if (puzzleIdx + 1 >= PUZZLES.length) {
      const pct = total > 0 ? correct / total : 0;
      const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;
      if (stars > bestStars) {
        localStorage.setItem('blindfold-blindtactics-best-stars', String(stars));
        bestStars = stars;
      }
      phase = 'idle';
      return;
    }
    puzzleIdx += 1;
    startPuzzle();
  }
</script>

<div class="trainer">
  {#if phase === 'idle'}
    <div class="center-panel">
      <h2 class="title">Blind Tactics</h2>
      <p class="instructions">
        See a position, then it disappears. Find the checkmate blindfolded!
        With delay moves, extra moves play before the board hides.
      </p>
      <div class="delay-row">
        <span class="delay-label">Delay moves:</span>
        {#each [0, 1, 2] as n}
          <button
            onclick={() => { delayMoves = n; }}
            class={['delay-btn', delayMoves === n && 'delay-active']}
          >
            {n}
          </button>
        {/each}
      </div>
      {#if bestStars > 0}
        <div class="best"><StarRating stars={bestStars} size="sm" /></div>
      {/if}
      <button class="btn-start" onclick={startGame}>
        Start
      </button>
    </div>

  {:else if phase === 'sighted' && originalBoard}
    <div class="center-panel">
      <div class="info-text">Puzzle {puzzleIdx + 1}/{PUZZLES.length} &mdash; Memorize!</div>
      <div class="board-container">
        <Board board={originalBoard} readOnly selectedSquare={null} validMoves={[]} targets={[]} reachedTargets={[]} dragValidMoves={[]} onSquareClick={noopSq} onDrop={noopDrop} onDragStart={noopSq} onDragEnd={noop} />
      </div>
      {#if delayedMoves.length > 0}
        <div class="info-text">
          Then: {delayedMoves.map((m) => `${m.piece}${m.to}`).join(', ')}
        </div>
      {/if}
      <div class="pulse-text">Studying...</div>
    </div>

  {:else if (phase === 'solved' || phase === 'wrong') && currentBoard}
    <div class="center-panel">
      <p class={['result-text', phase === 'solved' && 'result-correct', phase === 'wrong' && 'result-wrong']}>
        {phase === 'solved' ? 'Checkmate!' : 'Not checkmate \u2014 try to remember the position!'}
      </p>
      <div class="info-text">{correct}/{total} correct</div>
      <div class="board-container">
        <Board board={currentBoard} readOnly selectedSquare={null} validMoves={[]} targets={[]} reachedTargets={[]} dragValidMoves={[]} onSquareClick={noopSq} onDrop={noopDrop} onDragStart={noopSq} onDragEnd={noop} />
      </div>
      <button class="btn-action" onclick={nextPuzzle}>
        {puzzleIdx + 1 >= PUZZLES.length ? 'See Results' : 'Next'}
      </button>
    </div>

  {:else}
    <!-- blind phase -->
    <div class="center-panel">
      <div class="info-text">Puzzle {puzzleIdx + 1}/{PUZZLES.length} &mdash; Find the mate!</div>
      <p class="instructions">The board is hidden. Click squares to make your move.</p>
      <div class="board-container">
        <Board
          board={emptyBoard}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          targets={[]}
          reachedTargets={[]}
          dragValidMoves={[]}
          onSquareClick={handleSquareClick}
          onDrop={noopDrop}
          onDragStart={noopSq}
          onDragEnd={noop}
        />
      </div>
      <div class="info-small">{correct}/{total} correct so far</div>
    </div>
  {/if}
</div>

<style>
  .trainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .center-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 28rem;
    width: 100%;
    text-align: center;
  }

  .title {
    font-size: 1.25rem;
    font-weight: bold;
  }

  .instructions {
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .delay-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .delay-label {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .delay-btn {
    padding: 0.25rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid var(--card-border);
    background: transparent;
    color: var(--text-faint);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .delay-btn:hover {
    color: var(--foreground);
  }

  .delay-active {
    background: rgba(255, 248, 230, 0.15);
    color: var(--foreground);
    border-color: transparent;
  }

  .best {
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .btn-start {
    padding: 0.75rem 2rem;
    font-size: 1.125rem;
    font-weight: bold;
    border: none;
    border-radius: 0.5rem;
    background: rgba(255, 248, 230, 0.15);
    color: var(--foreground);
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-start:hover {
    background: rgba(255, 248, 230, 0.25);
  }

  .board-container {
    width: 100%;
    max-width: 320px;
  }

  .info-text {
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .info-small {
    font-size: 0.75rem;
    color: var(--text-faint);
  }

  .pulse-text {
    font-size: 0.875rem;
    color: var(--text-muted);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .result-text {
    font-size: 1.25rem;
    font-weight: bold;
  }

  .result-correct {
    color: #4ade80;
  }

  .result-wrong {
    color: #f87171;
  }

  .btn-action {
    padding: 0.5rem 1.5rem;
    border: none;
    border-radius: 0.5rem;
    background: rgba(255, 248, 230, 0.15);
    color: var(--foreground);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-action:hover {
    background: rgba(255, 248, 230, 0.25);
  }
</style>
