<script lang="ts" generics="A extends Answer">
  import type { Snippet } from 'svelte';
  import type { Answer, TimedRound } from '$lib/state/use-timed-round.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import BestScore from '$lib/components/ui/BestScore.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Countdown from '$lib/components/ui/Countdown.svelte';
  import FinishActions from '$lib/components/curriculum/FinishActions.svelte';

  /**
   * The screens every timed Vision trainer shares, around a round from
   * createTimedRound(): the trainer's name and Start, the clock while it
   * runs, and the result when time is up. The trainer brings the question
   * and the review.
   */

  interface Props {
    round: TimedRound<A>;
    title: string;
    /** What the score counts: right answers ("Score: 7", then "7/9 correct"), or squares completed ("Completed: 3"). */
    counts?: 'answers' | 'completed';
    /** On the start screen, under the name. */
    intro?: Snippet;
    /** Under the clock while the round runs: the question and the answer buttons. */
    play: Snippet;
    /** Under the result: the answers, looked back on. */
    results?: Snippet;
  }

  let { round, title, counts = 'answers', intro, play, results }: Props = $props();
</script>

<div class="trainer">
  {#if round.phase === 'idle'}
    <div class="screen">
      <h2>{title}</h2>
      {@render intro?.()}
      <BestScore score={round.best} stars={round.bestStars} />
      <Button variant="primary" size="large" onclick={round.start}>Start</Button>
    </div>

  {:else if round.phase === 'playing'}
    <Countdown remaining={round.timeLeft} total={round.seconds}>
      {counts === 'answers' ? 'Score' : 'Completed'}: {round.score}
    </Countdown>
    {@render play()}

  {:else}
    <div class="screen">
      <h2>⏱</h2>
      <p class="final-score">
        {#if counts === 'answers'}
          {round.score}/{round.history.length} correct
        {:else}
          {round.score} completed
        {/if}
      </p>
      {#if round.stars > 0}
        <StarRating stars={round.stars} size="lg" />
      {/if}
      <BestScore score={round.best} />
      <FinishActions label="Play Again" onclick={round.start} />
      {@render results?.()}
    </div>
  {/if}
</div>

<style>
  .trainer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    max-width: 28rem;
    margin: 0 auto;
  }

  .screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
  }

  .final-score {
    font-size: var(--size-title);
    font-weight: var(--weight-strong);
  }
</style>
