<script lang="ts">
  import type { Snippet } from 'svelte';
  import BackLink from '$lib/components/ui/BackLink.svelte';

  interface Props {
    /** The page one level up, e.g. { href: '/', label: 'Back to home' }. */
    back?: { href: string; label: string };
    /** At the right end of the back link's row, e.g. Continue. */
    action?: Snippet;
    children: Snippet;
  }

  let { back, action, children }: Props = $props();
</script>

<!--
  A screen with a board on it; put a BoardLayout inside. The back link sits
  where it does on every other page, the board's left edge lines up under it,
  and the board is the same size on every screen (Layout in app.css).
-->
<main class="board-page">
  <div class="top-row">
    {#if back}
      <BackLink href={back.href}>{back.label}</BackLink>
    {/if}
    {#if action}
      <div class="action">{@render action()}</div>
    {/if}
  </div>
  {@render children()}
</main>

<style>
  .board-page {
    display: flex;
    flex-direction: column;
    min-height: calc(100dvh - 3rem);
    padding: 1.5rem var(--gutter) 1rem;
  }
  /* Never scrolls when there's room for the board */
  @media (min-height: 32rem) and (min-width: 32rem) {
    .board-page {
      height: calc(100dvh - 3rem);
      overflow: hidden;
    }
  }
  /* The 2.25rem is in --board-size, so keep the two in step */
  .top-row {
    position: relative;
    height: 2.25rem;
    flex-shrink: 0;
  }
  .action {
    position: absolute;
    right: 0;
    top: -0.625rem;
  }

  @media (min-width: 900px) {
    .board-page {
      /* The column's left edge, or further left when the screen is too
         narrow for the board and the sidebar beside it */
      padding-left: clamp(
        var(--gutter),
        (100% - var(--column)) / 2,
        100% - var(--board-size) - var(--sidebar) - 1.5rem - var(--gutter)
      );
    }
  }
</style>
