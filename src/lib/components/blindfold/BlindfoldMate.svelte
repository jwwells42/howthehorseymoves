<script lang="ts">
  import { onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { type BoardState, type SquareId, type PieceKind, createBoardState } from '$lib/logic/types';
  import { getLegalMoves } from '$lib/logic/attacks';
  import type { MateEndgameType } from '$lib/logic/endgame';
  import {
    ENDGAME_INFO,
    PIECE_NAMES,
    generatePosition,
    validateEndgameMove,
    applyEndgameMove,
    pickDefenseMove,
    formatPosition,
    formatMoveNotation,
  } from '$lib/logic/endgame';

  /* ── Types ─────────────────────────────────────── */

  interface Props {
    type: MateEndgameType;
  }

  interface MoveEntry {
    number: number;
    white: string;
    black?: string;
  }

  let { type }: Props = $props();

  let info = $derived(ENDGAME_INFO[type]);
  let storageKey = $derived(`blindfold-mate-${type}-best-stars`);

  /* ── Input parsing (standard algebraic notation) ── */

  function isValidSquare(s: string): boolean {
    if (s.length !== 2) return false;
    const f = s.charCodeAt(0) - 97;
    const r = parseInt(s[1]) - 1;
    return f >= 0 && f <= 7 && r >= 0 && r <= 7;
  }

  function parseSAN(
    raw: string,
    board: BoardState,
  ): { from: SquareId; to: SquareId } | { error: string } {
    const s = raw.trim().replace(/[+#]/g, '');
    if (s.length === 0) return { error: 'Enter a move like Qd2 or Kc3' };

    const pieceChar = s[0].toUpperCase();
    if (!'KQRBN'.includes(pieceChar)) {
      return { error: 'Start with a piece letter (K, Q, R, B)' };
    }

    const rest = s.slice(1).toLowerCase().replace(/x/g, '');
    if (rest.length < 2 || rest.length > 3) {
      return { error: 'Enter a move like Qd2 or Kc3' };
    }

    const dest = rest.slice(-2);
    const disambig = rest.slice(0, -2);

    if (!isValidSquare(dest)) {
      return { error: `${dest} is not a valid square` };
    }

    const to = dest as SquareId;
    const piece = pieceChar as PieceKind;

    const candidates: SquareId[] = [];
    for (const [sq, p] of board.pieces) {
      if (p.color === 'w' && p.piece === piece) {
        const legal = getLegalMoves(sq, board, 'w');
        if (legal.includes(to)) {
          candidates.push(sq);
        }
      }
    }

    if (candidates.length === 0) {
      return { error: `No ${PIECE_NAMES[piece]} can reach ${dest}` };
    }

    if (candidates.length === 1) {
      return { from: candidates[0], to };
    }

    if (!disambig) {
      return { error: `Which one? Try ${pieceChar}${candidates[0][0]}${dest}` };
    }
    const filtered = candidates.filter((sq) => {
      if (disambig >= 'a' && disambig <= 'h') return sq[0] === disambig;
      if (disambig >= '1' && disambig <= '8') return sq[1] === disambig;
      return false;
    });
    if (filtered.length !== 1) {
      return { error: `No ${PIECE_NAMES[piece]} on ${disambig} can reach ${dest}` };
    }
    return { from: filtered[0], to };
  }

  /* ── State ─────────────────────────────────────── */

  let phase = $state<'idle' | 'playing' | 'won'>('idle');
  let board = $state<BoardState>({ pieces: new Map() });
  let startPos = $state({ white: '', black: '' });
  let moves = $state<MoveEntry[]>([]);
  let moveNumber = $state(1);
  let mistakes = $state(0);
  let input = $state('');
  let error = $state<string | null>(null);
  let waitingForBot = $state(false);
  let bestStars = $state(0);
  let hideHistory = $state(false);
  let lastOpponentMove = $state<string | null>(null);

  let boardHistory = $state<BoardState[]>([]);
  let reviewStep = $state(0);

  let inputEl = $state<HTMLInputElement | null>(null);
  let movesEndEl = $state<HTMLDivElement | null>(null);

  let stars = $derived(mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1);

  let halfMoves = $derived.by(() => {
    const result: { notation: string; isWhite: boolean }[] = [];
    for (const m of moves) {
      result.push({ notation: `${m.number}. ${m.white}`, isWhite: true });
      if (m.black) result.push({ notation: m.black, isWhite: false });
    }
    return result;
  });

  onMount(() => {
    bestStars = parseInt(localStorage.getItem(storageKey) ?? '0', 10);
  });

  /* Auto-scroll move list */
  $effect(() => {
    // Track moves length to trigger scroll
    void moves.length;
    movesEndEl?.scrollIntoView({ behavior: 'smooth' });
  });

  /* Focus input when playing */
  $effect(() => {
    if (phase === 'playing' && !waitingForBot) {
      inputEl?.focus();
    }
  });

  /* ── Actions ───────────────────────────────────── */

  function startGame() {
    const placements = generatePosition(type);
    const newBoard = createBoardState(placements);
    board = newBoard;
    startPos = formatPosition(newBoard);
    moves = [];
    moveNumber = 1;
    mistakes = 0;
    input = '';
    error = null;
    waitingForBot = false;
    lastOpponentMove = null;
    boardHistory = [newBoard];
    reviewStep = 0;
    phase = 'playing';
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (waitingForBot || phase !== 'playing') return;

    const parsed = parseSAN(input, board);
    input = '';

    if ('error' in parsed) {
      error = parsed.error;
      return;
    }

    const { from, to } = parsed;

    const validation = validateEndgameMove(board, from, to);
    if (!validation.valid) {
      mistakes += 1;
      error = validation.reason ?? 'Invalid move';
      return;
    }

    error = null;
    const newBoard = applyEndgameMove(board, from, to);
    const whiteNotation = formatMoveNotation(board, from, to, newBoard, 'b');

    if (validation.checkmate) {
      board = newBoard;
      boardHistory = [...boardHistory, newBoard];
      moves = [...moves, { number: moveNumber, white: whiteNotation }];
      phase = 'won';
      reviewStep = 0;
      const s = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
      if (s > bestStars) {
        localStorage.setItem(storageKey, s.toString());
        bestStars = s;
      }
      return;
    }

    board = newBoard;
    boardHistory = [...boardHistory, newBoard];
    waitingForBot = true;

    setTimeout(() => {
      const botMove = pickDefenseMove(newBoard);
      if (!botMove) {
        waitingForBot = false;
        return;
      }

      const afterBot = applyEndgameMove(newBoard, botMove.from, botMove.to);
      const blackNotation = formatMoveNotation(
        newBoard, botMove.from, botMove.to, afterBot, 'w',
      );

      board = afterBot;
      boardHistory = [...boardHistory, afterBot];
      lastOpponentMove = blackNotation;
      moves = [...moves, { number: moveNumber, white: whiteNotation, black: blackNotation }];
      moveNumber += 1;
      waitingForBot = false;
    }, 600);
  }

  function noop() {}
</script>

<div class="blindfold-mate">
  {#if phase === 'idle'}
    <div class="idle-screen">
      <h2 class="title">{info.name}</h2>
      <p class="description">
        Deliver checkmate without seeing the board. Enter moves in
        standard notation (e.g., Qd2, Kc3, Rad1).
      </p>
      {#if bestStars > 0}
        <StarRating stars={bestStars} size="sm" />
      {/if}

      <!-- Hide move list toggle -->
      <label class="toggle-label">
        <button
          type="button"
          role="switch"
          aria-checked={hideHistory}
          aria-label="Hide move list"
          class={['toggle-track', hideHistory && 'active']}
          onclick={() => hideHistory = !hideHistory}
        >
          <span class={['toggle-thumb', hideHistory && 'active']}></span>
        </button>
        Hide move list (harder)
      </label>

      <button class="action-btn" onclick={startGame}>Start</button>
    </div>

  {:else}
    <!-- Playing / Won -->
    <h2 class="title">{info.name}</h2>

    <!-- Starting position -->
    <div class="position-box">
      <div>
        <span class="pos-label">White: </span>
        {startPos.white}
      </div>
      <div>
        <span class="pos-label">Black: </span>
        {startPos.black}
      </div>
    </div>

    {#if phase === 'playing'}
      <!-- Move list or last opponent move -->
      {#if hideHistory}
        {#if lastOpponentMove}
          <div class="opponent-move-box">
            <span class="pos-label">Opponent played </span>
            <span class="opponent-move-val">{lastOpponentMove}</span>
          </div>
        {/if}
      {:else if moves.length > 0}
        <div class="move-list">
          {#each moves as m}
            <div>
              <span class="move-num">{m.number}.</span> {m.white}
              {#if m.black}
                &nbsp;&nbsp;{m.black}
              {/if}
            </div>
          {/each}
          <div bind:this={movesEndEl}></div>
        </div>
      {/if}

      <!-- Input -->
      <form class="input-row" onsubmit={handleSubmit}>
        <input
          bind:this={inputEl}
          type="text"
          bind:value={input}
          placeholder={waitingForBot ? '...' : 'e.g. Qd2'}
          maxlength={6}
          disabled={waitingForBot}
          class="san-input"
          autocomplete="off"
          autocapitalize="off"
        />
        <button
          type="submit"
          disabled={waitingForBot}
          class="go-btn"
        >
          Go
        </button>
      </form>

      {#if error}
        <p class="error">{error}</p>
      {/if}

      {#if mistakes > 0}
        <p class="mistake-count">
          {mistakes} mistake{mistakes !== 1 ? 's' : ''}
        </p>
      {/if}
    {/if}

    {#if phase === 'won'}
      <div class="won-area">
        <p class="checkmate-text">Checkmate!</p>
        <StarRating {stars} size="lg" />
        <p class="won-detail">
          {#if mistakes === 0}
            Perfect — no mistakes!
          {:else}
            {mistakes} mistake{mistakes > 1 ? 's' : ''}
          {/if}
        </p>

        <!-- Analysis board -->
        {#if boardHistory.length > 1}
          <div class="review-area">
            <p class="review-label">Review your game</p>
            <div class="review-board">
              <Board
                board={boardHistory[reviewStep]}
                readOnly
                selectedSquare={null}
                validMoves={[]}
                targets={[]}
                reachedTargets={[]}
                dragValidMoves={[]}
                onSquareClick={noop}
                onDrop={noop}
                onDragStart={noop}
                onDragEnd={noop}
              />
            </div>

            <!-- Navigation -->
            <div class="review-nav">
              <button
                class="nav-btn"
                onclick={() => reviewStep = 0}
                disabled={reviewStep === 0}
                aria-label="Go to start"
              >&laquo;</button>
              <button
                class="nav-btn"
                onclick={() => reviewStep = Math.max(0, reviewStep - 1)}
                disabled={reviewStep === 0}
                aria-label="Previous move"
              >&lsaquo;</button>
              <span class="nav-label">
                {reviewStep === 0 ? 'Start' : (halfMoves[reviewStep - 1]?.notation ?? '')}
              </span>
              <button
                class="nav-btn"
                onclick={() => reviewStep = Math.min(boardHistory.length - 1, reviewStep + 1)}
                disabled={reviewStep >= boardHistory.length - 1}
                aria-label="Next move"
              >&rsaquo;</button>
              <button
                class="nav-btn"
                onclick={() => reviewStep = boardHistory.length - 1}
                disabled={reviewStep >= boardHistory.length - 1}
                aria-label="Go to end"
              >&raquo;</button>
            </div>

            <!-- Full move list in review -->
            <div class="move-list">
              {#each moves as m}
                <div>
                  <span class="move-num">{m.number}.</span> {m.white}
                  {#if m.black}
                    &nbsp;&nbsp;{m.black}
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <button class="action-btn" onclick={startGame}>New Position</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .blindfold-mate {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 28rem;
    margin: 0 auto;
    padding: 1rem;
  }

  .idle-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
  }

  .description {
    color: var(--text-muted);
    text-align: center;
    font-size: 0.875rem;
    margin: 0;
  }

  /* Toggle switch */
  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-muted);
    cursor: pointer;
    user-select: none;
  }

  .toggle-track {
    position: relative;
    width: 2.5rem;
    height: 1.25rem;
    border-radius: 9999px;
    background: #52525b;
    border: none;
    cursor: pointer;
    transition: background-color 0.15s;
    padding: 0;
  }

  .toggle-track.active {
    background: #16a34a;
  }

  .toggle-thumb {
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 1rem;
    height: 1rem;
    border-radius: 9999px;
    background: white;
    transition: transform 0.15s;
  }

  .toggle-thumb.active {
    transform: translateX(1.25rem);
  }

  /* Position box */
  .position-box {
    width: 100%;
    border-radius: 0.5rem;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    padding: 0.75rem;
    font-size: 0.875rem;
    font-family: monospace;
  }

  .pos-label {
    color: var(--text-muted);
  }

  /* Opponent move */
  .opponent-move-box {
    width: 100%;
    border-radius: 0.5rem;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    padding: 0.75rem;
    font-size: 0.875rem;
    font-family: monospace;
    text-align: center;
  }

  .opponent-move-val {
    font-weight: 700;
  }

  /* Move list */
  .move-list {
    width: 100%;
    border-radius: 0.5rem;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    padding: 0.75rem;
    font-size: 0.875rem;
    font-family: monospace;
    max-height: 12rem;
    overflow-y: auto;
  }

  .move-num {
    color: var(--text-muted);
  }

  /* Input */
  .input-row {
    display: flex;
    gap: 0.5rem;
    width: 100%;
  }

  .san-input {
    flex: 1;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--foreground);
    font-family: monospace;
    font-size: 1.125rem;
    text-align: center;
  }

  .san-input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.4);
  }

  .san-input:disabled {
    opacity: 0.5;
  }

  .go-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    background: #16a34a;
    color: white;
    border: none;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .go-btn:hover {
    background: #15803d;
  }

  .go-btn:disabled {
    opacity: 0.5;
  }

  .action-btn {
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

  .action-btn:hover {
    background: #15803d;
  }

  .error {
    color: #f87171;
    font-size: 0.875rem;
    font-weight: 500;
    margin: 0;
  }

  .mistake-count {
    font-size: 0.875rem;
    color: var(--text-faint);
    margin: 0;
  }

  /* Won area */
  .won-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    animation: fade-in 0.3s ease-out;
  }

  .checkmate-text {
    color: #22c55e;
    font-weight: 700;
    margin: 0;
  }

  .won-detail {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin: 0;
  }

  /* Review area */
  .review-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }

  .review-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted);
    margin: 0;
  }

  .review-board {
    width: 100%;
    max-width: 360px;
  }

  .review-nav {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .nav-btn {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-family: monospace;
    background: none;
    border: none;
    color: var(--foreground);
    cursor: pointer;
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .nav-label {
    font-size: 0.75rem;
    color: var(--text-faint);
    min-width: 4rem;
    text-align: center;
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
