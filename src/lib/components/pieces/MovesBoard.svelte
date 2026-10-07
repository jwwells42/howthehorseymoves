<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import { EMPTY_BOARD, type PieceKind, type SquareId } from '$lib/logic/types';
  import { moveArrows } from './match-moves';

  /** Where a piece can go, drawn as arrows from `origin` on an empty board.
      The piece itself isn't shown: the arrows are the question. */

  interface Props {
    piece: PieceKind;
    origin: SquareId;
  }

  let { piece, origin }: Props = $props();

  let arrows = $derived(moveArrows(piece, origin));
  let label = $derived(`Arrows from ${origin} to ${arrows.map((a) => a.to).join(', ')}`);
</script>

<!-- A picture inside a button: taps go to the button, not to a square. -->
<div class="moves-board">
  <Board board={EMPTY_BOARD} {arrows} {label} readOnly coordinates={false} />
</div>

<style>
  .moves-board {
    pointer-events: none;
  }
</style>
