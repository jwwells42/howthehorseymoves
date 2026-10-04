<script lang="ts">
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import { type CurriculumChapter, withStop } from '$lib/curriculum';

  interface Props {
    chapters: CurriculumChapter[];
    stopStars: Record<string, number>;
    firstIncompleteId: string | null;
  }
  let { chapters, stopStars, firstIncompleteId }: Props = $props();
</script>

<div class="path">
  {#each chapters as chapter, ci}
    <div class="chapter">
      <div class="chapter-heading">
        <h2>{chapter.title}</h2>
        <div class="divider"></div>
      </div>

      <div class="grid">
        {#each chapter.stops as stop}
          {@const stars = stopStars[stop.id] ?? 0}
          {@const isNext = stop.id === firstIncompleteId}
          {@const isNone = stop.progress.type === 'none'}
          <a
            href={withStop(stop.href, stop)}
            id={stop.id}
            class={['card', isNext && 'up-next', isNone && 'no-track']}
          >
            <div class={['step-badge', stars > 0 && 'complete']}>
              {#if stars > 0}
                &#10003;
              {:else}
                &middot;
              {/if}
            </div>
            {#if isNext}
              <img src="/pieces/wN.svg" alt="You are here" class="knight-marker" />
            {/if}
            <div class="card-header">
              <img src={stop.icon} alt="" class="card-icon" />
              <h3>{stop.name}</h3>
            </div>
            <p class="card-desc">{stop.desc}</p>
            <div class="card-footer">
              {#if stars > 0}
                <StarRating {stars} size="sm" />
              {:else}
                &nbsp;
              {/if}
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .path {
    max-width: 56rem;
    margin: 0 auto;
  }

  .chapter {
    margin-bottom: 2.5rem;
  }

  .chapter-heading {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .chapter-heading h2 {
    white-space: nowrap;
  }

  .divider {
    flex: 1;
    border-top: 1px solid var(--line);
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  @media (min-width: 640px) { .grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .grid { grid-template-columns: repeat(3, 1fr); } }

  .card {
    border-radius: 0.75rem;
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 1.5rem;
    transition: background 0.15s;
    display: flex;
    flex-direction: column;
    position: relative;
    height: 100%;
  }
  .card:hover {
    background: var(--surface-raised);
  }
  .card:hover .card-desc {
    color: var(--ink);
  }

  /* The next stop to do, in the colour that means "look here". */
  .card.up-next {
    border-color: var(--highlight);
  }

  /* A stop that records no progress, such as a lesson you read. */
  .card.no-track {
    border-style: dashed;
  }

  /* Step badge — top-left corner */
  .step-badge {
    position: absolute;
    top: -0.625rem;
    left: -0.625rem;
    width: 1.75rem;
    height: 1.75rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--size-small);
    font-weight: var(--weight-strong);
    border: 2px solid var(--line);
    background: var(--surface);
    color: var(--ink-muted);
  }
  .step-badge.complete {
    background: var(--correct);
    border-color: var(--correct);
    color: var(--on-answer);
  }

  /* Card header — icon + title */
  .card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  .card-icon {
    width: 3rem;
    height: 3rem;
  }

  /* Card description */
  .card-desc {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    margin-bottom: 0.75rem;
    flex: 1;
  }

  /* Card footer — stars */
  .card-footer {
    font-size: var(--size-small);
    color: var(--ink-muted);
  }

  /* Knight marker on up-next card */
  .knight-marker {
    position: absolute;
    top: -1rem;
    right: -0.625rem;
    width: 1.75rem;
    height: 1.75rem;
  }
</style>
