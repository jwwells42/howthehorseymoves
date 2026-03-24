<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { playSound } from '$lib/state/sound';

  const GAME_DURATION = 30;
  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';

  interface Attempt {
    sq1: string;
    sq2: string;
    same: boolean;
    correct: boolean;
  }

  function areSameDiagonal(sq1: string, sq2: string): boolean {
    const df = Math.abs(sq1.charCodeAt(0) - sq2.charCodeAt(0));
    const dr = Math.abs(parseInt(sq1[1]) - parseInt(sq2[1]));
    return df === dr;
  }

  function generatePair(): { sq1: string; sq2: string; same: boolean } {
    const forceSame = Math.random() < 0.5;

    for (;;) {
      const f1 = Math.floor(Math.random() * 8);
      const r1 = Math.floor(Math.random() * 8);

      if (forceSame) {
        const dir1 = Math.random() < 0.5 ? 1 : -1;
        const dir2 = Math.random() < 0.5 ? 1 : -1;
        const dist = Math.floor(Math.random() * 7) + 1;
        const f2 = f1 + dir1 * dist;
        const r2 = r1 + dir2 * dist;
        if (f2 < 0 || f2 > 7 || r2 < 0 || r2 > 7) continue;
        return {
          sq1: String.fromCharCode(97 + f1) + (r1 + 1),
          sq2: String.fromCharCode(97 + f2) + (r2 + 1),
          same: true,
        };
      } else {
        const f2 = Math.floor(Math.random() * 8);
        const r2 = Math.floor(Math.random() * 8);
        if (f1 === f2 && r1 === r2) continue;
        const sq1 = String.fromCharCode(97 + f1) + (r1 + 1);
        const sq2 = String.fromCharCode(97 + f2) + (r2 + 1);
        if (areSameDiagonal(sq1, sq2)) continue;
        return { sq1, sq2, same: false };
      }
    }
  }

  function getStars(score: number): number {
    if (score >= 20) return 3;
    if (score >= 12) return 2;
    if (score >= 6) return 1;
    return 0;
  }

  function sqToCoords(sq: string): [number, number] {
    return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
  }

  type GameState = 'idle' | 'playing' | 'done';

  let gameState = $state<GameState>('idle');
  let score = $state(0);
  let timeLeft = $state(GAME_DURATION);
  let pair = $state(generatePair());
  let flash = $state<'correct' | 'wrong' | null>(null);
  let bestScore = $state(0);
  let bestStars = $state(0);
  let history = $state<Attempt[]>([]);

  let timerRef: ReturnType<typeof setInterval> | null = null;
  let flashRef: ReturnType<typeof setTimeout> | null = null;

  let stars = $derived(getStars(score));
  let timerBarColor = $derived(
    timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#fb923c' : '#22c55e'
  );

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('blindfold-diagonal-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('blindfold-diagonal-best-stars') ?? '0', 10);

    return () => {
      if (timerRef) clearInterval(timerRef);
      if (flashRef) clearTimeout(flashRef);
    };
  });

  function startGame() {
    score = 0;
    timeLeft = GAME_DURATION;
    pair = generatePair();
    flash = null;
    history = [];
    gameState = 'playing';

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
    if (s > 0) playSound('stars');
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('blindfold-diagonal-best', String(score));
    }
    if (s > bestStars) {
      bestStars = s;
      localStorage.setItem('blindfold-diagonal-best-stars', String(s));
    }
  }

  function handleAnswer(answeredYes: boolean) {
    if (gameState !== 'playing') return;
    if (flashRef) clearTimeout(flashRef);

    const correct = pair.same === answeredYes;
    history = [...history, { sq1: pair.sq1, sq2: pair.sq2, same: pair.same, correct }];

    if (correct) {
      score += 1;
      flash = 'correct';
      playSound('correct');
    } else {
      flash = 'wrong';
      playSound('wrong');
    }
    pair = generatePair();
    flashRef = setTimeout(() => { flash = null; }, 200);
  }

  const S = 10;
  const B = S * 8;

  function getDiagonalSquares(attempt: Attempt): [number, number][] {
    if (!attempt.same) return [];
    const [f1, r1] = sqToCoords(attempt.sq1);
    const [f2, r2] = sqToCoords(attempt.sq2);
    const squares: [number, number][] = [];
    const df = f2 > f1 ? 1 : -1;
    const dr = r2 > r1 ? 1 : -1;
    let f = f1, r = r1;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      squares.push([f, r]);
      f += df;
      r += dr;
    }
    f = f1 - df;
    r = r1 - dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      squares.push([f, r]);
      f -= df;
      r -= dr;
    }
    return squares;
  }
