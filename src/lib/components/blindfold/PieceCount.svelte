<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { playSound } from '$lib/state/sound';

  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';
  const GAME_DURATION = 30;

  type PieceColor = 'w' | 'b';
  type PieceKind = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
  type QuestionType = 'white' | 'black' | 'total' | 'pawns' | 'knights' | 'bishops' | 'rooks';

  const QUESTION_LABELS: Record<QuestionType, string> = {
    white: 'White pieces?',
    black: 'Black pieces?',
    total: 'Total pieces?',
    pawns: 'How many pawns?',
    knights: 'How many knights?',
    bishops: 'How many bishops?',
    rooks: 'How many rooks?',
  };

  interface PiecePlacement {
    piece: PieceKind;
    color: PieceColor;
    square: string;
  }

  const PIECE_POOL: { piece: PieceKind; color: PieceColor }[] = [
    { piece: 'Q', color: 'w' }, { piece: 'R', color: 'w' }, { piece: 'R', color: 'w' },
    { piece: 'B', color: 'w' }, { piece: 'B', color: 'w' }, { piece: 'N', color: 'w' },
    { piece: 'N', color: 'w' }, { piece: 'P', color: 'w' }, { piece: 'P', color: 'w' },
    { piece: 'P', color: 'w' },
    { piece: 'Q', color: 'b' }, { piece: 'R', color: 'b' }, { piece: 'R', color: 'b' },
    { piece: 'B', color: 'b' }, { piece: 'B', color: 'b' }, { piece: 'N', color: 'b' },
    { piece: 'N', color: 'b' }, { piece: 'P', color: 'b' }, { piece: 'P', color: 'b' },
    { piece: 'P', color: 'b' },
  ];

  function randomSquare(): string {
    const f = Math.floor(Math.random() * 8);
    const r = Math.floor(Math.random() * 8);
    return String.fromCharCode(97 + f) + (r + 1);
  }

  function generatePosition(): PiecePlacement[] {
    const numPieces = Math.floor(Math.random() * 8) + 5; // 5-12 pieces
    const usedSquares = new Set<string>();
    const placements: PiecePlacement[] = [];

    // Always include both kings
    let sq: string;
    do { sq = randomSquare(); } while (usedSquares.has(sq));
    usedSquares.add(sq);
    placements.push({ piece: 'K', color: 'w', square: sq });

    do { sq = randomSquare(); } while (usedSquares.has(sq));
    usedSquares.add(sq);
    placements.push({ piece: 'K', color: 'b', square: sq });

    for (let i = 2; i < numPieces; i++) {
      do { sq = randomSquare(); } while (usedSquares.has(sq));
      usedSquares.add(sq);
      const p = PIECE_POOL[Math.floor(Math.random() * PIECE_POOL.length)];
      placements.push({ ...p, square: sq });
    }

    return placements;
  }

  function getAnswer(position: PiecePlacement[], qType: QuestionType): number {
    switch (qType) {
      case 'white': return position.filter((p) => p.color === 'w').length;
      case 'black': return position.filter((p) => p.color === 'b').length;
      case 'total': return position.length;
      case 'pawns': return position.filter((p) => p.piece === 'P').length;
      case 'knights': return position.filter((p) => p.piece === 'N').length;
      case 'bishops': return position.filter((p) => p.piece === 'B').length;
      case 'rooks': return position.filter((p) => p.piece === 'R').length;
    }
  }

  const Q_TYPES: QuestionType[] = ['white', 'black', 'total', 'pawns', 'knights', 'bishops', 'rooks'];

  interface Challenge {
    position: PiecePlacement[];
    questionType: QuestionType;
    answer: number;
  }

  function generateChallenge(): Challenge {
    const position = generatePosition();
    const qType = Q_TYPES[Math.floor(Math.random() * Q_TYPES.length)];
    return { position, questionType: qType, answer: getAnswer(position, qType) };
  }

  interface Attempt {
    position: PiecePlacement[];
    questionType: QuestionType;
    answer: number;
    playerAnswer: number;
    correct: boolean;
  }

  function getStars(score: number): number {
    if (score >= 8) return 3;
    if (score >= 5) return 2;
    if (score >= 3) return 1;
    return 0;
  }

  function sqToCoords(sq: string): [number, number] {
    return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
  }

  const FLASH_TIME = 3000;

  type Phase = 'idle' | 'flash' | 'answer' | 'done';

  let phase = $state<Phase>('idle');
  let challenge = $state<Challenge>(generateChallenge());
  let score = $state(0);
  let timeLeft = $state(GAME_DURATION);
  let input = $state('');
  let flash = $state<'correct' | 'wrong' | null>(null);
  let bestScore = $state(0);
  let bestStars = $state(0);
  let history = $state<Attempt[]>([]);
  let inputEl = $state<HTMLInputElement | undefined>(undefined);

  let flashTimeout: ReturnType<typeof setTimeout> | null = null;
  let showTimerRef: ReturnType<typeof setTimeout> | null = null;
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('blindfold-piececount-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('blindfold-piececount-best-stars') ?? '0', 10);

    return () => {
      if (showTimerRef) clearTimeout(showTimerRef);
      if (flashTimeout) clearTimeout(flashTimeout);
      if (timerInterval) clearInterval(timerInterval);
    };
  });

  $effect(() => {
    if (phase === 'answer') {
      inputEl?.focus();
    }
  });

  $effect(() => {
    if (phase !== 'done') return;
    const stars = getStars(score);
    if (score > bestScore) {
      localStorage.setItem('blindfold-piececount-best', String(score));
      bestScore = score;
    }
    if (stars > bestStars) {
      localStorage.setItem('blindfold-piececount-best-stars', String(stars));
      bestStars = stars;
    }
    if (stars > 0) playSound('stars');
  });

  function showNextChallenge() {
    const ch = generateChallenge();
    challenge = ch;
    phase = 'flash';
    showTimerRef = setTimeout(() => {
      phase = 'answer';
    }, FLASH_TIME);
  }

  function startGame() {
    score = 0;
    timeLeft = GAME_DURATION;
    history = [];
    flash = null;

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        if (showTimerRef) clearTimeout(showTimerRef);
        showTimerRef = null;
        phase = 'done';
      }
    }, 1000);

    showNextChallenge();
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (phase !== 'answer') return;
    const answer = parseInt(input.trim());
    if (isNaN(answer)) return;
    if (flashTimeout) clearTimeout(flashTimeout);

    const correct = answer === challenge.answer;
    history = [...history, {
      position: challenge.position,
      questionType: challenge.questionType,
      answer: challenge.answer,
      playerAnswer: answer,
      correct,
    }];

    if (correct) {
      score += 1;
      flash = 'correct';
      playSound('correct');
    } else {
      flash = 'wrong';
      playSound('wrong');
    }
    input = '';
    flashTimeout = setTimeout(() => { flash = null; }, 200);
    showNextChallenge();
  }

  function timerBarColor(t: number): string {
    if (t <= 5) return '#ef4444';
    if (t <= 10) return '#fb923c';
    return '#22c55e';
  }

  let wrongOnes = $derived(history.filter((a) => !a.correct));
