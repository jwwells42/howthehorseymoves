<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    /** `primary` is the one thing to do next on a screen: Start, Next,
        Continue. Everything else is `secondary`. */
    variant?: 'primary' | 'secondary';
    /** `large` is for a button that starts something and should be easy to hit. */
    size?: 'normal' | 'large';
    /** Given an href, the button is a link that looks the same. */
    href?: string;
    children: Snippet;
  }

  let { variant = 'secondary', size = 'normal', href, children, ...rest }: Props = $props();

  let element = $state<HTMLElement>();

  /** Lets a parent move the keyboard to this button, e.g. "New route" once a route is done. */
  export function focus() {
    element?.focus();
  }
</script>

{#if href}
  <a bind:this={element} {href} class={['button', variant, size]}>{@render children()}</a>
{:else}
  <button bind:this={element} class={['button', variant, size]} {...rest}>{@render children()}</button>
{/if}

<style>
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid transparent;
    font-size: var(--size-secondary);
    font-weight: bold;
    cursor: pointer;
    transition: background 0.15s;
  }

  .large {
    padding: 0.75rem 2rem;
    font-size: var(--size-body);
  }

  .primary {
    background: var(--action);
    color: var(--on-action);
  }
  .primary:hover {
    background: var(--action-hover);
  }

  .secondary {
    background: var(--surface-raised);
    border-color: var(--line);
    color: var(--ink);
  }
  .secondary:hover {
    background: var(--line);
  }

  .button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
