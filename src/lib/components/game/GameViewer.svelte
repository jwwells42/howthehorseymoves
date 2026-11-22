<script lang="ts">
  import Board from '$lib/components/board/Board.svelte';
  import BoardLayout from '$lib/components/board/BoardLayout.svelte';
  import MoveNav from '$lib/components/board/MoveNav.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import EnginePanel from '$lib/components/analysis/EnginePanel.svelte';
  import EvalGraph from '$lib/components/analysis/EvalGraph.svelte';
  import { MARK } from '$lib/board-marks';
  import { parseGamePgn, extractMainLine, applyMove, toSan } from '$lib/logic/pgn';
  import { playLine, type UciMove } from '$lib/engine/uci';
  import { markMoves, countMarks, moverOf, MARKS, type GameAnalysis, type Mark } from '$lib/engine/review';
  import { getLegalMoves } from '$lib/logic/attacks';
  import { playSound } from '$lib/state/sound';
  import type { ModelGame } from '$lib/games/types';
  import type { SquareId, PieceColor, PieceKind, BoardState } from '$lib/logic/types';
  import type { Arrow, GameNode } from '$lib/logic/pgn';

  const AUTOPLAY_MS = 1200;

  interface Props {
    game: ModelGame;
    /** Stockfish in the sidebar (off in test mode, where it would give the moves away). */
    analysis?: boolean;
    /** A saved check of the whole game: ?! ? ?? on its moves, and the eval graph */
    review?: GameAnalysis | null;
  }

  let { game, analysis = false, review = null }: Props = $props();

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
  let currentHighlights = $derived(lastNode?.highlights);

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
    if (testComplete) return '✓';
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
      testHintArrow = { from: expected.from, to: expected.to, color: MARK.good };
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
  function goToExploreMove(index: number) {
    exploreStack = exploreStack.slice(0, index + 1);
    viewerSelected = null;
  }

  /** A move off the game's own moves. A pawn reaching the last rank becomes a queen. */
  function exploreMove(b: BoardState, from: SquareId, to: SquareId, color: PieceColor, promotion?: PieceKind) {
    const piece = b.pieces.get(from);
    const lastRank = color === 'w' ? '8' : '1';
    const promo = piece?.piece === 'P' && to[1] === lastRank ? (promotion ?? 'Q') : undefined;
    const newBoard = applyMove(b, from, to, promo);
    return { board: newBoard, from, to, san: toSan(b, from, to, color, newBoard, promo) };
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
    if (!exploring) exploring = true;
    exploreStack = [...exploreStack, exploreMove(curBoard, from, to, viewerColorToMove)];
    viewerSelected = null;
    playSound('move');
  }

  /** Play the engine's line (up to the move tapped) from the position on the board. */
  function playEngineLine(moves: UciMove[]) {
    for (const move of moves) {
      if (!exploring) {
        const parent = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;
        const children = parent ? parent.children : tree.children;
        const match = children.find((c) => c.from === move.from && c.to === move.to && c.promotion === move.promotion);
        if (match) {
          currentPath = [...currentPath, match];
          continue;
        }
        exploring = true;
      }
      exploreStack = [...exploreStack, exploreMove(displayBoard, move.from, move.to, viewerColorToMove, move.promotion)];
    }
    viewerSelected = null;
    isPlaying = false;
    playSound('move');
  }

  // === Engine ===
  let engineBest = $state<Arrow | null>(null);
  let fullMove = $derived(Math.floor((currentPath.length + exploreStack.length) / 2) + 1);
  let boardArrows = $derived.by(() => {
    if (testMode) return testArrows;
    const own = exploring ? [] : (currentArrows ?? []);
    return analysis && engineBest ? [...own, engineBest] : own;
  });

  // === Saved check of the game (the library's Stockfish analysis) ===
  let mainLine = $derived.by(() => {
    const nodes: GameNode[] = [];
    for (let n: GameNode | undefined = tree.children[0]; n; n = n.children[0]) nodes.push(n);
    return nodes;
  });
  /** Only if it was made from these moves (a game edited since has none) */
  let checked = $derived(review && review.evals.length === mainLine.length + 1 ? review : null);
  let marks = $derived(checked ? markMoves(checked.evals) : []);
  let counts = $derived(countMarks(marks));
  /** A PGN's own ! or ? wins over the engine's mark */
  let markOf = $derived.by(() => {
    const m = new Map<GameNode, Mark>();
    mainLine.forEach((node, i) => {
      if (marks[i] && !node.nag) m.set(node, marks[i]!);
    });
    return m;
  });
  /** The position on the board, counted along the game's moves (null off them) */
  let mainAt = $derived(
    !exploring && currentPath.every((n, i) => mainLine[i] === n) ? currentPath.length : null,
  );
  /** Engine's move where the move just played was marked */
  let bestHere = $derived.by(() => {
    if (!checked || !mainAt) return null;
    const ply = mainAt - 1;
    const mark = marks[ply];
    const uci = checked.best[ply];
    if (!mark || !uci) return null;
    const before = ply === 0 ? tree.startBoard : mainLine[ply - 1].boardAfter;
    const move = playLine(before, moverOf(ply), [uci])[0];
    return move ? { mark, ply, move } : null;
  });

  function showBest() {
    if (!bestHere) return;
    const { ply, move } = bestHere;
    goToNode(mainLine.slice(0, ply));
    playEngineLine([move]);
  }

  /** The next ?! ? or ?? by one side, after the board's move, round to the first */
  function nextMark(mark: Mark, color: PieceColor) {
    const plies = marks.flatMap((m, i) => (m === mark && moverOf(i) === color ? [i] : []));
    const from = mainAt ?? 0;
    const ply = plies.find((i) => i + 1 > from) ?? plies[0];
    if (ply !== undefined) {
      isPlaying = false;
      goToNode(mainLine.slice(0, ply + 1));
    }
  }

  const MARK_NAMES = { '?!': 'inaccuracies', '?': 'mistakes', '??': 'blunders' } as const;

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

  function formatVariationSan(node: { node: GameNode; moveNumber: number; isWhite: boolean }): string {
    const prefix = node.isWhite ? `${node.moveNumber}.` : (node === node ? `${node.moveNumber}...` : '');
    return `${prefix}${node.node.san}${node.node.nag ?? ''}`;
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<BoardLayout>
  {#snippet boardArea()}
    <Board
      board={testMode ? testBoard : displayBoard}
      selectedSquare={testMode ? testSelected : viewerSelected}
      validMoves={testMode ? testValidMoves : viewerValidMoves}
      dragValidMoves={testMode ? testDragMoves : viewerDragMoves}
      onSquareClick={testMode ? handleTestClick : handleViewerClick}
      onDrop={testMode ? handleTestDrop : handleViewerDrop}
      onDragStart={testMode ? handleTestDragStart : handleViewerDragStart}
      onDragEnd={testMode ? handleTestDragEnd : handleViewerDragEnd}
      arrows={boardArrows}
      highlights={testMode || exploring ? undefined : currentHighlights}
      playableColors={['w', 'b']}
    />
  {/snippet}

  {#snippet sidebarArea()}
    <!-- Black first, as Black sits at the top of the board -->
    {#if game.white || game.black}
    <div class="players">
      {#each [{ color: 'b' as PieceColor, name: game.black }, { color: 'w' as PieceColor, name: game.white }] as player}
        <div class="player-label">
          <div class={['player-dot', player.color === 'w' ? 'player-dot-white' : 'player-dot-black']}></div>
          <span class="player-name">{player.name}</span>
          {#if checked && !testMode}
            <span class="mark-counts">
              {#each MARKS as mark}
                {@const n = counts[MARK_NAMES[mark]][player.color === 'w' ? 0 : 1]}
                <button
                  class={['mark-count', `mark-${MARK_NAMES[mark]}`]}
                  disabled={n === 0}
                  onclick={() => nextMark(mark, player.color)}
                  aria-label="{mark} {n}"
                >{mark}&nbsp;{n}</button>
              {/each}
            </span>
          {/if}
        </div>
      {/each}
    </div>
    {/if}

    {#if analysis && !testMode}
      <EnginePanel
        board={displayBoard}
        color={viewerColorToMove}
        {fullMove}
        bind:best={engineBest}
        onPlay={playEngineLine}
      />
    {/if}

    {#if checked && !testMode}
      <EvalGraph
        evals={checked.evals}
        {marks}
        at={mainAt}
        onPick={(position) => {
          isPlaying = false;
          goToNode(mainLine.slice(0, position));
        }}
      />
    {/if}

    {#if !testMode && exploring}
      <div class="explore-indicator">
        <span class="explore-label">Exploring</span>
        <Button onclick={exitExplore}>Back to game</Button>
      </div>
    {/if}

    {#if testMode}
      <div class="test-panel">
        <h2 class="test-title">Test Yourself</h2>
        <p class="test-status">{testStatusText}</p>
        {#if testComplete}
          <div class="try-again">
            <Button variant="primary" onclick={retryTest}>Try Again</Button>
          </div>
        {/if}
      </div>
    {:else}
      <div class="game-info">
        <span class="game-event">{game.event}</span>
        {#if game.year}<span class="game-year">{game.year}</span>{/if}
      </div>

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
                {pair.white.node.san}{pair.white.node.nag ?? ''}{#if markOf.get(pair.white.node)}{@const m = markOf.get(pair.white.node)!}<span class={['mark', `mark-${MARK_NAMES[m]}`]}>{m}</span>{/if}
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
                {pair.black.node.san}{pair.black.node.nag ?? ''}{#if markOf.get(pair.black.node)}{@const m = markOf.get(pair.black.node)!}<span class={['mark', `mark-${MARK_NAMES[m]}`]}>{m}</span>{/if}
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
        {#if bestHere}
          <p class="best">
            <span class={['mark', `mark-${MARK_NAMES[bestHere.mark]}`]}>{bestHere.mark}</span>
            Best:
            <button class="best-move" onclick={showBest}>{bestHere.move.san}</button>
          </p>
        {/if}
        {#if currentComment && !exploring}
          <p class="comment-text">{currentComment}</p>
        {/if}
      </div>
    {/if}

    <MoveNav
      {canGoBack}
      {canGoForward}
      onStart={goToStart}
      onBack={goBack}
      onForward={goForward}
      onEnd={goToEnd}
      onTogglePlay={togglePlay}
      playing={isPlaying}
      playDisabled={testMode}
    />

    {#if !testMode}
      <div class="sub-controls">
        <label class="variation-toggle">
          <input type="checkbox" bind:checked={pauseOnVariations} />
          Pause at variations
        </label>
      </div>
    {/if}

    {#if testMode || totalMoves > 0}
      <div class="test-btn-wrap">
        {#if testMode}
          <Button onclick={exitTestMode}>Back to Viewer</Button>
        {:else}
          <Button onclick={startTestMode}>Test Yourself</Button>
        {/if}
      </div>
    {/if}
  {/snippet}
</BoardLayout>

<style>
  /* --- Test Mode --- */
  .test-panel {
    text-align: center;
    padding: 1rem;
  }

  .test-title {
    font-size: var(--size-large);
    font-weight: var(--weight-strong);
    margin: 0 0 0.25rem;
  }

  .test-status {
    color: var(--ink-muted);
    margin: 0;
  }

  .try-again {
    margin-top: 0.75rem;
  }

  /* --- Player labels --- */
  .players {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
  }
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
    border: 1px solid var(--line);
  }

  .player-dot-black {
    background: var(--piece-black);
  }

  .player-dot-white {
    background: var(--piece-white);
  }

  .player-name {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
  }

  /* --- The saved check: ?! ? ?? in their colours, always with the symbol --- */
  .mark {
    font-weight: var(--weight-strong);
  }
  .mark-inaccuracies {
    color: var(--mark-other);
  }
  .mark-mistakes {
    color: var(--highlight);
  }
  .mark-blunders {
    color: var(--wrong-text);
  }
  .mark-counts {
    display: flex;
    gap: 0.125rem;
    margin-left: 0.25rem;
  }
  .mark-count {
    background: none;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    padding: 0 0.25rem;
    font-size: var(--size-small);
    font-weight: var(--weight-strong);
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }
  .mark-count:hover:not(:disabled) {
    border-color: var(--line);
  }
  .mark-count:disabled {
    color: var(--ink-muted);
    font-weight: var(--weight-regular);
    cursor: default;
  }
  .best {
    font-size: var(--size-secondary);
    text-align: center;
    margin-bottom: 0.25rem;
  }
  .best-move {
    background: var(--surface-raised);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 0.25rem;
    padding: 0 0.375rem;
    font-weight: var(--weight-strong);
    cursor: pointer;
  }

  /* --- Explore indicator: off the game's own moves, so "look here". --- */
  .explore-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.375rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--highlight-tint);
    border: 1px solid var(--highlight);
    flex-shrink: 0;
  }

  .explore-label {
    font-size: var(--size-small);
    font-weight: var(--weight-strong);
    color: var(--highlight);
  }

  /* --- Sub controls --- */
  .sub-controls {
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }

  .variation-toggle {
    font-size: var(--size-small);
    color: var(--ink-muted);
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

  /* --- Comment area --- */
  .comment-area {
    flex-shrink: 0;
  }

  .comment-text {
    font-size: var(--size-secondary);
    color: var(--ink-muted);
    text-align: center;
    padding: 0 0.5rem;
    margin: 0;
  }

  .game-info {
    font-size: var(--size-secondary);
    margin-bottom: 0.5rem;
  }

  .game-event {
    font-weight: var(--weight-strong);
  }

  .game-year {
    color: var(--ink-muted);
    margin-left: 0.5rem;
  }

  .move-list {
    border-radius: 0.5rem;
    border: 1px solid var(--line);
    background: var(--surface);
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
    font-size: var(--size-secondary);
  }

  .move-num {
    color: var(--ink-muted);
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
    background: var(--surface-raised);
  }

  .move-active {
    background: var(--line);
    font-weight: var(--weight-strong);
  }

  .move-on-path {
    color: var(--ink);
  }

  .move-ellipsis {
    color: var(--ink-muted);
    padding: 0.125rem 0.375rem;
  }

  .game-result {
    text-align: center;
    font-size: var(--size-secondary);
    font-weight: var(--weight-strong);
    color: var(--ink-muted);
    margin-top: 0.5rem;
  }

  /* --- Variation rows --- */
  .variation-row {
    grid-column: 1 / -1;
    font-size: var(--size-small);
    color: var(--ink-muted);
    padding: 0.125rem 0.25rem 0.125rem 2.25rem;
  }

  .var-move-btn {
    background: none;
    border: none;
    color: var(--ink-muted);
    cursor: pointer;
    font-size: inherit;
    padding: 0.0625rem 0.125rem;
    border-radius: 0.125rem;
    transition: background-color 0.15s;
  }

  .var-move-btn:hover {
    background: var(--surface-raised);
    color: inherit;
  }

  .var-move-btn.move-active {
    background: var(--line);
    color: inherit;
    font-weight: var(--weight-strong);
  }

  /* --- Explore variation inline --- */
  .explore-var {
    color: var(--highlight);
  }

  .explore-line-num {
    color: var(--ink-muted);
  }

  .explore-line-btn {
    background: none;
    border: none;
    color: var(--highlight);
    cursor: pointer;
    font-size: inherit;
    padding: 0.0625rem 0.125rem;
    border-radius: 0.125rem;
    transition: background-color 0.15s;
  }

  .explore-line-btn:hover {
    background: var(--surface-raised);
  }

  .explore-line-btn.move-active {
    background: var(--highlight-tint);
    font-weight: var(--weight-strong);
  }
</style>
