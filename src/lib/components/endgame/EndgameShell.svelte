<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { playSound } from '$lib/state/sound';
  import {
    type BoardState,
    type SquareId,
    type PiecePlacement,
    createBoardState,
  } from '$lib/logic/types';
  import { getLegalMoves, getAllLegalMoves } from '$lib/logic/attacks';
  import { applyEndgameMove } from '$lib/logic/endgame';
  import { probeKPK, squareToIndex, KPK_BLACK, KPK_WHITE } from '$lib/logic/kpk-bitbase';
  import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';

  interface Props {
    title: string;
    instruction: string;
    placements: PiecePlacement[];
    onNext?: () => void;
  }

  let { title, instruction, placements, onNext }: Props = $props();

  /* ── KPK helpers ──────────────────────────────── */

  function findKPKPieces(
    board: BoardState,
  ): { wk: SquareId; bk: SquareId; wp: SquareId } | null {
    let wk: SquareId | undefined;
    let bk: SquareId | undefined;
    let wp: SquareId | undefined;
    for (const [sq, piece] of board.pieces) {
      if (piece.color === 'w' && piece.piece === 'K') wk = sq;
      else if (piece.color === 'b' && piece.piece === 'K') bk = sq;
      else if (piece.color === 'w' && piece.piece === 'P') wp = sq;
    }
    if (!wk || !bk || !wp) return null;
    return { wk, bk, wp };
  }

  function probeBoard(board: BoardState, stm: number): boolean | null {
    const pieces = findKPKPieces(board);
    if (!pieces) return null;
    return probeKPK(
      squareToIndex(pieces.wk),
      squareToIndex(pieces.bk),
      squareToIndex(pieces.wp),
      stm,
    );
  }

  /* ── State ────────────────────────────────────── */

  function buildBoard(): BoardState {
    return createBoardState(placements);
  }

  let board = $state<BoardState>(buildBoard());
  let selectedSquare = $state<SquareId | null>(null);
  let result = $state<'playing' | 'won'>('playing');
  let mistakes = $state(0);
  let feedback = $state<string | null>(null);
  let botSlide = $state<SlideAnimation | null>(null);
  let waitingForBot = $state(false);
  let dragFrom = $state<SquareId | null>(null);

  let validMoves = $derived.by(() => {
    if (!selectedSquare) return [];
    return getLegalMoves(selectedSquare, board, 'w');
  });

  let dragValidMoves = $derived.by(() => {
    if (!dragFrom) return [];
    return getLegalMoves(dragFrom, board, 'w');
  });

  let stars = $derived(mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1);

  let statusText = $derived.by(() => {
    if (result === 'won') return 'Pawn promoted \u2014 you win!';
    if (waitingForBot) return 'Opponent is thinking...';
    return instruction;
  });

  /* ── Bot move ─────────────────────────────────── */

  function makeBotMove(currentBoard: BoardState) {
    waitingForBot = true;

    setTimeout(() => {
      const moves = getAllLegalMoves('b', currentBoard);
      if (moves.length === 0) {
        waitingForBot = false;
        return;
      }

      // Bitbase-perfect defense: prefer moves that draw
      const drawing: typeof moves = [];
      const losing: typeof moves = [];

      for (const m of moves) {
        const nb = applyEndgameMove(currentBoard, m.from, m.to);
        const isWin = probeBoard(nb, KPK_WHITE);
        if (isWin === false) drawing.push(m);
        else losing.push(m);
      }

      const candidates = drawing.length > 0 ? drawing : losing;

      // Among candidates, prefer staying near the pawn and centralized
      let bestScore = -Infinity;
      let bestMoves: typeof moves = [];
      const wp = findPawnSquare(currentBoard);

      for (const m of candidates) {
        let score = 0;
        if (wp) {
          const dist = chebyshev(m.to, wp);
          score += (7 - dist) * 10;
        }
        const [x, y] = [m.to.charCodeAt(0) - 97, parseInt(m.to[1]) - 1];
        score += (4 - Math.max(Math.abs(x - 3.5), Math.abs(y - 3.5))) * 3;
        score += Math.random() * 2;

        if (score > bestScore) {
          bestScore = score;
          bestMoves = [m];
        } else if (Math.abs(score - bestScore) < 0.1) {
          bestMoves.push(m);
        }
      }

      const move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      const piece = currentBoard.pieces.get(move.from)!;
      const newPieces = new Map(currentBoard.pieces);
      newPieces.delete(move.from);
      newPieces.set(move.to, piece);

      botSlide = {
        piece: piece.piece,
        color: piece.color,
        from: move.from,
        to: move.to,
      };
      board = { pieces: newPieces };
      playSound('move');

      setTimeout(() => {
        botSlide = null;
        waitingForBot = false;
      }, 500);
    }, 400);
  }

  /** Find the white pawn square */
  function findPawnSquare(b: BoardState): SquareId | null {
    for (const [sq, p] of b.pieces) {
      if (p.color === 'w' && p.piece === 'P') return sq;
    }
    return null;
  }

  /** Chebyshev (king) distance between two squares */
  function chebyshev(a: SquareId, b: SquareId): number {
    return Math.max(
      Math.abs(a.charCodeAt(0) - b.charCodeAt(0)),
      Math.abs(parseInt(a[1]) - parseInt(b[1])),
    );
  }

  /* ── Execute player move ──────────────────────── */

  function executeMove(from: SquareId, to: SquareId) {
    const newPieces = new Map(board.pieces);
    const piece = newPieces.get(from)!;
    newPieces.delete(from);
    newPieces.set(to, piece);

    // Pawn promotion — win!
    if (piece.piece === 'P' && to[1] === '8') {
      newPieces.set(to, { piece: 'Q', color: 'w' });
      board = { pieces: newPieces };
      selectedSquare = null;
      result = 'won';
      feedback = null;
      playSound('stars');
      return;
    }

    const newBoard: BoardState = { pieces: newPieces };

    // Bitbase check: does this move maintain a win?
    const isWin = probeBoard(newBoard, KPK_BLACK);
    if (isWin === false) {
      mistakes += 1;
      feedback = 'That lets black draw \u2014 try again!';
      selectedSquare = null;
      playSound('wrong');
      return;
    }

    board = newBoard;
    selectedSquare = null;
    feedback = null;
    playSound('move');
    makeBotMove(newBoard);
  }

  /* ── Click handling ───────────────────────────── */

  function handleSquareClick(sq: SquareId) {
    if (result !== 'playing' || waitingForBot) return;

    if (!selectedSquare) {
      const p = board.pieces.get(sq);
      if (p && p.color === 'w') {
        selectedSquare = sq;
        feedback = null;
      }
      return;
    }

    if (sq === selectedSquare) {
      selectedSquare = null;
      return;
    }

    const target = board.pieces.get(sq);
    if (target && target.color === 'w') {
      selectedSquare = sq;
      return;
    }

    const legal = getLegalMoves(selectedSquare, board, 'w');
    if (!legal.includes(sq)) {
      selectedSquare = null;
      return;
    }

    executeMove(selectedSquare, sq);
  }

  /* ── Drag-and-drop handling ───────────────────── */

  function handleDrop(from: SquareId, to: SquareId) {
    if (result !== 'playing' || waitingForBot || from === to) return;
    const p = board.pieces.get(from);
    if (!p || p.color !== 'w') return;
    const legal = getLegalMoves(from, board, 'w');
    if (!legal.includes(to)) return;
    executeMove(from, to);
  }

  function onDragStart(sq: SquareId) {
    if (result !== 'playing' || waitingForBot) return;
    dragFrom = sq;
  }

  function onDragEnd() {
    dragFrom = null;
  }

  /* ── Reset ────────────────────────────────────── */

  function reset() {
    board = buildBoard();
    selectedSquare = null;
    result = 'playing';
    mistakes = 0;
    feedback = null;
    botSlide = null;
    waitingForBot = false;
    dragFrom = null;
  }
