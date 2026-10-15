<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import Choice from '$lib/components/ui/Choice.svelte';
  import {
    type Opening,
    type OpeningLine,
    parseOpeningPgn,
    extractLines,
    findBranchPoint,
  } from '$lib/openings';
  import { type MoveProgress, KNOWN, NEW, playerMoves, stateOf, tally } from '$lib/openings/progress';
  import type { StudyOrder } from './study-order';
  import { PER_VISIT_OPTIONS, SPEED_OPTIONS } from './study-order';

  /**
   * The screen an opening opens on. The next thing to do comes first: how
   * much is learned, how to study, Start. The settings are underneath.
   */

  interface Props {
    opening: Opening;
    lines: OpeningLine[];
    deselected: Set<number>;
    progress: MoveProgress;
    order: StudyOrder;
    perVisit: number;
    speed: number;
    autoNext: boolean;
    onStart: () => void;
    onExplore: () => void;
    onStartOver: () => void;
  }

  let {
    opening,
    lines,
    deselected = $bindable(),
    progress,
    order = $bindable(),
    perVisit = $bindable(),
    speed = $bindable(),
    autoNext = $bindable(),
    onStart,
    onExplore,
    onStartOver,
  }: Props = $props();

  let activeLines = $derived(lines.filter((_, i) => !deselected.has(i)));
  let canStart = $derived(activeLines.length > 0);
  let counts = $derived(tally(playerMoves(activeLines, opening.color), progress));

  const ORDERS: { value: StudyOrder; label: string }[] = [
    { value: 'flow', label: 'Flow' },
    { value: 'breadth', label: 'Breadth' },
    { value: 'depth', label: 'Depth' },
  ];

  // Starting over is two taps, like resigning: it can't be undone
  let confirmingStartOver = $state(false);

  // White's Nth move is ply 2N-2 and Black's is 2N-1 (lines start with White)
  function moveNumber(i: number) {
    return Math.floor(i / 2) + 1;
  }

  // === Lines ===

  function toggleLine(idx: number) {
    const next = new Set(deselected);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    deselected = next;
  }

  // Picks every line of a chapter, or clears them all if they were all picked
  function toggleChapter(indices: number[]) {
    const next = new Set(deselected);
    const allPicked = indices.every((i) => !next.has(i));
    for (const i of indices) {
      if (allPicked) next.add(i);
      else next.delete(i);
    }
    deselected = next;
  }

  function selectAll() { deselected = new Set(); }
  function selectNone() { deselected = new Set(lines.map((_, i) => i)); }

  // The line picker's groups: a study's lines under its chapter names, in the
  // study's order; any other opening's lines in one group with no name.
  // (A pass keeps the tree's order, so the picker's order is only for picking.)
  let lineGroups = $derived.by(() => {
    const all = lines.map((_, i) => i);
    const chapters = opening.chapters ?? [];
    if (chapters.length === 0) return [{ name: '', indices: all }];
    // Every line of the joined tree is a whole line of the chapter it came from
    const chapterOf = new Map<string, number>();
    chapters.forEach((ch, c) => {
      for (const line of extractLines(parseOpeningPgn(ch.pgn))) {
        const key = line.map((m) => m.san).join(' ');
        if (!chapterOf.has(key)) chapterOf.set(key, c);
      }
    });
    const groups = chapters.map((ch) => ({ name: ch.name, indices: [] as number[] }));
    for (const i of all) groups[chapterOf.get(lines[i].map((m) => m.san).join(' ')) ?? 0].indices.push(i);
    return groups.filter((g) => g.indices.length > 0);
  });

  // Each line is shown from where it leaves the line above it in the picker,
  // and a chapter's first line from the start. Shown from the start, lines that
  // share a long trunk all looked the same.
  let linePreviews = $derived.by(() => {
    const previews: string[] = [];
    for (const { indices } of lineGroups) {
      indices.forEach((li, k) => {
        const from = k > 0 ? findBranchPoint(lines[indices[k - 1]], lines[li]) : 0;
        previews[li] = formatLinePreview(lines[li], from);
      });
    }
    return previews;
  });

  // How far along each line is: every move known, some learned, or none yet
  let lineStates = $derived(
    lines.map((line) => {
      const states = line.filter((m) => m.colorPlayed === opening.color).map((m) => stateOf(progress, m.key));
      if (states.every((s) => s === KNOWN)) return 'known';
      return states.some((s) => s !== NEW) ? 'some' : 'none';
    }),
  );

  // "all 19", or the chapters picked when whole chapters are, else "4 of 19"
  let linesSummary = $derived.by(() => {
    if (activeLines.length === lines.length) return `all ${lines.length}`;
    const count = `${activeLines.length} of ${lines.length}`;
    const named = lineGroups.filter((g) => g.name);
    const whole = named.filter((g) => g.indices.every((i) => !deselected.has(i)));
    const onlyWhole = named.every((g) => whole.includes(g) || g.indices.every((i) => deselected.has(i)));
    return whole.length > 0 && onlyWhole ? `${whole.map((g) => g.name).join(', ')} (${count})` : count;
  });

  function formatLinePreview(line: OpeningLine, from: number): string {
    const start = Math.min(from, line.length - 1);
    const end = Math.min(line.length, start + 8);
    const parts: string[] = [];
    for (let i = start; i < end; i++) {
      if (line[i].colorPlayed === 'w') parts.push(`${moveNumber(i)}.`);
      else if (i === start) parts.push(`${moveNumber(i)}…`);
      parts.push(line[i].san + (line[i].nag ?? ''));
    }
    if (end < line.length) parts.push('…');
    return parts.join(' ');
  }
