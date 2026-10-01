<script lang="ts">
  import { type SquareId, type PieceKind, type PieceColor, type PiecePlacement, FILES, createBoardState } from '$lib/logic/types';
  import { getValidMoves } from '$lib/logic/moves';
  import type { BoardState } from '$lib/logic/types';
  import type { Arrow } from '$lib/logic/pgn';
  import { LICHESS_MARKS, MARK, highlight, type SquareHighlight } from '$lib/board-marks';
  import Board from '$lib/components/board/Board.svelte';
  import Wall from '$lib/components/board/Wall.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Choice from '$lib/components/ui/Choice.svelte';

  const ALL_PIECES: PieceKind[] = ['K', 'Q', 'R', 'B', 'N', 'P'];

  /** The arrow colours to pick from: the board's four mark colours. */
  const ARROW_COLORS = Object.entries(MARK);

  /** The Lichess letter for each mark colour, for `[%cal Ge2e4]` in a PGN. */
  const LICHESS_LETTER: Record<string, string> = Object.fromEntries(
    Object.entries(LICHESS_MARKS).map(([letter, color]) => [color, letter])
  );

  type EditorMode = 'route' | 'position';
  type RouteTool = PieceKind | 'wall' | 'star' | 'erase' | 'arrow';
  type PositionTool = PieceKind | 'erase' | 'arrow';

  let mode = $state<EditorMode>('route');

  /* ── Route mode state ───────────────────────────── */

  let routeTool = $state<RouteTool>('R');
  let studentSquare = $state<SquareId | null>(null);
  let studentPiece = $state<PieceKind>('R');
  let obstacles = $state<SquareId[]>([]);
  let targets = $state<SquareId[]>([]);

  /* ── Position mode state ────────────────────────── */

  let posTool = $state<PositionTool>('K');
  let posColor = $state<PieceColor>('w');
  let positionPieces = $state<Map<SquareId, { piece: PieceKind; color: PieceColor }>>(new Map());
  let posMode = $state<'checkmate' | 'reach-target'>('checkmate');
  let posSolution = $state('');
  let posTargets = $state('');
  let posMaxMoves = $state(1);
  let posPlayerPiece = $state<PieceKind>('R');

  /* ── Arrow state (shared) ───────────────────────── */

  let arrows = $state<Arrow[]>([]);
  let arrowColor = $state<string>(MARK.good);
  let arrowStart = $state<SquareId | null>(null);

  /* ── Shared state ───────────────────────────────── */

  let puzzleId = $state('');
  let title = $state('');
  let copied = $state(false);

  /* ── BFS solver (route mode) ────────────────────── */

  function bfs(kind: PieceKind, from: SquareId, to: SquareId, obs: SquareId[]): SquareId[] | null {
    if (from === to) return [];
    const basePieces = new Map<SquareId, { piece: PieceKind; color: PieceColor }>();
    for (const o of obs) basePieces.set(o, { piece: 'P', color: 'w' });

    const queue: { sq: SquareId; path: SquareId[] }[] = [{ sq: from, path: [] }];
    const visited = new Set<SquareId>([from]);

    while (queue.length > 0) {
      const { sq, path } = queue.shift()!;
      const pieces = new Map(basePieces);
      pieces.set(sq, { piece: kind, color: 'w' });
      const board: BoardState = { pieces, castlingRights: { K: false, Q: false, k: false, q: false }, enPassantSquare: undefined };

      const moves = getValidMoves(kind, sq, board, 'w');
      for (const next of moves) {
        if (visited.has(next)) continue;
        visited.add(next);
        const newPath = [...path, next];
        if (next === to) return newPath;
        queue.push({ sq: next, path: newPath });
      }
    }
    return null;
  }

  function permutations<T>(arr: T[]): T[][] {
    if (arr.length <= 1) return [arr];
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const perm of permutations(rest)) {
        result.push([arr[i], ...perm]);
      }
    }
    return result;
  }

  function solve(kind: PieceKind, start: SquareId, tgts: SquareId[], obs: SquareId[]): { solution: SquareId[]; moves: number } | null {
    if (tgts.length === 0 || !start) return null;
    const perms = permutations(tgts);
    let best: { solution: SquareId[]; moves: number } | null = null;

    for (const perm of perms) {
      let current = start;
      let fullPath: SquareId[] = [];
      let valid = true;
      for (const target of perm) {
        const leg = bfs(kind, current, target, obs);
        if (!leg) { valid = false; break; }
        fullPath = [...fullPath, ...leg];
        current = target;
      }
      if (valid && (!best || fullPath.length < best.moves)) {
        best = { solution: fullPath, moves: fullPath.length };
      }
    }
    return best;
  }

  /* ── FEN generation (position mode) ─────────────── */

  function toFen(pieces: Map<SquareId, { piece: PieceKind; color: PieceColor }>): string {
    const rows: string[] = [];
    for (let r = 8; r >= 1; r--) {
      let row = '';
      let empty = 0;
      for (const f of FILES) {
        const sq = `${f}${r}` as SquareId;
        const p = pieces.get(sq);
        if (p) {
          if (empty > 0) { row += empty; empty = 0; }
          const ch = p.color === 'w' ? p.piece : p.piece.toLowerCase();
          row += ch;
        } else {
          empty++;
        }
      }
      if (empty > 0) row += empty;
      rows.push(row);
    }
    return rows.join('/') + ' w - - 0 1';
  }

  /* ── Derived state ──────────────────────────────── */

  let routeResult = $derived.by(() => {
    if (!studentSquare || targets.length === 0) return null;
    return solve(studentPiece, studentSquare, targets, obstacles);
  });

  /** What the board shows. In route mode the walls stand on the board as white pawns. */
  let editorBoard = $derived.by(() => {
    if (mode === 'position') {
      return createBoardState([...positionPieces].map(([square, p]) => ({ ...p, square })));
    }
    const placements: PiecePlacement[] = obstacles.map((square) => ({ piece: 'P', color: 'w', square }));
    if (studentSquare) placements.push({ piece: studentPiece, color: 'w', square: studentSquare });
    return createBoardState(placements);
  });

  /** The shortest route, square by square, and the square an arrow starts from. */
  let editorHighlights = $derived.by((): SquareHighlight[] => {
    const marks: SquareHighlight[] = [];
    if (arrowStart) marks.push(...highlight([arrowStart], MARK.note));
    if (mode === 'route' && routeResult) {
      const path = routeResult.solution.filter((sq) => sq !== studentSquare && !targets.includes(sq));
      marks.push(...highlight(path, MARK.other));
    }
    return marks;
  });

  let outputCode = $derived.by(() => {
    const id = puzzleId || (mode === 'route' ? `${studentPiece.toLowerCase()}-XX` : 'puzzle-XX');
    const t = title || '';

    if (mode === 'route') {
      const position: string[] = [];
      if (studentSquare) {
        position.push(`    { piece: "${studentPiece}", color: "w", square: "${studentSquare}" }`);
      }

      const moves = routeResult?.moves ?? 0;
      const wallStr = obstacles.map(s => `"${s}"`).join(', ');
      const starStr = targets.map(s => `"${s}"`).join(', ');
      const instruction = targets.length === 1
        ? `Reach the star${moves > 0 ? ` in ${moves} move${moves !== 1 ? 's' : ''}` : ''}!`
        : `Collect all the stars!`;

      const arrowsLine = arrows.length > 0
        ? `\n  arrows: [${arrows.map(a => `{ from: "${a.from}", to: "${a.to}", color: "${a.color}" }`).join(', ')}],`
        : '';

      return `{
  type: "route",
  id: "${id}",
  playerPiece: "${studentPiece}",
  title: "${t}",
  instruction: "${instruction}",
  position: [
${position.join(',\n')},
  ],
  walls: [${wallStr}],
  stars: [${starStr}],${arrowsLine}
  starThresholds: { three: ${moves}, two: ${moves + 1}, one: ${moves + 2} },
},`;
    } else {
      const fen = toFen(positionPieces);

      const lines = [
        `{`,
        `  type: "puzzle",`,
        `  id: "${id}",`,
        `  title: "${t}",`,
        `  instruction: "",`,
        `  fen: "${fen}",`,
        `  pgn: "",`,
      ];
      if (arrows.length > 0) {
        const calEntries = arrows.map(a => `${LICHESS_LETTER[a.color] ?? 'G'}${a.from}${a.to}`);
        lines.push(`  // Arrows as PGN annotation: {[%cal ${calEntries.join(',')}]}`);
      }
      lines.push(`  starThresholds: { three: ${posMaxMoves}, two: ${posMaxMoves + 1}, one: ${posMaxMoves + 2} },`);
      lines.push(`},`);
      return lines.join('\n');
    }
  });

  /* ── Arrow helpers ──────────────────────────────── */

  function handleArrowClick(sq: SquareId) {
    if (!arrowStart) {
      arrowStart = sq;
    } else {
      if (sq !== arrowStart) {
        // Toggle: if this exact arrow exists, remove it
        const existing = arrows.findIndex(a => a.from === arrowStart && a.to === sq);
        if (existing >= 0) {
          arrows = arrows.filter((_, i) => i !== existing);
        } else {
          arrows = [...arrows, { from: arrowStart, to: sq, color: arrowColor }];
        }
      }
      arrowStart = null;
    }
  }

  function removeArrow(idx: number) {
    arrows = arrows.filter((_, i) => i !== idx);
  }

  /* ── Click handling ─────────────────────────────── */

  function handleRouteClick(sq: SquareId) {
    if (routeTool === 'arrow') {
      handleArrowClick(sq);
      return;
    }
    if (typeof routeTool === 'string' && ALL_PIECES.includes(routeTool as PieceKind)) {
      obstacles = obstacles.filter(o => o !== sq);
      targets = targets.filter(t => t !== sq);
      studentSquare = sq;
      studentPiece = routeTool as PieceKind;
    } else if (routeTool === 'wall') {
      if (sq === studentSquare) return;
      if (obstacles.includes(sq)) {
        obstacles = obstacles.filter(o => o !== sq);
      } else {
        targets = targets.filter(t => t !== sq);
        obstacles = [...obstacles, sq];
      }
    } else if (routeTool === 'star') {
      if (sq === studentSquare) return;
      if (targets.includes(sq)) {
        targets = targets.filter(t => t !== sq);
      } else {
        obstacles = obstacles.filter(o => o !== sq);
        targets = [...targets, sq];
      }
    } else if (routeTool === 'erase') {
      if (sq === studentSquare) studentSquare = null;
      obstacles = obstacles.filter(o => o !== sq);
      targets = targets.filter(t => t !== sq);
    }
  }

  function handlePositionClick(sq: SquareId) {
    if (posTool === 'arrow') {
      handleArrowClick(sq);
      return;
    }
    if (posTool === 'erase') {
      const next = new Map(positionPieces);
      next.delete(sq);
      positionPieces = next;
    } else {
      const next = new Map(positionPieces);
      const existing = next.get(sq);
      // If same piece+color already there, remove it (toggle)
      if (existing && existing.piece === posTool && existing.color === posColor) {
        next.delete(sq);
      } else {
        next.set(sq, { piece: posTool, color: posColor });
      }
      positionPieces = next;
    }
  }

  function handleClick(sq: SquareId) {
    if (mode === 'route') handleRouteClick(sq);
    else handlePositionClick(sq);
  }

  function clearBoard() {
    if (mode === 'route') {
      studentSquare = null;
      obstacles = [];
      targets = [];
    } else {
      positionPieces = new Map();
    }
    arrows = [];
    arrowStart = null;
  }

  function switchMode(m: EditorMode) {
    mode = m;
    arrowStart = null;
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(outputCode);
    copied = true;
    setTimeout(() => copied = false, 1500);
  }
