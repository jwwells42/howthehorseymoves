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
            <div class="stop-info">
              <span class="stop-label">{stop.name}</span>
              {#if stars > 0}
                <StarRating {stars} size="sm" />
              {/if}
            </div>
            {#if stars > 0}
              <div class="check-badge">&#10003;</div>
            {/if}
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
    gap: 0.625rem;
  }
  @media (min-width: 640px) { .stop-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .stop-grid { grid-template-columns: repeat(3, 1fr); } }

  .stop {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: 0.875rem;
    border: 1px solid rgba(255, 248, 230, 0.08);
    background: linear-gradient(180deg, rgba(255, 248, 230, 0.06), rgba(255, 248, 230, 0.02));
    text-decoration: none;
    color: var(--foreground);
    position: relative;
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  }

  .stop:hover {
    transform: translateY(-2px);
    border-color: rgba(212, 165, 74, 0.25);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(212, 165, 74, 0.08);
  }

  .stop.completed {
    border-color: rgba(34, 197, 94, 0.3);
  }
  .stop.completed:hover {
    border-color: rgba(34, 197, 94, 0.5);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(34, 197, 94, 0.15);
  }

  .stop.next {
    border-color: rgba(250, 204, 21, 0.4);
    box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.15);
    animation: next-glow 2s ease-in-out infinite;
  }

  @keyframes next-glow {
    0%, 100% { box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.15); }
    50% { box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.25), 0 0 12px rgba(250, 204, 21, 0.1); }
  }

  .stop.no-track {
    border-style: dashed;
    opacity: 0.85;
  }

  .stop-icon-wrap {
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 248, 230, 0.08), rgba(255, 248, 230, 0.02));
    border: 1px solid rgba(255, 248, 230, 0.06);
    transition: box-shadow 0.2s, border-color 0.2s;
  }

  .stop:hover .stop-icon-wrap {
    border-color: rgba(212, 165, 74, 0.15);
    box-shadow: 0 0 8px rgba(212, 165, 74, 0.1);
  }

  .stop.completed .stop-icon-wrap {
    border-color: rgba(34, 197, 94, 0.2);
  }

  .stop-icon {
    width: 2rem;
    height: 2rem;
  }

  .stop-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .stop-label {
    font-size: 0.875rem;
    line-height: 1.3;
    font-weight: 500;
  }

  .check-badge {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    background: #16a34a;
    color: white;
    font-size: 0.65rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(22, 163, 74, 0.3);
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
