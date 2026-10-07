<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { PieceKind } from '$lib/logic/types';
  import FinishActions from '$lib/components/curriculum/FinishActions.svelte';
  import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import MovesBoard from './MovesBoard.svelte';
  import { playSound } from '$lib/state/sound';
  import { makeRound, mistakesToStars, PIECE_NAMES, ROUND_LENGTH, type Question } from './match-moves';

  const STORAGE_KEY = 'match-moves-best-stars';
  /** How long the ✓ stays up before the next question. */
  const NEXT_DELAY_MS = 1200;

  // Made in onMount, not here: a round made on the server would be a different
  // random round from the browser's, and hydration keeps the server's <img src>.
  let round = $state.raw<Question[]>([]);
  let index = $state(0);
  let tried = $state<PieceKind[]>([]);
  let solved = $state(false);
  let mistakes = $state(0);
  let phase = $state<'playing' | 'done'>('playing');
  let bestStars = $state(0);
  let feedback = $state('');
  let nextTimer: ReturnType<typeof setTimeout> | undefined;

  let question = $derived(round[index]);
  let stars = $derived(mistakesToStars(mistakes));

  onMount(() => {
    round = makeRound();
    bestStars = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
  });

  onDestroy(() => clearTimeout(nextTimer));

  function choose(choice: PieceKind) {
    if (solved || tried.includes(choice)) return;
    if (choice === question.answer) {
      solved = true;
      feedback = `Right! That's how the ${PIECE_NAMES[choice]} moves.`;
      playSound('correct');
      nextTimer = setTimeout(next, NEXT_DELAY_MS);
    } else {
      tried = [...tried, choice];
      mistakes++;
      feedback = `Not that one. That board is the ${PIECE_NAMES[choice]}.`;
      playSound('wrong');
    }
  }

  function next() {
    if (index + 1 >= ROUND_LENGTH) {
      finish();
      return;
    }
    index++;
    tried = [];
    solved = false;
    feedback = '';
  }

  function finish() {
    phase = 'done';
    playSound('stars');
    if (stars > bestStars) {
      bestStars = stars;
      localStorage.setItem(STORAGE_KEY, String(stars));
    }
  }

  function restart() {
    clearTimeout(nextTimer);
    round = makeRound();
    index = 0;
    tried = [];
    solved = false;
    mistakes = 0;
    feedback = '';
    phase = 'playing';
  }
</script>

{#if phase === 'done'}
  <div class="done">
    <div class="tada" aria-hidden="true">&#127881;</div>
    <h2>All {ROUND_LENGTH} done!</h2>
    <p class="muted">
      {mistakes === 0 ? 'Perfect — no mistakes!' : `${mistakes} mistake${mistakes === 1 ? '' : 's'}`}
    </p>
    <StarRating {stars} size="lg" />
    <FinishActions label="Play Again" onclick={restart} />
  </div>
{:else if question}
  <div class="game">
    <ProgressBar value={index + (solved ? 1 : 0)} max={ROUND_LENGTH} label="Question {index + 1} of {ROUND_LENGTH}" />

    <div class="prompt">
      <img class="prompt-piece" src="/pieces/w{question.answer}.svg" alt="The {PIECE_NAMES[question.answer]}" />
      <p>Which board shows how the <strong>{PIECE_NAMES[question.answer]}</strong> moves?</p>
    </div>

    <div class={['choices', solved && 'solved']}>
      {#each question.choices as choice (choice)}
        {@const right = solved && choice === question.answer}
        {@const wrong = tried.includes(choice)}
        <button
          class={['choice', right && 'right', wrong && 'wrong']}
          disabled={wrong}
          onclick={() => choose(choice)}
        >
          <MovesBoard piece={choice} origin={question.origin} />
          <!-- Once picked, the board says whose moves they were. -->
          {#if right || wrong}
            <span class="badge">
              <span class="verdict" aria-hidden="true">{right ? '✓' : '✗'}</span>
              <img class="badge-piece" src="/pieces/w{choice}.svg" alt="the {PIECE_NAMES[choice]}" />
            </span>
          {/if}
        </button>
      {/each}
    </div>

    <p class="sr-only" aria-live="polite">{feedback}</p>
  </div>
{/if}

<style>
  .game {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    text-align: center;
  }
  .prompt-piece {
    width: 7rem;
    height: 7rem;
  }

  .choices {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  @media (max-width: 40rem) {
    .choices {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .choice {
    position: relative;
    display: block;
    padding: 0;
    border: 4px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
    overflow: hidden;
    cursor: pointer;
  }
  .choices:not(.solved) .choice:hover:not(:disabled) {
    border-color: var(--ink);
  }
  .choice:disabled,
  .solved .choice {
    cursor: default;
  }
  .choice.right { border-color: var(--correct); }
  .choice.wrong { border-color: var(--wrong); }

  /* Over the board's top-right corner, so the board keeps its size. */
  .badge {
    position: absolute;
    top: 0.25rem;
    right: 0.25rem;
    display: flex;
    align-items: center;
    gap: 0.125rem;
    padding: 0.125rem 0.25rem 0.125rem 0.125rem;
    border-radius: 9999px;
    background: var(--surface);
  }
  .badge-piece {
    width: 2rem;
    height: 2rem;
  }

  .verdict {
    width: 2rem;
    height: 2rem;
    display: grid;
    place-items: center;
    border-radius: 9999px;
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
    color: var(--on-answer);
  }
  .right .verdict { background: var(--correct); }
  .wrong .verdict { background: var(--wrong); }

  .done {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
  }
  .done h2 {
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
  }
  .tada { font-size: 3rem; }
  .muted { color: var(--ink-muted); }
</style>
