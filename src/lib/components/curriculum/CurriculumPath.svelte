<script lang="ts">
  import StarRating from '$lib/components/puzzle/StarRating.svelte';
  import type { CurriculumChapter } from '$lib/curriculum';

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
        <span class="chapter-num">{ci + 1}</span>
        <span class="chapter-title">{chapter.title}</span>
      </div>

      <div class="stop-grid">
        {#each chapter.stops as stop}
          {@const stars = stopStars[stop.id] ?? 0}
          {@const isNext = stop.id === firstIncompleteId}
          {@const isNone = stop.progress.type === 'none'}
          <a
            href={stop.href}
            id={stop.id}
            class={['stop', stars > 0 && 'completed', isNext && 'next', isNone && 'no-track']}
          >
            {#if isNext}
              <img src="/pieces/wN.svg" alt="You are here" class="knight-marker" />
            {/if}
            <div class="stop-icon-wrap">
              <img src={stop.icon} alt="" class="stop-icon" />
            </div>
            <span class="stop-label">{stop.name}</span>
            <div class="stop-footer">
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
  .path {
    max-width: 56rem;
    margin: 0 auto;
  }

  .chapter {
    margin-bottom: 2rem;
  }

  .chapter-heading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--card-border);
  }

  .chapter-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--btn-bg);
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: bold;
    flex-shrink: 0;
  }

  .chapter-title {
    font-size: 0.9rem;
    font-weight: bold;
    color: var(--foreground);
  }

  .stop-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  @media (min-width: 640px) { .stop-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .stop-grid { grid-template-columns: repeat(3, 1fr); } }

  .stop {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    text-decoration: none;
    color: var(--foreground);
    position: relative;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .stop:hover {
    border-color: rgba(240, 230, 204, 0.3);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .stop.completed {
    border-color: rgba(34, 197, 94, 0.4);
  }

  .stop.next {
    border-color: rgba(250, 204, 21, 0.5);
    box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.2);
  }

  .stop.no-track {
    border-style: dashed;
  }

  .stop-icon-wrap {
    width: 2.5rem;
    height: 2.5rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stop-icon {
    width: 2.25rem;
    height: 2.25rem;
  }

  .stop-label {
    flex: 1;
    font-size: 0.875rem;
    line-height: 1.3;
  }

  .stop.completed .stop-label {
    color: var(--foreground);
  }

  .stop-footer {
    flex-shrink: 0;
  }

  .knight-marker {
    position: absolute;
    top: -0.875rem;
    right: -0.5rem;
    width: 1.5rem;
    height: 1.5rem;
    animation: bounce 1.5s ease-in-out infinite;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
</style>