</script>

<div class="trainer">
  {#if gameState === 'idle'}
    <div class="screen">
      <h2 class="title">Same Diagonal?</h2>
      <p class="instructions">
        Two squares will appear. Are they on the same diagonal? You have 30 seconds!
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

  {:else if gameState === 'playing'}
    <div class="timer-bar-track">
      <div
        class="timer-bar-fill"
        style="width: {(timeLeft / GAME_DURATION) * 100}%; background: {timerBarColor};"
      ></div>
    </div>

    <div class="hud">
      <span>Score: {score}</span>
      <span>{timeLeft}s</span>
    </div>

    <div
      class={['target-pair', flash === 'correct' && 'flash-correct', flash === 'wrong' && 'flash-wrong']}
    >
      {pair.sq1} &mdash; {pair.sq2}
    </div>

    <div class="answer-buttons">
      <button class="yes-btn" onclick={() => handleAnswer(true)}>Yes</button>
      <button class="no-btn" onclick={() => handleAnswer(false)}>No</button>
    </div>

  {:else}
    {@const wrongOnes = history.filter((a) => !a.correct)}

    <div class="screen">
      <h2 class="title">Time's up!</h2>
      <p class="final-score">{score}/{history.length} correct</p>
      {#if stars > 0}
        <StarRating stars={stars} size="lg" />
      {/if}
      {#if bestScore > 0}
        <p class="best-small">Personal best: {bestScore}</p>
      {/if}
      <button class="start-btn" onclick={startGame}>Play Again</button>

      {#if wrongOnes.length > 0}
        <div class="review-section">
          <h3 class="review-heading">Mistakes ({wrongOnes.length})</h3>
          <div class="mini-grid">
            {#each wrongOnes as attempt}
              {@const [f1, r1] = sqToCoords(attempt.sq1)}
              {@const [f2, r2] = sqToCoords(attempt.sq2)}
              {@const diagSquares = getDiagonalSquares(attempt)}
              {@const borderColor = attempt.correct ? '#22c55e' : '#ef4444'}
              <div class="mini-item">
                <svg
                  viewBox="0 0 {B} {B}"
                  class="mini-svg"
                  style="border: 3px solid {borderColor}; border-radius: 4px;"
                >
                  {#each Array(8) as _, ri}
                    {#each Array(8) as _, fi}
                      {@const isLight = (fi + ri) % 2 === 0}
                      {@const isDiag = diagSquares.some(([df, dr]) => df === fi && dr === ri)}
                      {@const isSq = (fi === f1 && ri === r1) || (fi === f2 && ri === r2)}
                      <rect
                        x={fi * S}
                        y={ri * S}
                        width={S}
                        height={S}
                        fill={isSq ? '#5b9bd5' : isDiag ? (attempt.correct ? '#a3d9a3' : '#f0a0a0') : isLight ? LIGHT : DARK}
                      />
                    {/each}
                  {/each}
                </svg>
                <div class="mini-label">
                  <span class="mini-square">{attempt.sq1} — {attempt.sq2}</span><br />
                  <span class="text-red">
                    {attempt.same ? 'Yes' : 'No'}
                    <span class="text-faint"> (you: {attempt.same ? 'No' : 'Yes'})</span>
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if history.length > 0}
        <div class="review-section">
          <h3 class="review-heading">All answers ({history.length})</h3>
          <div class="mini-grid">
            {#each history as attempt}
              {@const [f1, r1] = sqToCoords(attempt.sq1)}
              {@const [f2, r2] = sqToCoords(attempt.sq2)}
              {@const diagSquares = getDiagonalSquares(attempt)}
              {@const borderColor = attempt.correct ? '#22c55e' : '#ef4444'}
              <div class="mini-item">
                <svg
                  viewBox="0 0 {B} {B}"
                  class="mini-svg"
                  style="border: 3px solid {borderColor}; border-radius: 4px;"
                >
                  {#each Array(8) as _, ri}
                    {#each Array(8) as _, fi}
                      {@const isLight = (fi + ri) % 2 === 0}
                      {@const isDiag = diagSquares.some(([df, dr]) => df === fi && dr === ri)}
                      {@const isSq = (fi === f1 && ri === r1) || (fi === f2 && ri === r2)}
                      <rect
                        x={fi * S}
                        y={ri * S}
                        width={S}
                        height={S}
                        fill={isSq ? '#5b9bd5' : isDiag ? (attempt.correct ? '#a3d9a3' : '#f0a0a0') : isLight ? LIGHT : DARK}
                      />
                    {/each}
                  {/each}
                </svg>
                <div class="mini-label">
                  <span class="mini-square">{attempt.sq1} — {attempt.sq2}</span><br />
                  <span class={attempt.correct ? 'text-green' : 'text-red'}>
                    {attempt.same ? 'Yes' : 'No'}
                    {#if !attempt.correct}
                      <span class="text-faint"> (you: {attempt.same ? 'No' : 'Yes'})</span>
                    {/if}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .trainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    max-width: 28rem;
    margin: 0 auto;
  }

  .screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    max-width: 42rem;
  }

  .title {
    font-size: 1.25rem;
    font-weight: bold;
  }

  .instructions {
    color: var(--text-muted);
  }

  .best {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .best-small {
    font-size: 0.875rem;
    color: var(--text-faint);
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

  /* Timer */
  .timer-bar-track {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 9999px;
    overflow: hidden;
  }

  .timer-bar-fill {
    height: 100%;
    border-radius: 9999px;
    transition: width 1s linear, background 0.5s;
  }

  .hud {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  /* Target pair */
  .target-pair {
    font-size: 3rem;
    font-weight: bold;
    padding: 2rem 0;
    transition: color 0.1s;
  }

  .target-pair.flash-correct {
    color: #4ade80;
  }

  .target-pair.flash-wrong {
    color: #ef4444;
  }

  /* Answer buttons */
  .answer-buttons {
    display: flex;
    gap: 1rem;
  }

  .yes-btn,
  .no-btn {
    padding: 1rem 2.5rem;
    border-radius: 0.75rem;
    font-weight: bold;
    font-size: 1.125rem;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    background: transparent;
  }

  .yes-btn:active,
  .no-btn:active {
    transform: scale(0.95);
  }

  .yes-btn {
    border: 2px solid #16a34a;
    color: #4ade80;
  }

  .yes-btn:hover {
    background: rgba(22, 163, 74, 0.2);
  }

  .no-btn {
    border: 2px solid #ef4444;
    color: #f87171;
  }

  .no-btn:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  /* Final score */
  .final-score {
    font-size: 1.875rem;
    font-weight: bold;
  }

  /* Review */
  .review-section {
    width: 100%;
    border-top: 1px solid rgba(255, 248, 230, 0.1);
    margin-top: 0.5rem;
    padding-top: 1rem;
  }

  .review-heading {
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

  .mini-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .mini-svg {
    width: 5rem;
    height: 5rem;
  }

  .mini-label {
    font-size: 0.75rem;
    text-align: center;
  }

  .mini-square {
    font-family: monospace;
    font-weight: bold;
  }

  .text-green {
    color: #4ade80;
  }

  .text-red {
    color: #ef4444;
  }

  .text-faint {
    color: var(--text-faint);
  }
</style>
