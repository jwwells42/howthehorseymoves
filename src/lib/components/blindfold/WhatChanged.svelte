<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';

  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';

  type PieceColor = 'w' | 'b';
  type PieceKind = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';

  interface PiecePlacement {
    piece: PieceKind;
    color: PieceColor;
    square: string;
  }

  interface Challenge {
    before: PiecePlacement[];
    after: PiecePlacement[];
    movedPiece: PiecePlacement;
    movedTo: string;
    answer: string;
  }

  const PIECE_POOL: { piece: PieceKind; color: PieceColor }[] = [
    { piece: 'K', color: 'w' }, { piece: 'Q', color: 'w' }, { piece: 'R', color: 'w' },
    { piece: 'B', color: 'w' }, { piece: 'N', color: 'w' }, { piece: 'P', color: 'w' },
    { piece: 'K', color: 'b' }, { piece: 'Q', color: 'b' }, { piece: 'R', color: 'b' },
    { piece: 'B', color: 'b' }, { piece: 'N', color: 'b' }, { piece: 'P', color: 'b' },
  ];

  function randomSquare(): string {
    const f = Math.floor(Math.random() * 8);
    const r = Math.floor(Math.random() * 8);
    return String.fromCharCode(97 + f) + (r + 1);
  }

  function generateChallenge(numPieces: number): Challenge {
    const usedSquares = new Set<string>();
    const placements: PiecePlacement[] = [];

    for (let i = 0; i < numPieces; i++) {
      let sq: string;
      do { sq = randomSquare(); } while (usedSquares.has(sq));
      usedSquares.add(sq);
      const p = PIECE_POOL[Math.floor(Math.random() * PIECE_POOL.length)];
      placements.push({ ...p, square: sq });
    }

    const moveIdx = Math.floor(Math.random() * placements.length);
    const movedPiece = placements[moveIdx];
    let newSq: string;
    do { newSq = randomSquare(); } while (usedSquares.has(newSq));

    const after = placements.map((p, i) =>
      i === moveIdx ? { ...p, square: newSq } : { ...p }
    );

    const colorName = movedPiece.color === 'w' ? 'White' : 'Black';
    return {
      before: placements,
      after,
      movedPiece,
      movedTo: newSq,
      answer: `${colorName} ${movedPiece.piece} ${movedPiece.square} \u2192 ${newSq}`,
    };
  }

  function sqToCoords(sq: string): [number, number] {
    return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
  }

  function getStars(correct: number, total: number): number {
    const pct = total > 0 ? correct / total : 0;
    if (pct >= 0.9) return 3;
    if (pct >= 0.7) return 2;
    if (pct >= 0.5) return 1;
    return 0;
  }

  const ROUNDS = 10;
  const SHOW_TIME = 4000;
  const SQ_SIZE = 40;
  const BOARD_PX = SQ_SIZE * 8;

  type Phase = 'idle' | 'showing' | 'guessing' | 'feedback' | 'done';

  let phase = $state<Phase>('idle');
  let level = $state(4);
  let challenge = $state<Challenge | null>(null);
  let input = $state('');
  let correct = $state(0);
  let total = $state(0);
  let round = $state(0);
  let isCorrect = $state(false);
  let bestStars = $state(0);

  let inputEl = $state<HTMLInputElement | null>(null);
  let showTimerRef: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    bestStars = parseInt(localStorage.getItem('blindfold-changed-best-stars') ?? '0', 10);

    return () => {
      if (showTimerRef) clearTimeout(showTimerRef);
    };
  });

  $effect(() => {
    if (phase === 'guessing' && inputEl) inputEl.focus();
  });

  function startGame() {
    const ch = generateChallenge(level);
    challenge = ch;
    phase = 'showing';
    correct = 0;
    total = 0;
    round = 1;
    showTimerRef = setTimeout(() => {
      phase = 'guessing';
    }, SHOW_TIME);
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!challenge || phase !== 'guessing') return;
    const sq = input.trim().toLowerCase();
    input = '';

    const right = sq === challenge.movedTo || sq === challenge.movedPiece.square;
    isCorrect = right;
    if (right) correct += 1;
    total += 1;
    phase = 'feedback';
  }

  function nextRound() {
    if (round >= ROUNDS) {
      const stars = getStars(correct, total);
      if (stars > bestStars) {
        localStorage.setItem('blindfold-changed-best-stars', String(stars));
        bestStars = stars;
      }
      phase = 'done';
      return;
    }
    const ch = generateChallenge(level);
    challenge = ch;
    phase = 'showing';
    round += 1;
    showTimerRef = setTimeout(() => {
      phase = 'guessing';
    }, SHOW_TIME);
  }

  function goIdle() {
    phase = 'idle';
  }

  let stars = $derived(getStars(correct, total));

  function squareFill(fi: number, ri: number, highlight?: { from?: string; to?: string }): string {
    const isLight = (fi + ri) % 2 === 0;
    const sqName = String.fromCharCode(97 + fi) + (8 - ri);
    if (highlight?.from === sqName) return '#f0a0a0';
    if (highlight?.to === sqName) return '#a3d9a3';
    return isLight ? LIGHT : DARK;
  }
