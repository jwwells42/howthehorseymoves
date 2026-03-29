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
    min-height: calc(100dvh - 3rem);
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
  }

  @media (min-height: 32rem) and (min-width: 32rem) {
    .page {
      height: calc(100dvh - 3rem);
      overflow: hidden;
    }
  }
  .center { text-align: center; }
  .muted-link { color: var(--text-muted); }
  .muted-link:hover { text-decoration: underline; }
</style>
