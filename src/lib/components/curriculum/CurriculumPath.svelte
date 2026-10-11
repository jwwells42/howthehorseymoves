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
            {#if stars > 0}
              <div class="done-badge">&#10003;</div>
            {/if}
            {#if isNext}
              <img src="/pieces/wN.svg" alt="You are here" class="knight-marker" />
            {/if}
            <img src={stop.icon} alt="" class="card-icon" />
            <div class="card-text">
              <h3>{stop.name}</h3>
              {#if stars > 0}
                <StarRating {stars} size="sm" />
              {/if}
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
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

  /* Small cards, just the icon and the name: two across on a phone, three
     where there's room */
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
  @media (min-width: 640px) { .grid { grid-template-columns: repeat(3, 1fr); } }

  /* On a phone the icon sits above the name */
  .card {
    border-radius: 0.75rem;
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 0.75rem 0.5rem;
    transition: background 0.15s;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.375rem;
    position: relative;
  }
  @media (min-width: 640px) {
    .card {
      flex-direction: row;
      text-align: left;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
    }
  }
  .card:hover {
    background: var(--surface-raised);
  }

  /* The next stop to do, in the colour that means "look here". */
  .card.up-next {
    border-color: var(--highlight);
  }

  /* A stop that records no progress, such as a lesson you read. */
  .card.no-track {
    border-style: dashed;
  }

  .card-icon {
    width: 2.5rem;
    height: 2.5rem;
    flex-shrink: 0;
  }
  .card-text {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  /* A finished stop: a tick in the top-left corner */
  .done-badge {
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
    background: var(--correct);
    border: 2px solid var(--correct);
    color: var(--on-answer);
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
