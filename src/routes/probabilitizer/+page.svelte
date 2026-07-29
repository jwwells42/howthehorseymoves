<script lang="ts">
  import { onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import { parseFen, createBoardState, type BoardState, type SquareId, type PieceKind, type PieceColor } from '$lib/logic/types';
  import { getLegalMoves } from '$lib/logic/attacks';
  import { applyMove, parseSan } from '$lib/logic/pgn';
  import { boardToFen } from '$lib/probabilitizer/board-to-fen';
  import { fetchExplorer, type ExplorerData, type ExplorerSettings, type FetchFn, RATING_BUCKETS, SPEEDS } from '$lib/probabilitizer/lichess';
  import { moveProbability, movePlayRate, lineTotals } from '$lib/probabilitizer/probability';
  import { createLichessOAuth } from '$lib/probabilitizer/auth';
  import type { OAuth2AuthCodePKCE } from '@bity/oauth2-auth-code-pkce';

  const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';

  function startBoard(): BoardState {
    const p = parseFen(START_FEN);
    return createBoardState(p.placements, {
      castlingRights: p.castlingRights,
      enPassantSquare: p.enPassantSquare,
    });
  }

  interface LineEntry {
    san: string;
    uci: string;
    from: SquareId;
    to: SquareId;
    promotion?: PieceKind;
    side: PieceColor;
    prob: number;
    excluded: boolean;
  }

  let board = $state<BoardState>(startBoard());
  let line = $state<LineEntry[]>([]);
  let currentData = $state<ExplorerData | null>(null);
  let settings = $state<ExplorerSettings>({ db: 'masters', ratings: [...RATING_BUCKETS], speeds: [...SPEEDS] });
  let loading = $state(false);
  let error = $state<string | null>(null);
  let flipped = $state(false);
  let lineText = $state('');

  let selectedSquare = $state<SquareId | null>(null);
  let validMoves = $state<SquareId[]>([]);
  let dragValidMoves = $state<SquareId[]>([]);

  // Lichess auth (the explorer requires being signed in since Feb 2026)
  let oauth: OAuth2AuthCodePKCE | null = null;
  let signedIn = $state(false);
  let authError = $state<string | null>(null);
  let authFetch: FetchFn = (url, init) => fetch(url, init);

  let colorToMove = $derived<PieceColor>(line.length % 2 === 0 ? 'w' : 'b');
  let fullMove = $derived(Math.floor(line.length / 2) + 1);
  let totals = $derived(lineTotals(line.map((e) => ({ side: e.side, prob: e.prob, excluded: e.excluded }))));

  // Who the percentages describe, based on the selected database.
  let dbLabel = $derived.by(() => {
    if (settings.db === 'masters') return 'Masters';
    const rs = [...settings.ratings].sort((a, b) => a - b);
    if (rs.length === 0 || rs.length === RATING_BUCKETS.length) return 'Lichess players';
    if (rs.length === 1) return `Lichess players rated ${rs[0]}`;
    return `Lichess players rated ${rs[0]}–${rs[rs.length - 1]}`;
  });
  let analysisUrl = $derived(
    `https://lichess.org/analysis/${boardToFen(board, colorToMove, fullMove).replace(/ /g, '_')}`,
  );

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const pct = (x: number) => (x * 100).toFixed(3);

  // --- Data fetching (guarded against out-of-order responses) ---
  let controller: AbortController | null = null;
  let reqSeq = 0;

  async function refresh() {
    if (!signedIn) return;
    const seq = ++reqSeq;
    controller?.abort();
    controller = new AbortController();
    loading = true;
    error = null;
    try {
      const data = await fetchExplorer(line.map((e) => e.uci), settings, authFetch, controller.signal);
      if (seq === reqSeq) {
        currentData = data;
        loading = false;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      if (seq === reqSeq) {
        error = (e as Error).message;
        loading = false;
      }
    }
  }

  onMount(async () => {
    oauth = createLichessOAuth();
    try {
      if (await oauth.isReturningFromAuthServer()) {
        await oauth.getAccessToken();
        history.replaceState({}, '', location.pathname);
      }
    } catch {
      authError = 'Lichess sign-in FAILURE';
    }
    if (oauth.isAuthorized()) {
      signedIn = true;
      authFetch = oauth.decorateFetchHTTPClient(window.fetch) as FetchFn;
      refresh();
    }
  });

  async function login() {
    authError = null;
    if (!oauth) oauth = createLichessOAuth();
    await oauth.fetchAuthorizationCode(); // redirects away to lichess.org
  }

  function logout() {
    oauth?.reset();
    signedIn = false;
    currentData = null;
    authError = null;
    authFetch = (url, init) => fetch(url, init);
  }

  // --- Move making ---
  function promotionFor(from: SquareId, to: SquareId): PieceKind | undefined {
    const p = board.pieces.get(from);
    if (p?.piece === 'P' && (to[1] === '8' || to[1] === '1')) return 'Q';
    return undefined;
  }

  function isCastle(from: SquareId, to: SquareId, b: BoardState): boolean {
    return b.pieces.get(from)?.piece === 'K' && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2;
  }

  // The board engine encodes castling as the king's destination (e1g1/e1c1); the
  // Lichess explorer uses king-takes-rook (e1h1/e1a1). Convert at the boundary.
  function toLichessUci(from: SquareId, to: SquareId, promotion: PieceKind | undefined, b: BoardState): string {
    if (isCastle(from, to, b)) {
      const rookFile = to.charCodeAt(0) > from.charCodeAt(0) ? 'h' : 'a';
      return `${from}${rookFile}${from[1]}`;
    }
    return from + to + (promotion ? promotion.toLowerCase() : '');
  }

  function fromLichessUci(uci: string, b: BoardState): { from: SquareId; to: SquareId; promotion?: PieceKind } {
    const from = uci.slice(0, 2) as SquareId;
    let to = uci.slice(2, 4) as SquareId;
    const promotion = uci.length > 4 ? (uci[4].toUpperCase() as PieceKind) : undefined;
    // King e-file to a/h rook square = Lichess castling → king's destination
    if (b.pieces.get(from)?.piece === 'K' && from[0] === 'e' && from[1] === to[1] && (to[0] === 'h' || to[0] === 'a')) {
      to = `${to[0] === 'h' ? 'g' : 'c'}${from[1]}` as SquareId;
    }
    return { from, to, promotion };
  }

  function sanFallback(from: SquareId, to: SquareId, b: BoardState): string {
    if (isCastle(from, to, b)) return to.charCodeAt(0) > from.charCodeAt(0) ? 'O-O' : 'O-O-O';
    return `${from}-${to}`;
  }

  function playMove(from: SquareId, to: SquareId, promotion?: PieceKind) {
    const uci = toLichessUci(from, to, promotion, board);
    const dataMove = currentData?.moves.find((m) => m.uci === uci);
    const prob = currentData ? moveProbability(currentData, uci) : 0;
    const san = dataMove?.san ?? sanFallback(from, to, board);
    const side = colorToMove;
    board = applyMove(board, from, to, promotion);
    line = [...line, { san, uci, from, to, promotion, side, prob, excluded: false }];
    selectedSquare = null;
    validMoves = [];
    refresh();
  }

  function onSquareClick(sq: SquareId) {
    if (selectedSquare && validMoves.includes(sq)) {
      playMove(selectedSquare, sq, promotionFor(selectedSquare, sq));
      return;
    }
    const p = board.pieces.get(sq);
    if (p && p.color === colorToMove) {
      selectedSquare = sq;
      validMoves = getLegalMoves(sq, board, colorToMove);
    } else {
      selectedSquare = null;
      validMoves = [];
    }
  }

  function onDrop(from: SquareId, to: SquareId) {
    if (getLegalMoves(from, board, colorToMove).includes(to)) {
      playMove(from, to, promotionFor(from, to));
    }
  }

  function onDragStart(sq: SquareId) {
    dragValidMoves = getLegalMoves(sq, board, colorToMove);
  }
  function onDragEnd() {
    dragValidMoves = [];
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!signedIn) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
    if (e.key === 'f' || e.key === 'F') {
      flipped = !flipped;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      undo();
    }
  }

  function playUci(uci: string) {
    const { from, to, promotion } = fromLichessUci(uci, board);
    playMove(from, to, promotion);
  }

  function rebuild(entries: LineEntry[]): BoardState {
    let b = startBoard();
    for (const e of entries) b = applyMove(b, e.from, e.to, e.promotion);
    return b;
  }

  function undo() {
    if (line.length === 0) return;
    line = line.slice(0, -1);
    board = rebuild(line);
    selectedSquare = null;
    validMoves = [];
    refresh();
  }

  function reset() {
    line = [];
    board = startBoard();
    selectedSquare = null;
    validMoves = [];
    refresh();
  }

  function toggleExclude(i: number) {
    line = line.map((e, idx) => (idx === i ? { ...e, excluded: !e.excluded } : e));
  }

  // --- Paste a line: replay it, fetching the explorer at each ply ---
  async function loadLine() {
    const tokens = lineText
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\d+\.(\.\.)?/g, ' ')
      .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\b/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (tokens.length === 0 || !signedIn) return;

    controller?.abort();
    const seq = ++reqSeq;
    loading = true;
    error = null;

    let b = startBoard();
    const newLine: LineEntry[] = [];
    try {
      let data = await fetchExplorer([], settings, authFetch);
      for (let i = 0; i < tokens.length; i++) {
        const color: PieceColor = i % 2 === 0 ? 'w' : 'b';
        let parsed: { from: SquareId; to: SquareId; promotion?: PieceKind } | null = null;
        try {
          parsed = parseSan(tokens[i], b, color);
        } catch {
          parsed = null;
        }
        if (!parsed || !parsed.from || !parsed.to) {
          throw new Error(`Couldn't read move "${tokens[i]}" — check the line.`);
        }
        const uci = toLichessUci(parsed.from, parsed.to, parsed.promotion, b);
        const prob = moveProbability(data, uci);
        const dataMove = data.moves.find((m) => m.uci === uci);
        newLine.push({
          san: dataMove?.san ?? tokens[i],
          uci,
          from: parsed.from,
          to: parsed.to,
          promotion: parsed.promotion,
          side: color,
          prob,
          excluded: false,
        });
        b = applyMove(b, parsed.from, parsed.to, parsed.promotion);
        await sleep(300); // stay under Lichess rate limits
        data = await fetchExplorer(newLine.map((e) => e.uci), settings, authFetch);
        if (seq !== reqSeq) return; // superseded by another action
      }
      board = b;
      line = newLine;
      currentData = data;
      selectedSquare = null;
      validMoves = [];
      loading = false;
    } catch (e) {
      if (seq !== reqSeq) return;
      error = (e as Error).message;
      loading = false;
    }
  }

  // --- Settings ---
  function setDb(db: ExplorerSettings['db']) {
    settings = { ...settings, db };
    refresh();
  }
  function toggleRating(r: number) {
    const has = settings.ratings.includes(r);
    settings = { ...settings, ratings: has ? settings.ratings.filter((x) => x !== r) : [...settings.ratings, r] };
    refresh();
  }
  function toggleSpeed(s: string) {
    const has = settings.speeds.includes(s);
    settings = { ...settings, speeds: has ? settings.speeds.filter((x) => x !== s) : [...settings.speeds, s] };
    refresh();
  }
