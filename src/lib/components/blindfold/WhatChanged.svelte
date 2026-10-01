<script lang="ts">
  import { onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Choice from '$lib/components/ui/Choice.svelte';
  import AnswerInput from './AnswerInput.svelte';
  import { playSound } from '$lib/state/sound';
  import { createBoardState, type PieceColor, type PieceKind, type PiecePlacement, type SquareId } from '$lib/logic/types';
  import { MARK, highlight } from '$lib/board-marks';

  interface Challenge {
    before: PiecePlacement[];
    after: PiecePlacement[];
    movedPiece: PiecePlacement;
    movedTo: SquareId;
    answer: string;
  }

  // Pieces available beyond the two kings (no extra kings)
  const EXTRA_POOL: { piece: PieceKind; color: PieceColor }[] = [
    { piece: 'Q', color: 'w' }, { piece: 'R', color: 'w' },
    { piece: 'B', color: 'w' }, { piece: 'N', color: 'w' }, { piece: 'P', color: 'w' },
    { piece: 'Q', color: 'b' }, { piece: 'R', color: 'b' },
    { piece: 'B', color: 'b' }, { piece: 'N', color: 'b' }, { piece: 'P', color: 'b' },
  ];

  function toSquare(f: number, r: number): SquareId {
    return (String.fromCharCode(97 + f) + (r + 1)) as SquareId;
  }

  function randomSquare(): SquareId {
    return toSquare(Math.floor(Math.random() * 8), Math.floor(Math.random() * 8));
  }

  /** Random square avoiding ranks 1 and 8 (for pawns) */
  function randomPawnSquare(): SquareId {
    return toSquare(Math.floor(Math.random() * 8), 1 + Math.floor(Math.random() * 6));
  }

  /** Get squares reachable by piece type from a given square (ignoring obstacles) */
  function getReachableSquares(piece: PieceKind, color: PieceColor, sq: string, occupied: Set<string>): SquareId[] {
    const f = sq.charCodeAt(0) - 97;
    const r = parseInt(sq[1]) - 1;
    const results: SquareId[] = [];

    function addIfValid(df: number, dr: number) {
      const nf = f + df, nr = r + dr;
      if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
        const s = toSquare(nf, nr);
        if (!occupied.has(s)) {
          // Pawns can't land on rank 1 or 8
          if (piece === 'P' && (nr === 0 || nr === 7)) return;
          results.push(s);
        }
      }
    }

    function addSlide(df: number, dr: number) {
      for (let d = 1; d < 8; d++) {
        const nf = f + df * d, nr = r + dr * d;
        if (nf < 0 || nf >= 8 || nr < 0 || nr >= 8) break;
        const s = toSquare(nf, nr);
        if (occupied.has(s)) break;
        results.push(s);
      }
    }

    switch (piece) {
      case 'K':
        for (let df = -1; df <= 1; df++)
          for (let dr = -1; dr <= 1; dr++)
            if (df || dr) addIfValid(df, dr);
        break;
      case 'N':
        for (const [df, dr] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
          addIfValid(df, dr);
        break;
      case 'R':
        addSlide(1,0); addSlide(-1,0); addSlide(0,1); addSlide(0,-1);
        break;
      case 'B':
        addSlide(1,1); addSlide(1,-1); addSlide(-1,1); addSlide(-1,-1);
        break;
      case 'Q':
        addSlide(1,0); addSlide(-1,0); addSlide(0,1); addSlide(0,-1);
        addSlide(1,1); addSlide(1,-1); addSlide(-1,1); addSlide(-1,-1);
        break;
      case 'P': {
        const dir = color === 'w' ? 1 : -1;
        addIfValid(0, dir);
        break;
      }
    }
    return results;
  }

  function generateChallenge(numPieces: number): Challenge {
    // Retry until we get a position where at least one piece can move
    for (let attempt = 0; attempt < 50; attempt++) {
      const usedSquares = new Set<string>();
      const placements: PiecePlacement[] = [];

      // Always place one white king and one black king
      for (const color of ['w', 'b'] as PieceColor[]) {
        let sq: SquareId;
        do { sq = randomSquare(); } while (usedSquares.has(sq));
        usedSquares.add(sq);
        placements.push({ piece: 'K', color, square: sq });
      }

      // Fill remaining slots with random non-king pieces
      for (let i = 2; i < numPieces; i++) {
        const p = EXTRA_POOL[Math.floor(Math.random() * EXTRA_POOL.length)];
        let sq: SquareId;
        if (p.piece === 'P') {
          do { sq = randomPawnSquare(); } while (usedSquares.has(sq));
        } else {
          do { sq = randomSquare(); } while (usedSquares.has(sq));
        }
        usedSquares.add(sq);
        placements.push({ ...p, square: sq });
      }

      // Try to find a piece that can make a legal move
      const indices = [...Array(placements.length).keys()];
      // Shuffle so we don't always pick the first moveable piece
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      for (const moveIdx of indices) {
        const movedPiece = placements[moveIdx];
        const reachable = getReachableSquares(movedPiece.piece, movedPiece.color, movedPiece.square, usedSquares);
        if (reachable.length === 0) continue;

        const newSq = reachable[Math.floor(Math.random() * reachable.length)];
        const after = placements.map((p, i) =>
          i === moveIdx ? { ...p, square: newSq } : { ...p }
        );

        const colorName = movedPiece.color === 'w' ? 'White' : 'Black';
        return {
          before: placements,
          after,
          movedPiece,
          movedTo: newSq,
          answer: `${colorName} ${movedPiece.piece} ${movedPiece.square} → ${newSq}`,
        };
      }
    }

    // Fallback (should never happen): simple king move
    const placements: PiecePlacement[] = [
      { piece: 'K', color: 'w', square: 'e1' },
      { piece: 'K', color: 'b', square: 'e8' },
    ];
    return {
      before: placements,
      after: [{ piece: 'K', color: 'w', square: 'e2' }, { piece: 'K', color: 'b', square: 'e8' }],
      movedPiece: placements[0],
      movedTo: 'e2',
      answer: 'White K e1 → e2',
    };
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

  let showTimerRef: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    bestStars = parseInt(localStorage.getItem('blindfold-changed-best-stars') ?? '0', 10);

    return () => {
      if (showTimerRef) clearTimeout(showTimerRef);
    };
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

  function handleSubmit() {
    if (!challenge || phase !== 'guessing') return;
    const sq = input.trim().toLowerCase();
    input = '';

    const right = sq === challenge.movedTo || sq === challenge.movedPiece.square;
    isCorrect = right;
    if (right) correct += 1;
    total += 1;
    playSound(right ? 'correct' : 'wrong');
    phase = 'feedback';
  }

  function nextRound() {
    if (round >= ROUNDS) {
      const stars = getStars(correct, total);
      if (stars > bestStars) {
        localStorage.setItem('blindfold-changed-best-stars', String(stars));
        bestStars = stars;
      }
      if (stars > 0) playSound('stars');
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
</script>

<div class="container">
  {#if phase === 'idle'}
    <div class="center-col">
      <h2>What Changed?</h2>
      <p class="muted">
        Memorize a position, then identify what moved. {ROUNDS} rounds &mdash; type the square something moved to (or from).
      </p>
      <Choice label="Pieces" options={[4, 6, 8].map((n) => ({ value: n, label: String(n) }))} bind:value={level} />
      {#if bestStars > 0}
        <StarRating stars={bestStars} size="sm" />
      {/if}
      <Button variant="primary" size="large" onclick={startGame}>Start</Button>
    </div>
  {:else if phase === 'done'}
    <div class="center-col">
      <h2>Complete!</h2>
      <p class="big-score">{correct}/{total} correct</p>
      {#if stars > 0}
        <StarRating {stars} size="lg" />
      {/if}
      <Button variant="primary" size="large" onclick={goIdle}>Play Again</Button>
    </div>
  {:else if phase === 'showing' && challenge}
    <div class="center-col">
      <div class="muted">Round {round}/{ROUNDS} &mdash; Memorize this position!</div>
      <div class="board">
        <Board board={createBoardState(challenge.before)} readOnly coordinates={false} label="Chess position to memorize" />
      </div>
      <div class="studying">Studying...</div>
    </div>
  {:else if phase === 'guessing' && challenge}
    <div class="center-col">
      <div class="muted">Round {round}/{ROUNDS} &mdash; What moved?</div>
      <div class="board">
        <Board board={createBoardState(challenge.after)} readOnly coordinates={false} label="Chess position after the move" />
      </div>
      <p class="muted">One piece moved. Type the square it moved <strong>to</strong> or <strong>from</strong>.</p>
      <AnswerInput bind:value={input} onsubmit={handleSubmit} label="Square" placeholder="Square..." />
    </div>
  {:else if phase === 'feedback' && challenge}
    <div class="center-col">
      <div class="muted">Round {round}/{ROUNDS}</div>
      <p class={['feedback', isCorrect ? 'correct' : 'wrong']}>
        {isCorrect ? '✓ Correct!' : '✗ Wrong!'}
      </p>
      <p class="muted">{challenge.answer}</p>
      <div class="board">
        <Board
          board={createBoardState(challenge.after)}
          readOnly
          coordinates={false}
          highlights={highlight([challenge.movedPiece.square, challenge.movedTo], MARK.note)}
          arrows={[{ from: challenge.movedPiece.square, to: challenge.movedTo, color: MARK.note }]}
          label="Chess position showing the move"
        />
      </div>
      <Button variant="primary" onclick={nextRound}>
        {round >= ROUNDS ? 'See Results' : 'Next'}
      </Button>
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

  .feedback {
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
  }
  .correct { color: var(--correct-text); }
  .wrong { color: var(--wrong-text); }
</style>
