<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';

  const GAME_DURATION = 30;

  type Direction = 'above' | 'below' | 'left' | 'right' | 'above-left' | 'above-right' | 'below-left' | 'below-right';

  const DIRECTION_LABELS: Record<Direction, string> = {
    'above': '\u2191 Above',
    'below': '\u2193 Below',
    'left': '\u2190 Left',
    'right': '\u2192 Right',
    'above-left': '\u2196 Above-Left',
    'above-right': '\u2197 Above-Right',
    'below-left': '\u2199 Below-Left',
    'below-right': '\u2198 Below-Right',
  };

  interface Question {
    sq1: string;
    sq2: string;
    direction: Direction;
  }

  interface Attempt extends Question {
    correct: boolean;
    answered: Direction;
  }

  function getDirection(sq1: string, sq2: string): Direction {
    const f1 = sq1.charCodeAt(0) - 97, r1 = parseInt(sq1[1]);
    const f2 = sq2.charCodeAt(0) - 97, r2 = parseInt(sq2[1]);

    const up = r2 > r1;
    const down = r2 < r1;
    const right = f2 > f1;
    const left = f2 < f1;

    if (up && !left && !right) return 'above';
    if (down && !left && !right) return 'below';
    if (left && !up && !down) return 'left';
    if (right && !up && !down) return 'right';
    if (up && left) return 'above-left';
    if (up && right) return 'above-right';
    if (down && left) return 'below-left';
    return 'below-right';
  }

  function generateQuestion(): Question {
    for (;;) {
      const f1 = Math.floor(Math.random() * 8);
      const r1 = Math.floor(Math.random() * 8);
      const f2 = Math.floor(Math.random() * 8);
      const r2 = Math.floor(Math.random() * 8);
      if (f1 === f2 && r1 === r2) continue;
      const sq1 = String.fromCharCode(97 + f1) + (r1 + 1);
      const sq2 = String.fromCharCode(97 + f2) + (r2 + 1);
      return { sq1, sq2, direction: getDirection(sq1, sq2) };
    }
  }

  function getStars(score: number): number {
    if (score >= 20) return 3;
    if (score >= 12) return 2;
    if (score >= 6) return 1;
    return 0;
  }

  const BUTTON_LAYOUT: Direction[][] = [
    ['above-left', 'above', 'above-right'],
    ['left', 'right'],
    ['below-left', 'below', 'below-right'],
  ];

  const BUTTON_SYMBOLS: Record<Direction, string> = {
    'above-left': '\u2196',
    'above': '\u2191',
    'above-right': '\u2197',
    'left': '\u2190',
    'right': '\u2192',
    'below-left': '\u2199',
    'below': '\u2193',
    'below-right': '\u2198',
  };

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

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('blindfold-relative-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('blindfold-relative-best-stars') ?? '0', 10);

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

    const stars = getStars(score);
    if (score > bestScore) {
      localStorage.setItem('blindfold-relative-best', String(score));
      bestScore = score;
    }
    if (stars > bestStars) {
      localStorage.setItem('blindfold-relative-best-stars', String(stars));
      bestStars = stars;
    }
  }

  function handleAnswer(dir: Direction) {
    if (gameState !== 'playing') return;
    if (flashTimeout) clearTimeout(flashTimeout);

    const correct = question.direction === dir;
    history = [...history, { ...question, correct, answered: dir }];

    if (correct) {
      score += 1;
      flash = 'correct';
    } else {
      flash = 'wrong';
    }
    question = generateQuestion();
    flashTimeout = setTimeout(() => { flash = null; }, 200);
  }

  let timerColor = $derived(
    timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f97316' : '#22c55e'
  );

  let stars = $derived(getStars(score));

  let wrongOnes = $derived(history.filter((a) => !a.correct));
</script>

<div class="container">
  {#if gameState === 'idle'}
    <div class="center-col">
      <h2 class="title">Relative Position</h2>
      <p class="muted">
        Where is the second square relative to the first? Click the direction arrow. You have 30 seconds!
      </p>
      {#if bestScore > 0}
        <div class="best">
          Best: {bestScore} {#if bestStars > 0}<StarRating stars={bestStars} size="sm" />{/if}
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
        <p class="best">Personal best: {bestScore}</p>
      {/if}
      <button class="start-btn" onclick={startGame}>Play Again</button>

      {#if wrongOnes.length > 0}
        <div class="mistakes-section">
          <h3 class="mistakes-title">Mistakes ({wrongOnes.length})</h3>
          <div class="mistakes-list">
            {#each wrongOnes as a, i}
              <div class="mistake-row">
                <span class="mono-bold">{a.sq1} &rarr; {a.sq2}</span>
                {' '}
                <span class="correct-label">{DIRECTION_LABELS[a.direction]}</span>
                {' '}
                <span class="faint">(you: {DIRECTION_LABELS[a.answered]})</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="play-col">
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
        <div class="question-label">
          Where is <span class="bold">{question.sq2}</span> from <span class="bold">{question.sq1}</span>?
        </div>
        <div class={['question-main', flash === 'correct' && 'flash-correct', flash === 'wrong' && 'flash-wrong']}>
          {question.sq1} &rarr; {question.sq2}
        </div>
      </div>

      <div class="dpad">
        {#each BUTTON_LAYOUT as row}
          <div class="dpad-row">
            {#each row as dir}
              <button class="dir-btn" onclick={() => handleAnswer(dir)}>
                {BUTTON_SYMBOLS[dir]}
              </button>
            {/each}
          </div>
        {/each}
      </div>
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

  .play-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
  }

  .title {
    font-size: 1.25rem;
    font-weight: bold;
  }

  .muted {
    color: var(--text-muted);
  }

  .best {
    display: flex;
    align-items: center;
    gap: 0.5rem;
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

  .timer-bar-track {
    width: 100%;
    height: 0.5rem;
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
    text-align: center;
    padding: 0.5rem 0;
  }

  .question-label {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-bottom: 0.25rem;
  }

  .bold {
    font-weight: bold;
  }

  .question-main {
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

  .dpad {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .dpad-row {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .dir-btn {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 0.5rem;
    border: 2px solid var(--card-border);
    background: var(--card-bg);
    color: var(--foreground);
    font-size: 1.5rem;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .dir-btn:hover {
    border-color: rgba(255, 248, 230, 0.4);
  }

  .dir-btn:active {
    transform: scale(0.95);
  }

  .mistakes-section {
    width: 100%;
    border-top: 1px solid rgba(255, 248, 230, 0.1);
    margin-top: 0.5rem;
    padding-top: 1rem;
  }

  .mistakes-title {
    font-weight: bold;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
  }

  .mistakes-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .mistake-row {
    font-size: 0.875rem;
  }

  .mono-bold {
    font-family: monospace;
    font-weight: bold;
  }

  .correct-label {
    color: #4ade80;
  }

  .faint {
    color: var(--text-faint);
  }
</style>
