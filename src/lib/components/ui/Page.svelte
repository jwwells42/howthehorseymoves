<script lang="ts">
  import type { Snippet } from 'svelte';
  import BackLink from './BackLink.svelte';

  interface Props {
    title: string;
    subtitle?: string;
    /** The page one level up, e.g. { href: '/', label: 'Back to home' }. */
    back?: { href: string; label: string };
    /** `narrow` suits a single column of text, `wide` a grid or a board. */
    width?: 'narrow' | 'normal' | 'wide';
    children: Snippet;
  }

  let { title, subtitle, back, width = 'normal', children }: Props = $props();
</script>

<main class={['page', width]}>
  {#if back}
    <BackLink href={back.href}>{back.label}</BackLink>
  {/if}

  <header class="header">
    <h1>{title}</h1>
    {#if subtitle}
      <p class="subtitle">{subtitle}</p>
    {/if}
  </header>

  {@render children()}
</main>

<style>
  .page {
    margin: 0 auto;
    padding: 1.5rem;
  }
  .narrow { max-width: 42rem; }
  .normal { max-width: 48rem; }
  .wide { max-width: 56rem; }

  .header {
    margin-bottom: 2rem;
  }
  .subtitle {
    margin-top: 0.25rem;
    color: var(--ink-muted);
  }
</style>