</script>

<div class="container">
  {#if phase === 'idle'}
    <div class="center-col">
      <h2 class="title">What Changed?</h2>
      <p class="muted">
        Memorize a position, then identify what moved. {ROUNDS} rounds &mdash; type the square something moved to (or from).
      </p>
      <div class="level-picker">
        <span class="level-label">Pieces:</span>
        {#each [4, 6, 8] as n}
          <button
            class={['level-btn', level === n && 'level-active']}
            onclick={() => { level = n; }}
          >
            {n}
          </button>
        {/each}
      </div>
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
  {:else if phase === 'showing' && challenge}
    <div class="center-col">
      <div class="round-label">Round {round}/{ROUNDS} &mdash; Memorize this position!</div>
      <svg viewBox="0 0 {BOARD_PX} {BOARD_PX}" class="board-svg" role="img" aria-label="Chess position to memorize">
        {#each Array(8) as _, ri}
          {#each Array(8) as _, fi}
            <rect
              x={fi * SQ_SIZE}
              y={ri * SQ_SIZE}
              width={SQ_SIZE}
              height={SQ_SIZE}
              fill={squareFill(fi, ri)}
            />
          {/each}
        {/each}
        {#each challenge.before as p}
          {@const [f, r] = sqToCoords(p.square)}
          <image
            href="/pieces/{p.color}{p.piece}.svg"
            x={f * SQ_SIZE + SQ_SIZE * 0.1}
            y={r * SQ_SIZE + SQ_SIZE * 0.1}
            width={SQ_SIZE * 0.8}
            height={SQ_SIZE * 0.8}
          />
        {/each}
      </svg>
      <div class="studying">Studying...</div>
    </div>
  {:else if phase === 'guessing' && challenge}
    <div class="center-col">
      <div class="round-label">Round {round}/{ROUNDS} &mdash; What moved?</div>
      <svg viewBox="0 0 {BOARD_PX} {BOARD_PX}" class="board-svg" role="img" aria-label="Chess position after move">
        {#each Array(8) as _, ri}
          {#each Array(8) as _, fi}
            <rect
              x={fi * SQ_SIZE}
              y={ri * SQ_SIZE}
              width={SQ_SIZE}
              height={SQ_SIZE}
              fill={squareFill(fi, ri)}
            />
          {/each}
        {/each}
        {#each challenge.after as p}
          {@const [f, r] = sqToCoords(p.square)}
          <image
            href="/pieces/{p.color}{p.piece}.svg"
            x={f * SQ_SIZE + SQ_SIZE * 0.1}
            y={r * SQ_SIZE + SQ_SIZE * 0.1}
            width={SQ_SIZE * 0.8}
            height={SQ_SIZE * 0.8}
          />
        {/each}
      </svg>
      <p class="muted-sm">One piece moved. Type the square it moved <strong>to</strong> or <strong>from</strong>.</p>
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
  {:else if phase === 'feedback' && challenge}
    <div class="center-col">
      <div class="round-label">Round {round}/{ROUNDS}</div>
      <p class={['feedback-text', isCorrect && 'correct-text', !isCorrect && 'wrong-text']}>
        {isCorrect ? 'Correct!' : 'Wrong!'}
      </p>
      <p class="muted-sm">{challenge.answer}</p>
      <svg viewBox="0 0 {BOARD_PX} {BOARD_PX}" class="board-svg" role="img" aria-label="Chess position showing the move">
        {#each Array(8) as _, ri}
          {#each Array(8) as _, fi}
            <rect
              x={fi * SQ_SIZE}
              y={ri * SQ_SIZE}
              width={SQ_SIZE}
              height={SQ_SIZE}
              fill={squareFill(fi, ri, { from: challenge.movedPiece.square, to: challenge.movedTo })}
            />
          {/each}
        {/each}
        {#each challenge.after as p}
          {@const [f, r] = sqToCoords(p.square)}
          <image
            href="/pieces/{p.color}{p.piece}.svg"
            x={f * SQ_SIZE + SQ_SIZE * 0.1}
            y={r * SQ_SIZE + SQ_SIZE * 0.1}
            width={SQ_SIZE * 0.8}
            height={SQ_SIZE * 0.8}
          />
        {/each}
      </svg>
      <button class="go-btn next-btn" onclick={nextRound}>
        {round >= ROUNDS ? 'See Results' : 'Next'}
      </button>
    </div>
  {/if}
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
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

  .muted-sm {
    font-size: 0.875rem;
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

  .level-picker {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .level-label {
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .level-btn {
    padding: 0.25rem 0.75rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    border: 1px solid var(--card-border);
    background: transparent;
    color: var(--text-faint);
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }

  .level-btn:hover {
    color: var(--foreground);
  }

  .level-active {
    background: #16a34a;
    color: white;
    border-color: #16a34a;
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

  .board-svg {
    width: 100%;
    max-width: 280px;
    display: block;
  }

  @media (min-width: 640px) {
    .board-svg {
      max-width: 320px;
    }
  }

  .studying {
    font-size: 0.875rem;
    color: var(--text-muted);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
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

  .next-btn {
    padding: 0.5rem 1.5rem;
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
</style>
