<script lang="ts">
  interface Props {
    text: string;
    /** The bot's colour, a --bot-* custom property. */
    color?: string;
  }

  let { text, color = 'var(--line)' }: Props = $props();
</script>

{#key text}
  <div class="bubble" style:border-color={color}>
    {text}
  </div>
{/key}

<style>
  .bubble {
    position: relative;
    font-size: var(--size-secondary);
    padding: 0.375rem 0.625rem;
    border-radius: 0.75rem;
    border: 2px solid;
    background: var(--surface);
    text-align: center;
    animation: bubble-in 0.2s ease-out;
    max-width: 12rem;
  }

  @keyframes bubble-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
