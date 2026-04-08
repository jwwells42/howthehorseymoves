<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import { parseGamePgn, extractMainLine } from '$lib/logic/pgn';
  import { getLegalMoves } from '$lib/logic/attacks';
  import { playSound } from '$lib/state/sound';
  import type { ModelGame } from '$lib/games/types';
  import type { SquareId, PieceColor, PieceKind, BoardState } from '$lib/logic/types';
  import type { Arrow, GameNode } from '$lib/logic/pgn';

  const AUTOPLAY_MS = 1200;

  let { game }: { game: ModelGame } = $props();

  let tree = $derived(parseGamePgn(game.pgn));
  let flatParsed = $derived(extractMainLine(tree));
  let totalMoves = $derived(flatParsed.moves.length);

  // === Viewer state — path-based navigation ===
  // $state.raw avoids deep proxying — needed so GameNode reference equality
  // works for isActivePath/isOnCurrentPath comparisons with movePairs paths.
  let currentPath = $state.raw<GameNode[]>([]);
  let isPlaying = $state(false);
  let pauseOnVariations = $state(false);

  // Current position derived from path
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

  // === Test mode state ===
  let testMode = $state(false);
  let testMoveIdx = $state(0);       // frontier: how far student has gotten
  let testViewIdx = $state(0);       // what position is displayed (0..testMoveIdx)
  let testSelected = $state<SquareId | null>(null);
  let testHintArrow = $state<Arrow | null>(null);
  let testComplete = $state(false);
  let testDragFrom = $state<SquareId | null>(null);
  let testAtFrontier = $derived(testViewIdx === testMoveIdx);

  // === Exploration ("what if") state ===
  let exploring = $state(false);
  let exploreStack = $state<{ board: BoardState; from: SquareId; to: SquareId; san: string }[]>([]);
  let viewerSelected = $state<SquareId | null>(null);
  let viewerDragFrom = $state<SquareId | null>(null);

  let displayBoard = $derived(
    exploring && exploreStack.length > 0
      ? exploreStack[exploreStack.length - 1].board
      : board
  );

  let viewerColorToMove = $derived.by((): PieceColor => {
    const totalMoves = currentPath.length + exploreStack.length;
    return totalMoves % 2 === 0 ? 'w' : 'b';
  });

  let viewerValidMoves = $derived.by(() => {
    if (!viewerSelected || testMode) return [];
    return getLegalMoves(viewerSelected, displayBoard, viewerColorToMove);
  });

  let viewerDragMoves = $derived.by(() => {
    if (!viewerDragFrom || testMode) return [];
    return getLegalMoves(viewerDragFrom, displayBoard, viewerColorToMove);
  });

  let moveListEl = $state<HTMLDivElement | undefined>(undefined);

  let testBoard = $derived(testMode ? flatParsed.positions[testViewIdx] : board);
  let testColorToMove: PieceColor = $derived(testMoveIdx % 2 === 0 ? 'w' : 'b');

  let testValidMoves = $derived.by(() => {
    if (!testMode || !testAtFrontier || !testSelected || testComplete) return [];
    return getLegalMoves(testSelected, flatParsed.positions[testMoveIdx], testColorToMove);
  });

  let testDragMoves = $derived.by(() => {
    if (!testMode || !testAtFrontier || !testDragFrom || testComplete) return [];
    return getLegalMoves(testDragFrom, flatParsed.positions[testMoveIdx], testColorToMove);
  });

  let testStatusText = $derived.by(() => {
    if (testComplete) return 'You did it! You reproduced the entire game.';
    if (!testAtFrontier) {
      const viewNum = Math.floor(testViewIdx / 2) + 1;
      const isWhite = testViewIdx % 2 === 0;
      return `Reviewing move ${viewNum}${isWhite ? '.' : '...'}`;
    }
    const moveNum = Math.floor(testMoveIdx / 2) + 1;
    const isWhiteTurn = testMoveIdx % 2 === 0;
    return `Move ${moveNum}${isWhiteTurn ? '.' : '...'} ${isWhiteTurn ? 'White' : 'Black'} to play`;
  });

  let testArrows = $derived(testHintArrow && testAtFrontier ? [testHintArrow] : undefined);

  // === Navigation ===
  function exitExplore() {
    exploring = false;
    exploreStack = [];
    viewerSelected = null;
    viewerDragFrom = null;

  }

  function goForward() {
    if (testMode) {
      if (testViewIdx < testMoveIdx) {
        testViewIdx++;
        testSelected = null;
        testHintArrow = null;
      }
      return;
    }
    if (exploring) return;

    const parent = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
    const children = parent ? parent.children : tree.children;
    if (children.length > 0) {
      currentPath = [...currentPath, children[0]];
    }
  }

  function goBack() {
    if (testMode) {
      if (testViewIdx > 0) {
        testViewIdx--;
        testSelected = null;
        testHintArrow = null;
      }
      return;
    }

    if (exploring) {
      exploreStack = exploreStack.slice(0, -1);
      viewerSelected = null;
      if (exploreStack.length === 0) exploring = false;
      return;
    }
    if (currentPath.length > 0) {
      currentPath = currentPath.slice(0, -1);
    }
  }

  function goToStart() {
    if (testMode) {
      testViewIdx = 0;
      testSelected = null;
      testHintArrow = null;
      return;
    }
    exitExplore();
    currentPath = [];
  }

  function goToEnd() {
    if (testMode) {
      testViewIdx = testMoveIdx;
      testSelected = null;
      testHintArrow = null;
      return;
    }
    exitExplore();
    let path = [...currentPath];
    let node = path.length > 0 ? path[path.length - 1] : null;
    let children = node ? node.children : tree.children;
    while (children.length > 0) {
      path.push(children[0]);
      children = children[0].children;
    }
    currentPath = path;
  }

  function goToNode(path: GameNode[]) {
    exitExplore();
    currentPath = path;
  }

  function togglePlay() {
    isPlaying = !isPlaying;
  }

  let canGoForward = $derived.by(() => {
    if (testMode) return testViewIdx < testMoveIdx;
    if (exploring) return false;
    const parent = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
    const children = parent ? parent.children : tree.children;
    return children.length > 0;
  });

  let canGoBack = $derived.by(() => {
    if (testMode) return testViewIdx > 0;
    return exploring || currentPath.length > 0;
  });

  // === Auto-play ===
  $effect(() => {
    // Read currentPath so the effect re-runs after each goForward()
    const pathLen = currentPath.length;
    if (testMode) return;
    if (!isPlaying || !canGoForward) {
      if (!canGoForward) isPlaying = false;
      return;
    }
    // Check if we should pause at variations
    const parent = pathLen > 0 ? currentPath[pathLen - 1] : null;
    const children = parent ? parent.children : tree.children;
    if (pauseOnVariations && children.length > 1) {
      isPlaying = false;
      return;
    }
    const timer = setTimeout(() => {
      goForward();
    }, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  });

  // === Keyboard controls ===
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && exploring) { e.preventDefault(); exitExplore(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goForward(); }
    else if (e.key === ' ' && !testMode) { e.preventDefault(); togglePlay(); }
  }

  // === Scroll current move into view ===
  $effect(() => {
    if (testMode) return;
    void currentPath;
    if (!moveListEl) return;
    const highlighted = moveListEl.querySelector("[data-active='true']") as HTMLElement | null;
    if (!highlighted) return;
    const top = highlighted.offsetTop - moveListEl.offsetTop;
    const bottom = top + highlighted.offsetHeight;
    if (top < moveListEl.scrollTop) {
      moveListEl.scrollTop = top;
    } else if (bottom > moveListEl.scrollTop + moveListEl.clientHeight) {
      moveListEl.scrollTop = bottom - moveListEl.clientHeight;
    }
  });

  // === Move list rendering ===
  // We need a structure that can render main line in the grid and variations inline.
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

  let moveListItems = $derived.by(() => {
    const items: ListItem[] = [];
    buildMoveList(tree.children, [], 1, true, items, false);
    return items;
  });

  function buildMoveList(
    children: GameNode[],
    parentPath: GameNode[],
    moveNumber: number,
    isWhite: boolean,
    items: ListItem[],
    _isVariation: boolean,
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

    // Variations (children[1+])
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

    // Continue main line
    const nextMoveNum = isWhite ? moveNumber : moveNumber + 1;
    buildMoveList(mainChild.children, mainPath, nextMoveNum, !isWhite, items, _isVariation);
  }

  // Check if a node path matches currentPath
  function isActivePath(path: GameNode[]): boolean {
    if (path.length !== currentPath.length) return false;
    for (let i = 0; i < path.length; i++) {
      if (path[i] !== currentPath[i]) return false;
    }
    return true;
  }

  // Find which move pair / side the explore branches from
  let exploreBranchKey = $derived.by((): { pairIdx: number; side: 'white' | 'black' } | null => {
    if (!exploring || exploreStack.length === 0) return null;
    for (let i = 0; i < movePairs.length; i++) {
      const pair = movePairs[i];
      if (pair.white && isActivePath(pair.white.path)) return { pairIdx: i, side: 'white' };
      if (pair.black && isActivePath(pair.black.path)) return { pairIdx: i, side: 'black' };
    }
    return null;
  });

  // Check if a path is "on" the current path (current path passes through it)
  function isOnCurrentPath(path: GameNode[]): boolean {
    if (path.length > currentPath.length) return false;
    for (let i = 0; i < path.length; i++) {
      if (path[i] !== currentPath[i]) return false;
    }
    return true;
  }

  // Build move pairs for grid rendering from the main line items
  interface MovePair {
    num: number;
    white: { node: GameNode; path: GameNode[] } | null;
    black: { node: GameNode; path: GameNode[] } | null;
    variationsAfterWhite: VariationItem[];
    variationsAfterBlack: VariationItem[];
  }

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
        // Flush pending variations to previous pair's black
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
        // Flush pending variations (e.g., from interrupted black move in a prior variation)
        if (pendingVariations.length > 0) {
          // These would be variations after the previous move
          // Actually they should go to the previous pair
          const prevPair = pairs.length >= 2 ? pairs[pairs.length - 2] : null;
          if (prevPair) {
            prevPair.variationsAfterBlack.push(...pendingVariations.splice(0));
          } else {
            pendingVariations.length = 0;
          }
        }
      } else {
        if (!currentPair) {
          // Black move without a white move (shouldn't happen in normal games, but handle it)
          currentPair = {
            num: item.moveNumber,
            white: null,
            black: { node: item.node, path: item.path },
            variationsAfterWhite: [],
            variationsAfterBlack: [],
          };
          pairs.push(currentPair);
        } else {
          // Flush pending variations to after white
          if (pendingVariations.length > 0) {
            currentPair.variationsAfterWhite.push(...pendingVariations.splice(0));
          }
          currentPair.black = { node: item.node, path: item.path };
        }
      }
    }

    // Flush remaining variations
    if (pendingVariations.length > 0 && currentPair) {
      if (currentPair.black) {
        currentPair.variationsAfterBlack.push(...pendingVariations.splice(0));
      } else {
        currentPair.variationsAfterWhite.push(...pendingVariations.splice(0));
      }
    }

    return pairs;
  });

  // === Test mode logic ===
  function advanceTestMove(from: SquareId, to: SquareId) {
    const expected = flatParsed.moves[testMoveIdx];
    if (from === expected.from && to === expected.to) {
      testHintArrow = null;
      const next = testMoveIdx + 1;
      if (next >= totalMoves) {
        testMoveIdx = next;
        testViewIdx = next;
        testComplete = true;
        playSound('stars');
      } else {
        testMoveIdx = next;
        testViewIdx = next;
      }
      testSelected = null;
      playSound('move');
    } else {
      testHintArrow = { from: expected.from, to: expected.to, color: '#15803d' };
      testSelected = null;
      playSound('wrong');
    }
  }

  function handleTestClick(sq: SquareId) {
    if (testComplete || !testAtFrontier) return;
    const currentBoard = flatParsed.positions[testMoveIdx];

    if (!testSelected) {
      const p = currentBoard.pieces.get(sq);
      if (p && p.color === testColorToMove) {
        testSelected = sq;
        testHintArrow = null;
      }
      return;
    }

    if (sq === testSelected) {
      testSelected = null;
      return;
    }

    const target = currentBoard.pieces.get(sq);
    if (target && target.color === testColorToMove) {
      testSelected = sq;
      return;
    }

    const legal = getLegalMoves(testSelected, currentBoard, testColorToMove);
    if (!legal.includes(sq)) {
      testSelected = null;
      return;
    }

    advanceTestMove(testSelected, sq);
  }

  function handleTestDrop(from: SquareId, to: SquareId) {
    if (testComplete || !testAtFrontier || from === to) return;
    const currentBoard = flatParsed.positions[testMoveIdx];
    const p = currentBoard.pieces.get(from);
    if (!p || p.color !== testColorToMove) return;
    const legal = getLegalMoves(from, currentBoard, testColorToMove);
    if (!legal.includes(to)) return;
    advanceTestMove(from, to);
  }

  function handleTestDragStart(sq: SquareId) {
    if (testComplete) return;
    testDragFrom = sq;
    testHintArrow = null;
  }

  function handleTestDragEnd() {
    testDragFrom = null;
  }

  function startTestMode() {
    exitExplore();
    testMode = true;
    testMoveIdx = 0;
    testViewIdx = 0;
    testSelected = null;
    testHintArrow = null;
    testComplete = false;
    isPlaying = false;
  }

  function exitTestMode() {
    exitExplore();
    testMode = false;
    testSelected = null;
    testHintArrow = null;
    testComplete = false;
    currentPath = [];
  }

  function retryTest() {
    testMoveIdx = 0;
    testViewIdx = 0;
    testComplete = false;
    testHintArrow = null;
  }

  // === Exploration move logic ===
  function moveToSan(b: BoardState, from: SquareId, to: SquareId): string {
    const piece = b.pieces.get(from);
    if (!piece) return `${from}${to}`;
    if (piece.piece === 'K') {
      const df = to.charCodeAt(0) - from.charCodeAt(0);
      if (df === 2) return 'O-O';
      if (df === -2) return 'O-O-O';
    }
    const cap = b.pieces.has(to);
    if (piece.piece === 'P') {
      const isCapture = from[0] !== to[0];
      const base = isCapture ? `${from[0]}x${to}` : to;
      const rank = to[1];
      if ((piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1')) return `${base}=Q`;
      return base;
    }
    return `${piece.piece}${cap ? 'x' : ''}${to}`;
  }

  function goToExploreMove(index: number) {
    exploreStack = exploreStack.slice(0, index + 1);
    viewerSelected = null;
  }

  function applyExploreMove(b: BoardState, from: SquareId, to: SquareId): BoardState {
    const pieces = new Map(b.pieces);
    const piece: { piece: PieceKind; color: PieceColor } = pieces.get(from)!;
    pieces.delete(from);
    pieces.set(to, piece);

    if (piece.piece === 'P') {
      if ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1')) {
        pieces.set(to, { piece: 'Q', color: piece.color });
      }
      if (to === b.enPassantSquare) {
        const epRank = piece.color === 'w' ? String(parseInt(to[1]) - 1) : String(parseInt(to[1]) + 1);
        pieces.delete(`${to[0]}${epRank}` as SquareId);
      }
    }

    if (piece.piece === 'K') {
      const df = to.charCodeAt(0) - from.charCodeAt(0);
      if (Math.abs(df) === 2) {
        const rank = from[1];
        if (df > 0) {
          pieces.delete(`h${rank}` as SquareId);
          pieces.set(`f${rank}` as SquareId, { piece: 'R', color: piece.color });
        } else {
          pieces.delete(`a${rank}` as SquareId);
          pieces.set(`d${rank}` as SquareId, { piece: 'R', color: piece.color });
        }
      }
    }

    return { pieces };
  }

  function handleViewerMove(from: SquareId, to: SquareId) {


    if (!exploring) {
      // Check if this move matches a child in the game tree
      const parent = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
      const children = parent ? parent.children : tree.children;
      const match = children.find(c => c.from === from && c.to === to);
      if (match) {
        currentPath = [...currentPath, match];
        viewerSelected = null;
        playSound('move');
        return;
      }
    }

    // Enter or extend exploration
    const curBoard = exploring && exploreStack.length > 0
      ? exploreStack[exploreStack.length - 1].board
      : board;
    const san = moveToSan(curBoard, from, to);
    const newBoard = applyExploreMove(curBoard, from, to);

    if (!exploring) exploring = true;
    exploreStack = [...exploreStack, { board: newBoard, from, to, san }];
    viewerSelected = null;
    playSound('move');
  }

  function handleViewerClick(sq: SquareId) {
    if (testMode) return;

    if (!viewerSelected) {
      const p = displayBoard.pieces.get(sq);
      if (p && p.color === viewerColorToMove) viewerSelected = sq;
      return;
    }

    if (sq === viewerSelected) { viewerSelected = null; return; }

    const target = displayBoard.pieces.get(sq);
    if (target && target.color === viewerColorToMove) { viewerSelected = sq; return; }

    const legal = getLegalMoves(viewerSelected, displayBoard, viewerColorToMove);
    if (!legal.includes(sq)) { viewerSelected = null; return; }

    handleViewerMove(viewerSelected, sq);
  }

  function handleViewerDrop(from: SquareId, to: SquareId) {
    if (testMode || from === to) return;
    const p = displayBoard.pieces.get(from);
    if (!p || p.color !== viewerColorToMove) return;
    const legal = getLegalMoves(from, displayBoard, viewerColorToMove);
    if (!legal.includes(to)) return;
    handleViewerMove(from, to);
  }

  function handleViewerDragStart(sq: SquareId) {
    if (testMode) return;
    viewerDragFrom = sq;
  }

  function handleViewerDragEnd() {
    viewerDragFrom = null;
  }

  function noop() {}

  function formatVariationSan(node: { node: GameNode; moveNumber: number; isWhite: boolean }): string {
    const prefix = node.isWhite ? `${node.moveNumber}.` : (node === node ? `${node.moveNumber}...` : '');
    return `${prefix}${node.node.san}${node.node.nag ?? ''}`;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<BoardLayout>
  {#snippet boardArea()}
    <div class="board-column">
      <div class="player-label">
        <div class="player-dot player-dot-black"></div>
        <span class="player-name">{game.black}</span>
      </div>

      <Board
        board={testMode ? testBoard : displayBoard}
        selectedSquare={testMode ? testSelected : viewerSelected}
        validMoves={testMode ? testValidMoves : viewerValidMoves}
        targets={[]}
        reachedTargets={[]}
        dragValidMoves={testMode ? testDragMoves : viewerDragMoves}
        onSquareClick={testMode ? handleTestClick : handleViewerClick}
        onDrop={testMode ? handleTestDrop : handleViewerDrop}
        onDragStart={testMode ? handleTestDragStart : handleViewerDragStart}
        onDragEnd={testMode ? handleTestDragEnd : handleViewerDragEnd}
        arrows={testMode ? testArrows : (exploring ? undefined : currentArrows)}
        playableColors={['w', 'b']}
      />

      <div class="player-label">
        <div class="player-dot player-dot-white"></div>
        <span class="player-name">{game.white}</span>
      </div>
    </div>
  {/snippet}

  {#snippet sidebarArea()}
    {#if !testMode && exploring}
      <div class="explore-indicator">
        <span class="explore-label">Exploring</span>
        <button class="explore-back-btn" onclick={exitExplore}>Back to game</button>
      </div>
    {/if}

    {#if testMode}
      <div class="test-panel">
        <h2 class="test-title">Test Yourself</h2>
        <p class="test-status">{testStatusText}</p>
        {#if testComplete}
          <button class="btn-try-again" onclick={retryTest}>
            Try Again
          </button>
        {/if}
      </div>
    {:else}
      <div class="game-info">
        <span class="game-event">{game.event}</span>
        <span class="game-year">{game.year}</span>
      </div>
      <p class="game-desc">{game.description}</p>

      <div class="move-list" bind:this={moveListEl}>
        <div class="move-grid">
          {#each movePairs as pair, pairIdx}
            {@const exploreAfterWhite = exploreBranchKey?.pairIdx === pairIdx && exploreBranchKey.side === 'white'}
            {@const exploreAfterBlack = exploreBranchKey?.pairIdx === pairIdx && exploreBranchKey.side === 'black'}
            <span class="move-num">{pair.num}.</span>
            {#if pair.white}
              <button
                class={['move-btn', isActivePath(pair.white.path) && 'move-active', isOnCurrentPath(pair.white.path) && !isActivePath(pair.white.path) && 'move-on-path']}
                data-active={isActivePath(pair.white.path)}
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
                  data-active={isActivePath(vn.path)}
                  onclick={() => goToNode(vn.path)}
                >{formatVariationSan(vn)}</button>{/each})</span>
              {/each}
            {/if}

            {#if exploreAfterWhite}
              <span class="variation-row explore-var">({#each exploreStack as move, i}{@const halfMove = currentPath.length + i}{@const moveNum = Math.floor(halfMove / 2) + 1}{@const isWhite = halfMove % 2 === 0}{#if isWhite}<span class="explore-line-num">{moveNum}.</span>{:else if i === 0}<span class="explore-line-num">{moveNum}...</span>{/if}<button
                  class={['explore-line-btn', i === exploreStack.length - 1 && 'move-active']}
                  onclick={() => goToExploreMove(i)}
                >{move.san}</button>{' '}{/each})</span>
            {/if}

            {#if pair.black}
              {#if pair.variationsAfterWhite.length > 0 || exploreAfterWhite}
                <span class="move-num">{pair.num}.</span>
                <span class="move-ellipsis">...</span>
              {/if}
              <button
                class={['move-btn', isActivePath(pair.black.path) && 'move-active', isOnCurrentPath(pair.black.path) && !isActivePath(pair.black.path) && 'move-on-path']}
                data-active={isActivePath(pair.black.path)}
                onclick={() => goToNode(pair.black!.path)}
              >
                {pair.black.node.san}{pair.black.node.nag ?? ''}
              </button>
            {:else if pair.variationsAfterWhite.length === 0 && !exploreAfterWhite}
              <span></span>
            {/if}

            {#if pair.variationsAfterBlack.length > 0}
              {#each pair.variationsAfterBlack as variation}
                <span class="variation-row">({#each variation.nodes as vn, vi}{#if vi > 0}{' '}{/if}<button
                  class={['var-move-btn', isActivePath(vn.path) && 'move-active']}
                  data-active={isActivePath(vn.path)}
                  onclick={() => goToNode(vn.path)}
                >{formatVariationSan(vn)}</button>{/each})</span>
              {/each}
            {/if}

            {#if exploreAfterBlack}
              <span class="variation-row explore-var">({#each exploreStack as move, i}{@const halfMove = currentPath.length + i}{@const moveNum = Math.floor(halfMove / 2) + 1}{@const isWhite = halfMove % 2 === 0}{#if isWhite}<span class="explore-line-num">{moveNum}.</span>{:else if i === 0}<span class="explore-line-num">{moveNum}...</span>{/if}<button
                  class={['explore-line-btn', i === exploreStack.length - 1 && 'move-active']}
                  onclick={() => goToExploreMove(i)}
                >{move.san}</button>{' '}{/each})</span>
            {/if}
          {/each}

        </div>
        {#if game.result}
          <div class="game-result">{game.result}</div>
        {/if}
      </div>

      <div class="comment-area">
        {#if exploring}
          <p class="comment-text">Try any move. Arrow left to undo, Esc to return.</p>
        {:else if currentComment}
          <p class="comment-text">{currentComment}</p>
        {/if}
      </div>
    {/if}

    <div class="nav-controls">
      <button
        class="nav-btn"
        onclick={goToStart}
        disabled={!canGoBack}
        aria-label="Start"
      >&#x23EE;</button>
      <button
        class="nav-btn"
        onclick={goBack}
        disabled={!canGoBack}
        aria-label="Back"
      >&#x25C0;</button>
      <button
        class="nav-btn nav-btn-wide"
        onclick={togglePlay}
        disabled={testMode}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >{isPlaying ? '\u23F8' : '\u25B6'}</button>
      <button
        class="nav-btn"
        onclick={goForward}
        disabled={!canGoForward}
        aria-label="Forward"
      >&#x25B6;</button>
      <button
        class="nav-btn"
        onclick={goToEnd}
        disabled={!canGoForward}
        aria-label="End"
      >&#x23ED;</button>
    </div>

    {#if !testMode}
      <div class="sub-controls">
        <label class="variation-toggle">
          <input type="checkbox" bind:checked={pauseOnVariations} />
          Pause at variations
        </label>
      </div>
    {/if}

    <div class="test-btn-wrap">
      {#if testMode}
        <button class="btn-test" onclick={exitTestMode}>
          Back to Viewer
        </button>
      {:else}
        <button class="btn-test" onclick={startTestMode}>
          Test Yourself
        </button>
      {/if}
    </div>
  {/snippet}
</BoardLayout>

<style>
  /* --- Test Mode --- */
  .test-panel {
    text-align: center;
    padding: 1rem;
  }

  .test-title {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
  }

  .test-status {
    color: var(--text-muted, #888);
    margin: 0;
  }

  .btn-try-again {
    padding: 0.5rem 1.25rem;
    background: #16a34a;
    color: white;
    border: none;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    margin-top: 0.75rem;
    transition: background-color 0.15s;
  }

  .btn-try-again:hover {
    background: #15803d;
  }

  /* --- Player labels --- */
  .player-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem;
    flex-shrink: 0;
  }

  .player-dot {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .player-dot-black {
    background: #1a1a1a;
  }

  .player-dot-white {
    background: white;
  }

  .player-name {
    font-size: 0.875rem;
    color: var(--text-muted, #888);
  }

  /* --- Board column (player labels + board) --- */
  .board-column {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    height: 100%;
  }

  /* --- Explore indicator --- */
  .explore-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    background: rgba(234, 179, 8, 0.1);
    border: 1px solid rgba(234, 179, 8, 0.3);
    flex-shrink: 0;
  }

  .explore-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #eab308;
  }

  .explore-back-btn {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    border: 1px solid var(--card-border, #333);
    background: var(--card-bg, #1a1a1a);
    color: inherit;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .explore-back-btn:hover {
    background: var(--btn-hover, #2a2a2a);
  }

  /* --- Nav controls --- */
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

  .nav-btn:hover:not(:disabled) {
    background: var(--btn-hover, #3a3a3a);
  }

  .nav-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .nav-btn-wide {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }

  /* --- Sub controls --- */
  .sub-controls {
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }

  .variation-toggle {
    font-size: 0.75rem;
    color: var(--text-faint, #666);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .variation-toggle input {
    cursor: pointer;
  }

  /* --- Test yourself button --- */
  .test-btn-wrap {
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }

  .btn-test {
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    border: 1px solid var(--card-border, #333);
    background: var(--card-bg, #1a1a1a);
    color: inherit;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
  }

  .btn-test:hover {
    background: var(--btn-hover, #2a2a2a);
  }

  /* --- Comment area --- */
  .comment-area {
    flex-shrink: 0;
  }

  .comment-text {
    font-size: 0.875rem;
    color: var(--text-muted, #888);
    font-style: italic;
    text-align: center;
    padding: 0 0.5rem;
    margin: 0;
  }

  .game-info {
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
  }

  .game-event {
    font-weight: 700;
  }

  .game-year {
    color: var(--text-faint, #666);
    margin-left: 0.5rem;
  }

  .game-desc {
    font-size: 0.75rem;
    color: var(--text-muted, #888);
    margin: 0 0 0.75rem;
  }

  .move-list {
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
    color: var(--text-faint, #666);
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

  .move-btn:hover {
    background: var(--btn-bg, #2a2a2a);
  }

  .move-active {
    background: rgba(34, 197, 94, 0.35);
    font-weight: 700;
    border-radius: 0.25rem;
    outline: 1px solid rgba(34, 197, 94, 0.5);
  }

  .move-on-path {
    color: var(--foreground, #f0e6cc);
  }

  .move-ellipsis {
    color: var(--text-faint, #666);
    padding: 0.125rem 0.375rem;
  }

  .game-result {
    text-align: center;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-muted, #888);
    margin-top: 0.5rem;
  }

  /* --- Variation rows --- */
  .variation-row {
    grid-column: 1 / -1;
    font-size: 0.8rem;
    color: var(--text-muted, #888);
    padding: 0.125rem 0.25rem 0.125rem 2.25rem;
  }

  .var-move-btn {
    background: none;
    border: none;
    color: var(--text-muted, #888);
    cursor: pointer;
    font-size: inherit;
    padding: 0.0625rem 0.125rem;
    border-radius: 0.125rem;
    transition: background-color 0.15s;
  }

  .var-move-btn:hover {
    background: var(--btn-bg, #2a2a2a);
    color: inherit;
  }

  .var-move-btn.move-active {
    background: rgba(34, 197, 94, 0.2);
    color: inherit;
    font-weight: 700;
  }

  /* --- Explore variation inline --- */
  .explore-var {
    color: #eab308;
  }

  .explore-line-num {
    color: var(--text-faint, #666);
  }

  .explore-line-btn {
    background: none;
    border: none;
    color: #eab308;
    cursor: pointer;
    font-size: inherit;
    padding: 0.0625rem 0.125rem;
    border-radius: 0.125rem;
    transition: background-color 0.15s;
  }

  .explore-line-btn:hover {
    background: var(--btn-bg, #2a2a2a);
  }

  .explore-line-btn.move-active {
    background: rgba(234, 179, 8, 0.15);
    font-weight: 700;
  }
</style>
