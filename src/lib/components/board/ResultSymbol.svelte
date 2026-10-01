<script lang="ts">
  /**
   * How a game ended, as one big symbol a student can read without reading:
   * a trophy for a win, ½ for a draw, a white flag for giving up. Usually
   * shown over the board in a BoardOverlay.
   */

  interface Props {
    result: 'win' | 'draw' | 'resign';
  }

  let { result }: Props = $props();

  const SYMBOLS = {
    win: { glyph: '🏆', label: 'You win' },
    draw: { glyph: '½', label: 'Draw' },
    resign: { glyph: '🏳️', label: 'Resigned' },
  };

  let symbol = $derived(SYMBOLS[result]);
</script>

<div class={['symbol', result]} role="img" aria-label={symbol.label}>{symbol.glyph}</div>

<style>
  .symbol {
    font-size: 7rem;
    line-height: 1;
    filter: drop-shadow(var(--shadow));
    animation: pop 0.5s ease-out;
  }
  .draw {
    font-size: 8rem;
    font-weight: bold;
    color: var(--highlight);
  }

  @keyframes pop {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); }
  }
</style>
