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
            class={['card', stars > 0 && 'completed', isNext && 'up-next', isNone && 'no-track']}
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
    margin-bottom: 2rem;
  }

  .chapter-heading {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
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
    gap: 1rem;
  }
  @media (min-width: 640px) { .stop-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 1024px) { .stop-grid { grid-template-columns: repeat(3, 1fr); } }

  /* Cards — matching old landing page style */
  .card {
    border-radius: 0.75rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    padding: 1.5rem;
    transition: all 0.15s;
    display: flex;
    flex-direction: column;
    position: relative;
    height: 100%;
    text-decoration: none;
    color: var(--foreground);
  }
  .card:hover {
    border-color: rgba(240, 230, 204, 0.3);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  }

  .card.completed {
    border-color: rgba(34, 197, 94, 0.25);
  }
  .card.completed:hover {
    border-color: rgba(34, 197, 94, 0.5);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(34, 197, 94, 0.15);
  }

  .card.up-next {
    animation: up-next-glow 2s ease-in-out infinite;
  }

  @keyframes up-next-glow {
    0%, 100% { box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.15); }
    50% { box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.25), 0 0 12px rgba(250, 204, 21, 0.1); }
  }

  .card.no-track {
    border-style: dashed;
    opacity: 0.85;
  }

  /* Step badge — top-left corner number/check */
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
    font-size: 0.75rem;
    font-weight: bold;
    border: 2px solid var(--card-border);
    background: var(--card-bg);
    color: var(--text-faint);
  }
  .step-badge.complete {
    background: #16a34a;
    border-color: #22c55e;
    color: white;
  }

  /* Card header — icon + title */
  .card-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
  }
  .card-header h3 {
    font-size: 1.125rem;
    font-weight: bold;
    margin: 0;
  }
  .card-icon {
    width: 3rem;
    height: 3rem;
  }

  /* Card footer — stars */
  .card-footer {
    font-size: 0.75rem;
    color: var(--text-faint);
  }

  /* Knight marker on up-next card */
  .knight-marker {
    position: absolute;
    top: -1rem;
    right: -0.625rem;
    width: 1.75rem;
    height: 1.75rem;
    animation: bounce 1.5s ease-in-out infinite;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
</style>
