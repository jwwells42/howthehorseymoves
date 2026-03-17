<script lang="ts">
  import { onMount } from 'svelte';
  import StarRating from '$lib/components/puzzle/StarRating.svelte';

  const PIECE_TYPES = ['Q', 'N', 'R', 'B'] as const;
  type PT = (typeof PIECE_TYPES)[number];
  const NAMES: Record<PT, string> = { Q: 'Queen', N: 'Knight', R: 'Rook', B: 'Bishop' };
  const SVGS: Record<PT, string> = {
    Q: '/pieces/wQ.svg', N: '/pieces/wN.svg', R: '/pieces/wR.svg', B: '/pieces/wB.svg',
  };

  interface Piece { type: PT; square: string }
  type GKey = `${PT}-${PT}`;
  interface MoveRecord { piece: PT; from: string; to: string }

  /* ── Square helpers ─────────────────────────────── */

  function sqFR(sq: string): [number, number] {
    return [sq.charCodeAt(0) - 97, parseInt(sq[1]) - 1];
  }
  function frSq(f: number, r: number): string {
    return String.fromCharCode(97 + f) + (r + 1);
  }

  /* ── Directions ─────────────────────────────────── */

  const DIAGS: [number, number][] = [[1,1],[1,-1],[-1,1],[-1,-1]];
  const LINES: [number, number][] = [[1,0],[-1,0],[0,1],[0,-1]];
  const ALL8: [number, number][] = [...DIAGS, ...LINES];
  const NJUMPS: [number, number][] = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];

  /* ── Attack logic ───────────────────────────────── */

  function slidingReaches(
    ff: number, fr: number, tf: number, tr: number,
    occ: Set<string>, dirs: [number, number][]
  ): boolean {
    for (const [df, dr] of dirs) {
      let f = ff + df, r = fr + dr;
      while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
        if (f === tf && r === tr) return true;
        if (occ.has(frSq(f, r))) break;
        f += df; r += dr;
      }
    }
    return false;
  }

  function doesAttack(pt: PT, from: string, to: string, pieces: Piece[]): boolean {
    if (from === to) return false;
    const [ff, fr] = sqFR(from);
    const [tf, tr] = sqFR(to);
    if (pt === 'N') {
      const df = Math.abs(ff - tf), dr = Math.abs(fr - tr);
      return (df === 1 && dr === 2) || (df === 2 && dr === 1);
    }
    const occ = new Set(pieces.map(p => p.square));
    return slidingReaches(ff, fr, tf, tr, occ, pt === 'B' ? DIAGS : pt === 'R' ? LINES : ALL8);
  }

  function getGuarding(pieces: Piece[]): Set<GKey> {
    const g = new Set<GKey>();
    for (const a of pieces)
      for (const b of pieces)
        if (a.type !== b.type && doesAttack(a.type, a.square, b.square, pieces))
          g.add(`${a.type}-${b.type}`);
    return g;
  }

  /* ── Move generation ────────────────────────────── */

  function pieceMoves(pt: PT, from: string, occ: Set<string>): string[] {
    const [ff, fr] = sqFR(from);
    if (pt === 'N') {
      return NJUMPS
        .map(([df, dr]) => [ff + df, fr + dr] as [number, number])
        .filter(([f, r]) => f >= 0 && f <= 7 && r >= 0 && r <= 7)
        .map(([f, r]) => frSq(f, r))
        .filter(sq => !occ.has(sq));
    }
    const dirs = pt === 'B' ? DIAGS : pt === 'R' ? LINES : ALL8;
    const moves: string[] = [];
    for (const [df, dr] of dirs) {
      let f = ff + df, r = fr + dr;
      while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
        const sq = frSq(f, r);
        if (occ.has(sq)) break;
        moves.push(sq);
        f += df; r += dr;
      }
    }
    return moves;
  }

  function pickMove(pieces: Piece[]): MoveRecord | null {
    const occ = new Set(pieces.map(p => p.square));
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    for (const i of order) {
      const moves = pieceMoves(pieces[i].type, pieces[i].square, occ);
      if (moves.length > 0) {
        const to = moves[Math.floor(Math.random() * moves.length)];
        return { piece: pieces[i].type, from: pieces[i].square, to };
      }
    }
    return null;
  }

  function randomPlacement(): Piece[] {
    const used = new Set<string>();
    return PIECE_TYPES.map(type => {
      let sq: string;
      do { sq = frSq(Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)); } while (used.has(sq));
      used.add(sq);
      return { type, square: sq };
    });
  }

  function getStars(streak: number): number {
    if (streak >= 5) return 3;
    if (streak >= 3) return 2;
    if (streak >= 1) return 1;
    return 0;
  }

  /* ── Board constants ────────────────────────────── */

  const SQ = 44;
  const BD = SQ * 8;
  const LT = '#d4c4a0';
  const DKC = '#7a9e6e';

  /* ── State ──────────────────────────────────────── */

  let phase = $state<'idle' | 'guessing' | 'feedback' | 'done'>('idle');
  let visible = $state<Piece[]>([]);
  let secret = $state<Piece[]>([]);
  let moves = $state<MoveRecord[]>([]);
  let selected = $state<Set<GKey>>(new Set());
  let answer = $state<Set<GKey>>(new Set());
  let streak = $state(0);
  let peakStreak = $state(0);
  let wasRight = $state(false);
  let best = $state(0);
  let bestStars = $state(0);

  onMount(() => {
    best = parseInt(localStorage.getItem('blindfold-guarding-best') ?? '0', 10);
    bestStars = parseInt(localStorage.getItem('blindfold-guarding-best-stars') ?? '0', 10);
  });

  function persistBest(s: number) {
    const stars = getStars(s);
    if (s > best) {
      localStorage.setItem('blindfold-guarding-best', String(s));
      best = s;
    }
    if (stars > bestStars) {
      localStorage.setItem('blindfold-guarding-best-stars', String(stars));
      bestStars = stars;
    }
  }

  function startGame() {
    const pieces = randomPlacement();
    visible = pieces;
    secret = pieces;
    moves = [];
    selected = new Set();
    answer = new Set();
    streak = 0;
    peakStreak = 0;
    phase = 'guessing';
  }

  function toggle(key: GKey) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    selected = next;
  }

  function check() {
    const correct = getGuarding(secret);
    answer = correct;
    const right = selected.size === correct.size && [...selected].every(k => correct.has(k));
    wasRight = right;
    if (right) {
      const s = streak + 1;
      streak = s;
      if (s > peakStreak) peakStreak = s;
      persistBest(s);
    } else {
      streak = 0;
    }
    phase = 'feedback';
  }

  function nextRound() {
    const move = pickMove(secret);
    if (!move) { startGame(); return; }
    const newSecret = secret.map(p => p.type === move.piece ? { ...p, square: move.to } : p);
    secret = newSecret;
    moves = [...moves, move];
    selected = new Set();
    answer = new Set();
    phase = 'guessing';
  }

  function giveUp() {
    phase = 'done';
  }

  let latestMove = $derived(moves.length > 0 ? moves[moves.length - 1] : null);
  let doneStars = $derived(getStars(peakStreak));

  function btnClass(key: GKey): string {
    const isSel = selected.has(key);
    const isAns = answer.has(key);
    const fb = phase === 'feedback';
    if (fb) {
      if (isSel && isAns) return 'guard-btn correct';
      if (isSel && !isAns) return 'guard-btn wrong';
      if (!isSel && isAns) return 'guard-btn missed';
      return 'guard-btn fb-default';
    }
    return isSel ? 'guard-btn selected' : 'guard-btn';
  }
