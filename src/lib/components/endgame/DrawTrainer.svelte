<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { playSound } from '$lib/state/sound';
  import { type BoardState, type SquareId, type PiecePlacement, type PieceColor, createBoardState, boardToKey } from '$lib/logic/types';
  import { getLegalMoves, getAllLegalMoves, isCheckmate, isStalemate } from '$lib/logic/attacks';
  import { applyEndgameMove, pickDefenseMove } from '$lib/logic/endgame';
  import { probeKPK, squareToIndex, KPK_BLACK, KPK_WHITE } from '$lib/logic/kpk-bitbase';
  import type { SlideAnimation } from '$lib/state/use-puzzle.svelte';

  interface Props {
    title: string;
    instruction: string;
    placements: PiecePlacement[];
    storageKey: string;
    botStrategy?: 'heuristic' | 'bitbase-kpk';
    onNext?: () => void;
  }

  let { title, instruction, placements, storageKey, botStrategy = 'heuristic', onNext }: Props = $props();

  const MAX_MOVES = 100; // half-moves before auto-draw

  /* ── State ────────────────────────────────────── */

  function newBoard() {
    return createBoardState(placements);
  }

  let board = $state<BoardState>(newBoard());
  let selectedSquare = $state<SquareId | null>(null);
  let result = $state<'playing' | 'draw' | 'lost'>('playing');
  let drawReason = $state<string>('');
  let mistakes = $state(0);
  let feedback = $state<string | null>(null);
  let botSlide = $state<SlideAnimation | null>(null);
  let waitingForBot = $state(false);
  let dragFrom = $state<SquareId | null>(null);
  let bestStars = $state(0);
  let halfMoves = $state(0);
  let positionCounts = $state<Map<string, number>>(new Map());

  // Bot plays White (attacker), student plays Black (defender)
  // Bot moves first
  let botMovedFirst = $state(false);

  $effect(() => {
    bestStars = parseInt(localStorage.getItem(storageKey) ?? '0', 10);
  });

  // Initialize position count and make bot's first move
  $effect(() => {
    if (!botMovedFirst && result === 'playing') {
      const key = boardToKey(board, 'w');
      positionCounts.set(key, 1);
      botMovedFirst = true;
      makeBotMove(board);
    }
  });

  let validMoves = $derived.by(() => {
    if (!selectedSquare) return [];
    return getLegalMoves(selectedSquare, board, 'b');
  });

  let dragValidMoves = $derived.by(() => {
    if (!dragFrom) return [];
    return getLegalMoves(dragFrom, board, 'b');
  });

  let stars = $derived(mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1);

  let statusText = $derived.by(() => {
    if (result === 'draw') return `Draw — ${drawReason}`;
    if (result === 'lost') return 'You lost!';
    if (waitingForBot) return 'Opponent is thinking...';
    return instruction;
  });

  /* ── Position tracking ─────────────────────────── */

  function recordPosition(boardState: BoardState, colorToMove: PieceColor): boolean {
    const key = boardToKey(boardState, colorToMove);
    const count = (positionCounts.get(key) ?? 0) + 1;
    positionCounts.set(key, count);
    return count >= 3;
  }

  /* ── KPK bitbase helpers ──────────────────────── */

  function findKPKPieces(
    b: BoardState,
  ): { wk: SquareId; bk: SquareId; wp: SquareId } | null {
    let wk: SquareId | undefined;
    let bk: SquareId | undefined;
    let wp: SquareId | undefined;
    for (const [sq, piece] of b.pieces) {
      if (piece.color === 'w' && piece.piece === 'K') wk = sq;
      else if (piece.color === 'b' && piece.piece === 'K') bk = sq;
      else if (piece.color === 'w' && piece.piece === 'P') wp = sq;
    }
    if (!wk || !bk || !wp) return null;
    return { wk, bk, wp };
  }

  function probeBoard(b: BoardState, stm: number): boolean | null {
    const pieces = findKPKPieces(b);
    if (!pieces) return null;
    return probeKPK(
      squareToIndex(pieces.wk),
      squareToIndex(pieces.bk),
      squareToIndex(pieces.wp),
      stm,
    );
  }

  function chebyshev(a: SquareId, b: SquareId): number {
    return Math.max(
      Math.abs(a.charCodeAt(0) - b.charCodeAt(0)),
      Math.abs(parseInt(a[1]) - parseInt(b[1])),
    );
  }

  /* ── Check for clean promotion ─────────────────── */

  function hasCleanPromotion(boardState: BoardState, color: PieceColor): boolean {
    // Check if any piece was just promoted (queen on rank 1 or 8 that wasn't there before)
    // Simpler: check if `color` has a queen/rook/bishop/knight that the opponent can't capture
    // Actually, we check after bot's move: did any pawn promote, and can the student capture it?
    for (const [sq, p] of boardState.pieces) {
      if (p.color !== color) continue;
      if (p.piece === 'K' || p.piece === 'P') continue;
      // Check if this piece is on the back rank (promotion square)
      const rank = sq[1];
      if ((color === 'w' && rank === '8') || (color === 'b' && rank === '1')) {
        // Could be a promoted piece — check if opponent can capture it
        const opponent: PieceColor = color === 'w' ? 'b' : 'w';
        const opponentMoves = getAllLegalMoves(opponent, boardState);
        const canCapture = opponentMoves.some(m => m.to === sq);
        if (!canCapture) return true;
      }
    }
    return false;
  }

  /* ── Bot move strategies ──────────────────────── */

  type Move = { from: SquareId; to: SquareId };

  /** Bitbase-perfect: pick the trickiest winning move (fewest drawing responses for Black) */
  function pickBitbaseBotMove(currentBoard: BoardState, moves: Move[]): Move[] {
    // Among all White moves, find the one that gives Black the fewest drawing options
    let trickiest: { move: Move; drawCount: number; score: number }[] = [];
    let minDraws = Infinity;

    for (const move of moves) {
      const nb = applyEndgameMove(currentBoard, move.from, move.to);

      // If this move promotes, handle it
      const p = currentBoard.pieces.get(move.from)!;
      // Skip — promotion is handled after selection

      // Count how many Black responses draw
      const blackMoves = getAllLegalMoves('b', nb);
      let drawCount = 0;
      for (const bm of blackMoves) {
        const nb2 = applyEndgameMove(nb, bm.from, bm.to);
        const isWin = probeBoard(nb2, KPK_WHITE);
        if (isWin === false) drawCount++;
      }

      // Heuristic tiebreaker: king proximity to pawn, pawn advancement
      let score = 0;
      const kpk = findKPKPieces(currentBoard);
      if (p.piece === 'K' && kpk) {
        score += (7 - chebyshev(move.to, kpk.wp)) * 5;
      }
      if (p.piece === 'P') {
        score += parseInt(move.to[1]) * 3;
      }
      score += Math.random() * 2;

      if (drawCount < minDraws) {
        minDraws = drawCount;
        trickiest = [{ move, drawCount, score }];
      } else if (drawCount === minDraws) {
        trickiest.push({ move, drawCount, score });
      }
    }

    // Among equally tricky, pick by heuristic score
    trickiest.sort((a, b) => b.score - a.score);
    const topScore = trickiest[0].score;
    return trickiest.filter(t => Math.abs(t.score - topScore) < 1).map(t => t.move);
  }

  /** Heuristic scoring for non-bitbase games (Philidor etc.) */
  function pickHeuristicBotMove(currentBoard: BoardState, moves: Move[]): Move[] {
    let bestScore = -Infinity;
    let bestMoves: Move[] = [];

    for (const move of moves) {
      const newBoard = applyEndgameMove(currentBoard, move.from, move.to);
      let score = 0;

      const piece = currentBoard.pieces.get(move.from)!;
      if (piece.piece === 'P') {
        const rank = parseInt(move.to[1]);
        score += rank * 20;
        if (rank === 8) score += 500;
      }

      const captured = currentBoard.pieces.get(move.to);
      if (captured && captured.color === 'b' && captured.piece !== 'K') {
        score += 200;
      }

      if (piece.piece === 'K') {
        const [x, y] = [move.to.charCodeAt(0) - 97, parseInt(move.to[1]) - 1];
        const centerDist = Math.max(Math.abs(x - 3.5), Math.abs(y - 3.5));
        score += (4 - centerDist) * 5;
      }

      if (isCheckmate('b', newBoard)) score += 10000;
      if (isStalemate('b', newBoard)) score -= 5000;

      const oppMoves = getAllLegalMoves('b', newBoard);
      score -= oppMoves.length * 3;
      score += Math.random() * 3;

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (Math.abs(score - bestScore) < 0.01) {
        bestMoves.push(move);
      }
    }

    return bestMoves;
  }

  /* ── Bot move (White = attacker) ───────────────── */

  function makeBotMove(currentBoard: BoardState) {
    waitingForBot = true;
    setTimeout(() => {
      // Use pickDefenseMove but for White as attacker
      // We need a simple attacker AI — pick best move for White
      const moves = getAllLegalMoves('w', currentBoard);
      if (moves.length === 0) {
        // White has no moves — stalemate on White = draw for student
        waitingForBot = false;
        result = 'draw';
        drawReason = 'Stalemate!';
        playSound('stars');
        saveBestStars();
        return;
      }

      // Select the best move based on strategy
      let bestMoves: { from: SquareId; to: SquareId }[];

      if (botStrategy === 'bitbase-kpk') {
        bestMoves = pickBitbaseBotMove(currentBoard, moves);
      } else {
        bestMoves = pickHeuristicBotMove(currentBoard, moves);
      }

      const move = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      const piece = currentBoard.pieces.get(move.from)!;

      botSlide = {
        piece: piece.piece,
        color: piece.color,
        from: move.from,
        to: move.to,
      };

      let newBoard = applyEndgameMove(currentBoard, move.from, move.to);

      // Handle pawn promotion for bot (auto-queen)
      const movingPiece = currentBoard.pieces.get(move.from)!;
      if (movingPiece.piece === 'P' && move.to[1] === '8') {
        const pieces = new Map(newBoard.pieces);
        pieces.set(move.to, { piece: 'Q', color: 'w' });
        newBoard = { pieces: newBoard.pieces };
        // Fix: actually use the updated pieces
        newBoard = { pieces };
      }

      board = newBoard;
      halfMoves += 1;
      playSound('move');

      setTimeout(() => {
        botSlide = null;
        waitingForBot = false;

        // Check if bot checkmated the student
        if (isCheckmate('b', newBoard)) {
          result = 'lost';
          playSound('wrong');
          return;
        }

        // Check for clean promotion (bot promoted and student can't capture)
        if (hasCleanPromotion(newBoard, 'w')) {
          result = 'lost';
          playSound('wrong');
          return;
        }

        // Check threefold after bot's move
        if (recordPosition(newBoard, 'b')) {
          result = 'draw';
          drawReason = 'Threefold repetition!';
          playSound('stars');
          saveBestStars();
          return;
        }

        // Check stalemate on student
        if (isStalemate('b', newBoard)) {
          result = 'draw';
          drawReason = 'Stalemate!';
          playSound('stars');
          saveBestStars();
          return;
        }

        // Move cap
        if (halfMoves >= MAX_MOVES) {
          result = 'draw';
          drawReason = 'Position held for 50 moves!';
          playSound('stars');
          saveBestStars();
          return;
        }
      }, 500);
    }, 400);
  }

  /* ── Save stars ────────────────────────────────── */

  function saveBestStars() {
    const s = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
    const prev = parseInt(localStorage.getItem(storageKey) ?? '0', 10);
    if (s > prev) {
      localStorage.setItem(storageKey, s.toString());
      bestStars = s;
    }
  }

  /* ── Execute student move (Black = defender) ──── */

  function executeMove(from: SquareId, to: SquareId) {
    const newBoard = applyEndgameMove(board, from, to);

    // KPK bitbase validation: reject moves that turn a draw into a win for White
    if (botStrategy === 'bitbase-kpk') {
      const isWin = probeBoard(newBoard, KPK_WHITE);
      if (isWin === true) {
        mistakes += 1;
        feedback = 'That lets White win \u2014 try again!';
        selectedSquare = null;
        playSound('wrong');
        return;
      }
    }

    // Check if student's move allows immediate checkmate
    const whiteMoves = getAllLegalMoves('w', newBoard);
    for (const wm of whiteMoves) {
      const afterWhite = applyEndgameMove(newBoard, wm.from, wm.to);
      if (isCheckmate('b', afterWhite)) {
        mistakes += 1;
        feedback = 'That allows checkmate!';
        selectedSquare = null;
        playSound('wrong');
        return;
      }
    }

    // Check if student's move allows clean promotion
    for (const wm of whiteMoves) {
      const piece = newBoard.pieces.get(wm.from);
      if (piece && piece.piece === 'P' && wm.to[1] === '8') {
        const afterPromo = applyEndgameMove(newBoard, wm.from, wm.to);
        const promoPieces = new Map(afterPromo.pieces);
        promoPieces.set(wm.to, { piece: 'Q', color: 'w' });
        const afterPromoBoard: BoardState = { pieces: promoPieces };
        if (hasCleanPromotion(afterPromoBoard, 'w')) {
          mistakes += 1;
          feedback = 'That allows promotion!';
          selectedSquare = null;
          playSound('wrong');
          return;
        }
      }
    }

    board = newBoard;
    selectedSquare = null;
    feedback = null;
    halfMoves += 1;
    playSound('move');

    // Check threefold after student's move
    if (recordPosition(newBoard, 'w')) {
      result = 'draw';
      drawReason = 'Threefold repetition!';
      playSound('stars');
      saveBestStars();
      return;
    }

    // Check stalemate on White (draw for student)
    if (isStalemate('w', newBoard)) {
      result = 'draw';
      drawReason = 'Stalemate!';
      playSound('stars');
      saveBestStars();
      return;
    }

    // Move cap
    if (halfMoves >= MAX_MOVES) {
      result = 'draw';
      drawReason = 'Position held for 50 moves!';
      playSound('stars');
      saveBestStars();
      return;
    }

    makeBotMove(newBoard);
  }

  /* ── Click handling ───────────────────────────── */

  function handleSquareClick(sq: SquareId) {
    if (result !== 'playing' || waitingForBot) return;

    if (!selectedSquare) {
      const p = board.pieces.get(sq);
      if (p && p.color === 'b') {
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
    if (target && target.color === 'b') {
      selectedSquare = sq;
      return;
    }

    const legal = getLegalMoves(selectedSquare, board, 'b');
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
    if (!p || p.color !== 'b') return;
    const legal = getLegalMoves(from, board, 'b');
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
    board = newBoard();
    selectedSquare = null;
    result = 'playing';
    drawReason = '';
    mistakes = 0;
    feedback = null;
    botSlide = null;
    waitingForBot = false;
    dragFrom = null;
    halfMoves = 0;
    positionCounts = new Map();
    botMovedFirst = false;
  }
</script>

<div class="draw-trainer">
  <div class="header">
    <h2 class="title">{title}</h2>
    <p class="status">{statusText}</p>
  </div>

  <div class="board-wrap">
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
      flipped={true}
    />
  </div>

  {#if feedback && result === 'playing'}
    <p class="feedback">{feedback}</p>
  {/if}

  {#if result === 'draw'}
    <div class="result">
      <StarRating {stars} size="lg" />
      <p class="result-text">
        {#if mistakes === 0}
          Perfect — no mistakes!
        {:else}
          {mistakes} mistake{mistakes > 1 ? 's' : ''}
        {/if}
      </p>
      {#if bestStars > 0 && bestStars > stars}
        <p class="best-text">Best: {bestStars} stars</p>
      {/if}
      <button class="try-again-btn" onclick={reset}>
        Try Again
      </button>
      {#if onNext}
        <button class="try-again-btn" onclick={onNext}>
          Continue
        </button>
      {/if}
    </div>
  {/if}

  {#if result === 'lost'}
    <div class="result">
      <p class="result-text">The opponent broke through.</p>
      <button class="try-again-btn" onclick={reset}>
        Try Again
      </button>
      {#if onNext}
        <button class="try-again-btn" onclick={onNext}>
          Continue
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .draw-trainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }

  @media (min-height: 32rem) and (min-width: 32rem) {
    .draw-trainer {
      flex: 1;
      min-height: 0;
    }
  }

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

  .board-wrap {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  @media (min-height: 32rem) and (min-width: 32rem) {
    .board-wrap {
      flex: 1;
      min-height: 0;
      align-items: center;
    }
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

  @media (max-height: 480px) {
    .draw-trainer { gap: 0.25rem; }
    .header { display: none; }
  }

  .result-text {
    font-size: 0.875rem;
    color: #888;
    margin: 0;
  }

  .best-text {
    font-size: 0.75rem;
    color: #666;
    margin: 0;
  }

  .try-again-btn {
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

  .try-again-btn:hover {
    background: #15803d;
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
