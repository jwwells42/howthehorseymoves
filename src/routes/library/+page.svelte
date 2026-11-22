<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { replaceState } from '$app/navigation';
  import Page from '$lib/components/ui/Page.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Choice from '$lib/components/ui/Choice.svelte';
  import ProgressBar from '$lib/components/ui/ProgressBar.svelte';
  import { splitPgnGames } from '$lib/logic/pgn';
  import { Engine } from '$lib/engine/stockfish';
  import { checkGame } from '$lib/engine/check-game';
  import { gamePositions, markMoves, countMarks, type MarkCounts } from '$lib/engine/review';
  import {
    filterGames,
    score,
    numbered,
    NO_FILTERS,
    readTypedLine,
    leagueOf,
    weekOf,
    type Filters,
    type LibraryGame,
    type Side,
    type Outcome,
  } from '$lib/library/summary';

  // The students' games: only the teacher (TEACHER_LICHESS_IDS) gets past the
  // lock. Off the nav. Filters live in the address, so a filtered list can be
  // bookmarked, and the game page's ‹ › step through the same list. Analyse
  // checks the listed games not yet checked, several at once (one Stockfish
  // per core but one), saving each as it's done.

  /** Games per import request: well under Vercel's 4.5 MB per request. */
  const BATCH_GAMES = 300;
  const BATCH_CHARS = 3_000_000;
  const EXPORT_BATCH = 300;
  const FREE_BYTES = 1024 ** 3;

  type Status = 'loading' | 'locked' | 'unavailable' | 'ready';
  type SortKey = 'date' | 'white' | 'black' | 'result' | 'plies' | 'blunders';

  let status = $state<Status>('loading');
  let games = $state.raw<LibraryGame[]>([]);
  let bytes = $state<number | null>(null);

  let filters = $state<Filters>({ ...NO_FILTERS });
  let sortKey = $state<SortKey>('date');
  let sortUp = $state(false);

  let importing = $state<{ sent: number; total: number } | null>(null);
  let imported = $state<{ added: number; known: number; failed: string[] } | null>(null);
  let dragging = $state(false);
  let exporting = $state(false);
  let clearArmed = $state(false);
  let checking = $state<{ done: number; total: number; failed: number } | null>(null);
  /** Stops the check that's running (not state: nothing on screen reads it) */
  const run = { stop: () => {} };

  let names = $derived(new Set(games.flatMap((g) => [g.summary.white, g.summary.black])));
  let nameCounts = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const { summary } of games) {
      for (const name of [summary.white, summary.black]) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => a[0].localeCompare(b[0]));
  });
  // Leagues (an event without its week), the latest first, with their game counts
  let leagues = $derived.by(() => {
    const byLeague = new Map<string, { n: number; latest: string }>();
    for (const { summary } of games) {
      const league = leagueOf(summary.event);
      const entry = byLeague.get(league) ?? { n: 0, latest: '' };
      entry.n++;
      if (summary.date > entry.latest) entry.latest = summary.date;
      byLeague.set(league, entry);
    }
    return [...byLeague].sort((a, b) => b[1].latest.localeCompare(a[1].latest) || a[0].localeCompare(b[0]));
  });
  // The picked league's weeks, in order (Week 2 before Week 10)
  let weeks = $derived.by(() => {
    if (!filters.event) return [];
    const counts = new Map<string, number>();
    for (const { summary } of games) {
      if (leagueOf(summary.event) === filters.event) counts.set(summary.event, (counts.get(summary.event) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => weekOf(a[0]).localeCompare(weekOf(b[0]), undefined, { numeric: true }));
  });
  let analysed = $derived(games.some((g) => g.summary.marks));

  let movesBad = $derived(filters.moves.trim() !== '' && readTypedLine(filters.moves) === null);
  let playerExact = $derived(names.has(filters.player.trim()));

  let shown = $derived.by(() => {
    const list = filterGames(games, filters, names);
    const value = (g: LibraryGame): string | number => {
      const s = g.summary;
      if (sortKey === 'plies') return s.plies;
      if (sortKey === 'blunders') return s.marks ? s.marks.blunders[0] + s.marks.blunders[1] : -1;
      if (sortKey === 'date') return `${s.date} ${s.time}`;
      return s[sortKey];
    };
    return [...list].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sortUp ? order : -order;
    });
  });

  let totals = $derived(playerExact ? score(shown, filters.player.trim()) : null);
  let unchecked = $derived(shown.filter((g) => !g.summary.marks));

  // === Filters ↔ the address ===

  function readFilters(params: URLSearchParams) {
    filters = {
      player: params.get('player') ?? '',
      side: (params.get('side') as Side) ?? 'either',
      outcome: (params.get('outcome') as Outcome) ?? 'all',
      event: params.get('event') ?? '',
      week: params.get('week') ?? '',
      from: params.get('from') ?? '',
      to: params.get('to') ?? '',
      moves: params.get('moves') ?? '',
    };
    sortKey = (params.get('sort') as SortKey) ?? 'date';
    sortUp = params.get('up') === '1';
  }

  let search = $derived.by(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== NO_FILTERS[key as keyof Filters]) params.set(key, value);
    }
    if (sortKey !== 'date') params.set('sort', sortKey);
    if (sortUp) params.set('up', '1');
    const text = params.toString();
    return text ? `?${text}` : '';
  });

  $effect(() => {
    if (status !== 'ready') return;
    if (search !== page.url.search) replaceState(`/library${search}`, page.state);
    // For the game page: Back comes here with the same filters, ‹ › step through this list
    try {
      sessionStorage.setItem('library-search', search);
      sessionStorage.setItem('library-list', JSON.stringify(shown.map((g) => g.id)));
    } catch {}
  });

  // === Loading ===

  async function load() {
    const all: LibraryGame[] = [];
    let after = '';
    for (;;) {
      const res = await fetch(`/api/library?after=${encodeURIComponent(after)}`);
      if (res.status === 403) return (status = 'locked');
      if (!res.ok) return (status = 'unavailable');
      const data = await res.json();
      all.push(...data.games);
      if (data.bytes !== undefined) bytes = data.bytes;
      if (!data.more || data.games.length === 0) break;
      after = data.games[data.games.length - 1].id;
    }
    games = all;
    status = 'ready';
  }

  onMount(() => {
    readFilters(page.url.searchParams);
    void load();
  });

  // === Import ===

  async function importFiles(files: FileList | File[]) {
    const texts = await Promise.all([...files].map((f) => f.text()));
    const pgns = texts.flatMap((t) => splitPgnGames(t).map((g) => g.pgn));
    if (pgns.length === 0) return;
    imported = { added: 0, known: 0, failed: [] };
    importing = { sent: 0, total: pgns.length };
    let batch: string[] = [];
    let chars = 0;
    const send = async () => {
      if (batch.length === 0) return;
      const res = await fetch('/api/library', { method: 'POST', body: batch.join('\n\n\n') });
      if (res.ok) {
        const r = await res.json();
        imported = { added: imported!.added + r.added, known: imported!.known + r.known, failed: [...imported!.failed, ...r.failed] };
      } else {
        imported = { ...imported!, failed: [...imported!.failed, `✗ ${res.status}`] };
      }
      importing = { sent: importing!.sent + batch.length, total: pgns.length };
      batch = [];
      chars = 0;
    };
    for (const pgn of pgns) {
      if (batch.length >= BATCH_GAMES || chars + pgn.length > BATCH_CHARS) await send();
      batch.push(pgn);
      chars += pgn.length;
    }
    await send();
    importing = null;
    await load();
  }

  function onPick(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (input.files) void importFiles(input.files);
    input.value = '';
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    if (e.dataTransfer?.files.length) void importFiles(e.dataTransfer.files);
  }

  // === Export, clear ===

  async function exportShown() {
    exporting = true;
    const ids = shown.map((g) => g.id);
    const bodies = new Map<string, string>();
    for (let i = 0; i < ids.length; i += EXPORT_BATCH) {
      const res = await fetch('/api/library/bodies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ids: ids.slice(i, i + EXPORT_BATCH) }),
      });
      if (!res.ok) {
        exporting = false;
        return;
      }
      for (const g of (await res.json()).games) bodies.set(g.id, g.body);
    }
    const text = ids.map((id) => bodies.get(id)).filter(Boolean).join('\n\n') + '\n';
    const url = URL.createObjectURL(new Blob([text], { type: 'application/x-chess-pgn' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'games.pgn';
    a.click();
    URL.revokeObjectURL(url);
    exporting = false;
  }

  // === Analyse ===

  function setMarks(id: string, marks: MarkCounts | undefined) {
    if (marks) games = games.map((g) => (g.id === id ? { ...g, summary: { ...g.summary, marks } } : g));
  }

  /** One game: fetched afresh, so a game another device has checked is left alone */
  async function checkOne(engine: Engine, id: string, stopped: () => boolean): Promise<boolean> {
    try {
      const res = await fetch(`/api/library/${encodeURIComponent(id)}`);
      if (!res.ok) return false;
      const data = await res.json();
      if (data.analysis) {
        setMarks(id, data.summary.marks);
        return true;
      }
      const result = await checkGame(engine, gamePositions(data.body), undefined, stopped);
      if (!result) return false;
      const put = await fetch(`/api/library/${encodeURIComponent(id)}/analysis`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(result),
      });
      if (!put.ok) return false;
      setMarks(id, countMarks(markMoves(result.evals)));
      return true;
    } catch {
      return false;
    }
  }

  async function analyseShown() {
    const queue = unchecked.map((g) => g.id);
    if (queue.length === 0 || checking) return;
    let stopped = false;
    const engines: Engine[] = [];
    run.stop = () => {
      stopped = true;
      for (const engine of engines) engine.stop();
    };
    checking = { done: 0, total: queue.length, failed: 0 };
    const cores = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
    const worker = async () => {
      const engine = new Engine();
      engines.push(engine);
      try {
        for (let id = queue.shift(); id && !stopped; id = queue.shift()) {
          const ok = await checkOne(engine, id, () => stopped);
          if (stopped) break;
          checking = { ...checking!, done: checking!.done + 1, failed: checking!.failed + (ok ? 0 : 1) };
        }
      } finally {
        engine.quit();
      }
    };
    await Promise.all(Array.from({ length: Math.min(cores, queue.length) }, worker));
    checking = null;
  }

  async function clearAll() {
    clearArmed = false;
    const res = await fetch('/api/library', { method: 'DELETE' });
    if (res.ok) await load();
  }

  function sortBy(key: SortKey) {
    if (sortKey === key) sortUp = !sortUp;
    else {
      sortKey = key;
      sortUp = key === 'white' || key === 'black';
    }
  }

  function resultText(result: string): string {
    return result === '1/2-1/2' ? '½-½' : result;
  }

  function megabytes(n: number): string {
    return n < 1024 ** 2 ? `${Math.round(n / 1024)} KB` : `${Math.round(n / 1024 ** 2)} MB`;
  }
</script>

<Page title="Library">
  {#if status === 'loading'}
    <p class="muted">…</p>
  {:else if status === 'locked'}
    <p class="symbol" aria-label="Locked">🔒</p>
  {:else if status === 'unavailable'}
    <p class="symbol wrong" role="alert">✗</p>
  {:else}
    <section
      class={['import', dragging && 'dragging']}
      aria-label="Import"
      ondragover={(e) => {
        e.preventDefault();
        dragging = true;
      }}
      ondragleave={() => (dragging = false)}
      ondrop={onDrop}
    >
      <label class="pick">
        <input type="file" accept=".pgn,text/plain" multiple class="sr-only" onchange={onPick} disabled={!!importing} />
        <span class="pick-button">Import PGN</span>
      </label>
      <span class="count">{games.length}</span>
      {#if importing}
        <div class="bar"><ProgressBar value={importing.sent} max={importing.total} label="Import" /></div>
      {:else if imported}
        <span class="result" aria-live="polite">
          <span class="added">+{imported.added}</span>
          {#if imported.known}<span class="muted">={imported.known}</span>{/if}
          {#if imported.failed.length}<span class="wrong">✗ {imported.failed.length}</span>{/if}
        </span>
      {/if}
    </section>
    {#if imported?.failed.length}
      <ul class="failed">
        {#each imported.failed as f, i (i)}<li><span class="wrong">✗</span> {f}</li>{/each}
      </ul>
    {/if}

    {#if games.length > 0}
      <div class="filters">
        <label class="field span-2">
          <span>Player</span>
          <input type="search" list="library-players" bind:value={filters.player} />
          <datalist id="library-players">
            {#each nameCounts as [name, n] (name)}<option value={name}>{n}</option>{/each}
          </datalist>
        </label>
        <label class="field span-2">
          <span>Event</span>
          <select bind:value={filters.event} onchange={() => (filters.week = '')}>
            <option value="">—</option>
            {#each leagues as [league, { n }] (league)}<option value={league}>{league} ({n})</option>{/each}
          </select>
        </label>
        <label class="field">
          <span>From</span>
          <input type="date" bind:value={filters.from} />
        </label>
        <label class="field">
          <span>To</span>
          <input type="date" bind:value={filters.to} />
        </label>
        <label class="field span-2">
          <span>Week</span>
          <select bind:value={filters.week} disabled={weeks.length < 2}>
            <option value="">—</option>
            {#each weeks as [event, n] (event)}<option value={event}>{weekOf(event)} ({n})</option>{/each}
          </select>
        </label>
        <label class="field full">
          <span>Moves</span>
          <input type="search" placeholder="1.e4 c5 2.Nf3" bind:value={filters.moves} class={[movesBad && 'bad']} />
        </label>
        <div class="choices">
          <Choice
            label="Result"
            hideLabel
            options={[
              { value: 'all', label: 'All' },
              { value: 'won', label: 'Won' },
              { value: 'drew', label: 'Drew' },
              { value: 'lost', label: 'Lost' },
            ]}
            bind:value={filters.outcome}
          />
          <Choice
            label="Side"
            hideLabel
            options={[
              { value: 'either', label: 'Either' },
              { value: 'white', label: 'White' },
              { value: 'black', label: 'Black' },
            ]}
            bind:value={filters.side}
          />
        </div>
      </div>

      <div class="summary-row">
        <span class="count">{shown.length}</span>
        {#if totals}
          <span class="totals">
            <span class="correct">+{totals.won}</span>
            <span>={totals.drew}</span>
            <span class="wrong">−{totals.lost}</span>
          </span>
        {/if}
        <span class="spacer"></span>
        {#if checking}
          <div class="bar"><ProgressBar value={checking.done} max={checking.total} label="Analyse" /></div>
          <span class="muted">{checking.done} / {checking.total}</span>
          {#if checking.failed}<span class="wrong">&#10007; {checking.failed}</span>{/if}
          <Button onclick={() => run.stop()} aria-label="Stop">&#9632;</Button>
        {:else if unchecked.length > 0}
          <Button onclick={analyseShown}>Analyse ({unchecked.length})</Button>
        {/if}
        <Button onclick={exportShown} disabled={exporting || shown.length === 0}>Export</Button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              {#each [['date', 'Date'], ['white', 'White'], ['black', 'Black'], ['result', 'Result']] as [key, label] (key)}
                <th aria-sort={sortKey === key ? (sortUp ? 'ascending' : 'descending') : undefined}><button onclick={() => sortBy(key as SortKey)}>{label}{#if sortKey === key}{sortUp ? ' ▲' : ' ▼'}{/if}</button></th>
              {/each}
              <th class="opening">Moves</th>
              <th><button onclick={() => sortBy('plies')}>#{#if sortKey === 'plies'}{sortUp ? ' ▲' : ' ▼'}{/if}</button></th>
              {#if analysed}
                <th><button onclick={() => sortBy('blunders')}>??{#if sortKey === 'blunders'}{sortUp ? ' ▲' : ' ▼'}{/if}</button></th>
              {/if}
            </tr>
          </thead>
          <tbody>
            {#each shown as game (game.id)}
              {@const s = game.summary}
              <tr>
                <td class="date"><a class="row-link" href="/library/{game.id}">{s.date}</a></td>
                <td class={[playerExact && s.white === filters.player.trim() && 'me']}>{s.white}</td>
                <td class={[playerExact && s.black === filters.player.trim() && 'me']}>{s.black}</td>
                <td class="result-cell">{resultText(s.result)}</td>
                <td class="opening">{numbered(s.start, 6)}</td>
                <td class="num">{Math.ceil(s.plies / 2)}</td>
                {#if analysed}
                  <td class="num blunders">{#if s.marks}<span class={[s.marks.blunders[0] && 'wrong']}>{s.marks.blunders[0]}</span>&nbsp;·&nbsp;<span class={[s.marks.blunders[1] && 'wrong']}>{s.marks.blunders[1]}</span>{/if}</td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}

    <footer class="footer">
      {#if bytes !== null}
        <span class="muted">Database: {megabytes(bytes)} / 1 GB</span>
        <span class="muted">({Math.max(1, Math.round((bytes / FREE_BYTES) * 100))}%)</span>
      {/if}
      <span class="spacer"></span>
      {#if games.length > 0}
        {#if clearArmed}
          <button class="clear confirm" onclick={clearAll} aria-label="Delete every game">✓</button>
          <button class="clear" onclick={() => (clearArmed = false)} aria-label="Cancel">✗</button>
        {:else}
          <button class="clear" onclick={() => (clearArmed = true)} aria-label="Clear library">🗑</button>
        {/if}
      {/if}
    </footer>
  {/if}
</Page>

<style>
  .muted {
    color: var(--ink-muted);
  }
  .wrong {
    color: var(--wrong-text);
  }
  .correct {
    color: var(--correct-text);
  }
  .symbol {
    font-size: var(--size-title);
  }

  .import {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border: 2px dashed var(--line);
    border-radius: 0.75rem;
    margin-bottom: 1rem;
  }
  .import.dragging {
    border-color: var(--highlight);
    background: var(--highlight-tint);
  }
  .pick-button {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    background: var(--action);
    color: var(--on-action);
    font-weight: var(--weight-strong);
    cursor: pointer;
  }
  .pick:focus-within .pick-button {
    outline: 3px solid var(--highlight);
    outline-offset: 2px;
  }
  .pick-button:hover {
    background: var(--action-hover);
  }
  .count {
    font-weight: var(--weight-strong);
    font-variant-numeric: tabular-nums;
  }
  .bar {
    flex: 1;
  }
  .result {
    display: flex;
    gap: 0.75rem;
    font-weight: var(--weight-strong);
  }
  .added {
    color: var(--correct-text);
  }
  .failed {
    font-size: var(--size-secondary);
    margin: 0 0 1rem;
    padding-left: 1rem;
  }

  /* Player and Event, then the dates and the moves, then the choices */
  .filters {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem 1rem;
    margin-bottom: 1rem;
  }
  .span-2 {
    grid-column: span 2;
  }
  .full {
    grid-column: 1 / -1;
  }
  .choices {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
  }
  @media (max-width: 560px) {
    .filters {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: var(--size-small);
    color: var(--ink-muted);
  }
  .field input,
  .field select {
    font-size: var(--size-secondary);
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    box-sizing: border-box;
    width: 100%;
    height: 2.5rem;
  }
  .field select:disabled {
    opacity: 0.5;
  }
  .field input.bad {
    border-color: var(--wrong);
  }

  .summary-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }
  .totals {
    display: flex;
    gap: 0.5rem;
    font-weight: var(--weight-strong);
  }
  .spacer {
    flex: 1;
  }

  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--size-secondary);
  }
  th {
    text-align: left;
    font-weight: var(--weight-strong);
    border-bottom: 1px solid var(--line);
    white-space: nowrap;
  }
  th button {
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    padding: 0.25rem 0.375rem;
    cursor: pointer;
  }
  th.opening {
    padding: 0.25rem 0.375rem;
  }
  tbody tr {
    position: relative;
  }
  tbody tr:hover {
    background: var(--surface);
  }
  td {
    padding: 0.25rem 0.375rem;
    border-bottom: 1px solid var(--line);
    white-space: nowrap;
  }
  td.opening {
    color: var(--ink-muted);
  }
  td.num,
  td.result-cell {
    font-variant-numeric: tabular-nums;
  }
  td.me {
    font-weight: var(--weight-strong);
  }
  .row-link {
    color: inherit;
    text-decoration: none;
  }
  /* The whole row opens the game */
  .row-link::after {
    content: '';
    position: absolute;
    inset: 0;
  }

  .footer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1.5rem;
    font-size: var(--size-small);
  }
  .clear {
    background: var(--surface-raised);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    padding: 0.375rem 0.75rem;
    font-size: var(--size-secondary);
    cursor: pointer;
  }
  .clear.confirm {
    background: var(--wrong);
    color: var(--on-answer);
    font-weight: var(--weight-strong);
  }
</style>
