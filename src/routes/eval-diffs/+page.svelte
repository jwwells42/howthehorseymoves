<script lang="ts">
  import { EVAL_DIFF_DATA } from '$lib/eval-diffs-data';
  import type { EvalDiffRow } from '$lib/eval-diffs-data';

  let selectedSpeeds = $state<Set<string>>(new Set(EVAL_DIFF_DATA.speeds));
  let selectedSides = $state<Set<string>>(new Set(EVAL_DIFF_DATA.sides));
  let selectedRatings = $state<Set<string>>(new Set(EVAL_DIFF_DATA.ratings));
  let selectedMoves = $state<Set<number>>(new Set(EVAL_DIFF_DATA.moves));
  let granularity = $state(0.01);

  function toggle<T>(set: Set<T>, val: T): Set<T> {
    const next = new Set(set);
    if (next.has(val)) next.delete(val); else next.add(val);
    return next;
  }

  function toggleAll<T>(set: Set<T>, all: T[]): Set<T> {
    return set.size === all.length ? new Set() : new Set(all);
  }

  function fmtEval(v: number, gran: number): string {
    if (gran >= 1) return v.toFixed(0);
    if (gran >= 0.1) return v.toFixed(1);
    return v.toFixed(2);
  }

  function parseBinBounds(bin: string): [number, number] {
    if (bin.endsWith('+')) return [parseFloat(bin), Infinity];
    const parts = bin.split(/[-–]/);
    return [parseFloat(parts[0]), parseFloat(parts[parts.length - 1])];
  }

  function rebinLabel(lower: number, gran: number): string {
    return fmtEval(lower, gran) + '–' + fmtEval(lower + gran, gran);
  }

  interface AggBin {
    pairs: number;
    better: number;
    worse: number;
    equal: number;
    lo: number;
  }

  let aggregated = $derived.by(() => {
    const agg: Record<string, AggBin> = {};
    const binKeys: string[] = [];
    let total = 0;

    for (const r of EVAL_DIFF_DATA.rows) {
      if (!selectedSpeeds.has(r.speed)) continue;
      if (!selectedSides.has(r.side)) continue;
      if (!selectedRatings.has(r.rating_bucket)) continue;
      if (!selectedMoves.has(r.move_number)) continue;

      const [lo, hi] = parseBinBounds(r.eval_diff_bin);
      const binWidth = hi - lo;
      const bucket = Math.floor((lo + 1e-9) / granularity) * granularity;

      let key: string;
      if (granularity <= 0.01) {
        key = r.eval_diff_bin;
      } else if (hi === Infinity) {
        key = fmtEval(bucket, granularity) + '+';
      } else if (binWidth > granularity + 1e-9) {
        key = r.eval_diff_bin;
      } else {
        key = rebinLabel(bucket, granularity);
      }

      if (!agg[key]) {
        agg[key] = { pairs: 0, better: 0, worse: 0, equal: 0, lo: bucket };
        binKeys.push(key);
      }
      const b = agg[key];
      b.pairs += r.pairs;
      b.better += r.better;
      b.worse += r.worse;
      b.equal += r.equal;
      total += r.pairs;
    }

    binKeys.sort((a, b) => agg[a].lo - agg[b].lo);
    return { agg, binKeys, total };
  });

  function fmtPct(count: number, total: number): string {
    if (total === 0) return '';
    return (count / total * 100).toFixed(1) + '%';
  }
</script>