</script>

<div class="lobby">
  <div class="header">
    <h2>{opening.name}</h2>
    {#if opening.description}
      <p class="description">{opening.description}</p>
    {/if}
  </div>

  <!-- How much is learned: solid = known, pale = seen once -->
  <div class="progress">
    <div
      class="learned"
      role="progressbar"
      aria-label="Moves known"
      aria-valuemin={0}
      aria-valuemax={counts.total}
      aria-valuenow={counts.known}
    >
      <div class="known" style:width="{counts.total ? (counts.known / counts.total) * 100 : 0}%"></div>
      <div class="seen" style:width="{counts.total ? (counts.seen / counts.total) * 100 : 0}%"></div>
    </div>
    <span class="count">{counts.known} / {counts.total}</span>
    {#if confirmingStartOver}
      <div class="confirm">
        <span aria-hidden="true">&#8634;</span>
        <button
          class="confirm-btn confirm-yes"
          onclick={() => { confirmingStartOver = false; onStartOver(); }}
          aria-label="Yes, start over"
        >&#10003;</button>
        <button class="confirm-btn confirm-no" onclick={() => (confirmingStartOver = false)} aria-label="No">&#10007;</button>
      </div>
    {:else}
      <Button onclick={() => (confirmingStartOver = true)} disabled={counts.known + counts.seen === 0}>
        <span aria-hidden="true">&#8634;</span> Start over
      </Button>
    {/if}
  </div>

  <div class="study">
    <Choice label="How to study" hideLabel options={ORDERS} bind:value={order} />
    <!-- The chosen way's one setting; the row keeps its height when there is none -->
    <div class="setting">
      {#if order === 'flow'}
        <Choice label="Speed" options={SPEED_OPTIONS} bind:value={speed} />
      {:else if order === 'breadth'}
        <Choice label="Moves per visit" options={PER_VISIT_OPTIONS} bind:value={perVisit} />
      {/if}
    </div>
  </div>

  <div class="actions">
    <Button variant="primary" size="large" onclick={onStart} disabled={!canStart}>
      {#if order === 'flow'}<span aria-hidden="true">&#9654;</span>{/if} Start
    </Button>
    <Button onclick={onExplore}>Explore</Button>
  </div>

  <div class="options">
    <details class="lines">
      <summary>Lines: {linesSummary}</summary>
      <div class="setup-controls">
        <Button onclick={selectAll}>All</Button>
        <Button onclick={selectNone}>None</Button>
      </div>
      <div class="line-list">
        {#each lineGroups as group}
          {#if group.name}
            {@const picked = group.indices.filter((i) => !deselected.has(i)).length}
            <!-- Ticks or clears the whole chapter; half-ticked when some of it is picked -->
            <label class="chapter">
              <input
                type="checkbox"
                checked={picked === group.indices.length}
                bind:indeterminate={() => picked > 0 && picked < group.indices.length, () => {}}
                onchange={() => toggleChapter(group.indices)}
              />
              {group.name}
              <span class="chapter-count">{group.indices.length} line{group.indices.length === 1 ? '' : 's'}</span>
            </label>
          {/if}
          {#each group.indices as li, k (li)}
            <label class="line-item">
              <input
                type="checkbox"
                checked={!deselected.has(li)}
                onchange={() => toggleLine(li)}
              />
              <span class={['line-dot', lineStates[li]]} aria-hidden="true"></span>
              <span class="line-num">{k + 1}.</span>
              <span class="line-preview">{linePreviews[li]}</span>
            </label>
          {/each}
        {/each}
      </div>
    </details>

    <label class="toggle-label">
      <input type="checkbox" bind:checked={autoNext} />
      Auto-advance
    </label>
  </div>
</div>

<style>
  .lobby {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    padding: 1rem;
    /* The page's column (see BoardPage), so it's centred on the page */
    width: min(var(--column), 100%);
    /* The opening page is one screen high and doesn't scroll, so on a screen
       too short for the lobby, the lobby scrolls rather than being cut off. */
    min-height: 0;
    overflow-y: auto;
  }

  .header {
    text-align: center;
  }

  .header h2 {
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
    margin-bottom: 0.25rem;
  }

  .description {
    color: var(--ink-muted);
  }

  /* === How much is learned === */

  .progress {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    max-width: 32rem;
    min-height: 2.75rem;
  }

  .learned {
    flex: 1;
    display: flex;
    height: 0.75rem;
    border-radius: 9999px;
    background: var(--surface);
    border: 1px solid var(--line);
    overflow: hidden;
  }

  .known {
    background: var(--correct);
  }

  .seen {
    background: var(--correct-tint);
  }

  .count {
    font-size: var(--size-small);
    color: var(--ink-muted);
    white-space: nowrap;
  }

  .confirm {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--size-large);
  }

  .confirm-btn {
    width: 2.75rem;
    height: 2.75rem;
    border: none;
    border-radius: 0.5rem;
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
    cursor: pointer;
  }

  /* Starting over is the danger: the ✓ that confirms it is the wrong colour */
  .confirm-yes {
    background: var(--wrong);
    color: var(--on-answer);
  }

  .confirm-no {
    background: var(--surface-raised);
    border: 1px solid var(--line);
  }

  .confirm-no:hover {
    background: var(--line);
  }

  /* === How to study === */

  .study {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .setting {
    min-height: 2.25rem;
    display: flex;
    align-items: center;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
  }

  /* === Settings, under the actions, set apart by a rule === */

  .options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
    max-width: 32rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--line);
  }

  .lines summary {
    cursor: pointer;
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }

  .lines summary:hover {
    color: var(--ink);
  }

  .lines[open] summary {
    margin-bottom: 0.75rem;
  }

  .setup-controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .line-list {
    max-height: 16rem;
    overflow-y: auto;
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    background: var(--surface);
  }

  /* Chapter heading: stays in view while its lines scroll under it */
  .chapter {
    position: sticky;
    top: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--surface-raised);
    border-bottom: 1px solid var(--line);
    font-size: var(--size-secondary);
    font-weight: var(--weight-strong);
    cursor: pointer;
  }

  .chapter input[type="checkbox"] {
    margin: 0;
  }

  .chapter-count {
    margin-left: auto;
    font-size: var(--size-small);
    font-weight: var(--weight-regular);
  }

  .line-item {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    font-size: var(--size-small);
    cursor: pointer;
    border-bottom: 1px solid var(--line);
    line-height: 1.4;
  }

  .line-item:last-child {
    border-bottom: none;
  }

  .line-item:hover {
    background: var(--surface-raised);
  }

  .line-item input[type="checkbox"] {
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  /* A line's progress: filled = every move known, pale = some learned */
  .line-dot {
    flex-shrink: 0;
    align-self: center;
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
    border: 2px solid var(--line);
  }

  .line-dot.some {
    border-color: var(--correct);
    background: var(--correct-tint);
  }

  .line-dot.known {
    border-color: var(--correct);
    background: var(--correct);
  }

  .line-num {
    color: var(--ink-muted);
    flex-shrink: 0;
    min-width: 1.5rem;
  }

  .line-preview {
    color: var(--ink-muted);
    word-break: break-word;
  }

  .toggle-label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }

  .toggle-label input[type="checkbox"] {
    margin: 0;
  }
</style>
