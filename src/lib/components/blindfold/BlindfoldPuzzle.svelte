<script lang="ts">
  import { saveBest, readNumber } from '$lib/state/storage';
  import { onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import FinishActions from '$lib/components/curriculum/FinishActions.svelte';
  import { parseFen, createBoardState } from '$lib/logic/types';
  import { isCheckmate, getLegalMoves } from '$lib/logic/attacks';
  import { playSound } from '$lib/state/sound';
  import type { BoardState, SquareId } from '$lib/logic/types';

  // Mate-in-1 puzzles where white delivers checkmate (all pieces invisible)
  const PUZZLES = [
    { fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1', desc: 'White: Ke1, Qh5, Bc4, pawns d2,e4,f2,g2,h2,a2,b2,c2. Black: Ke8, Qd8, Ra8,Rh8, Bc8,Bf8, Nc6,Nf6, pawns a7,b7,c7,d7,e5,f7,g7,h7' },
    { fen: 'rnbqkbnr/ppppp2p/6p1/5p1Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 1', desc: 'White: Ke1, Qh5, Ra1,Rh1, Bc1,Bf1, Nb1,Ng1, pawns a2-d2,f2-h2,e4. Black: Ke8, Qd8, Ra8,Rh8, Bc8,Bf8, Nb8,Ng8, pawns a7-e7,f5,g6,h7' },
    { fen: 'r1b1k2r/ppppqppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQR1K1 w kq - 0 1', desc: 'White: Kg1, Qd1, Ra1,Re1, Bc1,Bc4, Nc3,Nf3, pawns a2-d2,f2-h2,e4. Black: Ke8, Qe7, Ra8,Rh8, Bc5,Bc8, Nc6,Nf6, pawns a7-d7,e5,f7-h7' },
    { fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1', desc: 'White: Ke1, Qf3, Ra1,Rh1, Bc1,Bc4, Nb1,Ng1, pawns a2-d2,f2-h2,e4. Black: Ke8, Qd8, Ra8,Rh8, Bc5,Bc8, Nc6,Ng8, pawns a7-d7,e5,f7-h7' },
  ];

  type Phase = 'idle' | 'playing' | 'solved' | 'wrong' | 'done';

  function applyMoveOnBoard(board: BoardState, from: SquareId, to: SquareId): BoardState {
    const newPieces = new Map(board.pieces);
    const piece = newPieces.get(from);
    if (!piece) return board;
    newPieces.delete(from);
    newPieces.set(to, piece);
    return { pieces: newPieces };
  }

  let phase = $state<Phase>('idle');
  let puzzleIdx = $state(0);
  let board = $state<BoardState | null>(null);
  let selectedSquare = $state<SquareId | null>(null);
  let correct = $state(0);
  let total = $state(0);
  let bestStars = $state(0);

  let puzzle = $derived(PUZZLES[puzzleIdx % PUZZLES.length]);
  let emptyBoard = $derived(createBoardState([]));

  let validMoves = $derived.by(() => {
    if (!selectedSquare || !board) return [];
    const p = board.pieces.get(selectedSquare);
    if (!p || p.color !== 'w') return [];
    return getLegalMoves(selectedSquare, board, 'w');
  });

  let doneStars = $derived.by(() => {
    const pct = total > 0 ? correct / total : 0;
    if (pct >= 0.9) return 3;
    if (pct >= 0.6) return 2;
    if (pct >= 0.3) return 1;
    return 0;
  });

  onMount(() => {
    bestStars = readNumber('blindfold-puzzle-best-stars');
  });

  function startPuzzle(idx: number) {
    const p = PUZZLES[idx % PUZZLES.length];
    const { placements } = parseFen(p.fen);
    board = createBoardState(placements);
    selectedSquare = null;
    phase = 'playing';
  }

  function startGame() {
    puzzleIdx = 0;
    correct = 0;
    total = 0;
    startPuzzle(0);
  }

  function handleSquareClick(sq: SquareId) {
    if (phase !== 'playing' || !board) return;

    if (!selectedSquare) {
      const p = board.pieces.get(sq);
      if (p && p.color === 'w') selectedSquare = sq;
      return;
    }

    if (sq === selectedSquare) {
      selectedSquare = null;
      return;
    }

    const moves = getLegalMoves(selectedSquare, board, 'w');
    if (!moves.includes(sq)) {
      const p = board.pieces.get(sq);
      if (p && p.color === 'w') selectedSquare = sq;
      else selectedSquare = null;
      return;
    }

    const newBoard = applyMoveOnBoard(board, selectedSquare, sq);
    board = newBoard;
    selectedSquare = null;

    if (isCheckmate('b', newBoard)) {
      correct += 1;
      total += 1;
      phase = 'solved';
      playSound('correct');
    } else {
      total += 1;
      phase = 'wrong';
      playSound('wrong');
    }
  }

  function nextPuzzle() {
    const nextIdx = puzzleIdx + 1;
    if (nextIdx >= PUZZLES.length) {
      const pct = total > 0 ? correct / total : 0;
      const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;
      bestStars = saveBest('blindfold-puzzle-best-stars', stars);
      if (stars >= 1) playSound('stars');
      phase = 'done';
      return;
    }
    puzzleIdx = nextIdx;
    startPuzzle(nextIdx);
  }
</script>

{#if phase === 'idle' || phase === 'done'}
  <div class="trainer">
    {#if phase === 'idle'}
      <div class="center-panel">
        <h2 class="title">Blindfold Puzzle Solving</h2>
        {#if bestStars > 0}
          <StarRating stars={bestStars} size="sm" />
        {/if}
        <Button variant="primary" size="large" onclick={startGame}>Start</Button>
      </div>
    {:else}
      <div class="center-panel">
        <h2 class="title">Complete!</h2>
        <p class="final-score">{correct}/{total} correct</p>
        {#if doneStars >= 1}
          <StarRating stars={doneStars} size="lg" />
        {/if}
        <FinishActions label="Play Again" onclick={() => { phase = 'idle'; }} />
      </div>
    {/if}
  </div>
{:else}
  <!-- One board for the puzzle: empty to play on, then the answer -->
  <BoardLayout>
    {#snippet boardArea()}
      {#if (phase === 'solved' || phase === 'wrong') && board}
        <Board {board} readOnly />
      {:else}
        <Board
          board={emptyBoard}
          selectedSquare={selectedSquare}
          validMoves={validMoves}
          onSquareClick={handleSquareClick}
        />
      {/if}
    {/snippet}

    {#snippet sidebarArea()}
      <div class="center-panel">
        {#if (phase === 'solved' || phase === 'wrong') && board}
          <p class={['result-text', phase === 'solved' ? 'result-correct' : 'result-wrong']}>
            {phase === 'solved' ? '✓ Checkmate!' : '✗'}
          </p>
          <div class="info-text">{correct}/{total} correct</div>
          <Button variant="primary" onclick={nextPuzzle}>
            {puzzleIdx + 1 >= PUZZLES.length ? 'See Results' : 'Next'}
          </Button>
        {:else}
          <div class="info-text">Puzzle {puzzleIdx + 1}/{PUZZLES.length}</div>

          <!-- Position description -->
          <div class="desc-box">
            {puzzle.desc}
          </div>
        {/if}
      </div>
    {/snippet}
  </BoardLayout>
{/if}

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
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
  }

  .final-score {
    font-size: var(--size-title);
    font-weight: var(--weight-strong);
  }

  .info-text {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }

  .desc-box {
    width: 100%;
    padding: 0.75rem;
    border-radius: 0.75rem;
    border: 1px solid var(--line);
    background: var(--surface);
    text-align: left;
    font-size: var(--size-secondary);
    font-variant-numeric: tabular-nums;
    line-height: 1.625;
  }

  .result-text {
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
  }

  .result-correct {
    color: var(--correct-text);
  }

  .result-wrong {
    color: var(--wrong-text);
  }
</style>