<main class="page">
  <a href="/" class="back-link">&larr; Back to home</a>

  <h1>Do Eval Diffs Matter for Human Scores?</h1>
  <p class="subtitle">
    Methodology from <a href="https://qchess.net/HowDoEvalDiffsMatterForHumanScores" target="_blank" rel="noopener noreferrer">qchess.net</a>,
    applied to <a href="https://database.lichess.org/" target="_blank" rel="noopener noreferrer">Lichess</a> data
    + <a href="https://www.chessdb.cn/queryc_en/" target="_blank" rel="noopener noreferrer">chessdb.cn</a> evals
  </p>

  <p class="explainer">
    The table below shows the results from parsing all 56.7 million rated blitz, rapid, and classical
    games from the <a href="https://database.lichess.org/" target="_blank" rel="noopener noreferrer">Lichess open database</a>
    for March 2026, looking at moves 1–10, resulting in 43,594 positions and 1,281,577 move pairs.
    See <a href="https://qchess.net/HowDoEvalDiffsMatterForHumanScores" target="_blank" rel="noopener noreferrer">qchess.net</a>
    for the original research that inspired the current effort.
  </p>

  <div class="filters">
    <div class="filter-group">
      <h3>Speed <button class="toggle-btn" onclick={() => selectedSpeeds = toggleAll(selectedSpeeds, EVAL_DIFF_DATA.speeds)}>all/none</button></h3>
      <div class="checkboxes">
        {#each EVAL_DIFF_DATA.speeds as speed}
          <label class="cb">
            <input type="checkbox" checked={selectedSpeeds.has(speed)} onchange={() => selectedSpeeds = toggle(selectedSpeeds, speed)} />
            {speed}
          </label>
        {/each}
      </div>
    </div>

    <div class="filter-group">
      <h3>Side to Move <button class="toggle-btn" onclick={() => selectedSides = toggleAll(selectedSides, EVAL_DIFF_DATA.sides)}>all/none</button></h3>
      <div class="checkboxes">
        {#each EVAL_DIFF_DATA.sides as side}
          <label class="cb">
            <input type="checkbox" checked={selectedSides.has(side)} onchange={() => selectedSides = toggle(selectedSides, side)} />
            {side}
          </label>
        {/each}
      </div>
    </div>

    <div class="filter-group">
      <h3>Rating <button class="toggle-btn" onclick={() => selectedRatings = toggleAll(selectedRatings, EVAL_DIFF_DATA.ratings)}>all/none</button></h3>
      <div class="checkboxes">
        {#each EVAL_DIFF_DATA.ratings as rating}
          <label class="cb">
            <input type="checkbox" checked={selectedRatings.has(rating)} onchange={() => selectedRatings = toggle(selectedRatings, rating)} />
            {rating}
          </label>
        {/each}
      </div>
    </div>

    <div class="filter-group">
      <h3>Move <button class="toggle-btn" onclick={() => selectedMoves = toggleAll(selectedMoves, EVAL_DIFF_DATA.moves)}>all/none</button></h3>
      <div class="checkboxes">
        {#each EVAL_DIFF_DATA.moves as move}
          <label class="cb">
            <input type="checkbox" checked={selectedMoves.has(move)} onchange={() => selectedMoves = toggle(selectedMoves, move)} />
            Move {move}
          </label>
        {/each}
      </div>
    </div>

    <div class="filter-group">
      <h3>Eval Diff Granularity</h3>
      <div class="checkboxes">
        {#each [[0.01, 'Hundredths'], [0.1, 'Tenths'], [0.5, 'Halves'], [1, 'Whole']] as [val, label]}
          <label class="cb">
            <input type="radio" name="gran" checked={granularity === val} onchange={() => granularity = val as number} />
            {label}
          </label>
        {/each}
      </div>
    </div>
  </div>

  <p class="pair-count">{aggregated.total.toLocaleString()} pairs</p>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Eval Diff</th>
          <th class="num">Pairs</th>
          <th>Better Eval &rarr; Better Score</th>
          <th>Better Eval &rarr; Worse Score</th>
          <th class="num">Equal Score</th>
        </tr>
      </thead>
      <tbody>
        {#each aggregated.binKeys as key (key)}
          {@const b = aggregated.agg[key]}
          {@const betterPct = b.pairs > 0 ? b.better / b.pairs * 100 : 0}
          {@const worsePct = b.pairs > 0 ? b.worse / b.pairs * 100 : 0}
          <tr>
            <td>{key}</td>
            <td class="num">{b.pairs.toLocaleString()}</td>
            <td class="bar-cell">
              <span class="bar bar-better" style:width="{betterPct}%"></span>
              {b.better.toLocaleString()} <span class="pct">({fmtPct(b.better, b.pairs)})</span>
            </td>
            <td class="bar-cell">
              <span class="bar bar-worse" style:width="{worsePct}%"></span>
              {b.worse.toLocaleString()} <span class="pct">({fmtPct(b.worse, b.pairs)})</span>
            </td>
            <td class="num">
              {b.equal.toLocaleString()} <span class="pct">({fmtPct(b.equal, b.pairs)})</span>
            </td>
          </tr>
        {:else}
          <tr><td colspan="5" class="empty">No data for this selection</td></tr>
        {/each}
      </tbody>
    </table>
  </div>

  <section class="credits-section">
    <h2>Credits</h2>
    <div class="prose">
      <ul>
        <li><strong>Methodology:</strong> <a href="https://qchess.net/HowDoEvalDiffsMatterForHumanScores" target="_blank" rel="noopener noreferrer">qchess.net</a></li>
        <li><strong>Game data:</strong> <a href="https://database.lichess.org/" target="_blank" rel="noopener noreferrer">Lichess open database</a> (CC0)</li>
        <li><strong>Engine evals:</strong> <a href="https://www.chessdb.cn/queryc_en/" target="_blank" rel="noopener noreferrer">chessdb.cn</a> by <a href="https://github.com/noobpwnftw/chessdb" target="_blank" rel="noopener noreferrer">noobpwnftw</a></li>
        <li><strong>PGN parsing:</strong> <a href="https://crates.io/crates/pgn-reader" target="_blank" rel="noopener noreferrer">pgn-reader</a> &amp; <a href="https://crates.io/crates/shakmaty" target="_blank" rel="noopener noreferrer">shakmaty</a> by <a href="https://github.com/niklasf" target="_blank" rel="noopener noreferrer">niklasf</a></li>
        <li><strong>CDB API patterns:</strong> <a href="https://github.com/robertnurnberg/cdblib" target="_blank" rel="noopener noreferrer">cdblib</a> &amp; <a href="https://github.com/vondele/cdbexplore" target="_blank" rel="noopener noreferrer">cdbexplore</a></li>
      </ul>
    </div>
  </section>
</main>

<style>
  .page {
    min-height: 100vh;
    padding: 1.5rem;
    max-width: 60rem;
    margin: 0 auto;
  }
  .back-link {
    font-size: 0.875rem;
    color: var(--text-muted);
    display: inline-block;
    margin-bottom: 1.5rem;
  }
  .back-link:hover { color: var(--foreground); }

  h1 {
    font-size: 1.5rem;
    font-weight: bold;
    margin-bottom: 0.25rem;
  }
  .subtitle {
    color: var(--text-muted);
    font-size: 0.875rem;
    margin-bottom: 1.25rem;
  }
  .subtitle a { text-decoration: underline; }
  .subtitle a:hover { color: var(--foreground); }

  .explainer {
    margin-bottom: 1.25rem;
    font-size: 0.875rem;
    color: var(--text-muted);
    line-height: 1.6;
  }
  .explainer a { text-decoration: underline; }
  .explainer a:hover { color: var(--foreground); }

  .filters {
    display: flex;
    gap: 1.25rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
  .filter-group h3 {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .toggle-btn {
    font-size: 0.65rem;
    color: var(--text-faint);
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    text-decoration: underline;
  }
  .toggle-btn:hover { color: var(--foreground); }

  .checkboxes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.5rem;
  }
  .cb {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    cursor: pointer;
    font-size: 0.8rem;
    user-select: none;
    color: var(--text-muted);
  }
  .cb input { cursor: pointer; accent-color: var(--foreground); }

  .pair-count {
    color: var(--text-faint);
    font-size: 0.8rem;
    margin-bottom: 0.5rem;
  }

  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  th {
    background: var(--card-bg);
    text-align: left;
    padding: 0.5rem 0.625rem;
    border-bottom: 2px solid var(--card-border);
    font-weight: 600;
    white-space: nowrap;
    color: var(--foreground);
  }
  td {
    padding: 0.4rem 0.625rem;
    border-bottom: 1px solid var(--card-border);
    color: var(--text-muted);
  }
  tr:hover td { background: var(--btn-bg); }
  .num { text-align: right; font-variant-numeric: tabular-nums; }

  .bar-cell {
    position: relative;
  }
  .bar {
    position: absolute;
    top: 2px;
    bottom: 2px;
    left: 0;
    opacity: 0.2;
    border-radius: 2px;
    pointer-events: none;
  }
  .bar-better { background: #22a355; }
  .bar-worse { background: #d94040; }
  .pct { color: var(--text-faint); }
  .empty { text-align: center; padding: 2.5rem; color: var(--text-faint); }

  .credits-section {
    margin-top: 2.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--card-border);
  }
  .credits-section h2 {
    font-size: 1rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
  .prose {
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.6;
  }
  .prose ul {
    list-style: disc;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .prose a { text-decoration: underline; }
  .prose a:hover { color: var(--foreground); }
</style>