</script>

<BoardLayout>
  {#snippet boardArea()}
    <Board
      {board}
      {selectedSquare}
      {validMoves}
      targets={[]}
      reachedTargets={[]}
      {dragValidMoves}
      onSquareClick={handleSquareClick}
      onDrop={handleDrop}
      {onDragStart}
      {onDragEnd}
      opponentSlide={botSlide}
    />
  {/snippet}

  {#snippet sidebarArea()}
    <div class="header">
      <h2 class="title">{title}</h2>
      <p class="status">{statusText}</p>
    </div>

    {#if feedback && result === 'playing'}
      <p class="feedback">{feedback}</p>
    {/if}

    {#if result === 'won'}
      <div class="result">
        <StarRating {stars} size="lg" />
        <div class="result-buttons">
          <button class="play-again-btn secondary" onclick={reset}>
            Play Again
          </button>
          {#if onNext}
            <button class="play-again-btn" onclick={onNext}>
              Continue
            </button>
          {/if}
        </div>
      </div>
    {/if}
  {/snippet}
</BoardLayout>

<style>
  .header {
    text-align: center;
    flex-shrink: 0;
  }

  .title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
  }

  .status {
    color: #888;
    margin: 0;
  }

  .feedback {
    color: #f87171;
    font-size: 0.875rem;
    font-weight: 500;
    margin: 0;
    flex-shrink: 0;
  }

  .result {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    animation: fade-in 0.3s ease-out;
    flex-shrink: 0;
  }

  .result-buttons {
    display: flex;
    gap: 0.75rem;
  }

  .play-again-btn {
    padding: 0.5rem 1.5rem;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .play-again-btn:hover {
    background: #15803d;
  }

  .play-again-btn.secondary {
    background: var(--btn-bg, #2a2a2a);
    color: var(--foreground, white);
    border: 1px solid var(--card-border, #333);
  }
  .play-again-btn.secondary:hover {
    background: var(--btn-hover, #3a3a3a);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(0.5rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
