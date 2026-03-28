<script lang="ts">
  import { page } from '$app/state';
  import SetupTrainer from '$lib/components/board/SetupTrainer.svelte';
  import { SETUP_STAGES } from '$lib/components/board/SetupTrainer.svelte';

  let stageSlug = $derived(page.params.stage);
  let stageExists = $derived(SETUP_STAGES.some(s => s.slug === stageSlug));
</script>

{#if stageExists && stageSlug}
  {#key stageSlug}
    <SetupTrainer {stageSlug} />
  {/key}
{:else}
  <main class="page center">
    <h1>Stage not found</h1>
    <a href="/setup" class="muted-link">Back to stages</a>
  </main>
{/if}

<style>
  .page {
    min-height: 100vh;
    padding: 1.5rem;
    max-width: 48rem;
    margin: 0 auto;
  }
  .center { text-align: center; }
  .muted-link { color: var(--text-muted); }
  .muted-link:hover { text-decoration: underline; }
</style>
