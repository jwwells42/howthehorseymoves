<script lang="ts">
  import type { Snippet } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import { EMPTY_BOARD, type BoardState } from '$lib/logic/types';
  import type { SquareHighlight } from '$lib/board-marks';

  /**
   * One answer, looked back on after a trainer ends: a small board with the
   * squares that matter marked, framed in the colour of right or wrong, and
   * the question and answer underneath.
   */

  interface Props {
    correct: boolean;
    highlights?: SquareHighlight[];
    /** Pieces to show. The board is empty without it. */
    board?: BoardState;
    /** The question and the answer, in words. */
    children: Snippet;
  }

  let { correct, highlights = [], board = EMPTY_BOARD, children }: Props = $props();

  // A tint is hard to read on a board this small, so highlights are solid
  // unless they ask for something else.
  let solid = $derived(highlights.map((h): SquareHighlight => ({ look: 'solid', ...h })));
</script>

<figure class="review-card">
  <div class={['thumbnail', correct ? 'right' : 'wrong']}>
    <Board {board} highlights={solid} readOnly coordinates={false} />
  </div>
  <figcaption class="caption">
    <span class={['verdict', correct ? 'right' : 'wrong']} aria-hidden="true">{correct ? '✓' : '✗'}</span>
    <span class="sr-only">{correct ? 'Right.' : 'Wrong.'}</span>
    {@render children()}
  </figcaption>
</figure>

<style>
  .review-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .thumbnail {
    width: 6rem;
    border: 3px solid;
    border-radius: 4px;
    overflow: hidden;
  }
  .thumbnail.right { border-color: var(--correct); }
  .thumbnail.wrong { border-color: var(--wrong); }

  .caption {
    font-size: var(--size-small);
    text-align: center;
  }

  .verdict {
    font-weight: bold;
    margin-right: 0.25em;
  }
  .verdict.right { color: var(--correct-text); }
  .verdict.wrong { color: var(--wrong-text); }
</style>
