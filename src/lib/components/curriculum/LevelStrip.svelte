<script lang="ts" module>
  export interface LevelStop {
    id: string;
    name: string;
    icon: string;
    done: boolean;
  }
</script>

<script lang="ts">
  /**
   * One level's stops in a row, finished ones ticked, with the knight standing
   * above one of them. Change `knightAt` and the knight walks there.
   */

  interface Props {
    title: string;
    stops: LevelStop[];
    /** The stop the knight stands on. Left out, there's no knight. */
    knightAt?: number;
    /** The stop to go to next, ringed. */
    next?: number;
    /** Keep the title for screen readers only, when a heading above already says it */
    hideTitle?: boolean;
  }
  let { title, stops, knightAt, next, hideTitle = false }: Props = $props();
</script>

<div class="level">
  <h2 class={['level-title', hideTitle && 'sr-only']}>{title}</h2>
  <ol class="strip" style:grid-template-columns="repeat({stops.length}, 1fr)" aria-label={title}>
    {#each stops as stop, i (stop.id)}
      <li class={['stop', stop.done && 'done', i === next && 'next']}>
        <span class="dot">
          <img src={stop.icon} alt="" />
        </span>
        {#if stop.done}
          <span class="badge" aria-hidden="true">&#10003;</span>
        {/if}
        <span class="sr-only">{stop.name}{stop.done ? ', done' : ''}{i === next ? ', next' : ''}</span>
      </li>
    {/each}
    {#if knightAt !== undefined}
      <img src="/pieces/wN.svg" alt="" class="knight" style:left="{((knightAt + 0.5) / stops.length) * 100}%" />
    {/if}
  </ol>
</div>

<style>
  .level { width: 100%; }
  .level-title {
    font-size: var(--size-secondary);
    font-weight: var(--weight-regular);
    color: var(--ink-muted);
    margin-bottom: 0.25rem;
  }

  /* One column per stop; the knight stands above the row */
  .strip {
    position: relative;
    display: grid;
    padding: 2.25rem 0 0;
    margin: 0;
    list-style: none;
  }
  .stop {
    position: relative;
    display: flex;
    justify-content: center;
  }
  .dot {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 2px solid var(--line);
    background: var(--surface-raised);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dot img { width: 1.375rem; height: 1.375rem; }
  .stop.done .dot { border-color: var(--correct); }
  .stop.next .dot { border-color: var(--highlight); }
  .badge {
    position: absolute;
    top: -0.5rem;
    left: calc(50% + 0.5rem);
    width: 1.125rem;
    height: 1.125rem;
    border-radius: 50%;
    background: var(--correct);
    color: var(--on-answer);
    font-size: var(--size-small);
    font-weight: var(--weight-strong);
    line-height: 1.125rem;
  }
  .knight {
    position: absolute;
    top: 0;
    width: 2rem;
    height: 2rem;
    transform: translateX(-50%);
    transition: left 0.8s ease-in-out;
    animation: fade-in 0.3s ease-out;
  }
  @media (prefers-reduced-motion: reduce) {
    .knight { transition: none; animation: none; }
  }
  /* Bigger stops where there's room (nine must fit a phone) */
  @media (min-width: 480px) {
    .strip { padding-top: 2.75rem; }
    .dot { width: 2.75rem; height: 2.75rem; }
    .dot img { width: 1.875rem; height: 1.875rem; }
    .badge { left: calc(50% + 0.75rem); }
    .knight { width: 2.5rem; height: 2.5rem; }
  }
</style>
