<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import { playSound } from '$lib/state/sound';

  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';

  type PieceColor = 'w' | 'b';
  type PieceKind = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';

  interface PiecePlacement {
    piece: PieceKind;
    color: PieceColor;
    square: string;
  }

  const PIECE_POOL: { piece: PieceKind; color: PieceColor }[] = [
    { piece: 'Q', color: 'w' }, { piece: 'R', color: 'w' }, { piece: 'R', color: 'w' },
    { piece: 'B', color: 'w' }, { piece: 'B', color: 'w' }, { piece: 'N', color: 'w' },
    { piece: 'N', color: 'w' }, { piece: 'P', color: 'w' },
    { piece: 'Q', color: 'b' }, { piece: 'R', color: 'b' }, { piece: 'R', color: 'b' },
    { piece: 'B', color: 'b' }, { piece: 'B', color: 'b' }, { piece: 'N', color: 'b' },
    { piece: 'N', color: 'b' }, { piece: 'P', color: 'b' },
  ];

  function randomSquare(): string {
    const f = Math.floor(Math.random() * 8);
    const r = Math.floor(Math.random() * 8);
    return String.fromCharCode(97 + f) + (r + 1);
  }

  function generatePosition(numPieces: number): PiecePlacement[] {
    const usedSquares = new Set<string>();
    const placements: PiecePlacement[] = [];

    let wkSq: string;
    do { wkSq = randomSquare(); } while (usedSquares.has(wkSq));
    usedSquares.add(wkSq);
    placements.push({ piece: 'K', color: 'w', square: wkSq });

    let bkSq: string;
    do { bkSq = randomSquare(); } while (usedSquares.has(bkSq));
    usedSquares.add(bkSq);
    placements.push({ piece: 'K', color: 'b', square: bkSq });

    for (let i = 2; i < numPieces; i++) {
      let sq: string;
      do { sq = randomSquare(); } while (usedSquares.has(sq));
      usedSquares.add(sq);
      const p = PIECE_POOL[Math.floor(Math.random() * PIECE_POOL.length)];
      placements.push({ ...p, square: sq });
    }

    return placements;
  }

  function sqToCoords(sq: string): [number, number] {
    return [sq.charCodeAt(0) - 97, 8 - parseInt(sq[1])];
  }

  const LEVELS = [
    { pieces: 4, time: 8000, label: '4 pieces' },
    { pieces: 6, time: 8000, label: '6 pieces' },
    { pieces: 8, time: 6000, label: '8 pieces' },
  ];

  const ROUNDS = 5;
  const SQ_SIZE = 40;
  const BOARD_PX = SQ_SIZE * 8;

  const TRAY_PIECES: { piece: PieceKind; color: PieceColor }[] = [
    { piece: 'K', color: 'w' }, { piece: 'Q', color: 'w' }, { piece: 'R', color: 'w' },
    { piece: 'B', color: 'w' }, { piece: 'N', color: 'w' }, { piece: 'P', color: 'w' },
    { piece: 'K', color: 'b' }, { piece: 'Q', color: 'b' }, { piece: 'R', color: 'b' },
    { piece: 'B', color: 'b' }, { piece: 'N', color: 'b' }, { piece: 'P', color: 'b' },
  ];

  type Phase = 'idle' | 'showing' | 'placing' | 'result' | 'done';

  let phase = $state<Phase>('idle');
  let levelIdx = $state(0);
  let position = $state<PiecePlacement[]>([]);
  let placed = $state<PiecePlacement[]>([]);
  let selectedPiece = $state<{ piece: PieceKind; color: PieceColor } | null>(null);
  let round = $state(0);
  let totalCorrect = $state(0);
  let totalPieces = $state(0);
  let bestStars = $state(0);

  let showTimerRef: ReturnType<typeof setTimeout> | null = null;

  let level = $derived(LEVELS[levelIdx]);

  onMount(() => {
    bestStars = parseInt(localStorage.getItem('blindfold-flash-best-stars') ?? '0', 10);

    return () => {
      if (showTimerRef) clearTimeout(showTimerRef);
    };
  });

  function startRound() {
    const pos = generatePosition(level.pieces);
    position = pos;
    placed = [];
    selectedPiece = null;
    phase = 'showing';
    showTimerRef = setTimeout(() => {
      phase = 'placing';
    }, level.time);
  }

  function startGame() {
    round = 1;
    totalCorrect = 0;
    totalPieces = 0;
    startRound();
  }

  function handleBoardClick(e: MouseEvent) {
    if (phase !== 'placing' || !selectedPiece) return;
    const target = e.currentTarget as HTMLElement;
    const svg = target.querySelector('svg') ?? target;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * BOARD_PX;
    const y = (e.clientY - rect.top) / rect.height * BOARD_PX;
    const fi = Math.floor(x / SQ_SIZE);
    const ri = Math.floor(y / SQ_SIZE);
    if (fi >= 0 && fi < 8 && ri >= 0 && ri < 8) {
      const sq = String.fromCharCode(97 + fi) + (8 - ri);
      if (placed.some((p) => p.square === sq)) return;
      placed = [...placed, { ...selectedPiece, square: sq }];
    }
  }

  function checkAnswer() {
    let correctCount = 0;
    for (const p of placed) {
      const match = position.find(
        (orig) => orig.square === p.square && orig.piece === p.piece && orig.color === p.color
      );
      if (match) correctCount++;
    }
    totalCorrect += correctCount;
    totalPieces += position.length;
    playSound(correctCount === position.length ? 'correct' : 'wrong');
    phase = 'result';
  }

  function nextRound() {
    if (round >= ROUNDS) {
      const pct = totalPieces > 0 ? totalCorrect / totalPieces : 0;
      const stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
      if (stars > bestStars) {
        localStorage.setItem('blindfold-flash-best-stars', String(stars));
        bestStars = stars;
      }
      if (stars > 0) playSound('stars');
      phase = 'done';
      return;
    }
    round += 1;
    startRound();
  }

  function clearPlaced() {
    placed = [];
  }

  function goIdle() {
    phase = 'idle';
  }

  let correctSquares = $derived.by(() => {
    if (phase !== 'result') return new Set<string>();
    const s = new Set<string>();
    for (const p of placed) {
      const match = position.find(
        (orig) => orig.square === p.square && orig.piece === p.piece && orig.color === p.color
      );
      if (match) s.add(p.square);
    }
    return s;
  });

  let wrongSquares = $derived.by(() => {
    if (phase !== 'result') return new Set<string>();
    const s = new Set<string>();
    for (const p of placed) {
      const match = position.find(
        (orig) => orig.square === p.square && orig.piece === p.piece && orig.color === p.color
      );
      if (!match) s.add(p.square);
    }
    return s;
  });

  let overallStars = $derived.by(() => {
    if (totalPieces <= 0) return 0;
    const pct = totalCorrect / totalPieces;
    if (pct >= 0.9) return 3;
    if (pct >= 0.7) return 2;
    if (pct >= 0.4) return 1;
    return 0;
  });

  function boardFill(fi: number, ri: number, placedSqs?: Set<string>, wrongSqs?: Set<string>): string {
    const isLight = (fi + ri) % 2 === 0;
    const sqName = String.fromCharCode(97 + fi) + (8 - ri);
    if (placedSqs?.has(sqName)) return '#a3d9a3';
    if (wrongSqs?.has(sqName)) return '#f0a0a0';
    return isLight ? LIGHT : DARK;
  }
