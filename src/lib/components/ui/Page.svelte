<script lang="ts">
  import type { Snippet } from 'svelte';
  import BackLink from './BackLink.svelte';

  interface Props {
    title: string;
    subtitle?: string;
    /** The page one level up, e.g. { href: '/', label: 'Back to home' }. */
    back?: { href: string; label: string };
    children?: Snippet;
  }

  let { title, subtitle, back, children }: Props = $props();
</script>

<!-- Every page is the same width (--column), so the back link and the left
     edge of the page stay in the same place from page to page -->
<main class="page">
  {#if back}
    <BackLink href={back.href}>{back.label}</BackLink>
  {/if}

  <header class="header">
    <h1>{title}</h1>
    {#if subtitle}
      <p class="subtitle">{subtitle}</p>
    {/if}
  </header>

  {@render children?.()}
</main>

<style>
  .page {
    max-width: calc(var(--column) + 2 * var(--gutter));
    margin: 0 auto;
    padding: 1.5rem var(--gutter);
  }

  .header {
    margin-bottom: 2rem;
  }
  .subtitle {
    margin-top: 0.25rem;
    color: var(--ink-muted);
  }
</style>
