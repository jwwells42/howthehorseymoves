<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';

  interface Props {
    onReset: () => void;
  }
  let { onReset }: Props = $props();
</script>

<div class="controls">
  <Button onclick={onReset}>Reset</Button>
</div>

<style>
  .controls {
    display: flex;
    gap: 0.75rem;
  }
</style>