</script>

<div class="editor">
  <h1 class="heading">Puzzle Editor</h1>

  <Choice
    label="Puzzle type"
    options={[
      { value: 'route', label: 'Route' },
      { value: 'position', label: 'Position' },
    ]}
    bind:value={() => mode, switchMode}
  />

  <!-- Toolbar: one row -->
  {#if mode === 'route'}
    <div class="toolbar">
      {#each ALL_PIECES as p}
        <button class={['tool-btn', routeTool === p && 'active']} onclick={() => { routeTool = p; }}>
          <img src="/pieces/w{p}.svg" alt={p} class="tool-icon" />
        </button>
      {/each}

      <span class="divider"></span>

      <button class={['tool-btn', routeTool === 'wall' && 'active']} onclick={() => routeTool = 'wall'} aria-label="Wall">
        <svg viewBox="12 12 76 76" class="tool-icon" aria-hidden="true">
          <Wall x={0} y={0} size={100} />
        </svg>
      </button>
      <button class={['tool-btn', routeTool === 'star' && 'active']} onclick={() => routeTool = 'star'} aria-label="Star">
        <span class="star-icon">&#9733;</span>
      </button>
      <button class={['tool-btn', routeTool === 'arrow' && 'active']} onclick={() => { routeTool = 'arrow'; arrowStart = null; }} aria-label="Arrow">
        <span class="arrow-icon">&rarr;</span>
      </button>
      <button class={['tool-btn', routeTool === 'erase' && 'active']} onclick={() => routeTool = 'erase'} aria-label="Erase">
        <span class="erase-icon">&#10005;</span>
      </button>
      <div class="clear">
        <Button onclick={clearBoard}>Clear</Button>
      </div>
    </div>
  {:else}
    <div class="toolbar">
      {#each ALL_PIECES as p}
        <button class={['tool-btn', posTool === p && 'active']} onclick={() => { posTool = p; }}>
          <img src="/pieces/{posColor}{p}.svg" alt={p} class="tool-icon" />
        </button>
      {/each}

      <span class="divider"></span>

      <button
        class={['tool-btn', 'color-toggle']}
        onclick={() => posColor = posColor === 'w' ? 'b' : 'w'}
        aria-label="Toggle piece color"
      >
        <span class={['color-swatch', posColor === 'w' ? 'white' : 'black']}></span>
        <span class="tool-text-sm">{posColor === 'w' ? 'White' : 'Black'}</span>
      </button>
      <button class={['tool-btn', posTool === 'arrow' && 'active']} onclick={() => { posTool = 'arrow'; arrowStart = null; }} aria-label="Arrow">
        <span class="arrow-icon">&rarr;</span>
      </button>
      <button class={['tool-btn', posTool === 'erase' && 'active']} onclick={() => posTool = 'erase'} aria-label="Erase">
        <span class="erase-icon">&#10005;</span>
      </button>
      <div class="clear">
        <Button onclick={clearBoard}>Clear</Button>
      </div>
    </div>
  {/if}

  <!-- Arrow color picker (shown when arrow tool active) -->
  {#if (mode === 'route' && routeTool === 'arrow') || (mode === 'position' && posTool === 'arrow')}
    <div class="arrow-controls">
      <span>
        {arrowStart ? `Click destination for arrow from ${arrowStart}` : 'Click start square, then end square'}
      </span>
      <div class="arrow-colors">
        {#each ARROW_COLORS as [name, color]}
          <button
            class={['color-dot', arrowColor === color && 'color-dot-active']}
            style:background={color}
            onclick={() => arrowColor = color}
            aria-label="{name} arrow"
          ></button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="board">
    <Board
      board={editorBoard}
      label="Puzzle editor board"
      playableColors={[]}
      onSquareClick={handleClick}
      targets={mode === 'route' ? targets : []}
      obstacles={mode === 'route' ? obstacles : []}
      highlights={editorHighlights}
      {arrows}
    />
  </div>

  <!-- Arrow list -->
  {#if arrows.length > 0}
    <div class="arrow-list">
      <span class="arrow-list-label">Arrows:</span>
      {#each arrows as arrow, i}
        <span class="arrow-tag" style:border-color={arrow.color}>
          <span class="arrow-tag-dot" style:background={arrow.color}></span>
          {arrow.from}&rarr;{arrow.to}
          <button class="arrow-tag-x" onclick={() => removeArrow(i)} aria-label="Remove arrow">&times;</button>
        </span>
      {/each}
    </div>
  {/if}

  <!-- Metadata -->
  <div class="meta-row">
    <label class="meta-label">
      ID
      <input type="text" bind:value={puzzleId} placeholder={mode === 'route' ? 'rook-XX' : 'checkmate-XX'} class="meta-input" />
    </label>
    <label class="meta-label">
      Title
      <input type="text" bind:value={title} placeholder="Puzzle Title" class="meta-input" />
    </label>
  </div>

  <!-- Mode-specific controls -->
  {#if mode === 'route'}
    <div class="solution-info">
      {#if !studentSquare}
        <p class="muted">Click a piece, then click a square to place it.</p>
      {:else if targets.length === 0}
        <p class="muted">Place at least one target star.</p>
      {:else if routeResult}
        <p class="solution-text">
          Solution: {routeResult.solution.join(' → ')} ({routeResult.moves} move{routeResult.moves !== 1 ? 's' : ''})
        </p>
        <p class="stars-text">
          Stars: 3★ ≤ {routeResult.moves} &nbsp; 2★ ≤ {routeResult.moves + 1} &nbsp; 1★ ≤ {routeResult.moves + 2}
        </p>
      {:else}
        <p class="error-text">✗ No solution found — target is unreachable.</p>
      {/if}
    </div>
  {:else}
    <div class="pos-controls">
      <div class="pos-row">
        <label class="meta-label">
          Player piece
          <select bind:value={posPlayerPiece} class="meta-input">
            {#each ALL_PIECES as p}
              <option value={p}>{p}</option>
            {/each}
          </select>
        </label>
        <label class="meta-label">
          Mode
          <select bind:value={posMode} class="meta-input">
            <option value="checkmate">Checkmate</option>
            <option value="reach-target">Reach Target</option>
          </select>
        </label>
        <label class="meta-label">
          Max moves
          <input type="number" bind:value={posMaxMoves} min={1} max={10} class="meta-input" />
        </label>
      </div>
      <label class="meta-label">
        Solution squares (space-separated)
        <input type="text" bind:value={posSolution} placeholder="e.g. e7 e8" class="meta-input" />
      </label>
      {#if posMode === 'reach-target'}
        <label class="meta-label">
          Target squares (space-separated)
          <input type="text" bind:value={posTargets} placeholder="e.g. e8" class="meta-input" />
        </label>
      {/if}
    </div>
  {/if}

  <!-- Output -->
  {#if (mode === 'route' && studentSquare && targets.length > 0) || (mode === 'position' && positionPieces.size > 0)}
    <div class="output-section">
      <div class="output-header">
        <span class="output-label">Puzzle JSON</span>
        <Button onclick={copyOutput}>{copied ? 'Copied!' : 'Copy'}</Button>
      </div>
      <pre class="output-code">{outputCode}</pre>
    </div>
  {/if}
</div>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .heading {
    font-size: var(--size-large);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-wrap: wrap;
  }

  .divider {
    width: 1px;
    height: 1.5rem;
    background: var(--line);
    margin: 0 0.25rem;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid var(--line);
    background: var(--surface);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .tool-btn:hover {
    background: var(--line);
  }

  /* The tool in hand is the one to look at. */
  .tool-btn.active {
    border-color: var(--highlight);
    background: var(--highlight-tint);
  }

  .tool-icon {
    width: 24px;
    height: 24px;
  }

  .tool-text-sm {
    font-size: var(--size-small);
  }

  .color-swatch {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1.5px solid var(--line);
  }
  .color-swatch.white { background: var(--piece-white); }
  .color-swatch.black { background: var(--piece-black); }

  .star-icon {
    font-size: var(--size-large);
    color: var(--star);
    line-height: 1;
  }

  .erase-icon {
    font-size: var(--size-body);
    color: var(--wrong-text);
    line-height: 1;
    font-weight: var(--weight-strong);
  }

  .arrow-icon {
    font-size: var(--size-large);
    line-height: 1;
    font-weight: var(--weight-strong);
  }

  .clear {
    margin-left: auto;
  }

  .arrow-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: var(--size-small);
    color: var(--ink-muted);
  }

  .arrow-colors {
    display: flex;
    gap: 0.375rem;
  }

  .color-dot {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    transition: border-color 0.15s;
  }

  .color-dot-active {
    border-color: var(--ink);
  }

  .arrow-list {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: var(--size-small);
  }

  .arrow-list-label {
    color: var(--ink-muted);
  }

  .arrow-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid;
    background: var(--surface);
    font-variant-numeric: tabular-nums;
  }

  .arrow-tag-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .arrow-tag-x {
    background: none;
    border: none;
    color: var(--ink-muted);
    cursor: pointer;
    font-size: var(--size-secondary);
    padding: 0 0.125rem;
    line-height: 1;
  }

  .arrow-tag-x:hover {
    color: var(--wrong-text);
  }

  .board {
    width: 100%;
    max-width: 32.5rem;
    margin: 0 auto;
  }

  .meta-row {
    display: flex;
    gap: 1rem;
  }

  .meta-label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: var(--size-small);
    color: var(--ink-muted);
    flex: 1;
  }

  .meta-input {
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    font-variant-numeric: tabular-nums;
    font-size: var(--size-secondary);
  }

  .pos-controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .pos-row {
    display: flex;
    gap: 1rem;
  }

  .solution-info {
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--line);
    background: var(--surface);
  }

  .muted {
    color: var(--ink-muted);
    font-size: var(--size-secondary);
  }

  .solution-text {
    font-variant-numeric: tabular-nums;
    font-size: var(--size-secondary);
  }

  .stars-text {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    margin-top: 0.25rem;
  }

  .error-text {
    color: var(--wrong-text);
    font-size: var(--size-secondary);
    font-weight: var(--weight-strong);
  }

  .output-section {
    border-radius: 0.5rem;
    border: 1px solid var(--line);
    background: var(--surface);
    overflow: hidden;
  }

  .output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--line);
  }

  .output-label {
    font-size: var(--size-small);
    color: var(--ink-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .output-code {
    padding: 1rem;
    font-size: var(--size-small);
    line-height: 1.5;
    overflow-x: auto;
    margin: 0;
  }
</style>
