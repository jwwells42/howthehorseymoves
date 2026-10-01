<script lang="ts">
  import { onMount } from 'svelte';
  import { EMPTY_BOARD, FILES, RANKS, type SquareId } from '$lib/logic/types';
  import Board from '$lib/components/board/Board.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import BestScore from '$lib/components/ui/BestScore.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Countdown from '$lib/components/ui/Countdown.svelte';
  import { playSound } from '$lib/state/sound';
  import { MARK, highlight } from '$lib/board-marks';

  const GAME_DURATION = 30;

  const ALL_SQUARES: SquareId[] = [];
  for (const f of FILES) {
    for (const r of RANKS) {
      ALL_SQUARES.push(`${f}${r}` as SquareId);
    }
  }

  function randomSquare(exclude?: SquareId): SquareId {
    let sq: SquareId;
    do {
      sq = ALL_SQUARES[Math.floor(Math.random() * 64)];
    } while (sq === exclude);
    return sq;
  }

  function scoreToStars(score: number): number {
    if (score >= 10) return 3;
    if (score >= 5) return 2;
    if (score >= 3) return 1;
    return 0;
  }

  type GameState = 'idle' | 'playing' | 'done';

  let gameState = $state<GameState>('idle');
  let target = $state<SquareId>(randomSquare());
  let score = $state(0);
  let timeLeft = $state(GAME_DURATION);
  /** The square just tapped, for a moment, and whether it was the right one. */
  let flash = $state<{ square: SquareId; right: boolean } | null>(null);
  let bestScore = $state(0);
  let bestStars = $state(0);

  let timerRef: ReturnType<typeof setInterval> | null = null;
  let flashRef: ReturnType<typeof setTimeout> | null = null;

  onMount(() => {
    bestScore = parseInt(localStorage.getItem('coord-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('coord-best-stars') ?? '0', 10);

    return () => {
      if (timerRef) clearInterval(timerRef);
      if (flashRef) clearTimeout(flashRef);
    };
  });

  function startGame() {
    score = 0;
    timeLeft = GAME_DURATION;
    target = randomSquare();
    flash = null;
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

    const stars = scoreToStars(score);
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('coord-best', String(score));
    }
    if (stars > bestStars) {
      bestStars = stars;
      localStorage.setItem('coord-best-stars', String(stars));
    }
    if (stars > 0) playSound('stars');
  }

  function handleSquareClick(sq: SquareId) {
    if (gameState !== 'playing') return;

    if (flashRef) clearTimeout(flashRef);

    const right = sq === target;
    flash = { square: sq, right };
    if (right) {
      score += 1;
      target = randomSquare(target);
      playSound('correct');
    } else {
      playSound('wrong');
    }

    flashRef = setTimeout(() => {
      flash = null;
    }, 200);
  }

  let flashHighlights = $derived(
    flash ? highlight([flash.square], flash.right ? MARK.good : MARK.danger, 'solid') : []
  );
</script>

<div class="trainer">
  {#if gameState === 'idle'}
    <div class="screen">
      <p class="instructions">Click the correct square as fast as you can!</p>
      <div class="thresholds">
        <span class="threshold"><StarRating stars={1} size="sm" /> 3 correct</span>
        <span class="threshold"><StarRating stars={2} size="sm" /> 5 correct</span>
        <span class="threshold"><StarRating stars={3} size="sm" /> 10 correct</span>
      </div>
      <BestScore score={bestScore} stars={bestStars} />
      <Button variant="primary" size="large" onclick={startGame}>Start</Button>
    </div>
  {:else if gameState === 'playing'}
    <div class="countdown">
      <Countdown remaining={timeLeft} total={GAME_DURATION}>Score: {score}</Countdown>
    </div>
  {:else}
    <div class="screen">
      <div class="final-score">{score}</div>
      <StarRating stars={scoreToStars(score)} size="lg" />
      <div class="thresholds done-thresholds">
        <span class={['threshold', score >= 3 && 'achieved']}><StarRating stars={1} size="sm" /> 3</span>
        <span class={['threshold', score >= 5 && 'achieved']}><StarRating stars={2} size="sm" /> 5</span>
        <span class={['threshold', score >= 10 && 'achieved']}><StarRating stars={3} size="sm" /> 10</span>
      </div>
      <BestScore score={bestScore} stars={bestStars} />
      <Button variant="primary" size="large" onclick={startGame}>Play Again</Button>
      <a href="/setup" class="setup-link">Place the Pieces! &rarr;</a>
    </div>
  {/if}

  <div class="board-wrapper">
    <Board
      board={EMPTY_BOARD}
      readOnly={gameState !== 'playing'}
      onSquareClick={handleSquareClick}
      highlights={flashHighlights}
    >
      {#if gameState === 'playing'}
        <text x="400" y="400" class="target-name">{target}</text>
      {/if}
    </Board>
  </div>
</div>

<style>
  .trainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }

  @media (min-height: 32rem) and (min-width: 32rem) {
    .trainer {
      flex: 1;
      min-height: 0;
    }
  }

  .board-wrapper {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  @media (min-height: 32rem) and (min-width: 32rem) {
    .board-wrapper {
      flex: 1;
      min-height: 0;
      align-items: center;
    }
  }

  /* The square to find, written large across the board. A dark edge keeps it
     readable on both light and dark squares. */
  .target-name {
    font-size: 160px;
    font-weight: bold;
    text-anchor: middle;
    dominant-baseline: central;
    fill: var(--ink);
    stroke: var(--page);
    stroke-width: 10px;
    paint-order: stroke;
    opacity: 0.9;
    pointer-events: none;
    user-select: none;
  }

  .countdown {
    width: 100%;
    flex-shrink: 0;
  }

  .screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .instructions {
    color: var(--ink-muted);
  }

  .thresholds {
    display: flex;
    gap: 1.25rem;
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }

  .threshold {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .done-thresholds .threshold {
    opacity: 0.4;
  }

  .done-thresholds .threshold.achieved {
    opacity: 1;
    color: var(--ink);
  }

  .final-score {
    font-size: 3rem;
    font-weight: bold;
  }

  .setup-link {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    margin-top: 0.25rem;
  }

  .setup-link:hover {
    color: var(--ink);
  }
</style>