</script>

<div class="container">
  {#if phase === 'idle'}
    <div class="center-col">
      <h2 class="title">Flash Position</h2>
      <p class="muted">
        A position flashes briefly. Then place the pieces from memory! {ROUNDS} rounds.
      </p>
      <div class="level-picker">
        <span class="level-label">Difficulty:</span>
        {#each LEVELS as l, i}
          <button
            class={['level-btn', levelIdx === i && 'level-active']}
            onclick={() => { levelIdx = i; }}
          >
            {l.label}
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
      <p class="big-score">{totalCorrect}/{totalPieces} pieces correct</p>
      {#if overallStars > 0}
        <StarRating stars={overallStars} size="lg" />
      {/if}
      <button class="start-btn" onclick={goIdle}>Play Again</button>
    </div>
  {:else if phase === 'showing'}
    <div class="center-col">
      <div class="round-label">Round {round}/{ROUNDS} &mdash; Memorize!</div>
      <svg viewBox="0 0 {BOARD_PX} {BOARD_PX}" class="board-svg" role="img" aria-label="Chess position to memorize">
        {#each Array(8) as _, ri}
          {#each Array(8) as _, fi}
            <rect
              x={fi * SQ_SIZE}
              y={ri * SQ_SIZE}
              width={SQ_SIZE}
              height={SQ_SIZE}
              fill={boardFill(fi, ri)}
            />
          {/each}
        {/each}
        {#each position as p}
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
  {:else if phase === 'result'}
    <div class="center-col">
      <div class="round-label">Round {round}/{ROUNDS}</div>
      <p class="result-count">{correctSquares.size}/{position.length} correct</p>
      <div class="muted-xs">Correct answer:</div>
      <svg viewBox="0 0 {BOARD_PX} {BOARD_PX}" class="board-svg" role="img" aria-label="Correct chess position">
        {#each Array(8) as _, ri}
          {#each Array(8) as _, fi}
            <rect
              x={fi * SQ_SIZE}
              y={ri * SQ_SIZE}
              width={SQ_SIZE}
              height={SQ_SIZE}
              fill={boardFill(fi, ri, correctSquares, wrongSquares)}
            />
          {/each}
        {/each}
        {#each position as p}
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
      <button class="action-btn" onclick={nextRound}>
        {round >= ROUNDS ? 'See Results' : 'Next'}
      </button>
    </div>
  {:else}
    <!-- placing phase -->
    <div class="placing-col">
      <div class="round-label">Round {round}/{ROUNDS} &mdash; Place from memory!</div>

      <button
        class="board-wrapper board-btn"
        aria-label="Chess board — click to place pieces"
        onclick={handleBoardClick}
      >
        <svg
          viewBox="0 0 {BOARD_PX} {BOARD_PX}"
          class="board-svg clickable"
        >
          {#each Array(8) as _, ri}
            {#each Array(8) as _, fi}
              <rect
                x={fi * SQ_SIZE}
                y={ri * SQ_SIZE}
                width={SQ_SIZE}
                height={SQ_SIZE}
                fill={boardFill(fi, ri)}
              />
            {/each}
          {/each}
          {#each placed as p}
            {@const [f, r] = sqToCoords(p.square)}
            <image
              href="/pieces/{p.color}{p.piece}.svg"
              x={f * SQ_SIZE + 4}
              y={r * SQ_SIZE + 4}
              width={32}
              height={32}
            />
          {/each}
        </svg>
      </button>

      <div class="tray">
        {#each TRAY_PIECES as p}
          {@const isSelected = selectedPiece?.piece === p.piece && selectedPiece?.color === p.color}
          <button
            class={['tray-btn', isSelected && 'tray-selected']}
            onclick={() => { selectedPiece = isSelected ? null : p; }}
          >
            <img src="/pieces/{p.color}{p.piece}.svg" alt="{p.color}{p.piece}" class="tray-img" />
          </button>
        {/each}
      </div>

      <div class="actions">
        <button class="clear-btn" onclick={clearPlaced}>Clear</button>
        <button class="action-btn" onclick={checkAnswer}>
          Check ({placed.length}/{level.pieces})
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 32rem;
    margin: 0 auto;
  }

  .center-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
  }

  .placing-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .title {
    font-size: 1.25rem;
    font-weight: bold;
  }

  .muted {
    color: var(--text-muted);
  }

  .muted-xs {
    font-size: 0.75rem;
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

  .result-count {
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

  .clickable {
    cursor: pointer;
  }

  .board-wrapper {
    position: relative;
  }

  .board-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
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

  .tray {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.25rem;
  }

  .tray-btn {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.25rem;
    border: 2px solid var(--card-border);
    background: transparent;
    cursor: pointer;
    padding: 0;
    transition: border-color 0.15s;
  }

  .tray-btn:hover {
    border-color: rgba(255, 248, 230, 0.3);
  }

  .tray-selected {
    border-color: #22c55e;
    background: rgba(34, 197, 94, 0.2);
  }

  .tray-img {
    width: 100%;
    height: 100%;
    display: block;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
  }

  .clear-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: transparent;
    color: var(--text-faint);
    font-size: 0.875rem;
    cursor: pointer;
    transition: color 0.15s;
  }

  .clear-btn:hover {
    color: var(--foreground);
  }

  .action-btn {
    padding: 0.5rem 1.5rem;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .action-btn:hover {
    background: #15803d;
  }
</style>
