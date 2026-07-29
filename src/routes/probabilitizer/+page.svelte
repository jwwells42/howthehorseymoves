<script lang="ts">
  import { onMount } from 'svelte';
  import Board from '$lib/components/board/Board.svelte';
  import { parseFen, createBoardState, type BoardState, type SquareId, type PieceKind, type PieceColor } from '$lib/logic/types';
  import { getLegalMoves } from '$lib/logic/attacks';
  import { applyMove, parseSan } from '$lib/logic/pgn';
  import { boardToFen } from '$lib/probabilitizer/board-to-fen';
  import { fetchExplorer, type ExplorerData, type ExplorerSettings, RATING_BUCKETS, SPEEDS } from '$lib/probabilitizer/lichess';
  import { moveProbability, movePlayRate, lineTotals } from '$lib/probabilitizer/probability';

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

  let colorToMove = $derived<PieceColor>(line.length % 2 === 0 ? 'w' : 'b');
  let fullMove = $derived(Math.floor(line.length / 2) + 1);
  let totals = $derived(lineTotals(line.map((e) => ({ side: e.side, prob: e.prob, excluded: e.excluded }))));
  let analysisUrl = $derived(
    `https://lichess.org/analysis/${boardToFen(board, colorToMove, fullMove).replace(/ /g, '_')}`,
  );

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const pct = (x: number) => (x * 100).toFixed(3);

  // --- Data fetching (guarded against out-of-order responses) ---
  let controller: AbortController | null = null;
  let reqSeq = 0;

  async function refresh() {
    const seq = ++reqSeq;
    controller?.abort();
    controller = new AbortController();
    loading = true;
    error = null;
    try {
      const data = await fetchExplorer(line.map((e) => e.uci), settings, controller.signal);
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

  onMount(refresh);

  // --- Move making ---
  function promotionFor(from: SquareId, to: SquareId): PieceKind | undefined {
    const p = board.pieces.get(from);
    if (p?.piece === 'P' && (to[1] === '8' || to[1] === '1')) return 'Q';
    return undefined;
  }

  function playMove(from: SquareId, to: SquareId, promotion?: PieceKind) {
    const uci = from + to + (promotion ? promotion.toLowerCase() : '');
    const prob = currentData ? moveProbability(currentData, uci) : 0;
    const dataMove = currentData?.moves.find((m) => m.uci === uci);
    const san = dataMove?.san ?? `${from}-${to}`;
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

  function playUci(uci: string) {
    const from = uci.slice(0, 2) as SquareId;
    const to = uci.slice(2, 4) as SquareId;
    const promotion = uci.length > 4 ? (uci[4].toUpperCase() as PieceKind) : undefined;
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
    if (tokens.length === 0) return;

    controller?.abort();
    const seq = ++reqSeq;
    loading = true;
    error = null;

    let b = startBoard();
    const newLine: LineEntry[] = [];
    try {
      let data = await fetchExplorer([], settings);
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
        const uci = parsed.from + parsed.to + (parsed.promotion ? parsed.promotion.toLowerCase() : '');
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
        data = await fetchExplorer(newLine.map((e) => e.uci), settings);
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

<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>

  <h1>The Probabilitizer</h1>
  <p class="tagline">
    How likely is a whole opening line to actually appear on the board — from the very first move?
    Play or paste a line and see the cumulative odds, split by who you're playing.
  </p>
  <p class="credit">
    Based on
    <a href="https://github.com/EikaMikiku/Opening-Explorer-Plus" target="_blank" rel="noopener noreferrer">
      Opening-Explorer-Plus</a>
    by EikaMikiku. Data from the
    <a href="https://lichess.org/analysis#explorer" target="_blank" rel="noopener noreferrer">Lichess opening explorer</a>.
  </p>

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
    </div>

    <div class="right">
      {#if error}
        <p class="error">{error}</p>
      {/if}

      <section class="totals card">
        <h2>Chance this line arises from the start</h2>
        {#if totals.whiteCount + totals.blackCount === 0}
          <p class="muted">Play or paste some moves to see the odds.</p>
        {:else}
          <p>
            As <strong>White</strong>, aiming for this line, you reach this position
            <strong>{pct(totals.blackProb)}%</strong> of the time (given Black plays along).
          </p>
          <p>
            As <strong>Black</strong>, aiming for this line, you reach this position
            <strong>{pct(totals.whiteProb)}%</strong> of the time (given White plays along).
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
                  <td>{i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ''}{entry.san}</td>
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
          <p class="hint">Tick “Skip” to treat a move as forced / your own choice — it drops out of the odds.</p>
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
                <label class="chip"><input type="checkbox" checked={settings.ratings.includes(r)} onchange={() => toggleRating(r)} /> {r}+</label>
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
  </div>
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
    margin-bottom: 1.5rem;
  }
  .credit a {
    color: var(--text-muted);
    text-decoration: underline;
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
  .hint {
    font-size: 0.75rem;
    color: var(--text-faint);
    margin-top: 0.5rem;
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
