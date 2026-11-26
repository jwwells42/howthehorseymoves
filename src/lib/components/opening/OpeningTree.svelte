<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import MoveNav from '$lib/components/board/MoveNav.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { MARK, highlight } from '$lib/board-marks';
  import type { BoardState } from '$lib/logic/types';
  import {
    type BranchRow,
    type Opening,
    type OpeningLine,
    type TreeNode,
    branchRows,
    joinText,
    lineTo,
    movePrefix,
    plays,
    treePath,
  } from '$lib/openings';
  import { type MoveProgress, KNOWN, NEW, stateOf } from '$lib/openings/progress';

  /**
   * Explore: the whole repertoire as a tree beside the board. Each row is
   * the moves from one branch point to the next, folded under the row it
   * leaves; a move shows its position on the board. A line that stops where
   * it transposes ends in ⇄ and the move order it joins, which goes there.
   */

  interface Props {
    opening: Opening;
    startBoard: BoardState;
    lines: OpeningLine[];
    progress: MoveProgress;
    onExit: () => void;
  }

  let { opening, startBoard, lines, progress, onExit }: Props = $props();

  let flipped = $derived(opening.color === 'b');
  let tree = $derived(branchRows(lines));

  // The move on the board (none: the starting position)
  let selected = $state.raw<TreeNode | null>(null);
  // It opens on the first rows, with the rows under them folded
  function firstRows() { return new Set<BranchRow>(tree.rows); }
  let open = $state.raw(firstRows());

  let board = $derived(selected ? selected.move.boardAfter : startBoard);
  let arrows = $derived(selected?.move.arrows);
  let highlights = $derived(selected ? highlight([selected.move.from, selected.move.to], MARK.note) : []);
  let comment = $derived(selected?.move.comment);
  let nextMoves = $derived(selected ? selected.children : tree.roots);

  function select(node: TreeNode | null) {
    selected = node;
    if (!node) return;
    // Its row and the rows above it open, so it can be seen
    const next = new Set(open);
    for (let row = tree.rowOf.get(node) ?? null; row; row = row.parent) next.add(row);
    open = next;
  }

  function toggle(row: BranchRow) {
    const next = new Set(open);
    if (next.has(row)) next.delete(row);
    else next.add(row);
    open = next;
  }

  // Forward takes the first branch
  function forward() {
    if (nextMoves.length > 0) select(nextMoves[0]);
  }

  function toEnd() {
    let node = selected ?? tree.roots[0] ?? null;
    while (node && node.children.length > 0) node = node.children[0];
    select(node);
  }

  // A transposition goes to the move order it joins: the same position
  function goToJoin(join: OpeningLine) {
    select(treePath(tree, join).at(-1) ?? null);
  }

  function rowLabel(row: BranchRow) {
    return row.nodes.map((n, k) => movePrefix(n.ply, k === 0) + n.move.san).join(' ');
  }

  // How much of each branch is learned: the student's moves in its row and in every row under it
  type BranchState = 'known' | 'some' | 'none' | 'empty';
  let branchStates = $derived.by(() => {
    const states = new Map<BranchRow, BranchState>();
    function visit(row: BranchRow): { total: number; known: number; started: number } {
      let total = 0;
      let known = 0;
      let started = 0;
      for (const node of row.nodes) {
        if (!plays(opening.color, node.move)) continue;
        const state = stateOf(progress, node.move.key);
        total++;
        if (state >= KNOWN) known++;
        if (state !== NEW) started++;
      }
      for (const sub of row.rows) {
        const c = visit(sub);
        total += c.total;
        known += c.known;
        started += c.started;
      }
      states.set(row, total === 0 ? 'empty' : known === total ? 'known' : started > 0 ? 'some' : 'none');
      return { total, known, started };
    }
    tree.rows.forEach(visit);
    return states;
  });

  function handleKeydown(e: KeyboardEvent) {
    if ((e.target as HTMLElement | null)?.closest('input,textarea')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (selected) select(selected.parent);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      forward();
    }
  }

  // Keep the move on the board in view in the tree
  let treeEl = $state<HTMLDivElement | null>(null);
  $effect(() => {
    void selected;
    void open;
    if (!treeEl) return;
    const active = treeEl.querySelector("[data-active='true']") as HTMLElement | null;
    if (!active) return;
    const box = treeEl.getBoundingClientRect();
    const at = active.getBoundingClientRect();
    if (at.top < box.top) treeEl.scrollTop -= box.top - at.top;
    else if (at.bottom > box.bottom) treeEl.scrollTop += at.bottom - box.bottom;
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet branch(row: BranchRow)}
  {@const isOpen = open.has(row)}
  <li>
    <div class="row">
      {#if row.rows.length > 0}
        <button class="fold" aria-expanded={isOpen} aria-label={rowLabel(row)} onclick={() => toggle(row)}>
          {isOpen ? '▾' : '▸'}
        </button>
      {:else}
        <span class="fold"></span>
      {/if}
      <span class={['line-dot', branchStates.get(row)]} aria-hidden="true"></span>
      <span class="moves">
        {#each row.nodes as node, k (node)}
          <button
            class={['move-btn', node === selected && 'move-active']}
            data-active={node === selected}
            onclick={() => select(node)}
          >{movePrefix(node.ply, k === 0)}{node.move.san}{node.move.nag ?? ''}</button>
        {/each}
        {#if row.joins}
          {@const join = row.joins}
          <button class="join" onclick={() => goToJoin(join)}>{joinText(lineTo(row.nodes[row.nodes.length - 1]))}</button>
        {/if}
      </span>
    </div>
    {#if isOpen && row.rows.length > 0}
      <ul class="rows">
        {#each row.rows as sub (sub)}
          {@render branch(sub)}
        {/each}
      </ul>
    {/if}
  </li>
{/snippet}

<BoardLayout>
  {#snippet headerArea()}
    <h2 class="tree-title">{opening.name}</h2>
  {/snippet}

  {#snippet boardArea()}
    <Board {board} readOnly {arrows} {highlights} {flipped} label={opening.name} />
  {/snippet}

  {#snippet sidebarArea()}
    <MoveNav
      canGoBack={selected !== null}
      canGoForward={nextMoves.length > 0}
      onStart={() => select(null)}
      onBack={() => selected && select(selected.parent)}
      onForward={forward}
      onEnd={toEnd}
    />

    <div class="tree" bind:this={treeEl}>
      <ul class="rows top">
        {#each tree.rows as row (row)}
          {@render branch(row)}
        {/each}
      </ul>
    </div>

    <!-- Under the tree, so the tree doesn't move when a comment comes and goes -->
    {#if comment}
      <div class="comment-area">
        <p class="comment-text">{comment}</p>
      </div>
    {/if}

    <div class="tree-footer">
      <Button onclick={onExit}>&larr; Setup</Button>
    </div>
  {/snippet}
</BoardLayout>

<style>
  .tree-title {
    width: 100%;
    text-align: center;
    font-size: var(--size-secondary);
    font-weight: var(--weight-strong);
  }

  .tree {
    width: 100%;
    border-radius: 0.5rem;
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 0.5rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    font-size: var(--size-secondary);
  }

  .rows {
    list-style: none;
    margin: 0;
    padding: 0 0 0 0.75rem;
  }

  .rows.top {
    padding-left: 0;
  }

  .row {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
    padding: 0.125rem 0;
  }

  .fold {
    flex: 0 0 1.25rem;
    background: none;
    border: none;
    padding: 0;
    color: var(--ink-muted);
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
  }

  .fold:hover {
    color: var(--ink);
  }

  /* A branch's progress: filled = every move known, pale = some learned.
     Beside the row's first line, however many lines its moves wrap onto. */
  .line-dot {
    flex-shrink: 0;
    align-self: flex-start;
    margin-top: 0.4rem;
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
    border: 2px solid var(--line);
  }

  .line-dot.some {
    border-color: var(--correct);
    background: var(--correct-tint);
  }

  .line-dot.known {
    border-color: var(--correct);
    background: var(--correct);
  }

  /* No move of the student's in it */
  .line-dot.empty {
    visibility: hidden;
  }

  .moves {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 0.125rem;
    min-width: 0;
  }

  .move-btn {
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    cursor: pointer;
    background: none;
    border: none;
    color: var(--ink);
    font-family: inherit;
    font-size: inherit;
    transition: background-color 0.15s;
  }

  .move-btn:hover {
    background: var(--surface-raised);
  }

  .move-btn.move-active {
    background: var(--line);
    font-weight: var(--weight-strong);
  }

  .join {
    margin-left: 0.25rem;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    cursor: pointer;
    background: var(--surface-raised);
    border: 1px solid var(--line);
    color: var(--ink);
    font-family: inherit;
    font-size: inherit;
  }

  .join:hover {
    background: var(--line);
  }

  .comment-area {
    width: 100%;
    max-height: 6rem;
    overflow-y: auto;
    border-radius: 0.5rem;
    border: 1px solid var(--line);
    background: var(--surface);
    padding: 0.5rem 0.75rem;
    flex-shrink: 0;
  }

  .comment-text {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    text-align: center;
    margin: 0;
    line-height: 1.5;
  }

  .tree-footer {
    display: flex;
    justify-content: flex-end;
    width: 100%;
    flex-shrink: 0;
  }
</style>
