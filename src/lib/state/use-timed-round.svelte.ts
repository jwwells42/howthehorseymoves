import { onMount } from 'svelte';
import { playSound } from './sound';
import { readNumber, saveBest } from './storage';

/**
 * A timed round, the way the Vision trainers play it: as many questions as
 * you can in 30 seconds. Holds the clock, the score, every answer given (for
 * the review afterwards), the best score and stars, and the quick flash of
 * right or wrong. The trainer brings its own questions; `TimedRound.svelte`
 * draws the screens around them.
 *
 * Call it while a component starts up: it reads the best once the page is in
 * the browser, and stops the clock when the component goes away.
 */

export interface Answer {
  correct: boolean;
}

interface Options {
  /** Saved as `${key}-best` and `${key}-best-stars`. Students' progress is under these, so never rename one. */
  key: string;
  /** The scores that earn one, two and three stars. */
  stars: [number, number, number];
  /** At the start of every round, e.g. to pick the first question. */
  onStart?: () => void;
  /** When time is up. */
  onEnd?: () => void;
}

const SECONDS = 30;
const FLASH_MS = 200;

export function createTimedRound<A extends Answer>({ key, stars: thresholds, onStart, onEnd }: Options) {
  let phase = $state<'idle' | 'playing' | 'done'>('idle');
  let score = $state(0);
  let timeLeft = $state(SECONDS);
  let history = $state<A[]>([]);
  let flash = $state<'correct' | 'wrong' | null>(null);
  let best = $state(0);
  let bestStars = $state(0);

  const starsFor = (n: number) => thresholds.filter((t) => n >= t).length;
  let stars = $derived(starsFor(score));
  let mistakes = $derived(history.filter((a) => !a.correct));

  let clock: ReturnType<typeof setInterval> | null = null;
  let flashTimer: ReturnType<typeof setTimeout> | null = null;

  function stopTimers() {
    if (clock) clearInterval(clock);
    if (flashTimer) clearTimeout(flashTimer);
    clock = flashTimer = null;
  }

  onMount(() => {
    best = readNumber(`${key}-best`);
    bestStars = readNumber(`${key}-best-stars`);
    return stopTimers;
  });

  function start() {
    stopTimers();
    score = 0;
    timeLeft = SECONDS;
    history = [];
    flash = null;
    phase = 'playing';
    onStart?.();
    clock = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) end();
    }, 1000);
  }

  function end() {
    stopTimers();
    phase = 'done';
    const earned = starsFor(score);
    if (earned > 0) playSound('stars');
    best = saveBest(`${key}-best`, score);
    bestStars = saveBest(`${key}-best-stars`, earned);
    onEnd?.();
  }

  /** Keeps an answer for the review, and scores it if it's right. No sound. */
  function record(attempt: A) {
    if (phase !== 'playing') return;
    history = [...history, attempt];
    if (attempt.correct) score += 1;
  }

  /** record(), with the right or wrong sound and flash. */
  function answer(attempt: A) {
    if (phase !== 'playing') return;
    record(attempt);
    playSound(attempt.correct ? 'correct' : 'wrong');
    flash = attempt.correct ? 'correct' : 'wrong';
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (flash = null), FLASH_MS);
  }

  return {
    get phase() { return phase; },
    get playing() { return phase === 'playing'; },
    get score() { return score; },
    get timeLeft() { return timeLeft; },
    seconds: SECONDS,
    get history() { return history; },
    get mistakes() { return mistakes; },
    /** 'correct' or 'wrong' for a moment after each answer: a class for the question. */
    get flash() { return flash; },
    get stars() { return stars; },
    get best() { return best; },
    get bestStars() { return bestStars; },
    start,
    record,
    answer,
  };
}

export type TimedRound<A extends Answer = Answer> = ReturnType<typeof createTimedRound<A>>;