</script>

<div class="trainer">
  {#if phase === 'idle'}
    <div class="center-panel">
      <h2 class="title">Piece Count</h2>
      <p class="instructions">
        A position flashes for 3 seconds, then a question appears. Count the pieces! You have 30 seconds total.
      </p>
      {#if bestScore > 0}
        <div class="best">
          Best: {bestScore} {#if bestStars > 0}<StarRating stars={bestStars} size="sm" />{/if}
        </div>
      {/if}
      <button class="btn-start" onclick={startGame}>
        Start
      </button>
    </div>

  {:else if phase === 'done'}
    <div class="center-panel">
      <h2 class="title">Time&apos;s up!</h2>
      <p class="final-score">{score}/{history.length} correct</p>
      {#if getStars(score) > 0}
        <StarRating stars={getStars(score)} size="lg" />
      {/if}
      {#if bestScore > 0}
        <p class="best-small">Personal best: {bestScore}</p>
      {/if}
      <button class="btn-start" onclick={startGame}>
        Play Again
      </button>

      {#if wrongOnes.length > 0}
        <div class="mistakes-section">
          <h3 class="mistakes-title">Mistakes ({wrongOnes.length})</h3>
          <div class="mistakes-grid">
            {#each wrongOnes as a, i}
              <div class="mistake-item">
                <svg viewBox="0 0 80 80" class="mini-board">
                  {#each Array(8) as _, ri}
                    {#each Array(8) as _, fi}
                      <rect x={fi * 10} y={ri * 10} width={10} height={10}
                        fill={(fi + ri) % 2 === 0 ? LIGHT : DARK} />
                    {/each}
                  {/each}
                  {#each a.position as p}
                    {@const coords = sqToCoords(p.square)}
                    <image href="/pieces/{p.color}{p.piece}.svg"
                      x={coords[0] * 10 + 1} y={coords[1] * 10 + 1} width={8} height={8} />
                  {/each}
                </svg>
                <div class="mistake-info">
                  <span class="mistake-question">{QUESTION_LABELS[a.questionType]}</span>
                  <br />
                  <span class="mistake-answer">{a.answer}</span>
                  <span class="mistake-yours"> (you: {a.playerAnswer})</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

  {:else if phase === 'flash'}
    <div class="center-panel">
      <div class="timer-bar-track">
        <div class="timer-bar-fill"
          style="width: {(timeLeft / GAME_DURATION) * 100}%; background: {timerBarColor(timeLeft)};"
        ></div>
      </div>
      <div class="hud">
        <span>Score: {score}</span>
        <span>{timeLeft}s</span>
      </div>
      <div class="memorize-label">Memorize...</div>
      <svg viewBox="0 0 320 320" class="flash-board" role="img" aria-label="Chess position to memorize">
        {#each Array(8) as _, ri}
          {#each Array(8) as _, fi}
            <rect x={fi * 40} y={ri * 40} width={40} height={40}
              fill={(fi + ri) % 2 === 0 ? LIGHT : DARK} />
          {/each}
        {/each}
        {#each challenge.position as p}
          {@const coords = sqToCoords(p.square)}
          <image href="/pieces/{p.color}{p.piece}.svg"
            x={coords[0] * 40 + 4} y={coords[1] * 40 + 4} width={32} height={32} />
        {/each}
      </svg>
    </div>

  {:else}
    <!-- answer phase -->
    <div class="center-panel">
      <div class="timer-bar-track">
        <div class="timer-bar-fill"
          style="width: {(timeLeft / GAME_DURATION) * 100}%; background: {timerBarColor(timeLeft)};"
        ></div>
      </div>
      <div class="hud">
        <span>Score: {score}</span>
        <span>{timeLeft}s</span>
      </div>

      <div class={['question', flash === 'correct' && 'flash-correct', flash === 'wrong' && 'flash-wrong']}
      >
        {QUESTION_LABELS[challenge.questionType]}
      </div>

      <form onsubmit={handleSubmit} class="answer-form">
        <input
          bind:this={inputEl}
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          bind:value={input}
          placeholder="#"
          maxlength={2}
          class="answer-input"
          autocomplete="off"
        />
        <button type="submit" class="btn-go">
          Go
        </button>
      </form>
    </div>
  {/if}
</div>

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

  .btn-start {
    padding: 0.75rem 2rem;
    font-size: 1.125rem;
    font-weight: bold;
    border: none;
    border-radius: 0.5rem;
    background: rgba(255, 248, 230, 0.15);
    color: var(--foreground);
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-start:hover {
    background: rgba(255, 248, 230, 0.25);
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
    transition: width 1s linear;
  }

  .hud {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .memorize-label {
    font-size: 0.875rem;
    color: var(--text-muted);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .flash-board {
    width: 100%;
    max-width: 280px;
  }

  @media (min-width: 640px) {
    .flash-board {
      max-width: 320px;
    }
  }

  .question {
    font-size: 1.5rem;
    font-weight: bold;
    padding: 1rem 0;
    transition: color 0.1s;
  }

  .flash-correct {
    color: #4ade80;
  }

  .flash-wrong {
    color: #f87171;
  }

  .answer-form {
    display: flex;
    gap: 0.5rem;
    width: 100%;
    max-width: 200px;
  }

  .answer-input {
    flex: 1;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card);
    color: var(--foreground);
    font-family: monospace;
    font-size: 1.5rem;
    text-align: center;
  }

  .answer-input:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.4);
  }

  .btn-go {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.5rem;
    background: rgba(255, 248, 230, 0.15);
    color: var(--foreground);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .btn-go:hover {
    background: rgba(255, 248, 230, 0.25);
  }

  .final-score {
    font-size: 1.875rem;
    font-weight: bold;
  }

  .mistakes-section {
    width: 100%;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin-top: 0.5rem;
    padding-top: 1rem;
  }

  .mistakes-title {
    font-weight: bold;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
  }

  .mistakes-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    justify-items: center;
  }

  @media (min-width: 640px) {
    .mistakes-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .mistake-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .mini-board {
    width: 5rem;
    height: 5rem;
  }

  .mistake-info {
    font-size: 0.75rem;
    text-align: center;
  }

  .mistake-question {
    color: var(--text-faint);
  }

  .mistake-answer {
    color: #f87171;
  }

  .mistake-yours {
    color: var(--text-faint);
  }
</style>
