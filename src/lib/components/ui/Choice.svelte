<script lang="ts" generics="T extends string | number">
  /**
   * Pick one of a few options, shown as a row of buttons: a difficulty, a mode.
   * Underneath they are radio buttons, so the arrow keys move between them
   * and a screen reader says which is picked.
   */

  interface Props {
    /** What is being chosen, e.g. "Difficulty". Shown before the options. */
    label: string;
    options: { value: T; label: string }[];
    value: T;
  }

  let { label, options, value = $bindable() }: Props = $props();

  const id = $props.id();
</script>

<div class="choice" role="radiogroup" aria-labelledby="{id}-label">
  <span id="{id}-label" class="label">{label}</span>
  {#each options as option (option.value)}
    <label class={['option', option.value === value && 'chosen']}>
      <input type="radio" class="sr-only" name={id} value={option.value} bind:group={value} />
      {option.label}
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
    font-weight: bold;
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
</style>
