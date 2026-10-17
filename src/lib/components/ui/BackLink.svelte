<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    href: string;
    /** Instead of following the link, e.g. going back in the browser's history */
    onclick?: (e: MouseEvent) => void;
    /** Where it goes, e.g. "Back to home". */
    children: Snippet;
  }

  let { href, onclick, children }: Props = $props();
</script>

<a {href} {onclick} class="back-link">&larr; {@render children()}</a>

<style>
  .back-link {
    display: inline-block;
    /* In a flex column, stay the size of the words rather than stretching. */
    align-self: flex-start;
    flex-shrink: 0;
    margin-bottom: 1rem;
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }
  .back-link:hover {
    color: var(--ink);
  }
</style>
