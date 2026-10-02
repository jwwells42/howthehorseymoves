<script lang="ts" generics="T extends string | number">
  /**
   * Pick one of a few options, shown as a row of buttons: a difficulty, a mode.
   * Underneath they are radio buttons, so the arrow keys move between them
   * and a screen reader says which is picked.
   *
   * `stacked` puts the options in a column, each with room for a line that
   * explains it. Use it when there are more than three options or they need
   * explaining.
   */

  interface Props {
    /** What is being chosen, e.g. "Difficulty". Shown before the options. */
    label: string;
    /** Read the label to screen readers only, where the options explain themselves. */
    hideLabel?: boolean;
    options: { value: T; label: string; description?: string }[];
    value: T;
    stacked?: boolean;
  }

  let { label, hideLabel = false, options, value = $bindable(), stacked = false }: Props = $props();

  const id = $props.id();
</script>

<div class={['choice', stacked && 'stacked']} role="radiogroup" aria-labelledby="{id}-label">
  <span id="{id}-label" class={['label', hideLabel && 'sr-only']}>{label}</span>
  {#each options as option (option.value)}
    <label class={['option', option.value === value && 'chosen']}>
      <input type="radio" class="sr-only" name={id} value={option.value} bind:group={value} />
      {option.label}
      {#if option.description}
        <span class="description">{option.description}</span>
      {/if}
    </label>
  {/each}
</div>

<style>
  /* As wide as its options, so whatever holds it decides where it sits. */
  .choice {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    width: fit-content;
    max-width: 100%;
  }

  .label {
    margin-right: 0.25rem;
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }

  .option {
    padding: 0.25rem 0.75rem;
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    font-size: var(--size-secondary);
    font-weight: var(--weight-strong);
    color: var(--ink-muted);
    cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }
  .option:hover {
    color: var(--ink);
  }
  .option.chosen {
    background: var(--action);
    border-color: var(--action);
    color: var(--on-action);
  }
  /* The radio button itself is hidden, so its focus ring goes on the label. */
  .option:has(:focus-visible) {
    outline: 3px solid var(--highlight);
    outline-offset: 2px;
  }

  .stacked {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }
  .stacked .label {
    margin-right: 0;
  }
  /* A list of settings, quieter than a row: a radio dot and an outline mark
     the choice, so it doesn't compete with the screen's main button. */
  .stacked .option {
    display: grid;
    grid-template-columns: 1rem 1fr;
    column-gap: 0.75rem;
    align-items: center;
    padding: 0.5rem 0.75rem;
  }
  .stacked .option::before {
    content: '';
    grid-row: span 2;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    border: 2px solid var(--line);
  }
  .stacked .option.chosen {
    background: var(--surface);
    border-color: var(--action);
    color: var(--ink);
  }
  .stacked .option.chosen::before {
    border-color: var(--action);
    background: var(--action);
    box-shadow: inset 0 0 0 3px var(--surface);
  }

  .description {
    font-weight: var(--weight-regular);
  }
</style>
