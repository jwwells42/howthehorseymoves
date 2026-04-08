<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import { parseGamePgn } from '$lib/logic/pgn';
  import type { GameNode } from '$lib/logic/pgn';
  import type { BoardState } from '$lib/logic/types';
  import type { Arrow } from '$lib/logic/pgn';

  interface Props {
    pgn: string;
    fen?: string;
    /** When true, don't render a board — call onBoardChange instead */
    noBoard?: boolean;
    /** Called when position changes (only used with noBoard) */
    onBoardChange?: (board: BoardState, arrows?: Arrow[]) => void;
    /** Flip the board (black on bottom) */
    flipped?: boolean;
  }
  let { pgn, fen, noBoard, onBoardChange, flipped }: Props = $props();

  let tree = $derived(parseGamePgn(pgn, fen));

  // Path-based navigation (same pattern as GameViewer)
  let currentPath = $state.raw<GameNode[]>([]);

  let board = $derived(
    currentPath.length > 0
      ? currentPath[currentPath.length - 1].boardAfter
      : tree.startBoard
  );

  let lastNode = $derived(
    currentPath.length > 0 ? currentPath[currentPath.length - 1] : null
  );
  let currentComment = $derived(
    currentPath.length === 0 ? tree.comment : lastNode?.comment
  );
  let currentArrows = $derived(lastNode?.arrows);

  // Notify parent when position changes (noBoard mode)
  $effect(() => {
    if (noBoard && onBoardChange) {
      onBoardChange(board, currentArrows);
    }
  });

  // Move list rendering (simplified from GameViewer)
  interface MoveListItem {
    kind: 'move';
    node: GameNode;
    path: GameNode[];
    moveNumber: number;
    isWhite: boolean;
  }

  interface VariationItem {
    kind: 'variation';
    nodes: { node: GameNode; path: GameNode[]; moveNumber: number; isWhite: boolean }[];
  }

  type ListItem = MoveListItem | VariationItem;

  interface MovePair {
    num: number;
    white: { node: GameNode; path: GameNode[] } | null;
    black: { node: GameNode; path: GameNode[] } | null;
    variationsAfterWhite: VariationItem[];
    variationsAfterBlack: VariationItem[];
  }

  function buildMoveList(
    children: GameNode[],
    parentPath: GameNode[],
    moveNumber: number,
    isWhite: boolean,
    items: ListItem[],
  ) {
    if (children.length === 0) return;

    const mainChild = children[0];
    const mainPath = [...parentPath, mainChild];

    items.push({
      kind: 'move',
      node: mainChild,
      path: mainPath,
      moveNumber,
      isWhite,
    });

    for (let v = 1; v < children.length; v++) {
      const varNodes: VariationItem['nodes'] = [];
      let varNode: GameNode | undefined = children[v];
      let varPath = [...parentPath];
      let varMoveNum = moveNumber;
      let varIsWhite = isWhite;

      while (varNode) {
        varPath = [...varPath, varNode];
        varNodes.push({
          node: varNode,
          path: [...varPath],
          moveNumber: varMoveNum,
          isWhite: varIsWhite,
        });
        if (!varIsWhite) varMoveNum++;
        varIsWhite = !varIsWhite;
        varNode = varNode.children[0];
      }

      items.push({ kind: 'variation', nodes: varNodes });
    }

    const nextMoveNum = isWhite ? moveNumber : moveNumber + 1;
    buildMoveList(mainChild.children, mainPath, nextMoveNum, !isWhite, items);
  }

  let moveListItems = $derived.by(() => {
    const items: ListItem[] = [];
    buildMoveList(tree.children, [], 1, true, items);
    return items;
  });

  let movePairs = $derived.by(() => {
    const pairs: MovePair[] = [];
    let currentPair: MovePair | null = null;
    const pendingVariations: VariationItem[] = [];

    for (const item of moveListItems) {
      if (item.kind === 'variation') {
        pendingVariations.push(item);
        continue;
      }

      if (item.isWhite) {
        if (pendingVariations.length > 0 && currentPair) {
          currentPair.variationsAfterBlack.push(...pendingVariations.splice(0));
        }
        currentPair = {
          num: item.moveNumber,
          white: { node: item.node, path: item.path },
          black: null,
          variationsAfterWhite: [],
          variationsAfterBlack: [],
        };
        pairs.push(currentPair);
        if (pendingVariations.length > 0) {
          const prevPair = pairs.length >= 2 ? pairs[pairs.length - 2] : null;
          if (prevPair) {
            prevPair.variationsAfterBlack.push(...pendingVariations.splice(0));
          } else {
            pendingVariations.length = 0;
          }
        }
      } else {
        if (!currentPair) {
          currentPair = {
            num: item.moveNumber,
            white: null,
            black: { node: item.node, path: item.path },
            variationsAfterWhite: [],
            variationsAfterBlack: [],
          };
          pairs.push(currentPair);
        } else {
          if (pendingVariations.length > 0) {
            currentPair.variationsAfterWhite.push(...pendingVariations.splice(0));
          }
          currentPair.black = { node: item.node, path: item.path };
        }
      }
    }

    if (pendingVariations.length > 0 && currentPair) {
      if (currentPair.black) {
        currentPair.variationsAfterBlack.push(...pendingVariations.splice(0));
      } else {
        currentPair.variationsAfterWhite.push(...pendingVariations.splice(0));
      }
    }

    return pairs;
  });

  function isActivePath(path: GameNode[]): boolean {
    if (path.length !== currentPath.length) return false;
    for (let i = 0; i < path.length; i++) {
      if (path[i] !== currentPath[i]) return false;
    }
    return true;
  }

  function goToNode(path: GameNode[]) {
    currentPath = path;
  }

  let canGoBack = $derived(currentPath.length > 0);
  let canGoForward = $derived(
    currentPath.length === 0
      ? tree.children.length > 0
      : (currentPath[currentPath.length - 1].children.length > 0)
  );

  function goToStart() {
    currentPath = [];
  }

  function goForward() {
    const next = currentPath.length === 0
      ? tree.children[0]
      : currentPath[currentPath.length - 1].children[0];
    if (next) {
      currentPath = [...currentPath, next];
    }
  }

  function goBack() {
    if (currentPath.length > 0) {
      currentPath = currentPath.slice(0, -1);
    }
  }

  function goToEnd() {
    let path = [...currentPath];
    let node = path.length > 0 ? path[path.length - 1] : null;
    let children = node ? node.children : tree.children;
    while (children.length > 0) {
      path.push(children[0]);
      children = children[0].children;
    }
    currentPath = path;
  }

  function formatVariationSan(vn: { node: GameNode; moveNumber: number; isWhite: boolean }): string {
    if (vn.isWhite) return `${vn.moveNumber}. ${vn.node.san}${vn.node.nag ?? ''}`;
    return `${vn.moveNumber}... ${vn.node.san}${vn.node.nag ?? ''}`;
  }
