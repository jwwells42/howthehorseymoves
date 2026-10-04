<script lang="ts">
  import { page } from '$app/state';
  import Button from '$lib/components/ui/Button.svelte';
  import { doneHref, stopFromUrl } from '$lib/curriculum';

  /**
   * The buttons at the end of an activity. Opened from the path, Continue
   * comes first (large, full width) and leads to the screen between stops,
   * with the activity's own button (Play Again, New Position, …) smaller
   * underneath. Opened from a hub, it's just the activity's own button.
   */

  interface Props {
    /** The activity's own button */
    label: string;
    onclick: () => void;
    /** Its size when it's the only button */
    size?: 'normal' | 'large';
  }
  let { label, onclick, size = 'large' }: Props = $props();

  let stop = $derived(stopFromUrl(page.url));
  let mainButton = $state<Button>();

  /** Moves the keyboard to the main button: Continue on the path, else the activity's own. */
  export function focus() {
    mainButton?.focus();
  }
</script>

{#if stop}
  <div class="finish">
    <Button bind:this={mainButton} variant="primary" size="large" href={doneHref(stop)}>
      Continue <span aria-hidden="true">&rarr;</span>
    </Button>
    <div class="own">
      <Button {onclick}>{label}</Button>
    </div>
  </div>
{:else}
  <Button bind:this={mainButton} variant="primary" {size} {onclick}>{label}</Button>
{/if}

<style>
  /* A grid stretches Continue across; the activity's own button keeps its
     size underneath, so it reads as the lesser choice. */
  .finish {
    display: grid;
    gap: 0.75rem;
    width: min(20rem, 100%);
  }
  .own {
    display: flex;
    justify-content: center;
  }
</style>
