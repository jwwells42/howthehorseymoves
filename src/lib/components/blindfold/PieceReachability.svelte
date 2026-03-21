<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';

  const GAME_DURATION = 30;
  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';

  type PieceType = 'N' | 'B';

  const PIECE_NAMES: Record<PieceType, string> = { N: 'Knight', B: 'Bishop' };

  interface Question {
    piece: PieceType;
    from: string;
    to: string;
    reachable: boolean;
    reason: string;
  }

  interface Attempt extends Question {
    correct: boolean;
  }

  function sameColor(sq1: string, sq2: string): boolean {
    const f1 = sq1.charCodeAt(0) - 97, r1 = parseInt(sq1[1]) - 1;
    const f2 = sq2.charCodeAt(0) - 97, r2 = parseInt(sq2[1]) - 1;
    return (f1 + r1) % 2 === (f2 + r2) % 2;
  }

  function knightCanReachInN(from: string, to: string, n: number): boolean {
    if (n === 0) return from === to;
    const visited = new Set([from]);
    let frontier = [from];
    for (let step = 0; step < n; step++) {
      const next: string[] = [];
      for (const sq of frontier) {
        const f = sq.charCodeAt(0) - 97;
        const r = parseInt(sq[1]) - 1;
        for (const [df, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
          const nf = f + df, nr = r + dr;
          if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
          const nsq = String.fromCharCode(97 + nf) + (nr + 1);
          if (visited.has(nsq)) continue;
          visited.add(nsq);
          next.push(nsq);
          if (nsq === to) return true;
        }
      }
      frontier = next;
    }
    return false;
  }

  function generateQuestion(): Question {
    const piece: PieceType = Math.random() < 0.5 ? 'N' : 'B';
    const forceYes = Math.random() < 0.5;

    for (;;) {
      const f1 = Math.floor(Math.random() * 8);
      const r1 = Math.floor(Math.random() * 8);
      const f2 = Math.floor(Math.random() * 8);
      const r2 = Math.floor(Math.random() * 8);
      if (f1 === f2 && r1 === r2) continue;
      const from = String.fromCharCode(97 + f1) + (r1 + 1);
      const to = String.fromCharCode(97 + f2) + (r2 + 1);

      if (piece === 'B') {
        const same = sameColor(from, to);
        if (forceYes && !same) continue;
        if (!forceYes && same) continue;
        return {
          piece: 'B',
          from, to,
          reachable: same,
          reason: same ? 'Same color squares' : 'Different color squares',
        };
      } else {
        const moves = Math.floor(Math.random() * 3) + 2; // 2-4 moves
        const canReach = knightCanReachInN(from, to, moves);
        if (forceYes && !canReach) continue;
        if (!forceYes && canReach) continue;
        return {
          piece: 'N',
          from, to,
          reachable: canReach,
          reason: canReach ? `Reachable in \u2264${moves} moves` : `Not reachable in ${moves} moves`,
        };
      }
    }
  }

  function getStars(score: number): number {
    if (score >= 18) return 3;
    if (score >= 10) return 2;
    if (score >= 5) return 1;
    return 0;
  }

  function sqToCoords(sq: string): [number, number] {
    return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
  }

  // Mini board constants
  const MB_S = 10;
  const MB_B = MB_S * 8;

  function getMiniBoardFill(attempt: Attempt, fi: number, ri: number): string {
    const [f1, r1] = sqToCoords(attempt.from);
    const [f2, r2] = sqToCoords(attempt.to);
    const isLight = (fi + ri) % 2 === 0;
    const isSq1 = fi === f1 && ri === r1;
    const isSq2 = fi === f2 && ri === r2;

    if (isSq1) return '#5b9bd5';
    if (isSq2) return attempt.reachable ? '#4ade80' : '#ef4444';
    return isLight ? LIGHT : DARK;
  }

  let gameState = $state<'idle' | 'playing' | 'done'>('idle');
  let score = $state(0);
  let timeLeft = $state(GAME_DURATION);
  let question = $state<Question>(generateQuestion());
  let flash = $state<'correct' | 'wrong' | null>(null);
  let bestScore = $state(0);
  let bestStars = $state(0);
  let history = $state<Attempt[]>([]);

  let timerRef: ReturnType<typeof setInterval> | null = null;
  let flashTimeout: ReturnType<typeof setTimeout> | null = null;

  let stars = $derived(getStars(score));
  let timerColor = $derived(timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#fb923c' : '#22c55e');
  let wrongOnes = $derived(history.filter((a) => !a.correct));

  // Extract move count from question.reason for display
  let questionMoveCount = $derived(question.reason.match(/\d+/)?.[0] ?? '?');

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('blindfold-reachability-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('blindfold-reachability-best-stars') ?? '0', 10);

    return () => {
      if (timerRef) clearInterval(timerRef);
      if (flashTimeout) clearTimeout(flashTimeout);
    };
  });

  function startGame() {
    gameState = 'playing';
    score = 0;
    timeLeft = GAME_DURATION;
    question = generateQuestion();
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
      localStorage.setItem('blindfold-reachability-best', String(score));
      bestScore = score;
    }
    if (s > bestStars) {
      localStorage.setItem('blindfold-reachability-best-stars', String(s));
      bestStars = s;
    }
  }

  function handleAnswer(answeredYes: boolean) {
    if (gameState !== 'playing') return;
    if (flashTimeout) clearTimeout(flashTimeout);

    const correct = question.reachable === answeredYes;
    history = [...history, { ...question, correct }];

    if (correct) {
      score += 1;
      flash = 'correct';
    } else {
      flash = 'wrong';
    }
    question = generateQuestion();
    flashTimeout = setTimeout(() => { flash = null; }, 200);
  }