</script>

<div class="guarding-game">
  {#if phase === 'idle'}
    <div class="idle-screen">
      <h2 class="title">Who's Guarding Whom?</h2>
      <p class="description">
        Four pieces are placed on the board. Identify which pieces guard which.
        Then pieces start moving — but the board stays frozen. Track positions in your head!
      </p>
      {#if best > 0}
        <div class="best-line">
          Best streak: {best}
          {#if bestStars > 0}
            <StarRating stars={bestStars} size="sm" />
          {/if}
        </div>
      {/if}
      <button class="action-btn" onclick={startGame}>Start</button>
    </div>

  {:else if phase === 'done'}
    <div class="done-screen">
      <h2 class="title">Game Over</h2>
      <p class="peak-streak">Best streak: {peakStreak}</p>
      {#if doneStars > 0}
        <StarRating stars={doneStars} size="lg" />
      {/if}
      {#if best > 0}
        <p class="best-text">All-time best: {best}</p>
      {/if}

      <!-- Actual positions board -->
      <div class="board-label">Actual positions</div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <svg viewBox="{-14} {-2} {BD + 28} {BD + 16}" class="board-svg">
        {#each Array(8) as _, i}
          <text x={-6} y={(7 - i) * SQ + SQ / 2 + 4}
            text-anchor="middle" font-size="9" fill="#888" class="label">{i + 1}</text>
        {/each}
        {#each Array(8) as _, i}
          <text x={i * SQ + SQ / 2} y={BD + 11}
            text-anchor="middle" font-size="9" fill="#888" class="label">{String.fromCharCode(97 + i)}</text>
        {/each}
        {#each Array(8) as _, row}
          {#each Array(8) as _, col}
            <rect x={col * SQ} y={row * SQ}
              width={SQ} height={SQ} fill={(col + row) % 2 === 0 ? LT : DKC} />
          {/each}
        {/each}
        {#each secret as p}
          {@const fr = sqFR(p.square)}
          <image href={SVGS[p.type]}
            x={fr[0] * SQ + 2} y={(7 - fr[1]) * SQ + 2}
            width={SQ - 4} height={SQ - 4} />
        {/each}
      </svg>

      {#if moves.length > 0}
        <div class="move-history">
          <p class="move-history-label">All moves:</p>
          <div class="move-list-wrap">
            {#each moves as m, i}
              <span class="move-entry">
                <span class="move-num">{i + 1}.</span>
                {NAMES[m.piece]} {m.from} &rarr; {m.to}
              </span>
            {/each}
          </div>
        </div>
      {/if}

      <button class="action-btn" onclick={startGame}>New Game</button>
    </div>

  {:else}
    <!-- guessing / feedback phases -->
    <div class="play-area">
      <div class="streak-bar">
        <span class="streak-label">Streak: <span class="streak-val">{streak}</span></span>
        {#if best > 0}
          <span class="streak-label">Best: {best}</span>
        {/if}
      </div>

      <div class="play-layout">
        <!-- Left: board + latest move -->
        <div class="board-col">
          {#if moves.length > 0}
            <div class="board-label">Board (original positions)</div>
          {/if}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <svg viewBox="{-14} {-2} {BD + 28} {BD + 16}" class="board-svg board-lg">
            {#each Array(8) as _, i}
              <text x={-6} y={(7 - i) * SQ + SQ / 2 + 4}
                text-anchor="middle" font-size="9" fill="#888" class="label">{i + 1}</text>
            {/each}
            {#each Array(8) as _, i}
              <text x={i * SQ + SQ / 2} y={BD + 11}
                text-anchor="middle" font-size="9" fill="#888" class="label">{String.fromCharCode(97 + i)}</text>
            {/each}
            {#each Array(8) as _, row}
              {#each Array(8) as _, col}
                <rect x={col * SQ} y={row * SQ}
                  width={SQ} height={SQ} fill={(col + row) % 2 === 0 ? LT : DKC} />
              {/each}
            {/each}
            {#each visible as p}
              {@const fr = sqFR(p.square)}
              <image href={SVGS[p.type]}
                x={fr[0] * SQ + 2} y={(7 - fr[1]) * SQ + 2}
                width={SQ - 4} height={SQ - 4} />
            {/each}
          </svg>

          {#if latestMove}
            <div class="latest-move">
              <span class="latest-move-text">
                <span class="move-num">Move {moves.length}:</span>
                <span class="move-bold">{NAMES[latestMove.piece]} {latestMove.from} &rarr; {latestMove.to}</span>
              </span>
            </div>
          {/if}
        </div>

        <!-- Right: guarding selector + buttons -->
        <div class="selector-col">
          <div class="selector-area">
            <p class="selector-prompt">
              {moves.length === 0 ? 'Which pieces guard which?' : 'Now who guards whom?'}
            </p>
            <div class="selector-rows">
              {#each PIECE_TYPES as from}
                <div class="selector-row">
                  <div class="piece-label">
                    <img src={SVGS[from]} alt={NAMES[from]} class="piece-icon" />
                    <span class="arrow-icon">&rarr;</span>
                  </div>
                  <div class="target-btns">
                    {#each PIECE_TYPES.filter(to => to !== from) as to}
                      {@const key = `${from}-${to}` as GKey}
                      <button
                        class={btnClass(key)}
                        onclick={() => phase === 'guessing' && toggle(key)}
                        disabled={phase === 'feedback'}
                      >
                        {NAMES[to]}
                      </button>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>

          {#if phase === 'guessing'}
            <div class="action-row">
              <button class="action-btn" onclick={check}>Check</button>
              {#if moves.length > 0}
                <button class="give-up-btn" onclick={giveUp}>Give up</button>
              {/if}
            </div>
          {/if}

          {#if phase === 'feedback'}
            <div class="feedback-area">
              <p class={wasRight ? 'fb-correct' : 'fb-wrong'}>
                {wasRight ? 'Correct!' : 'Not quite \u2014 check the highlights'}
              </p>
              <div class="action-row">
                <button class="action-btn" onclick={nextRound}>Next Move</button>
                <button class="give-up-btn" onclick={giveUp}>Give up</button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .guarding-game {
    max-width: 28rem;
    margin: 0 auto;
  }

  @media (min-width: 640px) {
    .guarding-game {
      max-width: 64rem;
    }
  }

  .idle-screen,
  .done-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 28rem;
    margin: 0 auto;
    text-align: center;
  }

  .title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
  }

  .description {
    color: var(--text-muted);
    margin: 0;
  }

  .best-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-faint);
  }

  .peak-streak {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }

  .best-text {
    font-size: 0.875rem;
    color: var(--text-faint);
    margin: 0;
  }

  .action-btn {
    padding: 0.625rem 2rem;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 700;
    font-size: 1.125rem;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .action-btn:hover {
    background: #15803d;
  }

  .give-up-btn {
    background: none;
    border: none;
    font-size: 0.875rem;
    color: var(--text-faint);
    cursor: pointer;
    transition: color 0.15s;
  }

  .give-up-btn:hover {
    color: var(--foreground);
  }

  /* Board SVG */
  .board-svg {
    width: 100%;
    max-width: 300px;
  }

  .board-lg {
    max-width: 300px;
  }

  @media (min-width: 640px) {
    .board-lg {
      max-width: 480px;
    }
  }

  .board-label {
    font-size: 0.75rem;
    color: var(--text-faint);
    margin-bottom: 0.25rem;
    text-align: center;
  }

  .label {
    pointer-events: none;
    user-select: none;
  }

  /* Play area */
  .play-area {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .streak-bar {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 0.875rem;
  }

  .streak-label {
    color: var(--text-faint);
  }

  .streak-val {
    font-weight: 700;
    color: var(--foreground);
  }

  .play-layout {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }

  @media (min-width: 640px) {
    .play-layout {
      flex-direction: row;
      gap: 2rem;
      align-items: flex-start;
    }
  }

  .board-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
    width: 100%;
  }

  @media (min-width: 640px) {
    .board-col {
      width: 480px;
    }
  }

  .latest-move {
    width: 100%;
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    text-align: center;
  }

  .latest-move-text {
    font-family: monospace;
    font-size: 0.875rem;
  }

  @media (min-width: 640px) {
    .latest-move-text {
      font-size: 1rem;
    }
  }

  .move-num {
    color: var(--text-faint);
  }

  .move-bold {
    font-weight: 700;
  }

  /* Selector column */
  .selector-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
  }

  @media (min-width: 640px) {
    .selector-col {
      align-items: flex-start;
    }
  }

  .selector-area {
    width: 100%;
  }

  .selector-prompt {
    font-size: 0.875rem;
    font-weight: 500;
    margin: 0 0 0.75rem;
  }

  @media (min-width: 640px) {
    .selector-prompt {
      font-size: 1rem;
    }
  }

  .selector-rows {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .selector-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .piece-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    width: 52px;
    flex-shrink: 0;
  }

  @media (min-width: 640px) {
    .piece-label {
      width: 60px;
    }
  }

  .piece-icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  @media (min-width: 640px) {
    .piece-icon {
      width: 1.75rem;
      height: 1.75rem;
    }
  }

  .arrow-icon {
    font-size: 0.75rem;
    color: var(--text-faint);
  }

  .target-btns {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  @media (min-width: 640px) {
    .target-btns {
      gap: 0.5rem;
    }
  }

  .guard-btn {
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
    border: 1px solid var(--card-border);
    color: var(--text-muted);
    background: transparent;
    cursor: pointer;
    transition: border-color 0.15s, background-color 0.15s;
  }

  @media (min-width: 640px) {
    .guard-btn {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
    }
  }

  .guard-btn:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.3);
  }

  .guard-btn.selected {
    background: rgba(37, 99, 235, 0.3);
    border-color: #3b82f6;
    color: #93c5fd;
  }

  .guard-btn.correct {
    background: rgba(22, 163, 74, 0.3);
    border-color: #22c55e;
    color: #86efac;
  }

  .guard-btn.wrong {
    background: rgba(220, 38, 38, 0.3);
    border-color: #ef4444;
    color: #fca5a5;
    text-decoration: line-through;
  }

  .guard-btn.missed {
    background: rgba(245, 158, 11, 0.2);
    border-color: #f59e0b;
    color: #fdba74;
  }

  .guard-btn.fb-default {
    border-color: var(--card-border);
    color: var(--text-faint);
    opacity: 0.4;
  }

  .action-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .feedback-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  @media (min-width: 640px) {
    .feedback-area {
      align-items: flex-start;
    }
  }

  .fb-correct {
    color: #4ade80;
    font-weight: 700;
    margin: 0;
  }

  .fb-wrong {
    color: #f87171;
    font-weight: 700;
    margin: 0;
  }

  /* Move history (done screen) */
  .move-history {
    width: 100%;
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border);
    background: var(--card-bg);
    text-align: left;
  }

  .move-history-label {
    font-size: 0.75rem;
    color: var(--text-faint);
    margin: 0 0 0.375rem;
    font-weight: 500;
  }

  .move-list-wrap {
    display: flex;
    flex-wrap: wrap;
    column-gap: 1rem;
    row-gap: 0.25rem;
  }

  .move-entry {
    font-size: 0.875rem;
    font-family: monospace;
  }
</style>
