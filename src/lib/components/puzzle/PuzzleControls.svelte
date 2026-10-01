<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';

  interface Props {
    onReset: () => void;
    onHint?: () => void;
  }
  let { onReset, onHint }: Props = $props();
</script>

<div class="controls">
  <Button onclick={onReset}>Reset</Button>
  {#if onHint}
    <Button onclick={onHint}><span aria-hidden="true">💡</span> Hint</Button>
  {/if}
</div>

<style>
  .controls {
    display: flex;
    gap: 0.75rem;
  }
</style>
