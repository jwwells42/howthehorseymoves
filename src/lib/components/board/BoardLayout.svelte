<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    boardArea: Snippet;
    sidebarArea: Snippet;
  }

  let { boardArea, sidebarArea }: Props = $props();
</script>

<div class="board-layout">
  <div class="board-area">
    {@render boardArea()}
  </div>
  <div class="sidebar-area">
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

  .sidebar-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    flex-shrink: 0;
  }

  @media (max-height: 480px) {
    .board-layout {
      gap: 0.25rem;
    }
  }

  /* Desktop: horizontal layout */
  @media (min-width: 900px) and (min-height: 500px) {
    .board-layout {
      flex-direction: row;
      align-items: stretch;
      gap: 1.5rem;
    }

    .board-area {
      flex: 1;
    }

    .sidebar-area {
      width: 14rem;
      flex-shrink: 0;
      overflow-y: auto;
      align-items: stretch;
      justify-content: center;
    }
  }
</style>
