<script lang="ts" module>
  import { page } from '$app/state';

  /**
   * The link above the board: in a mode, back to the lobby (as the browser's
   * Back does, since each mode is a step in its history); in the lobby, to
   * the list of openings.
   */
  export function backLink() {
    if (!page.state.openingPhase) return { href: '/openings', label: 'Back to openings' };
    return {
      href: page.url.pathname + page.url.search,
      label: 'Back to setup',
      onclick: (e: MouseEvent) => {
        e.preventDefault();
        history.back();
      },
    };
  }
</script>

<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { pushState } from '$app/navigation';
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import PgnExplorer from '$lib/components/game/PgnExplorer.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import OpeningLobby from './OpeningLobby.svelte';
  import OpeningDrill from './OpeningDrill.svelte';
  import OpeningFlow from './OpeningFlow.svelte';
  import type { BoardState } from '$lib/logic/types';
  import type { Arrow } from '$lib/logic/pgn';
  import { type Opening, parseOpeningPgn, extractLines, lineId } from '$lib/openings';
  import {
    type MoveProgress,
    type MoveState,
    NEW,
    loadProgress,
    migrateOldProgress,
    playerMoves,
    saveStates,
    savesProgress,
  } from '$lib/openings/progress';
  import {
    type StudyMode,
    type StudyOrder,
    DEFAULT_PER_VISIT,
    DEFAULT_SPEED,
    PER_VISIT_OPTIONS,
    PREFS,
    SPEED_OPTIONS,
    orderKey,
    skippedKey,
  } from './study-order';

  /**
   * An opening: the lobby, then one of flow (watch every line), learn (new
   * moves, breadth or depth), review (the moves due), or explore (the whole
   * tree).
   */

  type Phase = 'lobby' | StudyMode | 'explore';

  interface Props {
    opening: Opening;
  }

  let { opening }: Props = $props();

  let flipped = $derived(opening.color === 'b');

  let parsed = $derived.by(() => {
    const tree = parseOpeningPgn(opening.pgn);
    return { tree, lines: extractLines(tree) };
  });
  let startBoard = $derived(parsed.tree.startBoard);
  let lines = $derived(parsed.lines);

  let deselected = $state<Set<number>>(new Set());
  let activeLines = $derived(lines.filter((_, i) => !deselected.has(i)));

  // Each mode is a step in the browser's history, so Back comes to the lobby
  let phase = $derived<Phase>(page.state.openingPhase ?? 'lobby');

  function open(mode: Exclude<Phase, 'lobby'>) {
    pushState('', { openingPhase: mode });
  }

  // === Settings, remembered on this device ===

  function initialOrder(): StudyOrder { return opening.defaultOrder ?? 'depth'; }
  let order = $state<StudyOrder>(initialOrder());
  let perVisit = $state(DEFAULT_PER_VISIT);
  let speed = $state(DEFAULT_SPEED);
  let autoNext = $state(false);
  let blindfold = $state(false);
  let settingsLoaded = false;

  function readPref<T>(key: string, allowed: readonly T[], parse: (raw: string) => T): T | undefined {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return undefined;
      const value = parse(raw);
      return allowed.includes(value) ? value : undefined;
    } catch {
      return undefined;
    }
  }

  function writePref(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch {}
  }

  $effect(() => {
    const values = [order, perVisit, speed, autoNext, blindfold];
    if (!settingsLoaded) return;
    writePref(orderKey(opening.id), values[0] as string);
    writePref(PREFS.perVisit, String(values[1]));
    writePref(PREFS.speed, String(values[2]));
    writePref(PREFS.autoNext, String(values[3]));
    writePref(PREFS.blindfold, String(values[4]));
  });

  // The lines left out, kept by their moves so a re-exported PGN keeps them
  $effect(() => {
    const skipped = [...deselected].map((i) => lineId(lines[i]));
    if (!settingsLoaded || !savesProgress(opening)) return;
    writePref(skippedKey(opening.id), JSON.stringify(skipped));
  });

  function readSkipped(): Set<number> {
    try {
      const ids = new Set(JSON.parse(localStorage.getItem(skippedKey(opening.id)) ?? '[]'));
      return new Set(lines.flatMap((line, i) => (ids.has(lineId(line)) ? [i] : [])));
    } catch {
      return new Set();
    }
  }

  // === Progress ===

  let progress = $state.raw<MoveProgress>({});

  function reloadProgress() {
    if (savesProgress(opening)) progress = loadProgress(opening.id);
  }

  function setStates(states: Record<string, MoveState>) {
    if (savesProgress(opening)) {
      progress = saveStates(opening.id, states);
    } else {
      // A pasted PGN keeps its progress only while it's open
      const now = Math.floor(Date.now() / 1000);
      const next = { ...progress };
      for (const [key, state] of Object.entries(states)) next[key] = [state, now];
      progress = next;
    }
  }

  function startOver() {
    const states: Record<string, MoveState> = {};
    for (const move of playerMoves(lines, opening.color)) {
      if (progress[move.key]) states[move.key] = NEW;
    }
    setStates(states);
  }

  onMount(() => {
    order = readPref(orderKey(opening.id), ['breadth', 'depth'] as const, (r) => r as StudyOrder) ?? order;
    perVisit = readPref(PREFS.perVisit, PER_VISIT_OPTIONS.map((o) => o.value), Number) ?? perVisit;
    speed = readPref(PREFS.speed, SPEED_OPTIONS.map((o) => o.value), Number) ?? speed;
    autoNext = readPref(PREFS.autoNext, [true, false], (r) => r === 'true') ?? autoNext;
    blindfold = readPref(PREFS.blindfold, [true, false], (r) => r === 'true') ?? blindfold;
    if (savesProgress(opening)) deselected = readSkipped();
    settingsLoaded = true;

    migrateOldProgress(opening, lines);
    reloadProgress();
    // Another tab, or sync, saved progress for this opening
    const onStorage = (e: StorageEvent) => {
      if (phase === 'lobby' && (e.key === null || e.key === `opening-${opening.id}-moves`)) reloadProgress();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  });

  function backToLobby() {
    history.back();
  }

  // What was saved while away (by another tab, or sync) shows in the lobby
  $effect(() => {
    if (phase === 'lobby') untrack(reloadProgress);
  });

  // === Explore ===

  let exploreBoardOverride = $state<BoardState | null>(null);
  let exploreBoard = $derived(exploreBoardOverride ?? startBoard);
  let exploreArrows = $state<Arrow[] | undefined>(undefined);

  function onExploreBoardChange(b: BoardState, a?: Arrow[]) {
    exploreBoardOverride = b;
    exploreArrows = a;
  }
</script>

{#if phase === 'lobby'}
  <OpeningLobby
    {opening}
    {lines}
    bind:deselected
    {progress}
    bind:order
    bind:perVisit
    bind:speed
    bind:autoNext
    bind:blindfold
    onStart={open}
    onExplore={() => open('explore')}
    onStartOver={startOver}
  />
{:else if phase === 'explore'}
  <BoardLayout>
    {#snippet boardArea()}
      <Board board={exploreBoard} readOnly arrows={exploreArrows} {flipped} />
    {/snippet}

    {#snippet sidebarArea()}
      <PgnExplorer pgn={opening.pgn} {flipped} noBoard onBoardChange={onExploreBoardChange} />
      <div class="explore-footer">
        <Button onclick={backToLobby}>&larr; Setup</Button>
      </div>
    {/snippet}
  </BoardLayout>
{:else if phase === 'flow'}
  <OpeningFlow {opening} {startBoard} lines={activeLines} bind:speed {blindfold} onExit={backToLobby} />
{:else}
  <OpeningDrill
    {opening}
    {startBoard}
    lines={activeLines}
    order={phase === 'review' ? 'review' : order}
    {perVisit}
    {progress}
    onStates={setStates}
    {autoNext}
    {blindfold}
    onExit={backToLobby}
  />
{/if}

<style>
  .explore-footer {
    display: flex;
    justify-content: flex-end;
    width: 100%;
    flex-shrink: 0;
  }
</style>
