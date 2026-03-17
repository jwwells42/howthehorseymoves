<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';

  const OPENINGS = [
    { name: 'Italian Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'] },
    { name: 'Sicilian Defense', moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4'] },
    { name: "Queen's Gambit", moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'] },
    { name: 'French Defense', moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'] },
    { name: 'Ruy Lopez', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4'] },
    { name: 'Scotch Game', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4'] },
    { name: "King's Indian", moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'] },
    { name: 'Caro-Kann', moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4'] },
    { name: 'London System', moves: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5'] },
    { name: 'Pirc Defense', moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'] },
  ];

  const INITIAL_PIECES: Record<string, { piece: string; color: 'w' | 'b' }> = {};
  for (const f of 'abcdefgh') {
    INITIAL_PIECES[`${f}2`] = { piece: 'P', color: 'w' };
    INITIAL_PIECES[`${f}7`] = { piece: 'P', color: 'b' };
  }
  INITIAL_PIECES['a1'] = { piece: 'R', color: 'w' };
  INITIAL_PIECES['b1'] = { piece: 'N', color: 'w' };
  INITIAL_PIECES['c1'] = { piece: 'B', color: 'w' };
  INITIAL_PIECES['d1'] = { piece: 'Q', color: 'w' };
  INITIAL_PIECES['e1'] = { piece: 'K', color: 'w' };
  INITIAL_PIECES['f1'] = { piece: 'B', color: 'w' };
  INITIAL_PIECES['g1'] = { piece: 'N', color: 'w' };
  INITIAL_PIECES['h1'] = { piece: 'R', color: 'w' };
  INITIAL_PIECES['a8'] = { piece: 'R', color: 'b' };
  INITIAL_PIECES['b8'] = { piece: 'N', color: 'b' };
  INITIAL_PIECES['c8'] = { piece: 'B', color: 'b' };
  INITIAL_PIECES['d8'] = { piece: 'Q', color: 'b' };
  INITIAL_PIECES['e8'] = { piece: 'K', color: 'b' };
  INITIAL_PIECES['f8'] = { piece: 'B', color: 'b' };
  INITIAL_PIECES['g8'] = { piece: 'N', color: 'b' };
  INITIAL_PIECES['h8'] = { piece: 'R', color: 'b' };

  function parseSanMove(san: string, board: Map<string, { piece: string; color: 'w' | 'b' }>, isWhite: boolean): { from: string; to: string } | null {
    const color = isWhite ? 'w' : 'b';
    let s = san.replace(/[+#!?]/g, '');

    if (s === 'O-O' || s === 'O-O-O') {
      const rank = isWhite ? '1' : '8';
      if (s === 'O-O') return { from: `e${rank}`, to: `g${rank}` };
      return { from: `e${rank}`, to: `c${rank}` };
    }

    const isCapture = s.includes('x');
    s = s.replace('x', '');

    if (s[0] >= 'a' && s[0] <= 'h') {
      const to = s.slice(-2);
      if (isCapture) {
        const fromFile = s[0];
        const dir = isWhite ? -1 : 1;
        const fromRank = parseInt(to[1]) + dir;
        return { from: `${fromFile}${fromRank}`, to };
      }
      const dir = isWhite ? -1 : 1;
      const fromSq1 = `${to[0]}${parseInt(to[1]) + dir}`;
      if (board.has(fromSq1) && board.get(fromSq1)!.piece === 'P' && board.get(fromSq1)!.color === color) {
        return { from: fromSq1, to };
      }
      const fromSq2 = `${to[0]}${parseInt(to[1]) + dir * 2}`;
      if (board.has(fromSq2) && board.get(fromSq2)!.piece === 'P' && board.get(fromSq2)!.color === color) {
        return { from: fromSq2, to };
      }
      return null;
    }

    const pieceChar = s[0];
    const rest = s.slice(1);
    const to = rest.slice(-2);
    const disambig = rest.slice(0, -2);

    for (const [sq, p] of board) {
      if (p.piece !== pieceChar || p.color !== color) continue;
      if (disambig.length === 1) {
        if (disambig >= 'a' && disambig <= 'h' && sq[0] !== disambig) continue;
        if (disambig >= '1' && disambig <= '8' && sq[1] !== disambig) continue;
      }
      return { from: sq, to };
    }
    return null;
  }

  function applyMoves(moves: string[]): Map<string, { piece: string; color: 'w' | 'b' }> {
    const board = new Map(Object.entries(INITIAL_PIECES));
    for (let i = 0; i < moves.length; i++) {
      const isWhite = i % 2 === 0;
      const parsed = parseSanMove(moves[i], board, isWhite);
      if (!parsed) continue;
      const piece = board.get(parsed.from);
      if (!piece) continue;
      board.delete(parsed.from);
      board.set(parsed.to, piece);
      if (piece.piece === 'K' && Math.abs(parsed.from.charCodeAt(0) - parsed.to.charCodeAt(0)) === 2) {
        const rank = parsed.from[1];
        if (parsed.to[0] === 'g') {
          const rook = board.get(`h${rank}`);
          if (rook) { board.delete(`h${rank}`); board.set(`f${rank}`, rook); }
        } else {
          const rook = board.get(`a${rank}`);
          if (rook) { board.delete(`a${rank}`); board.set(`d${rank}`, rook); }
        }
      }
    }
    return board;
  }

  interface Question {
    opening: string;
    moves: string[];
    askPiece: string;
    askColor: 'w' | 'b';
    correctSquare: string;
  }

  function generateQuestion(): Question {
    const opening = OPENINGS[Math.floor(Math.random() * OPENINGS.length)];
    const numMoves = Math.min(opening.moves.length, Math.floor(Math.random() * 3) + 3);
    const moves = opening.moves.slice(0, numMoves);
    const board = applyMoves(moves);

    const movedPieces: { piece: string; color: 'w' | 'b'; square: string }[] = [];
    for (const [sq, p] of board) {
      const initial = INITIAL_PIECES[sq];
      if (!initial || initial.piece !== p.piece || initial.color !== p.color) {
        movedPieces.push({ ...p, square: sq });
      }
    }

    if (movedPieces.length === 0) {
      const entries = [...board.entries()];
      const [sq, p] = entries[Math.floor(Math.random() * entries.length)];
      return { opening: opening.name, moves, askPiece: p.piece, askColor: p.color, correctSquare: sq };
    }

    const pick = movedPieces[Math.floor(Math.random() * movedPieces.length)];
    return { opening: opening.name, moves, askPiece: pick.piece, askColor: pick.color, correctSquare: pick.square };
  }

  function getStars(correct: number, total: number): number {
    const pct = total > 0 ? correct / total : 0;
    if (pct >= 0.9) return 3;
    if (pct >= 0.7) return 2;
    if (pct >= 0.5) return 1;
    return 0;
  }

  const PIECE_NAMES: Record<string, string> = {
    K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn',
  };

  const ROUNDS = 10;

  let phase: 'idle' | 'playing' | 'feedback' | 'done' = $state('idle');
  let question: Question | null = $state(null);
  let input = $state('');
  let correct = $state(0);
  let total = $state(0);
  let round = $state(0);
  let isCorrect = $state(false);
  let bestStars = $state(0);

  let inputEl: HTMLInputElement | null = $state(null);

  onMount(() => {
    bestStars = parseInt(localStorage.getItem('blindfold-landed-best-stars') ?? '0', 10);
  });

  $effect(() => {
    if ((phase === 'playing') && inputEl) inputEl.focus();
  });

  function startGame() {
    question = generateQuestion();
    phase = 'playing';
    correct = 0;
    total = 0;
    round = 1;
    input = '';
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!question || phase !== 'playing') return;
    const sq = input.trim().toLowerCase();
    input = '';

    const right = sq === question.correctSquare;
    isCorrect = right;
    if (right) correct += 1;
    total += 1;
    phase = 'feedback';
  }

  function nextRound() {
    if (round >= ROUNDS) {
      const stars = getStars(correct, total);
      if (stars > bestStars) {
        localStorage.setItem('blindfold-landed-best-stars', String(stars));
        bestStars = stars;
      }
      phase = 'done';
      return;
    }
    question = generateQuestion();
    phase = 'playing';
    round += 1;
    input = '';
  }

  function goIdle() {
    phase = 'idle';
  }

  let stars = $derived(getStars(correct, total));
</script>

<div class="container">
  {#if phase === 'idle'}
    <div class="center-col">
      <h2 class="title">Where Did It Land?</h2>
      <p class="muted">
        Follow a sequence of opening moves mentally. Then answer: where is a specific piece? {ROUNDS} rounds.
      </p>
      {#if bestStars > 0}
        <div class="best">
          <StarRating stars={bestStars} size="sm" />
        </div>
      {/if}
      <button class="start-btn" onclick={startGame}>Start</button>
    </div>
  {:else if phase === 'done'}
    <div class="center-col">
      <h2 class="title">Complete!</h2>
      <p class="big-score">{correct}/{total} correct</p>
      {#if stars > 0}
        <StarRating {stars} size="lg" />
      {/if}
      <button class="start-btn" onclick={goIdle}>Play Again</button>
    </div>
  {:else if phase === 'feedback' && question}
    {@const colorName = question.askColor === 'w' ? 'white' : 'black'}
    <div class="center-col">
      <div class="round-label">Round {round}/{ROUNDS}</div>
      <p class="feedback-text" class:correct-text={isCorrect} class:wrong-text={!isCorrect}>
        {isCorrect ? 'Correct!' : 'Wrong!'}
      </p>
      <p class="muted">
        The {colorName} {PIECE_NAMES[question.askPiece]} is on <span class="mono-bold">{question.correctSquare}</span>
      </p>
      <div class="moves-summary">
        <span class="moves-name">{question.opening}:</span>
        {' '}
        {#each question.moves as m, i}
          <span>{#if i % 2 === 0}<span>{Math.floor(i / 2) + 1}. </span>{/if}{m} </span>
        {/each}
      </div>
      <button class="go-btn" onclick={nextRound}>
        {round >= ROUNDS ? 'See Results' : 'Next'}
      </button>
    </div>
  {:else if phase === 'playing' && question}
    {@const colorName = question.askColor === 'w' ? 'white' : 'black'}
    <div class="center-col">
      <div class="round-label">Round {round}/{ROUNDS}</div>

      <div class="move-box">
        <div class="move-box-name">{question.opening}</div>
        <div class="move-box-moves">
          {#each question.moves as m, i}
            <span>{#if i % 2 === 0}<span class="move-num">{Math.floor(i / 2) + 1}. </span>{/if}<span class="move-san">{m} </span></span>
          {/each}
        </div>
      </div>

      <div class="question-area">
        <div class="question-text">
          Where is the
          <span class="bold">{colorName} {PIECE_NAMES[question.askPiece]}</span>?
        </div>
        <img
          src="/pieces/{question.askColor}{question.askPiece}.svg"
          alt="{colorName} {PIECE_NAMES[question.askPiece]}"
          class="piece-img"
        />
      </div>

      <form class="input-row" onsubmit={handleSubmit}>
        <input
          bind:this={inputEl}
          type="text"
          bind:value={input}
          placeholder="Square..."
          maxlength={2}
          class="sq-input"
          autocomplete="off"
          autocapitalize="off"
        />
        <button type="submit" class="go-btn">Go</button>
      </form>
    </div>
  {/if}
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    max-width: 28rem;
    margin: 0 auto;
  }

  .center-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
  }

  .title {
    font-size: 1.25rem;
    font-weight: bold;
  }

  .muted {
    color: var(--text-muted);
  }

  .best {
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .round-label {
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .start-btn {
    padding: 0.75rem 2rem;
    background: rgba(255, 248, 230, 0.15);
    color: var(--foreground);
    border: none;
    border-radius: 0.5rem;
    font-weight: bold;
    font-size: 1.125rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .start-btn:hover {
    background: rgba(255, 248, 230, 0.25);
  }

  .big-score {
    font-size: 1.875rem;
    font-weight: bold;
  }

  .move-box {
    width: 100%;
    padding: 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
  }

  .move-box-name {
    font-size: 0.75rem;
    color: var(--text-faint);
    margin-bottom: 0.5rem;
  }

  .move-box-moves {
    font-family: monospace;
    font-size: 1.125rem;
  }

  .move-num {
    color: var(--text-faint);
  }

  .move-san {
    font-weight: bold;
  }

  .question-area {
    padding: 0.5rem 0;
  }

  .question-text {
    font-size: 1.125rem;
  }

  .bold {
    font-weight: bold;
  }

  .piece-img {
    width: 3rem;
    height: 3rem;
    margin: 0.5rem auto 0;
    display: block;
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
    width: 100%;
    max-width: 200px;
  }

  .sq-input {
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

  .sq-input:focus {
    outline: none;
    border-color: rgba(255, 248, 230, 0.4);
  }

  .go-btn {
    padding: 0.5rem 1rem;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .go-btn:hover {
    background: #15803d;
  }

  .feedback-text {
    font-size: 1.25rem;
    font-weight: bold;
  }

  .correct-text {
    color: #4ade80;
  }

  .wrong-text {
    color: #f87171;
  }

  .mono-bold {
    font-family: monospace;
    font-weight: bold;
  }

  .moves-summary {
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .moves-name {
    font-weight: 500;
  }
</style>
