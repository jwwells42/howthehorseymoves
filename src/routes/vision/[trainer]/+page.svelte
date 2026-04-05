<script lang="ts">
  import { page } from '$app/state';
  import type { MateEndgameType } from '$lib/logic/endgame';
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
  <main class={['page', 'board-page', trainer !== 'guarding' && 'blindfold-page', trainer === 'guarding' && 'blindfold-wide']}>
    <a href="/vision" class="back-link">&larr; Back to vision</a>
    <TrainerComponent />
  </main>
{:else if mateMatch}
  <main class="page board-page blindfold-page">
    <a href="/vision" class="back-link">&larr; Back to vision</a>
    <BlindfoldMate type={mateMatch[1] as MateEndgameType} />
  </main>
{:else}
  <main class="page center">
    <h1>Not found</h1>
    <a href="/vision" class="muted-link">Back to vision</a>
  </main>
{/if}

<style>
  .page { min-height: 100vh; padding: 1.5rem; max-width: 42rem; margin: 0 auto; }
  .board-page {
    min-height: calc(100dvh - 3rem);
    display: flex;
    flex-direction: column;
    max-width: none;
  }

  @media (min-height: 32rem) and (min-width: 32rem) {
    .board-page {
      height: calc(100dvh - 3rem);
      overflow: hidden;
    }
  }
  .center { text-align: center; }
  .back-link { font-size: 0.875rem; color: var(--text-muted); display: inline-block; margin-bottom: 1rem; flex-shrink: 0; }
  .back-link:hover { color: var(--foreground); }
  .muted-link { color: var(--text-muted); }
  .muted-link:hover { text-decoration: underline; }
  .blindfold-page { max-width: 42rem; margin: 0 auto; }
  .blindfold-wide { max-width: 64rem; margin: 0 auto; }
</style>
