<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';

  /**
   * A text box and a Go button, for trainers where the student types a square,
   * a move or a number. It takes the keyboard as soon as it appears, and again
   * whenever it stops being disabled, so the student never has to click it.
   */

  interface Props {
    value: string;
    onsubmit: () => void;
    /** Read out by screen readers, e.g. "Square". */
    label: string;
    placeholder?: string;
    maxlength?: number;
    /** Brings up a number keypad on touch screens. */
    numeric?: boolean;
    disabled?: boolean;
    /** Shown under the box when the last answer could not be used. */
    error?: string | null;
  }

  let {
    value = $bindable(),
    onsubmit,
    label,
    placeholder,
    maxlength = 2,
    numeric = false,
    disabled = false,
    error = null,
  }: Props = $props();

  let input = $state<HTMLInputElement>();

  $effect(() => {
    if (!disabled) input?.focus();
  });

  function submit(event: SubmitEvent) {
    event.preventDefault();
    onsubmit();
  }
</script>

<form class="answer" onsubmit={submit}>
  <input
    bind:this={input}
    bind:value
    type="text"
    inputmode={numeric ? 'numeric' : undefined}
    pattern={numeric ? '[0-9]*' : undefined}
    aria-label={label}
    {placeholder}
    {maxlength}
    {disabled}
    autocomplete="off"
    autocapitalize="off"
  />
  <Button type="submit" variant="primary" {disabled}>Go</Button>
</form>
{#if error}
  <p class="error" role="alert">{error}</p>
{/if}

<style>
  .answer {
    display: flex;
    gap: 0.5rem;
    width: 100%;
    max-width: 16rem;
  }
  input {
    flex: 1;
    min-width: 0;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--line);
    background: var(--surface);
    font-size: var(--size-large);
    font-variant-numeric: tabular-nums;
    text-align: center;
  }
  input::placeholder {
    color: var(--ink-muted);
  }
  .error {
    font-size: var(--size-secondary);
    font-weight: bold;
    color: var(--wrong-text);
  }
</style>
