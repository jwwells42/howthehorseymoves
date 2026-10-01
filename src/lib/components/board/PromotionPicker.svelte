<script lang="ts">
  import type { PieceColor, PieceKind } from '$lib/logic/types';
  import BoardOverlay from './BoardOverlay.svelte';

  /** The four pieces a pawn can become, shown over the board when it reaches the last rank. */

  interface Props {
    color?: PieceColor;
    onpick: (piece: PieceKind) => void;
  }

  let { color = 'w', onpick }: Props = $props();

  const CHOICES: { piece: PieceKind; name: string }[] = [
    { piece: 'Q', name: 'Queen' },
    { piece: 'R', name: 'Rook' },
    { piece: 'B', name: 'Bishop' },
    { piece: 'N', name: 'Knight' },
  ];
</script>

<BoardOverlay>
  <div class="picker" role="group" aria-label="Promote the pawn to">
    {#each CHOICES as { piece, name }}
      <button class="choice" onclick={() => onpick(piece)}>
        <img src="/pieces/{color}{piece}.svg" alt={name} />
      </button>
    {/each}
  </div>
</BoardOverlay>

<style>
  .picker {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 2px solid var(--line);
    border-radius: 0.75rem;
    background: var(--surface);
  }

  .choice {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4.5rem;
    height: 4.5rem;
    border: 2px solid transparent;
    border-radius: 0.5rem;
    background: var(--surface-raised);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .choice:hover {
    background: var(--line);
    border-color: var(--highlight);
  }

  .choice img {
    width: 3.5rem;
    height: 3.5rem;
  }
</style>