</script>

<div class="container">
  {#if gameState === 'idle'}
    <div class="center-col">
      <h2 class="title">Piece Reachability</h2>
      <p class="subtitle">
        Can the piece reach the target square? Bishops need same-color squares. Knights need the right number of moves. You have 30 seconds!
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
            {#each wrongOnes as attempt}
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
                  <span class="mono bold">{PIECE_NAMES[attempt.piece]}</span>
                  <br />
                  <span class="mono">{attempt.from} &rarr; {attempt.to}</span>
                  <br />
                  <span class="text-red">
                    {attempt.reachable ? 'Yes' : 'No'}
                    <span class="faint"> (you: {attempt.reachable ? 'No' : 'Yes'})</span>
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
            {#each history as attempt}
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
                  <span class="mono bold">{PIECE_NAMES[attempt.piece]}</span>
                  <br />
                  <span class="mono">{attempt.from} &rarr; {attempt.to}</span>
                  <br />
                  <span class={attempt.correct ? 'text-green' : 'text-red'}>
                    {attempt.reachable ? 'Yes' : 'No'}
                    {#if !attempt.correct}
                      <span class="faint"> (you: {attempt.reachable ? 'No' : 'Yes'})</span>
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
      <img
        src="/pieces/w{question.piece}.svg"
        alt={PIECE_NAMES[question.piece]}
        class="piece-img"
      />
      <div class={['square-display', flash === 'correct' && 'flash-correct', flash === 'wrong' && 'flash-wrong']}>
        {question.from} &rarr; {question.to}
      </div>
      <div class="question-label">
        {#if question.piece === 'B'}
          Can a bishop reach it?
        {:else}
          Can a knight reach it in &le;{questionMoveCount} moves?
        {/if}
      </div>
    </div>

    <div class="answer-buttons">
      <button class="yes-btn" onclick={() => handleAnswer(true)}>
        Yes
      </button>
      <button class="no-btn" onclick={() => handleAnswer(false)}>
        No
      </button>
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
    width: 3rem;
    height: 3rem;
  }

  .square-display {
    font-size: 1.875rem;
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

  .answer-buttons {
    display: flex;
    gap: 1rem;
  }

  .yes-btn {
    padding: 1rem 2.5rem;
    border-radius: 0.75rem;
    border: 2px solid #16a34a;
    background: transparent;
    color: #4ade80;
    font-weight: bold;
    font-size: 1.125rem;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }

  .yes-btn:hover {
    background: rgba(22, 163, 74, 0.2);
  }

  .yes-btn:active {
    transform: scale(0.95);
  }

  .no-btn {
    padding: 1rem 2.5rem;
    border-radius: 0.75rem;
    border: 2px solid #ef4444;
    background: transparent;
    color: #f87171;
    font-weight: bold;
    font-size: 1.125rem;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }

  .no-btn:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .no-btn:active {
    transform: scale(0.95);
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
