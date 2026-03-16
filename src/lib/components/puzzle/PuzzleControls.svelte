<script lang="ts">
  interface Props {
    onReset: () => void;
    onHint?: () => void;
  }
  let { onReset, onHint }: Props = $props();
</script>

<div class="controls">
  <button class="btn" onclick={onReset}>Reset</button>
  {#if onHint}
    <button class="btn hint-btn" onclick={onHint}>Hint</button>
  {/if}
</div>

<style>
  .controls {
    display: flex;
    gap: 0.75rem;
  }
  .btn {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    background: var(--btn-bg);
    color: inherit;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.15s;
  }
  .btn:hover {
    background: var(--btn-hover);
  }
  .hint-btn {
    background: rgba(120, 53, 15, 0.4);
    color: #fcd34d;
  }
  .hint-btn:hover {
    background: rgba(120, 53, 15, 0.6);
  }
</style>
