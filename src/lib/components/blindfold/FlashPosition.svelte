<script lang="ts">
  import { onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import FinishActions from '$lib/components/curriculum/FinishActions.svelte';
  import Choice from '$lib/components/ui/Choice.svelte';
  import { playSound } from '$lib/state/sound';
  import { createBoardState, type PieceColor, type PieceKind, type PiecePlacement, type SquareId } from '$lib/logic/types';
  import { MARK, highlight } from '$lib/board-marks';

  const PIECE_POOL: { piece: PieceKind; color: PieceColor }[] = [
    { piece: 'Q', color: 'w' }, { piece: 'R', color: 'w' }, { piece: 'R', color: 'w' },
    { piece: 'B', color: 'w' }, { piece: 'B', color: 'w' }, { piece: 'N', color: 'w' },
    { piece: 'N', color: 'w' }, { piece: 'P', color: 'w' },
    { piece: 'Q', color: 'b' }, { piece: 'R', color: 'b' }, { piece: 'R', color: 'b' },
    { piece: 'B', color: 'b' }, { piece: 'B', color: 'b' }, { piece: 'N', color: 'b' },
    { piece: 'N', color: 'b' }, { piece: 'P', color: 'b' },
  ];

  function randomSquare(): SquareId {
    const f = Math.floor(Math.random() * 8);
    const r = Math.floor(Math.random() * 8);
    return (String.fromCharCode(97 + f) + (r + 1)) as SquareId;
  }

  function generatePosition(numPieces: number): PiecePlacement[] {
    const usedSquares = new Set<string>();
    const placements: PiecePlacement[] = [];

    let wkSq: SquareId;
    do { wkSq = randomSquare(); } while (usedSquares.has(wkSq));
    usedSquares.add(wkSq);
    placements.push({ piece: 'K', color: 'w', square: wkSq });

    let bkSq: SquareId;
    do { bkSq = randomSquare(); } while (usedSquares.has(bkSq));
    usedSquares.add(bkSq);
    placements.push({ piece: 'K', color: 'b', square: bkSq });

    for (let i = 2; i < numPieces; i++) {
      let sq: SquareId;
      do { sq = randomSquare(); } while (usedSquares.has(sq));
      usedSquares.add(sq);
      const p = PIECE_POOL[Math.floor(Math.random() * PIECE_POOL.length)];
      placements.push({ ...p, square: sq });
    }

    return placements;
  }

  const LEVELS = [
    { pieces: 4, time: 8000, label: '4 pieces' },
    { pieces: 6, time: 8000, label: '6 pieces' },
    { pieces: 8, time: 6000, label: '8 pieces' },
  ];

  const ROUNDS = 5;

  const TRAY_PIECES: { piece: PieceKind; color: PieceColor }[] = [
    { piece: 'K', color: 'w' }, { piece: 'Q', color: 'w' }, { piece: 'R', color: 'w' },
    { piece: 'B', color: 'w' }, { piece: 'N', color: 'w' }, { piece: 'P', color: 'w' },
    { piece: 'K', color: 'b' }, { piece: 'Q', color: 'b' }, { piece: 'R', color: 'b' },
    { piece: 'B', color: 'b' }, { piece: 'N', color: 'b' }, { piece: 'P', color: 'b' },
  ];

  const PIECE_NAMES: Record<PieceKind, string> = {
    K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn',
  };

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

  function placePiece(sq: SquareId) {
    if (phase !== 'placing' || !selectedPiece) return;
    if (placed.some((p) => p.square === sq)) return;
    placed = [...placed, { ...selectedPiece, square: sq }];
  }

  /** A placed piece is right if the same piece stood on that square. */
  function isRight(p: PiecePlacement): boolean {
    return position.some(
      (orig) => orig.square === p.square && orig.piece === p.piece && orig.color === p.color
    );
  }

  function checkAnswer() {
    const correctCount = placed.filter(isRight).length;
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

  let rightSquares = $derived(placed.filter(isRight).map((p) => p.square));
  let wrongSquares = $derived(placed.filter((p) => !isRight(p)).map((p) => p.square));

  let overallStars = $derived.by(() => {
    if (totalPieces <= 0) return 0;
    const pct = totalCorrect / totalPieces;
    if (pct >= 0.9) return 3;
    if (pct >= 0.7) return 2;
    if (pct >= 0.4) return 1;
    return 0;
  });
</script>

<div class="container">
  {#if phase === 'idle'}
    <div class="center-col">
      <h2>Flash Position</h2>
      <p class="muted">
        A position flashes briefly. Then place the pieces from memory! {ROUNDS} rounds.
      </p>
      <Choice
        label="Difficulty"
        options={LEVELS.map((l, i) => ({ value: i, label: l.label }))}
        bind:value={levelIdx}
      />
      {#if bestStars > 0}
        <StarRating stars={bestStars} size="sm" />
      {/if}
      <Button variant="primary" size="large" onclick={startGame}>Start</Button>
    </div>
  {:else if phase === 'done'}
    <div class="center-col">
      <h2>Complete!</h2>
      <p class="big-score">{totalCorrect}/{totalPieces} pieces correct</p>
      {#if overallStars > 0}
        <StarRating stars={overallStars} size="lg" />
      {/if}
      <FinishActions label="Play Again" onclick={goIdle} />
    </div>
  {:else if phase === 'showing'}
    <div class="center-col">
      <div class="muted">Round {round}/{ROUNDS} &mdash; Memorize!</div>
      <div class="board">
        <Board board={createBoardState(position)} readOnly coordinates={false} label="Chess position to memorize" />
      </div>
      <div class="studying">Studying...</div>
    </div>
  {:else if phase === 'result'}
    <div class="center-col">
      <div class="muted">Round {round}/{ROUNDS}</div>
      <p class="result-count">{rightSquares.length}/{position.length} correct</p>
      <div class="muted">Correct answer:</div>
      <div class="board">
        <Board
          board={createBoardState(position)}
          readOnly
          coordinates={false}
          highlights={[...highlight(rightSquares, MARK.good), ...highlight(wrongSquares, MARK.danger)]}
          label="Correct chess position"
        />
      </div>
      <Button variant="primary" onclick={nextRound}>
        {round >= ROUNDS ? 'See Results' : 'Next'}
      </Button>
    </div>
  {:else}
    <!-- placing phase -->
    <div class="center-col">
      <div class="muted">Round {round}/{ROUNDS} &mdash; Place from memory!</div>

      <div class="board">
        <Board
          board={createBoardState(placed)}
          coordinates={false}
          playableColors={[]}
          onSquareClick={placePiece}
          label="Chess board: tap a square to place the chosen piece"
        />
      </div>

      <div class="tray">
        {#each TRAY_PIECES as p}
          {@const isSelected = selectedPiece?.piece === p.piece && selectedPiece?.color === p.color}
          <button
            class={['tray-piece', isSelected && 'selected']}
            aria-pressed={isSelected}
            onclick={() => { selectedPiece = isSelected ? null : p; }}
          >
            <img
              src="/pieces/{p.color}{p.piece}.svg"
              alt="{p.color === 'w' ? 'White' : 'Black'} {PIECE_NAMES[p.piece]}"
            />
          </button>
        {/each}
      </div>

      <div class="actions">
        <Button onclick={clearPlaced}>Clear</Button>
        <Button variant="primary" onclick={checkAnswer}>
          Check ({placed.length}/{level.pieces})
        </Button>
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
    width: 100%;
    text-align: center;
  }

  .muted {
    color: var(--ink-muted);
  }

  .big-score {
    font-size: var(--size-title);
    font-weight: var(--weight-strong);
  }

  .result-count {
    font-weight: var(--weight-strong);
  }

  .board {
    width: 100%;
    max-width: 24rem;
  }

  .studying {
    color: var(--ink-muted);
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

  .tray-piece {
    width: 2.75rem;
    height: 2.75rem;
    padding: 0;
    border-radius: 0.25rem;
    border: 2px solid var(--line);
    background: transparent;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .tray-piece:hover {
    border-color: var(--ink-muted);
  }
  /* The chosen piece is the one to look at. */
  .tray-piece.selected {
    border-color: var(--highlight);
    background: var(--highlight-tint);
  }
  .tray-piece img {
    display: block;
    width: 100%;
    height: 100%;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
  }
</style>
