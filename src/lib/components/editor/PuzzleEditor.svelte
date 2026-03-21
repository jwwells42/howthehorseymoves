<script lang="ts">
  import { type SquareId, type PieceKind, type PieceColor, FILES, RANKS } from '$lib/logic/types';
  import { getValidMoves } from '$lib/logic/moves';
  import type { BoardState } from '$lib/logic/types';

  const LIGHT = '#d4c4a0';
  const DARK = '#7a9e6e';
  const SQ = 100;
  const BOARD = SQ * 8;

  const PIECE_LABELS: { kind: PieceKind; label: string }[] = [
    { kind: 'R', label: 'Rook' },
    { kind: 'B', label: 'Bishop' },
    { kind: 'Q', label: 'Queen' },
    { kind: 'K', label: 'King' },
    { kind: 'N', label: 'Knight' },
    { kind: 'P', label: 'Pawn' },
  ];

  type Tool = 'piece' | 'obstacle' | 'target' | 'erase';

  let pieceKind = $state<PieceKind>('R');
  let tool = $state<Tool>('piece');
  let studentSquare = $state<SquareId | null>(null);
  let obstacles = $state<SquareId[]>([]);
  let targets = $state<SquareId[]>([]);
  let puzzleId = $state('');
  let title = $state('');
  let copied = $state(false);

  /* ── Board state for BFS ────────────────────────── */

  function buildBoard(pieceSq: SquareId | null): BoardState {
    const pieces = new Map<SquareId, { piece: PieceKind; color: PieceColor }>();
    for (const obs of obstacles) {
      pieces.set(obs, { piece: 'P', color: 'w' });
    }
    if (pieceSq) {
      pieces.set(pieceSq, { piece: pieceKind, color: 'w' });
    }
    return { pieces, castlingRights: { K: false, Q: false, k: false, q: false }, enPassantSquare: undefined };
  }

  /* ── BFS solver ─────────────────────────────────── */

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

  /* ── Derived state ──────────────────────────────── */

  let result = $derived.by(() => {
    if (!studentSquare || targets.length === 0) return null;
    return solve(pieceKind, studentSquare, targets, obstacles);
  });

  let solutionPath = $derived(result ? new Set(result.solution) : new Set<SquareId>());

  let outputCode = $derived.by(() => {
    const setup = [];
    if (studentSquare) {
      setup.push(`    { piece: "${pieceKind}", color: "w", square: "${studentSquare}" }`);
    }
    for (const obs of obstacles) {
      setup.push(`    { piece: "P", color: "w", square: "${obs}" }`);
    }

    const id = puzzleId || `${pieceKind.toLowerCase()}-XX`;
    const t = title || '';
    const sol = result ? result.solution.map(s => `"${s}"`).join(', ') : '';
    const moves = result?.moves ?? 0;
    const three = moves;
    const two = moves + 1;
    const one = moves + 2;

    const tgtStr = targets.map(s => `"${s}"`).join(', ');

    const instruction = targets.length === 1
      ? `Reach the star${moves > 0 ? ` in ${moves} move${moves !== 1 ? 's' : ''}` : ''}!`
      : `Collect all the stars!`;

    return `{
  id: "${id}",
  piece: "${pieceKind}",
  title: "${t}",
  instruction: "${instruction}",
  setup: [
${setup.join(',\n')},
  ],
  targets: [${tgtStr}],
  solution: [${sol}],
  starThresholds: { three: ${three}, two: ${two}, one: ${one} },
},`;
  });

  /* ── Click handling ─────────────────────────────── */

  function handleClick(sq: SquareId) {
    if (tool === 'piece') {
      // Remove if there was an obstacle or target here
      obstacles = obstacles.filter(o => o !== sq);
      targets = targets.filter(t => t !== sq);
      studentSquare = sq;
    } else if (tool === 'obstacle') {
      if (sq === studentSquare) return;
      if (obstacles.includes(sq)) {
        obstacles = obstacles.filter(o => o !== sq);
      } else {
        targets = targets.filter(t => t !== sq);
        obstacles = [...obstacles, sq];
      }
    } else if (tool === 'target') {
      if (sq === studentSquare) return;
      if (targets.includes(sq)) {
        targets = targets.filter(t => t !== sq);
      } else {
        obstacles = obstacles.filter(o => o !== sq);
        targets = [...targets, sq];
      }
    } else if (tool === 'erase') {
      if (sq === studentSquare) studentSquare = null;
      obstacles = obstacles.filter(o => o !== sq);
      targets = targets.filter(t => t !== sq);
    }
  }

  function clearBoard() {
    studentSquare = null;
    obstacles = [];
    targets = [];
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(outputCode);
    copied = true;
    setTimeout(() => copied = false, 1500);
  }
</script>

