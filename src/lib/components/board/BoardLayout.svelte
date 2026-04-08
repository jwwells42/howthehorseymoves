<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    boardArea: Snippet;
    sidebarArea: Snippet;
    headerArea?: Snippet;
  }

  let { boardArea, sidebarArea, headerArea }: Props = $props();
</script>

<div class="board-layout">
  {#if headerArea}
    <div class="mobile-header">
      {@render headerArea()}
    </div>
  {/if}
  <div class="board-area">
    {@render boardArea()}
  </div>
  <div class="sidebar-area">
    {#if headerArea}
      <div class="desktop-header">
        {@render headerArea()}
      </div>
    {/if}
    {@render sidebarArea()}
  </div>
</div>

<style>
  /* Mobile-first: vertical stack */
  .board-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
    flex: 1;
    min-height: 0;
  }

  .board-area {
    position: relative;
    width: 100%;
    display: flex;
    justify-content: center;
    flex: 1;
    min-height: 0;
    align-items: center;
  }

  .mobile-header {
    display: block;
    width: 100%;
    text-align: center;
    flex-shrink: 0;
  }

  .desktop-header {
    display: none;
  }

  .sidebar-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-width: 0;
    flex-shrink: 0;
  }

  @media (max-height: 480px) {
    .board-layout {
      gap: 0.25rem;
    }
  }

  /* Desktop: horizontal layout */
  @media (min-width: 900px) {
    .mobile-header {
      display: none;
    }

    .desktop-header {
      display: block;
    }
    .board-layout {
      flex-direction: row;
      align-items: stretch;
      justify-content: center;
      gap: 1rem;
    }

    .board-area {
      flex: 0 0 auto;
      width: min(calc(100dvh - 6rem), calc(100% - 19rem));
      aspect-ratio: 1;
    }

    .sidebar-area {
      width: 18rem;
      flex-shrink: 0;
      align-items: center;
    }
  }
</style>
