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

      <div class="stops">
        {#each chapter.stops as stop, si}
          {@const stars = stopStars[stop.id] ?? 0}
          {@const isNext = stop.id === firstIncompleteId}
          {@const isNone = stop.progress.type === 'none'}
          <div class="stop-row" class:left={si % 2 === 0} class:right={si % 2 !== 0}>
            {#if si > 0}
              <div class="connector" class:completed={stars > 0}></div>
            {/if}
            <a
              href={stop.href}
              id={stop.id}
              class={['stop-link', stars > 0 && 'completed', isNext && 'next', isNone && 'no-track']}
            >
              {#if isNext}
                <img src="/pieces/wN.svg" alt="You are here" class="knight-marker" />
              {/if}
              <div class="stop-node">
                <img src={stop.icon} alt="" class="stop-icon" />
              </div>
              <span class="stop-label">{stop.name}</span>
              {#if stars > 0}
                <StarRating {stars} size="sm" />
              {/if}
            </a>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .path {
    max-width: 22rem;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .chapter {
    margin-bottom: 1.5rem;
  }

  .chapter-heading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding: 0.5rem 0;
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

  .stops {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
  }

  .stop-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    position: relative;
  }

  .stop-row.left {
    align-items: flex-start;
    padding-left: 1.5rem;
  }

  .stop-row.right {
    align-items: flex-end;
    padding-right: 1.5rem;
  }

  .connector {
    width: 2px;
    height: 1.25rem;
    background: var(--card-border);
    align-self: center;
  }

  .connector.completed {
    background: #22c55e;
  }

  .stop-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    text-decoration: none;
    color: var(--foreground);
    position: relative;
    padding: 0.25rem;
    border-radius: 0.5rem;
    transition: background 0.15s;
  }

  .stop-link:hover {
    background: var(--btn-bg);
  }

  .stop-node {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    border: 3px solid var(--card-border);
    background: var(--card-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .stop-link.completed .stop-node {
    border-color: #22c55e;
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
  }

  .stop-link.next .stop-node {
    border-color: #facc15;
    box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.3);
  }

  .stop-link.no-track .stop-node {
    border-style: dashed;
  }

  .stop-icon {
    width: 2rem;
    height: 2rem;
  }

  .stop-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: center;
    max-width: 6rem;
    line-height: 1.2;
  }

  .stop-link.completed .stop-label {
    color: var(--foreground);
  }

  .knight-marker {
    position: absolute;
    top: -1.5rem;
    width: 1.75rem;
    height: 1.75rem;
    animation: bounce 1.5s ease-in-out infinite;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
</style>