</script>

<svelte:head>
  <title>The Probabilitizer — How The Horsey Moves</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>

  <h1>The Probabilitizer</h1>
  <p class="tagline">
    See the percentage chance you'll actually see move 23 in your Bg5 Najdorf.
  </p>

  {#if !signedIn}
    <section class="signin card">
      <h2>Sign in with Lichess to continue</h2>
      {#if authError}<p class="error">{authError}</p>{/if}
      <button type="button" class="signin-btn" onclick={login}>Sign in with Lichess</button>
    </section>
  {:else}
  <div class="signed-in-row">
    <span class="signed-in-label">✓ Signed in with Lichess</span>
    <button type="button" onclick={logout}>Sign out</button>
  </div>

  <div class="layout">
    <div class="left">
      <div class="board-wrap">
        <Board
          {board}
          {selectedSquare}
          {validMoves}
          targets={[]}
          reachedTargets={[]}
          {dragValidMoves}
          {onSquareClick}
          {onDrop}
          {onDragStart}
          {onDragEnd}
          playableColors={['w', 'b']}
          {flipped}
        />
      </div>

      <div class="board-controls">
        <button type="button" onclick={undo} disabled={line.length === 0}>&larr; Undo</button>
        <button type="button" onclick={reset} disabled={line.length === 0}>Reset</button>
        <button type="button" onclick={() => (flipped = !flipped)}>Flip</button>
        <a class="btn-link" href={analysisUrl} target="_blank" rel="noopener noreferrer">Analysis ↗</a>
      </div>

      <div class="paste">
        <label for="line-input">Paste a line (SAN / PGN)</label>
        <div class="paste-row">
          <input
            id="line-input"
            type="text"
            bind:value={lineText}
            placeholder="1.e4 e5 2.Nf3 Nc6 3.Bb5"
            onkeydown={(e) => e.key === 'Enter' && loadLine()}
          />
          <button type="button" onclick={loadLine} disabled={loading}>Load</button>
        </div>
      </div>

      <section class="card settings">
        <h2>Database</h2>
        <div class="radio-row">
          <label><input type="radio" name="db" checked={settings.db === 'masters'} onchange={() => setDb('masters')} /> Masters</label>
          <label><input type="radio" name="db" checked={settings.db === 'lichess'} onchange={() => setDb('lichess')} /> Lichess</label>
        </div>
        {#if settings.db === 'lichess'}
          <div class="filters">
            <p class="filter-label">Rating</p>
            <div class="chips">
              {#each RATING_BUCKETS as r}
                <label class="chip"><input type="checkbox" checked={settings.ratings.includes(r)} onchange={() => toggleRating(r)} /> {r}</label>
              {/each}
            </div>
            <p class="filter-label">Time control</p>
            <div class="chips">
              {#each SPEEDS as s}
                <label class="chip"><input type="checkbox" checked={settings.speeds.includes(s)} onchange={() => toggleSpeed(s)} /> {s}</label>
              {/each}
            </div>
          </div>
        {/if}
      </section>
    </div>

    <div class="right">
      {#if error}
        <p class="error">{error}</p>
      {/if}

      <section class="totals card">
        <h2>Percentage from starting position</h2>
        {#if totals.whiteCount + totals.blackCount === 0}
          <p class="muted">Put some moves in</p>
        {:else}
          <p>
            {dbLabel} get here <strong>{pct(totals.blackProb)}%</strong> of the time as White.
          </p>
          <p>
            {dbLabel} get here <strong>{pct(totals.whiteProb)}%</strong> of the time as Black.
          </p>
        {/if}
      </section>

      {#if line.length > 0}
        <section class="card">
          <h2>Your line</h2>
          <table class="line-table">
            <thead>
              <tr><th>Move</th><th>Chance</th><th>Skip</th></tr>
            </thead>
            <tbody>
              {#each line as entry, i}
                <tr class={entry.excluded ? 'excluded' : ''}>
                  <td>{`${Math.floor(i / 2) + 1}${i % 2 === 0 ? '. ' : '. ..'}`}{entry.san}</td>
                  <td>{pct(entry.prob)}%</td>
                  <td class="skip">
                    <input
                      type="checkbox"
                      checked={entry.excluded}
                      onchange={() => toggleExclude(i)}
                      aria-label={`Treat ${entry.san} as forced`}
                    />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </section>
      {/if}

      <section class="card">
        <div class="explorer-head">
          <h2>Moves here {#if loading}<span class="spinner" aria-label="loading">…</span>{/if}</h2>
        </div>
        {#if currentData && currentData.moves.length > 0}
          <ul class="explorer-moves">
            {#each currentData.moves as m}
              {@const games = m.white + m.draws + m.black}
              <li>
                <button type="button" class="explorer-move" onclick={() => playUci(m.uci)}>
                  <span class="em-san">{m.san}</span>
                  <span class="em-games">{games.toLocaleString()}</span>
                  <span class="em-bar">
                    <span class="em-white" style={`width:${(100 * m.white) / games}%`}></span>
                    <span class="em-draw" style={`width:${(100 * m.draws) / games}%`}></span>
                    <span class="em-black" style={`width:${(100 * m.black) / games}%`}></span>
                  </span>
                  <span class="em-rate">{pct(movePlayRate(currentData, m))}%</span>
                </button>
              </li>
            {/each}
          </ul>
        {:else if !loading}
          <p class="muted">No games in this database for this position.</p>
        {/if}
      </section>
    </div>
  </div>
  {/if}

  <p class="credit">
    Based on
    <a href="https://github.com/EikaMikiku/Opening-Explorer-Plus" target="_blank" rel="noopener noreferrer">
      Opening-Explorer-Plus</a>
    by EikaMikiku. Data from the
    <a href="https://lichess.org/analysis#explorer" target="_blank" rel="noopener noreferrer">Lichess opening explorer</a>.
  </p>
</main>

<style>
  .page {
    min-height: 100vh;
    padding: 1.5rem;
    max-width: 72rem;
    margin: 0 auto;
  }
  .back-link {
    font-size: 0.875rem;
    color: var(--text-muted);
    display: inline-block;
    margin-bottom: 1rem;
  }
  .back-link:hover {
    color: var(--foreground);
  }
  h1 {
    font-size: 1.875rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  .tagline {
    color: var(--text-muted);
    max-width: 42rem;
    line-height: 1.5;
    margin-bottom: 0.5rem;
  }
  .credit {
    font-size: 0.8rem;
    color: var(--text-faint);
    margin-top: 2.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--card-border);
  }
  .credit a {
    color: var(--text-muted);
    text-decoration: underline;
  }

  .signin {
    max-width: 34rem;
  }
  .signin p {
    color: var(--text-muted);
    line-height: 1.5;
    margin-bottom: 1rem;
  }
  .signin-btn {
    padding: 0.6rem 1.1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--btn-bg);
    color: var(--foreground);
    font-size: 0.95rem;
    font-weight: bold;
    cursor: pointer;
  }
  .signin-btn:hover {
    background: var(--btn-hover);
  }
  .signed-in-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }
  .signed-in-row button {
    padding: 0.25rem 0.6rem;
    border-radius: 0.4rem;
    border: 1px solid var(--card-border);
    background: var(--btn-bg);
    color: var(--foreground);
    cursor: pointer;
    font-size: 0.8rem;
  }
  .signed-in-row button:hover {
    background: var(--btn-hover);
  }

  .layout {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: flex-start;
  }
  .left {
    flex: 1 1 20rem;
    max-width: 32rem;
  }
  .right {
    flex: 1 1 22rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .board-wrap {
    width: 100%;
  }

  .board-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }
  .board-controls button,
  .paste button,
  .btn-link {
    padding: 0.45rem 0.8rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--btn-bg);
    color: var(--foreground);
    cursor: pointer;
    font-size: 0.875rem;
  }
  .board-controls button:hover,
  .paste button:hover,
  .btn-link:hover {
    background: var(--btn-hover);
  }
  .board-controls button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .btn-link {
    text-decoration: none;
    display: inline-block;
  }

  .paste {
    margin-top: 1rem;
  }
  .paste label {
    display: block;
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: 0.35rem;
  }
  .paste-row {
    display: flex;
    gap: 0.5rem;
  }
  .paste-row input {
    flex: 1;
    padding: 0.45rem 0.6rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--foreground);
    font-size: 0.875rem;
  }

  .card {
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    border-radius: 0.75rem;
    padding: 1rem;
  }
  .card h2 {
    font-size: 1rem;
    font-weight: bold;
    margin-bottom: 0.6rem;
  }
  .totals p {
    line-height: 1.5;
    margin-bottom: 0.4rem;
  }
  .muted {
    color: var(--text-faint);
  }
  .error {
    color: #dc2626;
    font-size: 0.875rem;
  }

  .line-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }
  .line-table th,
  .line-table td {
    text-align: left;
    padding: 0.3rem 0.4rem;
    border-bottom: 1px solid var(--card-border);
  }
  .line-table th:nth-child(2),
  .line-table td:nth-child(2) {
    text-align: right;
  }
  .line-table .skip {
    text-align: center;
  }
  .line-table tr.excluded td:not(.skip) {
    opacity: 0.4;
    text-decoration: line-through;
  }

  .explorer-moves {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .explorer-move {
    width: 100%;
    display: grid;
    grid-template-columns: 3.5rem 4rem 1fr 4rem;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.4rem;
    background: transparent;
    border: none;
    border-radius: 0.4rem;
    color: var(--foreground);
    cursor: pointer;
    font-size: 0.8rem;
  }
  .explorer-move:hover {
    background: var(--btn-hover);
  }
  .em-san {
    font-weight: bold;
    text-align: left;
  }
  .em-games {
    text-align: right;
    color: var(--text-muted);
  }
  .em-rate {
    text-align: right;
    color: var(--text-muted);
  }
  .em-bar {
    display: flex;
    height: 14px;
    border-radius: 3px;
    overflow: hidden;
    border: 1px solid var(--card-border);
  }
  .em-white {
    background: #f0f0f0;
  }
  .em-draw {
    background: #9ca3af;
  }
  .em-black {
    background: #374151;
  }

  .radio-row {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
  }
  .filters {
    margin-top: 0.75rem;
  }
  .filter-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 0.5rem 0 0.3rem;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .chip {
    font-size: 0.8rem;
    padding: 0.2rem 0.45rem;
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;
  }
  .spinner {
    color: var(--text-faint);
    font-weight: normal;
  }
</style>
