<script lang="ts">
  import { createTimedRound } from '$lib/state/use-timed-round.svelte';
  import TimedRound from './TimedRound.svelte';

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

  let question = $state<Question>(generateQuestion());

  const round = createTimedRound<Attempt>({
    key: 'blindfold-relative',
    stars: [6, 12, 20],
    onStart: () => (question = generateQuestion()),
  });

  function handleAnswer(dir: Direction) {
    round.answer({ ...question, correct: question.direction === dir, answered: dir });
    question = generateQuestion();
  }
</script>

<TimedRound {round} title="Relative Position">
  {#snippet play()}
    <div class="question-area">
      <div class="question-label">
        Where is <span class="bold">{question.sq2}</span> from <span class="bold">{question.sq1}</span>?
      </div>
      <div class={['question-main', round.flash === 'correct' && 'flash-correct', round.flash === 'wrong' && 'flash-wrong']}>
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
  {/snippet}

  {#snippet results()}
    {#if round.mistakes.length > 0}
      <div class="mistakes-section">
        <h3 class="mistakes-title">Mistakes ({round.mistakes.length})</h3>
        <div class="mistakes-list">
          {#each round.mistakes as a}
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
  {/snippet}
</TimedRound>

<style>
  .question-area {
    text-align: center;
    padding: 0.5rem 0;
  }

  .question-label {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    margin-bottom: 0.25rem;
  }

  .bold {
    font-weight: var(--weight-strong);
  }

  .question-main {
    font-size: var(--size-title);
    font-weight: var(--weight-strong);
    transition: color 0.1s;
  }

  .flash-correct {
    color: var(--correct-text);
  }

  .flash-wrong {
    color: var(--wrong-text);
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
    border: 2px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    font-size: var(--size-large);
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .dir-btn:hover {
    border-color: var(--ink-muted);
  }

  .dir-btn:active {
    transform: scale(0.95);
  }

  .mistakes-section {
    width: 100%;
    border-top: 1px solid var(--line);
    margin-top: 0.5rem;
    padding-top: 1rem;
  }

  .mistakes-title {
    font-weight: var(--weight-strong);
    font-size: var(--size-secondary);
    margin-bottom: 0.75rem;
  }

  .mistakes-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .mistake-row {
    font-size: var(--size-secondary);
  }

  .mono-bold {
    font-variant-numeric: tabular-nums;
    font-weight: var(--weight-strong);
  }

  .correct-label {
    color: var(--correct-text);
  }

  .faint {
    color: var(--ink-muted);
  }
</style>
