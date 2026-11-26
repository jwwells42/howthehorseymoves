<script lang="ts" module>
  import { page } from '$app/state';

  /**
   * The link above the board: in a mode, back to the lobby (as the browser's
   * Back does, since each mode is a step in its history); in the lobby, to
   * the list (of openings, or of games).
   */
  export function backLink(list = { href: '/openings', label: 'Back to openings' }) {
    if (!page.state.openingPhase) return list;
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
  import { onMount, untrack, type Snippet } from 'svelte';
  import { pushState } from '$app/navigation';
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import OpeningLobby from './OpeningLobby.svelte';
  import OpeningDrill from './OpeningDrill.svelte';
  import OpeningWatch from './OpeningWatch.svelte';
  import OpeningTree from './OpeningTree.svelte';
  import { type Opening, parseOpeningPgn, repertoireLines, lineId } from '$lib/openings';
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
   * An opening: the lobby, then one of watch (every line plays itself),
   * learn (new moves, breadth or depth), review (the moves due), or explore
   * (the whole tree beside the board). A line stops where it transposes into
   * another (see repertoire.ts). A game to memorize (`color` "both") also has test (the
   * whole game from memory), and its page gives its own explore.
   *
   * Opened from the path (`path`), there's no lobby: it goes straight into
   * learn, every line, with none of the lobby's settings, and ends with
   * Continue. Progress is saved the same way, so the lobby shows it later.
   */

  type Phase = 'lobby' | StudyMode | 'explore';

  interface Props {
    opening: Opening;
    /** Opened from the path: no lobby, no settings */
    path?: boolean;
    /** Explore, in place of the PGN explorer (a game's viewer) */
    explore?: Snippet;
    /** A game: the best stars from a test, and what to do with a new test's */
    testBest?: number;
    onTestDone?: (stars: number) => void;
  }

  let { opening, path = false, explore, testBest = 0, onTestDone }: Props = $props();

  let flipped = $derived(opening.color === 'b');

  let parsed = $derived.by(() => {
    const tree = parseOpeningPgn(opening.pgn);
    return { tree, lines: repertoireLines(tree) };
  });
  let startBoard = $derived(parsed.tree.startBoard);
  let lines = $derived(parsed.lines);

  let deselected = $state<Set<number>>(new Set());
  let activeLines = $derived(lines.filter((_, i) => !deselected.has(i)));

  // Each mode is a step in the browser's history, so Back comes to the lobby
  let phase = $derived<Phase>(page.state.openingPhase ?? (path ? 'learn' : 'lobby'));

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
  // Saved progress is read in the browser. A pass is worked out from it when
  // it starts, so on the path (no lobby first) it waits for this
  let progressLoaded = $state(false);

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
    migrateOldProgress(opening, lines);
    reloadProgress();
    progressLoaded = true;
    // On the path the lobby's settings stay as they start, and aren't saved
    if (!path) loadSettings();
    // Another tab, or sync, saved progress for this opening
    const onStorage = (e: StorageEvent) => {
      if (phase === 'lobby' && (e.key === null || e.key === `opening-${opening.id}-moves`)) reloadProgress();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  });

  function loadSettings() {
    order = readPref(orderKey(opening.id), ['breadth', 'depth'] as const, (r) => r as StudyOrder) ?? order;
    perVisit = readPref(PREFS.perVisit, PER_VISIT_OPTIONS.map((o) => o.value), Number) ?? perVisit;
    speed = readPref(PREFS.speed, SPEED_OPTIONS.map((o) => o.value), Number) ?? speed;
    autoNext = readPref(PREFS.autoNext, [true, false], (r) => r === 'true') ?? autoNext;
    blindfold = readPref(PREFS.blindfold, [true, false], (r) => r === 'true') ?? blindfold;
    if (savesProgress(opening)) deselected = readSkipped();
    settingsLoaded = true;
  }

  function backToLobby() {
    history.back();
  }

  // What was saved while away (by another tab, or sync) shows in the lobby
  $effect(() => {
    if (phase === 'lobby') untrack(reloadProgress);
  });
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
    {testBest}
  />
{:else if phase === 'explore' && explore}
  {@render explore()}
{:else if phase === 'explore'}
  <!-- Every line, picked or not -->
  <OpeningTree {opening} {startBoard} {lines} {progress} onExit={backToLobby} />
{:else if path && !progressLoaded}
  <BoardLayout>
    {#snippet boardArea()}
      <Board board={startBoard} readOnly {flipped} />
    {/snippet}
    {#snippet sidebarArea()}{/snippet}
  </BoardLayout>
{:else if phase === 'watch'}
  <OpeningWatch {opening} {startBoard} lines={activeLines} bind:speed {blindfold} onExit={backToLobby} />
{:else}
  <OpeningDrill
    {opening}
    {startBoard}
    lines={activeLines}
    order={phase === 'review' || phase === 'test' ? phase : order}
    {perVisit}
    {progress}
    onStates={setStates}
    {autoNext}
    {blindfold}
    onExit={path ? undefined : backToLobby}
    {onTestDone}
  />
{/if}
