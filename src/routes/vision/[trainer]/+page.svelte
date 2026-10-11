<script lang="ts">
  import { page } from '$app/state';
  import type { MateEndgameType } from '$lib/logic/endgame';
  import BoardPage from '$lib/components/board/BoardPage.svelte';
  import ColorOfSquare from '$lib/components/blindfold/ColorOfSquare.svelte';
  import SameDiagonal from '$lib/components/blindfold/SameDiagonal.svelte';
  import SameRankFile from '$lib/components/blindfold/SameRankFile.svelte';
  import MoveCounting from '$lib/components/blindfold/MoveCounting.svelte';
  import KnightRoutes from '$lib/components/blindfold/KnightRoutes.svelte';
  import BishopRoutes from '$lib/components/blindfold/BishopRoutes.svelte';
  import PieceReachability from '$lib/components/blindfold/PieceReachability.svelte';
  import NeighborSquares from '$lib/components/blindfold/NeighborSquares.svelte';
  import RelativePosition from '$lib/components/blindfold/RelativePosition.svelte';
  import WhatChanged from '$lib/components/blindfold/WhatChanged.svelte';
  import WhereDidItLand from '$lib/components/blindfold/WhereDidItLand.svelte';
  import FlashPosition from '$lib/components/blindfold/FlashPosition.svelte';
  import PieceCount from '$lib/components/blindfold/PieceCount.svelte';
  import RookMaze from '$lib/components/blindfold/RookMaze.svelte';
  import BlindTactics from '$lib/components/blindfold/BlindTactics.svelte';
  import BlindfoldPuzzle from '$lib/components/blindfold/BlindfoldPuzzle.svelte';
  import KnightGauntlet from '$lib/components/blindfold/KnightGauntlet.svelte';
  import GuardingGame from '$lib/components/blindfold/GuardingGame.svelte';
  import KnightSquares from '$lib/components/blindfold/KnightSquares.svelte';
  import BlindfoldMate from '$lib/components/blindfold/BlindfoldMate.svelte';

  let trainer = $derived(page.params.trainer ?? '');
  let fullKey = $derived(`blindfold-${trainer}`);

  const TRAINER_COMPONENTS: Record<string, any> = {
    'blindfold-color': ColorOfSquare,
    'blindfold-diagonals': SameDiagonal,
    'blindfold-rankfile': SameRankFile,
    'blindfold-counting': MoveCounting,
    'blindfold-knight-routes': KnightRoutes,
    'blindfold-bishop-routes': BishopRoutes,
    'blindfold-reachability': PieceReachability,
    'blindfold-neighbors': NeighborSquares,
    'blindfold-relative': RelativePosition,
    'blindfold-changed': WhatChanged,
    'blindfold-landed': WhereDidItLand,
    'blindfold-flash': FlashPosition,
    'blindfold-piececount': PieceCount,
    'blindfold-rookmaze': RookMaze,
    'blindfold-blindtactics': BlindTactics,
    'blindfold-puzzle': BlindfoldPuzzle,
    'blindfold-gauntlet': KnightGauntlet,
    'blindfold-guarding': GuardingGame,
    'blindfold-knightsquares': KnightSquares,
  };

  let TrainerComponent = $derived(TRAINER_COMPONENTS[fullKey]);
  let mateMatch = $derived(fullKey.match(/^blindfold-mate-(kqk|krrk|krk|kbbk|kbnk)$/));
</script>

{#if TrainerComponent}
  <BoardPage back={{ href: '/vision', label: 'Back to vision' }}>
    <div class="trainer">
      <TrainerComponent />
    </div>
  </BoardPage>
{:else if mateMatch}
  <BoardPage back={{ href: '/vision', label: 'Back to vision' }}>
    <div class="trainer">
      <BlindfoldMate type={mateMatch[1] as MateEndgameType} />
    </div>
  </BoardPage>
{:else}
  <main class="center">
    <h1>Not found</h1>
    <a href="/vision" class="muted-link">Back to vision</a>
  </main>
{/if}

<style>
  /* The page's column: a screen without a board is centred in it, and a
     board starts at its left edge (BoardLayout) */
  .trainer {
    width: min(var(--column), 100%);
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  .center { text-align: center; padding: 1.5rem; }
  .muted-link { color: var(--ink-muted); }
  .muted-link:hover { text-decoration: underline; }
</style>
