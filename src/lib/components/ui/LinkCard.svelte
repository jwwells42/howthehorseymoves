<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** Leave it out for something the student cannot open yet. The card
        then shows `reason` and does not link. */
    href?: string;
    /** Why there is no link, shown on the right in place of `aside`. */
    reason?: string;
    /** An image path, usually a piece from /pieces/. */
    icon?: string;
    title: string;
    description?: string;
    /** Progress on the right: a count, stars, a check. */
    aside?: Snippet;
  }

  let { href, reason = 'Coming soon', icon, title, description, aside }: Props = $props();
</script>

{#snippet body()}
  <div class="main">
    {#if icon}
      <img src={icon} alt="" class="icon" />
    {/if}
    <div>
      <h3>{title}</h3>
      {#if description}
        <p class="description">{description}</p>
      {/if}
    </div>
  </div>
  {#if !href}
    <span class="aside">{reason}</span>
  {:else if aside}
    <div class="aside">{@render aside()}</div>
  {/if}
{/snippet}

{#if href}
  <a {href} class="card">{@render body()}</a>
{:else}
  <div class="card disabled">{@render body()}</div>
{/if}

<style>
  .card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-radius: 0.75rem;
    border: 1px solid var(--line);
    background: var(--surface);
    transition: background 0.15s;
  }
  a.card:hover {
    background: var(--surface-raised);
  }
  a.card:hover .description {
    color: var(--ink);
  }
  .disabled {
    opacity: 0.5;
  }

  .main {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .icon {
    width: 2.5rem;
    height: 2.5rem;
    flex-shrink: 0;
  }
  .description {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }
  .aside {
    flex-shrink: 0;
    text-align: right;
    font-size: var(--size-small);
    color: var(--ink-muted);
  }
</style>
