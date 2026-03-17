<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';

  const GAME_DURATION = 30;
  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';

  type PieceType = 'N' | 'B' | 'R' | 'Q' | 'K';

  const PIECE_NAMES: Record<PieceType, string> = {
    N: 'Knight', B: 'Bishop', R: 'Rook', Q: 'Queen', K: 'King',
  };

  const PIECE_ICONS: Record<PieceType, string> = {
    N: '/pieces/wN.svg', B: '/pieces/wB.svg', R: '/pieces/wR.svg', Q: '/pieces/wQ.svg', K: '/pieces/wK.svg',
  };

  interface Attempt {
    piece: PieceType;
    square: string;
    correct: boolean;
    answer: number;
    expected: number;
  }

  function countAttacks(piece: PieceType, f: number, r: number): number {
    if (piece === 'N') {
      const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
      return offsets.filter(([df, dr]) => {
        const nf = f + df, nr = r + dr;
        return nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7;
      }).length;
    }
    if (piece === 'K') {
      const offsets = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
      return offsets.filter(([df, dr]) => {
        const nf = f + df, nr = r + dr;
        return nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7;
      }).length;
    }
    if (piece === 'R') {
      return 14;
    }
    if (piece === 'B') {
      return Math.min(f, r) + Math.min(7 - f, r) + Math.min(f, 7 - r) + Math.min(7 - f, 7 - r);
    }
    // Queen = Bishop + Rook
    const bishopCount = Math.min(f, r) + Math.min(7 - f, r) + Math.min(f, 7 - r) + Math.min(7 - f, 7 - r);
    return bishopCount + 14;
  }

  function getAttackedSquares(piece: PieceType, f: number, r: number): [number, number][] {
    const squares: [number, number][] = [];
    if (piece === 'N') {
      for (const [df, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nf = f + df, nr = r + dr;
        if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) squares.push([nf, nr]);
      }
    } else if (piece === 'K') {
      for (const [df, dr] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        const nf = f + df, nr = r + dr;
        if (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) squares.push([nf, nr]);
      }
    } else {
      const dirs: [number, number][] = [];
      if (piece === 'B' || piece === 'Q') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
      if (piece === 'R' || piece === 'Q') dirs.push([1,0],[-1,0],[0,1],[0,-1]);
      for (const [df, dr] of dirs) {
        let nf = f + df, nr = r + dr;
        while (nf >= 0 && nf <= 7 && nr >= 0 && nr <= 7) {
          squares.push([nf, nr]);
          nf += df; nr += dr;
        }
      }
    }
    return squares;
  }

  const PIECE_POOL: PieceType[] = ['N', 'N', 'N', 'B', 'B', 'K', 'K', 'Q', 'R'];

  function generateQuestion(): { piece: PieceType; square: string; expected: number } {
    const piece = PIECE_POOL[Math.floor(Math.random() * PIECE_POOL.length)];
    const f = Math.floor(Math.random() * 8);
    const r = Math.floor(Math.random() * 8);
    const square = String.fromCharCode(97 + f) + (r + 1);
    return { piece, square, expected: countAttacks(piece, f, r) };
  }

  function getStars(score: number): number {
    if (score >= 10) return 3;
    if (score >= 6) return 2;
    if (score >= 3) return 1;
    return 0;
  }

  // Mini board helper
  const MB_S = 10;
  const MB_B = MB_S * 8;

  function getMiniBoardFill(attempt: Attempt, fi: number, ri: number): string {
    const f = attempt.square.charCodeAt(0) - 97;
    const r = parseInt(attempt.square[1]) - 1;
    const svgR = 7 - r;
    const attacked = getAttackedSquares(attempt.piece, f, r);
    const attackedSet = new Set(attacked.map(([af, ar]) => `${af},${7 - ar}`));

    const isLight = (fi + ri) % 2 === 0;
    const isPiece = fi === f && ri === svgR;
    const isAttacked = attackedSet.has(`${fi},${ri}`);

    if (isPiece) return '#5b9bd5';
    if (isAttacked) return attempt.correct ? '#a3d9a3' : '#f0a0a0';
    return isLight ? LIGHT : DARK;
  }

  let gameState: 'idle' | 'playing' | 'done' = $state('idle');
  let score = $state(0);
  let timeLeft = $state(GAME_DURATION);
  let question = $state(generateQuestion());
  let input = $state('');
  let flash: 'correct' | 'wrong' | null = $state(null);
  let bestScore = $state(0);
  let bestStars = $state(0);
  let history: Attempt[] = $state([]);
  let inputEl: HTMLInputElement | null = $state(null);

  let timerRef: ReturnType<typeof setInterval> | null = null;
  let flashTimeout: ReturnType<typeof setTimeout> | null = null;

  let stars = $derived(getStars(score));
  let timerColor = $derived(timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#fb923c' : '#22c55e');
  let wrongOnes = $derived(history.filter((a) => !a.correct));

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('blindfold-counting-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('blindfold-counting-best-stars') ?? '0', 10);

    return () => {
      if (timerRef) clearInterval(timerRef);
      if (flashTimeout) clearTimeout(flashTimeout);
    };
  });

  $effect(() => {
    if (gameState === 'playing') {
      inputEl?.focus();
    }
  });

  function startGame() {
    gameState = 'playing';
    score = 0;
    timeLeft = GAME_DURATION;
    question = generateQuestion();
    input = '';
    flash = null;
    history = [];

    if (timerRef) clearInterval(timerRef);
    timerRef = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  function endGame() {
    if (timerRef) {
      clearInterval(timerRef);
      timerRef = null;
    }
    gameState = 'done';

    const s = getStars(score);
    if (score > bestScore) {
      localStorage.setItem('blindfold-counting-best', String(score));
      bestScore = score;
    }
    if (s > bestStars) {
      localStorage.setItem('blindfold-counting-best-stars', String(s));
      bestStars = s;
    }
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (gameState !== 'playing') return;
    const answer = parseInt(input.trim());
    if (isNaN(answer)) return;
    if (flashTimeout) clearTimeout(flashTimeout);

    const correct = answer === question.expected;
    history = [...history, {
      piece: question.piece,
      square: question.square,
      correct,
      answer,
      expected: question.expected,
    }];

    if (correct) {
      score += 1;
      flash = 'correct';
    } else {
      flash = 'wrong';
    }
    input = '';
    question = generateQuestion();
    flashTimeout = setTimeout(() => { flash = null; }, 200);
  }
</script>

<div class="container">
  {#if gameState === 'idle'}
    <div class="center-col">
      <h2 class="title">Move Counting</h2>
      <p class="subtitle">
        A piece appears on a square. How many squares does it control on an empty board? You have 30 seconds!
      </p>
      {#if bestScore > 0}
        <div class="best">
          Best: {bestScore}
          {#if bestStars > 0}
            <StarRating stars={bestStars} size="sm" />
          {/if}
        </div>
      {/if}
      <button class="start-btn" onclick={startGame}>Start</button>
    </div>
  {:else if gameState === 'done'}
    <div class="center-col">
      <h2 class="title">Time's up!</h2>
      <p class="big-score">{score}/{history.length} correct</p>
      {#if stars > 0}
        <StarRating {stars} size="lg" />
      {/if}
      {#if bestScore > 0}
        <p class="best-text">Personal best: {bestScore}</p>
      {/if}
      <button class="start-btn" onclick={startGame}>Play Again</button>

      {#if wrongOnes.length > 0}
        <div class="section-divider">
          <h3 class="section-title">Mistakes ({wrongOnes.length})</h3>
          <div class="mini-grid">
            {#each wrongOnes as attempt, i}
              <div class="mini-board-wrap">
                <svg
                  viewBox="0 0 {MB_B} {MB_B}"
                  class="mini-board"
                  style="border-color: {attempt.correct ? '#22c55e' : '#ef4444'};"
                >
                  {#each Array(8) as _, ri}
                    {#each Array(8) as _, fi}
                      <rect
                        x={fi * MB_S} y={ri * MB_S}
                        width={MB_S} height={MB_S}
                        fill={getMiniBoardFill(attempt, fi, ri)}
                      />
                    {/each}
                  {/each}
                </svg>
                <div class="mini-label">
                  <span class="mono bold">{PIECE_NAMES[attempt.piece]} {attempt.square}</span>
                  <br />
                  <span class="text-red">{attempt.expected} squares
                    <span class="faint"> (you: {attempt.answer})</span>
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if history.length > 0}
        <div class="section-divider">
          <h3 class="section-title">All answers ({history.length})</h3>
          <div class="mini-grid">
            {#each history as attempt, i}
              <div class="mini-board-wrap">
                <svg
                  viewBox="0 0 {MB_B} {MB_B}"
                  class="mini-board"
                  style="border-color: {attempt.correct ? '#22c55e' : '#ef4444'};"
                >
                  {#each Array(8) as _, ri}
                    {#each Array(8) as _, fi}
                      <rect
                        x={fi * MB_S} y={ri * MB_S}
                        width={MB_S} height={MB_S}
                        fill={getMiniBoardFill(attempt, fi, ri)}
                      />
                    {/each}
                  {/each}
                </svg>
                <div class="mini-label">
                  <span class="mono bold">{PIECE_NAMES[attempt.piece]} {attempt.square}</span>
                  <br />
                  <span class={attempt.correct ? 'text-green' : 'text-red'}>
                    {attempt.expected} squares
                    {#if !attempt.correct}
                      <span class="faint"> (you: {attempt.answer})</span>
                    {/if}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <!-- Playing state -->
    <div class="timer-bar-track">
      <div
        class="timer-bar-fill"
        style="width: {(timeLeft / GAME_DURATION) * 100}%; background: {timerColor};"
      ></div>
    </div>

    <div class="hud">
      <span>Score: {score}</span>
      <span>{timeLeft}s</span>
    </div>

    <div class="question-area">
      <img src={PIECE_ICONS[question.piece]} alt={PIECE_NAMES[question.piece]} class="piece-img" />
      <div class="square-display" class:flash-correct={flash === 'correct'} class:flash-wrong={flash === 'wrong'}>
        {question.square}
      </div>
      <div class="question-label">How many squares?</div>
    </div>

    <form class="input-row" onsubmit={handleSubmit}>
      <input
        bind:this={inputEl}
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        bind:value={input}
        placeholder="#"
        maxlength={2}
        class="text-input"
        autocomplete="off"
      />
      <button type="submit" class="go-btn">Go</button>
    </form>
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
    max-width: 42rem;
    margin: 0 auto;
  }

  .title {
    font-size: 1.25rem;
    font-weight: bold;
  }

  .subtitle {
    color: var(--text-muted);
  }

  .best {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .best-text {
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .big-score {
    font-size: 1.875rem;
    font-weight: bold;
  }

  .start-btn {
    padding: 0.75rem 2rem;
    font-size: 1.125rem;
    font-weight: bold;
    border: none;
    border-radius: 0.5rem;
    background: #16a34a;
    color: white;
    cursor: pointer;
    transition: background 0.15s;
  }

  .start-btn:hover {
    background: #15803d;
  }

  .timer-bar-track {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 9999px;
    overflow: hidden;
  }

  .timer-bar-fill {
    height: 100%;
    transition: width 1s linear, background 0.5s;
  }

  .hud {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .question-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem 0;
  }

  .piece-img {
    width: 4rem;
    height: 4rem;
  }

  .square-display {
    font-size: 2.25rem;
    font-weight: bold;
    transition: color 0.1s;
  }

  .flash-correct {
    color: #4ade80;
  }

  .flash-wrong {
    color: #f87171;
  }

  .question-label {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .input-row {
    display: flex;
    gap: 0.5rem;
    width: 100%;
    max-width: 200px;
  }

  .text-input {
    flex: 1;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--foreground);
    font-family: monospace;
    font-size: 1.5rem;
    text-align: center;
  }

  .text-input:focus {
    outline: none;
    border-color: rgba(255, 248, 230, 0.4);
  }

  .text-input::placeholder {
    color: var(--text-faint);
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

  .section-divider {
    width: 100%;
    border-top: 1px solid rgba(255, 248, 230, 0.1);
    margin-top: 0.5rem;
    padding-top: 1rem;
  }

  .section-title {
    font-weight: bold;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
  }

  .mini-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    justify-items: center;
  }

  @media (min-width: 640px) {
    .mini-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .mini-board-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .mini-board {
    width: 5rem;
    height: 5rem;
    border: 3px solid;
    border-radius: 4px;
  }

  .mini-label {
    font-size: 0.75rem;
    text-align: center;
  }

  .mono {
    font-family: monospace;
  }

  .bold {
    font-weight: bold;
  }

  .text-green {
    color: #4ade80;
  }

  .text-red {
    color: #f87171;
  }

  .faint {
    color: var(--text-faint);
  }
</style>
