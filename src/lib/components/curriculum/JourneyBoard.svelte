<script lang="ts">
  import { CURRICULUM, getStopStars, type CurriculumStop } from '$lib/curriculum';
  import { getCharacter } from '$lib/characters/bots';
  import type { BotLevel } from '$lib/logic/bot';
  import { progressState } from '$lib/state/progress-store';

  /**
   * The path as chessboards, eight levels to a board (Levels 1–8, then
   * 9–16): one rank per level, the board's first level at the bottom, each
   * level's stops along its rank and its bot waiting just past the end of
   * it. It shows the board the knight is on; a rank with no level yet is
   * dimmed. Finished stops are ticked, the knight's level is framed, and the
   * knight stands on `knightAt`. Change `knightAt` and the knight walks
   * there, or, onto the next board, that board appears with the knight on it.
   *
   * Reads saved progress, so render it only in the browser, once progress
   * has loaded.
   */

  interface Props {
    /** The id of the stop the knight stands on. */
    knightAt: string;
  }
  let { knightAt }: Props = $props();

  const FILES = 8;
  /** Levels on one board: a rank each. */
  const LEVELS_PER_BOARD = 8;
  /** The board's eight files plus the bot's square past the end. */
  const COLUMNS = FILES + 1;

  interface Square {
    id: string;
    name: string;
    done: boolean;
  }
  interface Rank {
    title: string;
    stops: (Square | null)[];
    bot: (Square & { avatar?: string }) | null;
  }

  function square(stop: CurriculumStop): Square {
    return { id: stop.id, name: stop.name, done: getStopStars(stop) > 0 };
  }

  let allRanks = $derived.by((): Rank[] => {
    void $progressState;
    return CURRICULUM.map((chapter) => {
      // A level's last stop is its bot (curriculum.test.ts checks it)
      const botStop = chapter.stops.find((s) => s.id.startsWith('play-'));
      const stops = chapter.stops.filter((s) => s !== botStop);
      return {
        title: chapter.title,
        stops: Array.from({ length: FILES }, (_, i) => (stops[i] ? square(stops[i]) : null)),
        bot: botStop
          ? { ...square(botStop), avatar: getCharacter(botStop.id.replace('play-', '') as BotLevel)?.avatar }
          : null,
      };
    });
  });

  let at = $derived.by(() => {
    for (const [level, rank] of allRanks.entries()) {
      const file = rank.stops.findIndex((s) => s?.id === knightAt);
      if (file >= 0) return { level, column: file, name: rank.stops[file]!.name };
      if (rank.bot?.id === knightAt) return { level, column: FILES, name: rank.bot.name };
    }
    return null;
  });

  let summary = $derived.by(() => {
    if (!at) return '';
    const rank = allRanks[at.level];
    const done = rank.stops.filter((s) => s?.done).length;
    const total = rank.stops.filter(Boolean).length;
    return `${at.name}, ${rank.title}: ${done}/${total}`;
  });

  /** The board the knight is on: 0 for Levels 1–8, 1 for 9–16, … */
  let board = $derived(Math.floor((at?.level ?? 0) / LEVELS_PER_BOARD));
  let firstLevel = $derived(board * LEVELS_PER_BOARD);

  /** The board's first level is the bottom row. */
  function rowOf(level: number): number {
    return LEVELS_PER_BOARD - 1 - (level - firstLevel);
  }

  // Rows top to bottom, the board's last level first; null = no level yet
  let rows = $derived(
    Array.from({ length: LEVELS_PER_BOARD }, (_, i): [number, Rank | null] => [
      firstLevel + i,
      allRanks[firstLevel + i] ?? null,
    ]).reverse(),
  );
  const NO_STOPS: null[] = Array(FILES).fill(null);
</script>

<div class="journey">
  <p class="sr-only">{summary}</p>

  {#key board}
  <div class="numbers" aria-hidden="true">
    {#each rows as [level, rank]}
      <span class={['number', level === at?.level && 'current']}>{rank ? level + 1 : ''}</span>
    {/each}
  </div>

  <div class="squares" aria-hidden="true">
    {#each rows as [level, rank]}
      {#each rank?.stops ?? NO_STOPS as stop, file}
        <div class={['square', (level + file) % 2 === 0 ? 'dark' : 'light', !stop && 'empty']}>
          {#if stop?.done}
            <span class="tick">&#10003;</span>
          {/if}
        </div>
      {/each}
      <div class="bot">
        {#if rank?.bot?.avatar}
          <img src={rank.bot.avatar} alt="" />
        {/if}
        {#if rank?.bot?.done}
          <span class="tick corner">&#10003;</span>
        {/if}
      </div>
    {/each}

    {#if at}
      <div class="frame" style:top="{(rowOf(at.level) / LEVELS_PER_BOARD) * 100}%"></div>
      <img
        src="/pieces/wN.svg"
        alt=""
        class="knight"
        style:left="{(at.column / COLUMNS) * 100}%"
        style:top="{(rowOf(at.level) / LEVELS_PER_BOARD) * 100}%"
      />
    {/if}
  </div>
  {/key}
</div>

<style>
  /* Fits a Chromebook window with the rest of the card: no taller than
     about a third of the window. */
  .journey {
    /* The number of ranks: levels on one board */
    --levels: 8;
    width: min(100%, 26rem, calc(34dvh * 9 / var(--levels) + 1.75rem));
    display: grid;
    grid-template-columns: 1.25rem 1fr;
    gap: 0.25rem;
  }

  .numbers {
    display: grid;
    grid-template-rows: repeat(var(--levels), 1fr);
  }
  .number {
    display: grid;
    place-items: center;
    font-size: var(--size-small);
    color: var(--ink-muted);
  }
  .number.current {
    color: var(--ink);
    font-weight: var(--weight-strong);
  }

  .squares {
    position: relative;
    display: grid;
    grid-template-columns: repeat(9, 1fr);
    grid-template-rows: repeat(var(--levels), 1fr);
    aspect-ratio: 9 / var(--levels);
  }
  .square {
    display: grid;
    place-items: center;
  }
  .light { background: var(--board-light); }
  .dark { background: var(--board-dark); }
  .empty { opacity: 0.35; }

  /* The bot stands just off the board, at the end of its rank */
  .bot {
    position: relative;
    display: grid;
    place-items: center;
  }
  .bot img {
    width: 85%;
    height: 85%;
    object-fit: contain;
  }

  .tick {
    width: 60%;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--correct);
    color: var(--on-answer);
    font-size: var(--size-small);
    font-weight: var(--weight-strong);
    line-height: 1;
  }
  .tick.corner {
    position: absolute;
    top: -10%;
    right: -10%;
    width: 50%;
  }

  /* The knight's level */
  .frame {
    position: absolute;
    left: -2px;
    width: calc(100% + 4px);
    height: calc(100% / var(--levels));
    border: 3px solid var(--highlight);
    border-radius: 4px;
    pointer-events: none;
    transition: top 0.8s ease-in-out;
  }

  .knight {
    position: absolute;
    width: calc(100% / 9);
    height: calc(100% / var(--levels));
    /* A percentage padding is of the whole board's width: this is a sliver of a square */
    padding: 0.5%;
    filter: drop-shadow(0 1px 2px var(--scrim));
    transition: left 0.8s ease-in-out, top 0.8s ease-in-out;
    animation: fade-in 0.3s ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .frame, .knight { transition: none; animation: none; }
  }
</style>