<div class="editor">
  <h1 class="heading">Puzzle Editor</h1>

  <!-- Piece selector -->
  <div class="toolbar">
    <span class="toolbar-label">Piece:</span>
    {#each PIECE_LABELS as p}
      <button
        class={['tool-btn', pieceKind === p.kind && 'active']}
        onclick={() => { pieceKind = p.kind; }}
      >
        <img src="/pieces/w{p.kind}.svg" alt={p.label} class="tool-icon" />
      </button>
    {/each}
  </div>

  <!-- Tool selector -->
  <div class="toolbar">
    <span class="toolbar-label">Tool:</span>
    <button class={['tool-btn', tool === 'piece' && 'active']} onclick={() => tool = 'piece'}>
      <img src="/pieces/w{pieceKind}.svg" alt="Place piece" class="tool-icon" />
      <span class="tool-text">Piece</span>
    </button>
    <button class={['tool-btn', tool === 'obstacle' && 'active']} onclick={() => tool = 'obstacle'}>
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
      <span class="tool-text">Wall</span>
    </button>
    <button class={['tool-btn', tool === 'target' && 'active']} onclick={() => tool = 'target'}>
      <span class="star-icon">&#9733;</span>
      <span class="tool-text">Star</span>
    </button>
    <button class={['tool-btn', tool === 'erase' && 'active']} onclick={() => tool = 'erase'}>
      <span class="erase-icon">&#10005;</span>
      <span class="tool-text">Erase</span>
    </button>
    <button class="tool-btn clear-btn" onclick={clearBoard}>
      Clear
    </button>
  </div>

  <!-- Board -->
  <div class="board-area">
    <svg viewBox="-24 -2 {BOARD + 28} {BOARD + 24}" class="board-svg">
      <!-- Rank labels -->
      {#each RANKS as rank, ri}
        <text x={-12} y={ri * SQ + SQ / 2 + 4} text-anchor="middle" font-size="14" fill="#888">{rank}</text>
      {/each}
      <!-- File labels -->
      {#each FILES as file, fi}
        <text x={fi * SQ + SQ / 2} y={BOARD + 16} text-anchor="middle" font-size="14" fill="#888">{file}</text>
      {/each}

      {#each RANKS as rank, ri}
        {#each FILES as file, fi}
          {@const sq = `${file}${rank}` as SquareId}
          {@const isLight = (fi + ri) % 2 === 0}
          {@const isStudent = sq === studentSquare}
          {@const isObstacle = obstacles.includes(sq)}
          {@const isTarget = targets.includes(sq)}
          {@const isOnPath = solutionPath.has(sq) && !isStudent && !isTarget}

          <g
            onclick={() => handleClick(sq)}
            onkeydown={() => {}}
            role="button"
            tabindex="-1"
            aria-label={sq}
            style="cursor: pointer"
          >
            <!-- Square -->
            <rect
              x={fi * SQ} y={ri * SQ}
              width={SQ} height={SQ}
              fill={isLight ? LIGHT : DARK}
            />

            <!-- Solution path highlight -->
            {#if isOnPath}
              <rect
                x={fi * SQ} y={ri * SQ}
                width={SQ} height={SQ}
                fill="rgba(96, 165, 250, 0.3)"
              />
            {/if}

            <!-- Target star -->
            {#if isTarget}
              <text
                x={fi * SQ + SQ / 2}
                y={ri * SQ + SQ / 2 + 4}
                text-anchor="middle"
                dominant-baseline="central"
                font-size="48"
                fill="#fbbf24"
                class="no-select"
              >&#9733;</text>
            {/if}

            <!-- Pieces -->
            {#if isStudent}
              <image
                href="/pieces/w{pieceKind}.svg"
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
          </g>
        {/each}
      {/each}
    </svg>
  </div>

  <!-- Metadata -->
  <div class="meta-row">
    <label class="meta-label">
      ID
      <input type="text" bind:value={puzzleId} placeholder="rook-XX" class="meta-input" />
    </label>
    <label class="meta-label">
      Title
      <input type="text" bind:value={title} placeholder="Around the Wall" class="meta-input" />
    </label>
  </div>

  <!-- Solution info -->
  <div class="solution-info">
    {#if !studentSquare}
      <p class="muted">Place a piece to begin.</p>
    {:else if targets.length === 0}
      <p class="muted">Place at least one target star.</p>
    {:else if result}
      <p class="solution-text">
        Solution: {result.solution.join(' → ')} ({result.moves} move{result.moves !== 1 ? 's' : ''})
      </p>
      <p class="stars-text">
        Stars: 3★ ≤ {result.moves} &nbsp; 2★ ≤ {result.moves + 1} &nbsp; 1★ ≤ {result.moves + 2}
      </p>
    {:else}
      <p class="error-text">No solution found — target is unreachable.</p>
    {/if}
  </div>

  <!-- Output -->
  {#if studentSquare && targets.length > 0}
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

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .toolbar-label {
    font-size: 0.875rem;
    color: var(--text-muted);
    min-width: 3rem;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.375rem 0.625rem;
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

  .tool-text {
    font-size: 0.75rem;
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
