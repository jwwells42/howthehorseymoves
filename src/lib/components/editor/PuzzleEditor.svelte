<script lang="ts">
  import { type SquareId, type PieceKind, type PieceColor, FILES, RANKS, squareToCoords } from '$lib/logic/types';
  import { getValidMoves } from '$lib/logic/moves';
  import type { BoardState } from '$lib/logic/types';
  import type { Arrow } from '$lib/logic/pgn';

  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';
  const SQ = 100;
  const BOARD = SQ * 8;

  const ALL_PIECES: PieceKind[] = ['K', 'Q', 'R', 'B', 'N', 'P'];
  const ARROW_COLORS = ['#15803d', '#dc2626', '#2563eb', '#ca8a04'];

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
  let arrowColor = $state('#15803d');
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

  let solutionPath = $derived(routeResult ? new Set(routeResult.solution) : new Set<SquareId>());

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
        const calEntries = arrows.map(a => {
          const colorCode = a.color === '#dc2626' ? 'R' : a.color === '#2563eb' ? 'B' : a.color === '#ca8a04' ? 'Y' : 'G';
          return `${colorCode}${a.from}${a.to}`;
        });
        lines.push(`  // Arrows as PGN annotation: {[%cal ${calEntries.join(',')}]}`);
      }
      lines.push(`  starThresholds: { three: ${posMaxMoves}, two: ${posMaxMoves + 1}, one: ${posMaxMoves + 2} },`);
      lines.push(`},`);
      return lines.join('\n');
    }
  });

  /* ── Arrow helpers ──────────────────────────────── */

  function getArrowPath(arrow: Arrow) {
    const [fx, fy] = squareToCoords(arrow.from);
    const [tx, ty] = squareToCoords(arrow.to);
    const x1 = fx * SQ + SQ / 2;
    const y1 = fy * SQ + SQ / 2;
    const x2 = tx * SQ + SQ / 2;
    const y2 = ty * SQ + SQ / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const headLen = 40;
    const headW = 55;
    const shaftW = 18;
    const ux = dx / len;
    const uy = dy / len;
    const sx = x2 - ux * headLen;
    const sy = y2 - uy * headLen;
    const px = -uy;
    const py = ux;
    const hw = headW / 2;
    return { x1, y1, sx, sy, x2, y2, px, py, hw, shaftW, color: arrow.color };
  }

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

  <!-- Mode toggle -->
  <div class="mode-toggle">
    <button class={['mode-btn', mode === 'route' && 'active']} onclick={() => switchMode('route')}>
      Route
    </button>
    <button class={['mode-btn', mode === 'position' && 'active']} onclick={() => switchMode('position')}>
      Position
    </button>
  </div>

  <!-- Toolbar: one row -->
  {#if mode === 'route'}
    <div class="toolbar">
      {#each ALL_PIECES as p}
        <button
          class={['tool-btn', routeTool === p && 'active']}
          onclick={() => { routeTool = p; }}
        >
          <img src="/pieces/w{p}.svg" alt={p} class="tool-icon" />
        </button>
      {/each}

      <span class="divider"></span>

      <button class={['tool-btn', routeTool === 'wall' && 'active']} onclick={() => routeTool = 'wall'} aria-label="Wall">
        <svg viewBox="0 0 24 24" class="tool-icon" aria-label="Wall">
          <rect x="1" y="1" width="22" height="22" rx="2" fill="#a8a29e" stroke="#78716c" stroke-width="1"/>
          <line x1="1" y1="8" x2="23" y2="8" stroke="#78716c" stroke-width="0.8"/>
          <line x1="1" y1="15" x2="23" y2="15" stroke="#78716c" stroke-width="0.8"/>
          <line x1="8" y1="1" x2="8" y2="8" stroke="#78716c" stroke-width="0.8"/>
          <line x1="16" y1="1" x2="16" y2="8" stroke="#78716c" stroke-width="0.8"/>
          <line x1="4" y1="8" x2="4" y2="15" stroke="#78716c" stroke-width="0.8"/>
          <line x1="12" y1="8" x2="12" y2="15" stroke="#78716c" stroke-width="0.8"/>
          <line x1="20" y1="8" x2="20" y2="15" stroke="#78716c" stroke-width="0.8"/>
          <line x1="8" y1="15" x2="8" y2="23" stroke="#78716c" stroke-width="0.8"/>
          <line x1="16" y1="15" x2="16" y2="23" stroke="#78716c" stroke-width="0.8"/>
        </svg>
      </button>
      <button class={['tool-btn', routeTool === 'star' && 'active']} onclick={() => routeTool = 'star'}>
        <span class="star-icon">&#9733;</span>
      </button>
      <button class={['tool-btn', routeTool === 'arrow' && 'active']} onclick={() => { routeTool = 'arrow'; arrowStart = null; }} aria-label="Arrow">
        <span class="arrow-icon">&rarr;</span>
      </button>
      <button class={['tool-btn', routeTool === 'erase' && 'active']} onclick={() => routeTool = 'erase'}>
        <span class="erase-icon">&#10005;</span>
      </button>
      <button class="tool-btn clear-btn" onclick={clearBoard}>Clear</button>
    </div>
  {:else}
    <div class="toolbar">
      {#each ALL_PIECES as p}
        <button
          class={['tool-btn', posTool === p && 'active']}
          onclick={() => { posTool = p; }}
        >
          <img src="/pieces/{posColor}{p}.svg" alt={p} class="tool-icon" />
        </button>
      {/each}

      <span class="divider"></span>

      <button
        class={['tool-btn', 'color-toggle']}
        onclick={() => posColor = posColor === 'w' ? 'b' : 'w'}
        aria-label="Toggle piece color"
      >
        <span class="color-swatch" style="background: {posColor === 'w' ? '#fff' : '#333'}; border-color: {posColor === 'w' ? '#aaa' : '#666'}"></span>
        <span class="tool-text-sm">{posColor === 'w' ? 'White' : 'Black'}</span>
      </button>
      <button class={['tool-btn', posTool === 'arrow' && 'active']} onclick={() => { posTool = 'arrow'; arrowStart = null; }} aria-label="Arrow">
        <span class="arrow-icon">&rarr;</span>
      </button>
      <button class={['tool-btn', posTool === 'erase' && 'active']} onclick={() => posTool = 'erase'}>
        <span class="erase-icon">&#10005;</span>
      </button>
      <button class="tool-btn clear-btn" onclick={clearBoard}>Clear</button>
    </div>
  {/if}

  <!-- Arrow color picker (shown when arrow tool active) -->
  {#if (mode === 'route' && routeTool === 'arrow') || (mode === 'position' && posTool === 'arrow')}
    <div class="arrow-controls">
      <span class="arrow-hint">
        {arrowStart ? `Click destination for arrow from ${arrowStart}` : 'Click start square, then end square'}
      </span>
      <div class="arrow-colors">
        {#each ARROW_COLORS as c}
          <button
            class={['color-dot', arrowColor === c && 'color-dot-active']}
            style="background: {c}"
            onclick={() => arrowColor = c}
            aria-label="Arrow color {c}"
          ></button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Board -->
  <div class="board-area">
    <svg viewBox="-24 -2 {BOARD + 28} {BOARD + 24}" class="board-svg">
      {#each RANKS as rank, ri}
        <text x={-12} y={ri * SQ + SQ / 2 + 4} text-anchor="middle" font-size="14" fill="#888">{rank}</text>
      {/each}
      {#each FILES as file, fi}
        <text x={fi * SQ + SQ / 2} y={BOARD + 16} text-anchor="middle" font-size="14" fill="#888">{file}</text>
      {/each}

      {#each RANKS as rank, ri}
        {#each FILES as file, fi}
          {@const sq = `${file}${rank}` as SquareId}
          {@const isLight = (fi + ri) % 2 === 0}

          <g
            onclick={() => handleClick(sq)}
            onkeydown={() => {}}
            role="button"
            tabindex="-1"
            aria-label={sq}
            style="cursor: pointer"
          >
            <rect
              x={fi * SQ} y={ri * SQ}
              width={SQ} height={SQ}
              fill={isLight ? LIGHT : DARK}
            />

            {#if mode === 'route'}
              {@const isStudent = sq === studentSquare}
              {@const isObstacle = obstacles.includes(sq)}
              {@const isTarget = targets.includes(sq)}
              {@const isOnPath = solutionPath.has(sq) && !isStudent && !isTarget}

              {#if isOnPath}
                <rect x={fi * SQ} y={ri * SQ} width={SQ} height={SQ} fill="rgba(96, 165, 250, 0.3)" />
              {/if}

              {#if isTarget}
                <text
                  x={fi * SQ + SQ / 2} y={ri * SQ + SQ / 2 + 4}
                  text-anchor="middle" dominant-baseline="central"
                  font-size="48" fill="#fbbf24" class="no-select"
                >&#9733;</text>
              {/if}

              {#if isStudent}
                <image
                  href="/pieces/w{studentPiece}.svg"
                  x={fi * SQ + 8} y={ri * SQ + 8}
                  width={SQ - 16} height={SQ - 16}
                />
              {:else if isObstacle}
                {@const bx = fi * SQ + 12}
                {@const by = ri * SQ + 12}
                {@const bw = SQ - 24}
                {@const bh = SQ - 24}
                <rect x={bx} y={by} width={bw} height={bh} rx="4" fill="#a8a29e" stroke="#78716c" stroke-width="1.5"/>
                <line x1={bx} y1={by + bh * 0.33} x2={bx + bw} y2={by + bh * 0.33} stroke="#78716c" stroke-width="1"/>
                <line x1={bx} y1={by + bh * 0.66} x2={bx + bw} y2={by + bh * 0.66} stroke="#78716c" stroke-width="1"/>
                <line x1={bx + bw * 0.33} y1={by} x2={bx + bw * 0.33} y2={by + bh * 0.33} stroke="#78716c" stroke-width="1"/>
                <line x1={bx + bw * 0.66} y1={by} x2={bx + bw * 0.66} y2={by + bh * 0.33} stroke="#78716c" stroke-width="1"/>
                <line x1={bx + bw * 0.17} y1={by + bh * 0.33} x2={bx + bw * 0.17} y2={by + bh * 0.66} stroke="#78716c" stroke-width="1"/>
                <line x1={bx + bw * 0.5} y1={by + bh * 0.33} x2={bx + bw * 0.5} y2={by + bh * 0.66} stroke="#78716c" stroke-width="1"/>
                <line x1={bx + bw * 0.83} y1={by + bh * 0.33} x2={bx + bw * 0.83} y2={by + bh * 0.66} stroke="#78716c" stroke-width="1"/>
                <line x1={bx + bw * 0.33} y1={by + bh * 0.66} x2={bx + bw * 0.33} y2={by + bh} stroke="#78716c" stroke-width="1"/>
                <line x1={bx + bw * 0.66} y1={by + bh * 0.66} x2={bx + bw * 0.66} y2={by + bh} stroke="#78716c" stroke-width="1"/>
              {/if}

            {:else}
              {@const posPiece = positionPieces.get(sq)}
              {#if posPiece}
                <image
                  href="/pieces/{posPiece.color}{posPiece.piece}.svg"
                  x={fi * SQ + 8} y={ri * SQ + 8}
                  width={SQ - 16} height={SQ - 16}
                />
              {/if}
            {/if}
          </g>
        {/each}
      {/each}

      <!-- Arrow start highlight -->
      {#if arrowStart}
        {@const [asx, asy] = squareToCoords(arrowStart)}
        <rect
          x={asx * SQ} y={asy * SQ}
          width={SQ} height={SQ}
          fill="rgba(37, 99, 235, 0.3)"
          class="no-select"
        />
      {/if}

      <!-- Arrows -->
      {#each arrows as arrow}
        {@const a = getArrowPath(arrow)}
        <g class="no-select" opacity="0.75">
          <line
            x1={a.x1} y1={a.y1} x2={a.sx} y2={a.sy}
            stroke={a.color}
            stroke-width={a.shaftW}
            stroke-linecap="round"
          />
          <polygon
            points="{a.x2},{a.y2} {a.sx + a.px * a.hw},{a.sy + a.py * a.hw} {a.sx - a.px * a.hw},{a.sy - a.py * a.hw}"
            fill={a.color}
          />
        </g>
      {/each}
    </svg>
  </div>

  <!-- Arrow list -->
  {#if arrows.length > 0}
    <div class="arrow-list">
      <span class="arrow-list-label">Arrows:</span>
      {#each arrows as arrow, i}
        <span class="arrow-tag" style="border-color: {arrow.color}">
          <span class="arrow-tag-dot" style="background: {arrow.color}"></span>
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
          Solution: {routeResult.solution.join(' \u2192 ')} ({routeResult.moves} move{routeResult.moves !== 1 ? 's' : ''})
        </p>
        <p class="stars-text">
          Stars: 3\u2605 \u2264 {routeResult.moves} &nbsp; 2\u2605 \u2264 {routeResult.moves + 1} &nbsp; 1\u2605 \u2264 {routeResult.moves + 2}
        </p>
      {:else}
        <p class="error-text">No solution found \u2014 target is unreachable.</p>
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
        <button class="copy-btn" onclick={copyOutput}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
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
    font-size: 1.5rem;
    font-weight: bold;
  }

  .mode-toggle {
    display: flex;
    gap: 0;
    border-radius: 0.5rem;
    overflow: hidden;
    border: 1px solid var(--card-border);
    width: fit-content;
  }

  .mode-btn {
    padding: 0.5rem 1.25rem;
    border: none;
    background: var(--card-bg);
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: background 0.15s, color 0.15s;
  }

  .mode-btn:hover {
    background: var(--btn-hover);
  }

  .mode-btn.active {
    background: rgba(74, 222, 128, 0.15);
    color: var(--foreground);
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
    background: var(--card-border);
    margin: 0 0.25rem;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--foreground);
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .tool-btn:hover {
    background: var(--btn-hover);
  }

  .tool-btn.active {
    border-color: #4ade80;
    background: rgba(74, 222, 128, 0.15);
  }

  .tool-icon {
    width: 24px;
    height: 24px;
  }

  .tool-text-sm {
    font-size: 0.7rem;
  }

  .color-swatch {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    border: 1.5px solid;
  }

  .star-icon {
    font-size: 1.25rem;
    color: #fbbf24;
    line-height: 1;
  }

  .erase-icon {
    font-size: 1rem;
    color: #f87171;
    line-height: 1;
    font-weight: bold;
  }

  .arrow-icon {
    font-size: 1.25rem;
    line-height: 1;
    font-weight: bold;
  }

  .arrow-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .arrow-hint {
    font-style: italic;
  }

  .arrow-colors {
    display: flex;
    gap: 0.375rem;
  }

  .color-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    transition: border-color 0.15s;
  }

  .color-dot-active {
    border-color: var(--foreground);
  }

  .arrow-list {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.8rem;
  }

  .arrow-list-label {
    color: var(--text-muted);
  }

  .arrow-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid;
    background: var(--card-bg);
    font-family: monospace;
    font-size: 0.75rem;
  }

  .arrow-tag-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .arrow-tag-x {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.9rem;
    padding: 0 0.125rem;
    line-height: 1;
  }

  .arrow-tag-x:hover {
    color: #f87171;
  }

  .clear-btn {
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .board-area {
    display: flex;
    justify-content: center;
  }

  .board-svg {
    width: 100%;
    max-width: 520px;
  }

  .no-select {
    pointer-events: none;
    user-select: none;
  }

  .meta-row {
    display: flex;
    gap: 1rem;
  }

  .meta-label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    flex: 1;
  }

  .meta-input {
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    color: var(--foreground);
    font-family: monospace;
    font-size: 0.875rem;
  }

  .meta-input:focus {
    outline: none;
    border-color: rgba(255, 248, 230, 0.4);
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
    border: 1px solid var(--card-border);
    background: var(--card-bg);
  }

  .muted {
    color: var(--text-muted);
    font-size: 0.875rem;
  }

  .solution-text {
    font-family: monospace;
    font-size: 0.875rem;
  }

  .stars-text {
    font-size: 0.875rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .error-text {
    color: #f87171;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .output-section {
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    overflow: hidden;
  }

  .output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--card-border);
  }

  .output-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .copy-btn {
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    border: 1px solid var(--card-border);
    background: var(--btn-bg);
    color: var(--foreground);
    font-size: 0.75rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .copy-btn:hover {
    background: var(--btn-hover);
  }

  .output-code {
    padding: 1rem;
    font-size: 0.8125rem;
    line-height: 1.5;
    overflow-x: auto;
    margin: 0;
  }
</style>