</script>

<svelte:window onkeydown={(e) => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
  if (e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
}} />

{#snippet navControls()}
  <div class="nav-controls">
    <button class="nav-btn" onclick={goToStart} disabled={!canGoBack} aria-label="Start">&#x23EE;</button>
    <button class="nav-btn" onclick={goBack} disabled={!canGoBack} aria-label="Back">&#x25C0;</button>
    <button class="nav-btn" onclick={goForward} disabled={!canGoForward} aria-label="Forward">&#x25B6;</button>
    <button class="nav-btn" onclick={goToEnd} disabled={!canGoForward} aria-label="End">&#x23ED;</button>
  </div>
{/snippet}

{#snippet moveGrid()}
  <div class="move-list">
    <div class="move-grid">
      {#each movePairs as pair}
        <span class="move-num">{pair.num}.</span>
        {#if pair.white}
          <button
            class={['move-btn', isActivePath(pair.white.path) && 'move-active']}
            onclick={() => goToNode(pair.white!.path)}
          >
            {pair.white.node.san}{pair.white.node.nag ?? ''}
          </button>
        {:else}
          <span></span>
        {/if}

        {#if pair.variationsAfterWhite.length > 0}
          {#if !pair.black}
            <span></span>
          {/if}
          {#each pair.variationsAfterWhite as variation}
            <span class="variation-row">({#each variation.nodes as vn, vi}{#if vi > 0}{' '}{/if}<button
              class={['var-move-btn', isActivePath(vn.path) && 'move-active']}
              onclick={() => goToNode(vn.path)}
            >{formatVariationSan(vn)}</button>{/each})</span>
          {/each}
        {/if}

        {#if pair.black}
          {#if pair.variationsAfterWhite.length > 0}
            <span class="move-num">{pair.num}.</span>
            <span class="move-ellipsis">...</span>
          {/if}
          <button
            class={['move-btn', isActivePath(pair.black.path) && 'move-active']}
            onclick={() => goToNode(pair.black!.path)}
          >
            {pair.black.node.san}{pair.black.node.nag ?? ''}
          </button>
        {:else if pair.variationsAfterWhite.length === 0}
          <span></span>
        {/if}

        {#if pair.variationsAfterBlack.length > 0}
          {#each pair.variationsAfterBlack as variation}
            <span class="variation-row">({#each variation.nodes as vn, vi}{#if vi > 0}{' '}{/if}<button
              class={['var-move-btn', isActivePath(vn.path) && 'move-active']}
              onclick={() => goToNode(vn.path)}
            >{formatVariationSan(vn)}</button>{/each})</span>
          {/each}
        {/if}
      {/each}
    </div>
  </div>
{/snippet}

{#if noBoard}
  <div class="panel-only">
    {@render navControls()}
    {#if currentComment}
      <p class="comment-text">{currentComment}</p>
    {/if}
    {@render moveGrid()}
  </div>
{:else}
  <div class="explorer">
    <div class="explorer-layout">
      <div class="board-area">
        <Board
          {board}
          selectedSquare={null}
          validMoves={[]}
          targets={[]}
          reachedTargets={[]}
          dragValidMoves={[]}
          onSquareClick={() => {}}
          onDrop={() => {}}
          onDragStart={() => {}}
          onDragEnd={() => {}}
          readOnly
          arrows={currentArrows}
          {flipped}
        />
      </div>

      <div class="panel">
        {@render navControls()}
        {#if currentComment}
          <p class="comment-text">{currentComment}</p>
        {/if}
        {@render moveGrid()}
      </div>
    </div>
  </div>
{/if}

<style>
  .panel-only {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    min-height: 0;
    flex: 1;
  }

  .explorer {
    width: 100%;
  }

  .explorer-layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
  }

  @media (min-width: 52rem) {
    .explorer-layout {
      flex-direction: row;
      align-items: flex-start;
      gap: 1rem;
    }
  }

  .board-area {
    width: 100%;
    max-width: 500px;
    flex-shrink: 0;
  }

  @media (min-width: 52rem) {
    .board-area {
      max-width: 400px;
    }
  }

  .panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-width: 0;
  }

  @media (min-width: 52rem) {
    .panel {
      flex: 1;
      max-width: 22rem;
    }
  }

  .nav-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .nav-btn {
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--btn-bg, #2a2a2a);
    color: inherit;
    border: none;
    cursor: pointer;
    font-size: 1.125rem;
    transition: background-color 0.15s;
  }
  .nav-btn:hover:not(:disabled) { background: var(--btn-hover, #3a3a3a); }
  .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .comment-text {
    font-size: 0.875rem;
    color: var(--text-muted);
    font-style: italic;
    text-align: center;
    padding: 0 0.5rem;
    margin: 0;
    max-width: 28rem;
  }

  .move-list {
    width: 100%;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border, #333);
    background: var(--card-bg, #1a1a1a);
    padding: 0.75rem;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .move-grid {
    display: grid;
    grid-template-columns: 2rem 1fr 1fr;
    column-gap: 0.25rem;
    row-gap: 0.125rem;
    font-size: 0.875rem;
  }

  .move-num {
    color: var(--text-faint);
    text-align: right;
  }

  .move-btn {
    text-align: left;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    cursor: pointer;
    background: none;
    border: none;
    color: inherit;
    font-size: inherit;
    transition: background-color 0.15s;
  }
  .move-btn:hover { background: var(--btn-bg); }

  .move-active {
    background: rgba(34, 197, 94, 0.35);
    font-weight: 700;
    border-radius: 0.25rem;
    outline: 1px solid rgba(34, 197, 94, 0.5);
  }

  .move-ellipsis {
    color: var(--text-faint);
    padding: 0.125rem 0.375rem;
  }

  .variation-row {
    grid-column: 1 / -1;
    font-size: 0.8rem;
    color: var(--text-muted);
    padding: 0.125rem 0.25rem 0.125rem 2.25rem;
  }

  .var-move-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: inherit;
    padding: 0.0625rem 0.125rem;
    border-radius: 0.125rem;
    transition: background-color 0.15s;
  }
  .var-move-btn:hover { background: var(--btn-bg); color: inherit; }
  .var-move-btn.move-active { background: rgba(34, 197, 94, 0.2); color: inherit; font-weight: 700; }
</style>
