<script lang="ts">
  interface Props {
    text: string;
    color?: string;
  }

  let { text, color = '#f59e0b' }: Props = $props();
</script>

{#key text}
  <div class="bubble" style:border-color={color}>
    {text}
  </div>
{/key}

<style>
  .bubble {
    position: relative;
    font-size: 0.8125rem;
    padding: 0.375rem 0.625rem;
    border-radius: 0.75rem;
    border: 1.5px solid;
    background: var(--card-bg, #1a1a1a);
    text-align: center;
    animation: bubble-in 0.2s ease-out;
    max-width: 12rem;
  }

  @keyframes bubble-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
</style>
