<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    href: string;
    /** Where it goes, e.g. "Back to home". */
    children: Snippet;
  }

  let { href, children }: Props = $props();
</script>

<a {href} class="back-link">&larr; {@render children()}</a>

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
