<script lang="ts">
  import { saveBest } from '$lib/state/storage';
  import { onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import MoveNav from '$lib/components/board/MoveNav.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import FinishActions from '$lib/components/curriculum/FinishActions.svelte';
  import AnswerInput from './AnswerInput.svelte';
  import { type BoardState, type SquareId, type PieceKind, createBoardState } from '$lib/logic/types';
  import { getLegalMoves } from '$lib/logic/attacks';
  import { playSound } from '$lib/state/sound';
  import type { MateEndgameType } from '$lib/logic/endgame';
  import {
    ENDGAME_INFO,
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
    if (s.length === 0) return { error: '\u2717' };

    const pieceChar = s[0].toUpperCase();
    if (!'KQRBN'.includes(pieceChar)) {
      return { error: '\u2717' };
    }

    const rest = s.slice(1).toLowerCase().replace(/x/g, '');
    if (rest.length < 2 || rest.length > 3) {
      return { error: '\u2717' };
    }

    const dest = rest.slice(-2);
    const disambig = rest.slice(0, -2);

    if (!isValidSquare(dest)) {
      return { error: `\u2717 ${dest}` };
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
      return { error: `\u2717 ${pieceChar}${dest}` };
    }

    if (candidates.length === 1) {
      return { from: candidates[0], to };
    }

    if (!disambig) {
      return { error: `${pieceChar}${candidates[0][0]}${dest}?` };
    }
    const filtered = candidates.filter((sq) => {
      if (disambig >= 'a' && disambig <= 'h') return sq[0] === disambig;
      if (disambig >= '1' && disambig <= '8') return sq[1] === disambig;
      return false;
    });
    if (filtered.length !== 1) {
      return { error: `\u2717 ${pieceChar}${disambig}${dest}` };
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

  function handleSubmit() {
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
      error = validation.reason ? `\u2717 ${validation.reason}` : '\u2717';
      playSound('wrong');
      return;
    }

    error = null;
    const newBoard = applyEndgameMove(board, from, to);
    playSound('move');
    const whiteNotation = formatMoveNotation(board, from, to, newBoard, 'b');

    if (validation.checkmate) {
      board = newBoard;
      boardHistory = [...boardHistory, newBoard];
      moves = [...moves, { number: moveNumber, white: whiteNotation }];
      phase = 'won';
      reviewStep = 0;
      const s = mistakes === 0 ? 3 : mistakes === 1 ? 2 : 1;
      bestStars = saveBest(storageKey, s);
      playSound('stars');
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
</script>

<!-- After a win the game can be stepped through on the board -->
{#if phase === 'won' && boardHistory.length > 1}
  <BoardLayout>
    {#snippet headerArea()}
      <h2 class="title">{info.name}</h2>
    {/snippet}

    {#snippet boardArea()}
      <Board board={boardHistory[reviewStep]} readOnly />
    {/snippet}

    {#snippet sidebarArea()}
      <div class="won-area">
        <p class="checkmate-text">✓ Checkmate!</p>
        <StarRating {stars} size="lg" />
        {#if mistakes > 0}
          <p class="won-detail">{mistakes} mistake{mistakes > 1 ? 's' : ''}</p>
        {/if}

        <MoveNav
          canGoBack={reviewStep > 0}
          canGoForward={reviewStep < boardHistory.length - 1}
          onStart={() => (reviewStep = 0)}
          onBack={() => (reviewStep = Math.max(0, reviewStep - 1))}
          onForward={() => (reviewStep = Math.min(boardHistory.length - 1, reviewStep + 1))}
          onEnd={() => (reviewStep = boardHistory.length - 1)}
        >
          <span class="nav-label">
            {reviewStep === 0 ? 'Start' : (halfMoves[reviewStep - 1]?.notation ?? '')}
          </span>
        </MoveNav>

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

        <FinishActions label="New Position" onclick={startGame} size="normal" />
      </div>
    {/snippet}
  </BoardLayout>
{:else}
  <div class="blindfold-mate">
    {#if phase === 'idle'}
      <div class="idle-screen">
        <h2 class="title">{info.name}</h2>
        {#if bestStars > 0}
          <StarRating stars={bestStars} size="sm" />
        {/if}

        <label class="toggle-label">
          <input type="checkbox" bind:checked={hideHistory} />
          Hide move list
        </label>

        <Button variant="primary" size="large" onclick={startGame}>Start</Button>
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

        <AnswerInput
          bind:value={input}
          onsubmit={handleSubmit}
          label="Your move"
          placeholder={waitingForBot ? '...' : 'e.g. Qd2'}
          maxlength={6}
          disabled={waitingForBot}
          {error}
        />

        {#if mistakes > 0}
          <p class="mistake-count">
            {mistakes} mistake{mistakes !== 1 ? 's' : ''}
          </p>
        {/if}
      {/if}

      {#if phase === 'won'}
        <div class="won-area">
          <p class="checkmate-text">✓ Checkmate!</p>
          <StarRating {stars} size="lg" />
          <p class="won-detail">
            {#if mistakes > 0}
              {mistakes} mistake{mistakes > 1 ? 's' : ''}
            {/if}
          </p>

          <FinishActions label="New Position" onclick={startGame} size="normal" />
        </div>
      {/if}
    {/if}
  </div>
{/if}

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
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
    margin: 0;
  }


  .toggle-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    cursor: pointer;
    user-select: none;
  }
  .toggle-label input {
    width: 1.25rem;
    height: 1.25rem;
    accent-color: var(--action);
  }

  /* Position box */
  .position-box {
    width: 100%;
    border-radius: 0.5rem;
    background: var(--surface);
    border: 1px solid var(--line);
    padding: 0.75rem;
    font-size: var(--size-secondary);
    font-variant-numeric: tabular-nums;
  }

  .pos-label {
    color: var(--ink-muted);
  }

  /* Opponent move */
  .opponent-move-box {
    width: 100%;
    border-radius: 0.5rem;
    background: var(--surface);
    border: 1px solid var(--line);
    padding: 0.75rem;
    font-size: var(--size-secondary);
    font-variant-numeric: tabular-nums;
    text-align: center;
  }

  .opponent-move-val {
    font-weight: var(--weight-strong);
  }

  /* Move list */
  .move-list {
    width: 100%;
    border-radius: 0.5rem;
    background: var(--surface);
    border: 1px solid var(--line);
    padding: 0.75rem;
    font-size: var(--size-secondary);
    font-variant-numeric: tabular-nums;
    max-height: 12rem;
    overflow-y: auto;
  }

  .move-num {
    color: var(--ink-muted);
  }

  .mistake-count {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
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
    color: var(--correct-text);
    font-weight: var(--weight-strong);
    margin: 0;
  }

  .won-detail {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    margin: 0;
  }

  /* Review area */
  .nav-label {
    font-size: var(--size-small);
    color: var(--ink-muted);
    min-width: 4rem;
    text-align: center;
  }
</style>
