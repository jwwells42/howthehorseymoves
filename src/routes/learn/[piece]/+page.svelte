<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import BackLink from '$lib/components/ui/BackLink.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';
  import PuzzleSetCard from '$lib/components/puzzle/PuzzleSetCard.svelte';
  import { getPuzzlesForPiece, PIECES, getCategory } from '$lib/puzzles';
  import { progressState, isPuzzleUnlocked, getPuzzleProgress } from '$lib/state/progress-store';
  import EndgameShell from '$lib/components/endgame/EndgameShell.svelte';
  import MateTrainer from '$lib/components/endgame/MateTrainer.svelte';
  import DrawTrainer from '$lib/components/endgame/DrawTrainer.svelte';
  import { pawnEndingSteps, stepStorageKey } from '$lib/components/lessons/pawn-endings-data';
  import type { MateEndgameType } from '$lib/logic/endgame';
  import type { PiecePlacement } from '$lib/logic/types';
  import { SECTIONS as HOW_TO_WIN_SECTIONS, getSectionSteps } from '$lib/components/lessons/how-to-win-data';
  import type { HowToWinSection } from '$lib/components/lessons/how-to-win-data';
  import { doneHref, stopFromUrl, withStop } from '$lib/curriculum';
  import { goto } from '$app/navigation';
  let piece = $derived(page.params.piece ?? '');
  // Opened from the path: links pass the stop along (see progression mode in curriculum.ts)
  let pathStop = $derived(stopFromUrl(page.url));
  function goDone() {
    if (pathStop) goto(doneHref(pathStop));
  }

  // Endgame positions
  const ENDGAME_POSITIONS: Record<string, { title: string; instruction: string; placements: PiecePlacement[] }> = {
    'endings-kpk': {
      title: 'King + Pawn vs King',
      instruction: 'Promote the pawn! Every wrong move is a draw.',
      placements: [
        { piece: 'K', color: 'w', square: 'd6' },
        { piece: 'P', color: 'w', square: 'd4' },
        { piece: 'K', color: 'b', square: 'd8' },
      ],
    },
  };

  // "Hold the draw" endgame positions (student plays Black, bot plays White)
  const DRAW_POSITIONS: Record<string, { title: string; instruction: string; placements: PiecePlacement[]; storageKey: string; botStrategy?: 'heuristic' | 'bitbase-kpk' }> = {
    'endings-philidor': {
      title: 'Philidor Position',
      instruction: 'Hold the draw! Keep your rook active.',
      placements: [
        { piece: 'K', color: 'w', square: 'e6' },
        { piece: 'P', color: 'w', square: 'e5' },
        { piece: 'R', color: 'w', square: 'a1' },
        { piece: 'K', color: 'b', square: 'e8' },
        { piece: 'R', color: 'b', square: 'a6' },
      ],
      storageKey: 'draw-philidor-best-stars',
    },
    'endings-kpk-draw': {
      title: 'Hold the Draw: K+P vs K',
      instruction: 'Keep opposition! Block the key squares and force stalemate.',
      placements: [
        { piece: 'K', color: 'w', square: 'd5' },
        { piece: 'P', color: 'w', square: 'd4' },
        { piece: 'K', color: 'b', square: 'd7' },
      ],
      storageKey: 'draw-kpk-best-stars',
      botStrategy: 'bitbase-kpk',
    },
    'endings-wrong-bishop': {
      title: 'Wrong Bishop',
      instruction: 'The bishop can\'t control the promotion square! Stay in the corner to draw.',
      placements: [
        { piece: 'K', color: 'w', square: 'f6' },
        { piece: 'B', color: 'w', square: 'e4' },
        { piece: 'P', color: 'w', square: 'h6' },
        { piece: 'K', color: 'b', square: 'h8' },
      ],
      storageKey: 'draw-wrong-bishop-best-stars',
    },
  };

  let endgame = $derived(ENDGAME_POSITIONS[piece]);
  let drawEndgame = $derived(DRAW_POSITIONS[piece]);
  let mateEndgameMatch = $derived(piece.match(/^endings-(kqk|krrk|krk|kbbk|kbnk)$/));
  let howToWinMatch = $derived(piece.match(/^how-to-win-(check|checkmate|stalemate)$/));

  // Category page
  let category = $derived(getCategory(piece));

  // Puzzle list
  let puzzleSet = $derived(getPuzzlesForPiece(piece));
  let pieceInfo = $derived(PIECES.find((p) => p.key === piece));

  // Stars saved by the lessons and trainers, read once the page is in the browser
  let sectionStars = $state<Record<string, number>>({});
  let hwStepStars = $state(0);
  let krrkTrainerStars = $state(0);
  let pawnStepStars = $state<Record<string, number>>({});
  onMount(() => {
    const s: Record<string, number> = {};
    for (const sec of HOW_TO_WIN_SECTIONS) {
      s[sec.key] = parseInt(localStorage.getItem(sec.storageKey) ?? '0', 10);
    }
    sectionStars = s;
    if (howToWinMatch) {
      const sectionInfo = HOW_TO_WIN_SECTIONS.find(s => s.key === howToWinMatch![1]);
      if (sectionInfo) {
        hwStepStars = parseInt(localStorage.getItem(sectionInfo.storageKey) ?? '0', 10);
      }
    }
    krrkTrainerStars = parseInt(localStorage.getItem('endings-krrk-best-stars') ?? '0', 10);
    pawnStepStars = Object.fromEntries(
      pawnEndingSteps.map((step) => [step.id, parseInt(localStorage.getItem(stepStorageKey(step.id)) ?? '0', 10)])
    );
  });

  const ADVANCED_ENDINGS = ['endings-kbbk', 'endings-kbnk', 'endings-lucena', 'endings-philidor', 'endings-reti', 'endings-wrong-bishop', 'endings-pawn-races'];
  let parentCategory = $derived(
    piece.startsWith('checkmate-') ? 'checkmate'
    : piece.startsWith('tactics-') ? 'tactics'
    : ADVANCED_ENDINGS.includes(piece) ? 'advanced-endings'
    : piece.startsWith('endings-') ? 'endings'
    : null
  );
  let backHref = $derived(
    parentCategory ? `/learn/${parentCategory}`
    : '/'
  );
  let backLabel = $derived(
    parentCategory ? `Back to ${parentCategory}`
    : 'Back to home'
  );

  let displayName = $derived(pieceInfo?.name ?? puzzleSet?.name ?? 'Puzzles');
  let displayDescription = $derived(pieceInfo?.description ?? '');
  let puzzleIds = $derived(puzzleSet?.puzzles.map((p) => p.id) ?? []);
</script>

{#snippet stars(count: number)}
  {#if count > 0}
    <StarRating stars={count} size="sm" />
  {/if}
{/snippet}

{#if endgame}
  <!-- Endgame trainer (e.g. KPK) -->
  <main class="board-page">
    <BackLink href="/">Back to home</BackLink>
    <EndgameShell title={endgame.title} instruction={endgame.instruction} placements={endgame.placements} onNext={() => window.location.href = '/'} />
  </main>
{:else if mateEndgameMatch}
  <!-- Mate conversion trainer (KQK, KRRK, etc.) -->
  <main class="board-page">
    {#if mateEndgameMatch[1] === 'krrk'}
      <BackLink href="/learn/checkmate-rook-ladder">Back to Rook Ladder</BackLink>
    {:else}
      <BackLink href="/">Back to home</BackLink>
    {/if}
    <MateTrainer type={mateEndgameMatch[1] as MateEndgameType} />
  </main>
{:else if drawEndgame}
  <!-- Draw endgame trainer (Philidor, etc.) -->
  <main class="board-page">
    <BackLink href="/learn/advanced-endings">Back to advanced endings</BackLink>
    <DrawTrainer
      title={drawEndgame.title}
      instruction={drawEndgame.instruction}
      placements={drawEndgame.placements}
      storageKey={drawEndgame.storageKey}
      botStrategy={drawEndgame.botStrategy}
      onNext={pathStop ? goDone : undefined}
    />
  </main>
{:else if piece === 'pawn-endings-lesson'}
  <Page
    title="Pawn Endings"
    subtitle="Key squares, opposition, and essential pawn ending patterns."
    back={{ href: '/', label: 'Back to home' }}
    width="narrow"
  >
    <div class="start">
      <Button variant="primary" size="large" href={withStop(`/learn/pawn-endings-lesson/${pawnEndingSteps[0].id}`, pathStop)}>Start</Button>
    </div>
    <CardList>
      {#each pawnEndingSteps as step, idx}
        <LinkCard
          href={withStop(`/learn/pawn-endings-lesson/${step.id}`, pathStop)}
          title="{idx + 1}. {step.title}"
          description={step.type === 'diagram' ? 'Diagram' : 'Quiz'}
        >
          {#snippet aside()}{@render stars(pawnStepStars[step.id] ?? 0)}{/snippet}
        </LinkCard>
      {/each}
    </CardList>
  </Page>
{:else if piece === 'how-to-win'}
  <Page
    title="How to Win"
    subtitle="Learn check, checkmate, and stalemate."
    back={{ href: '/', label: 'Back to home' }}
    width="narrow"
  >
    <CardList>
      {#each HOW_TO_WIN_SECTIONS as sec}
        <LinkCard href={withStop(`/learn/how-to-win-${sec.key}`, pathStop)} icon={sec.icon} title={sec.title} description={sec.description}>
          {#snippet aside()}{@render stars(sectionStars[sec.key] ?? 0)}{/snippet}
        </LinkCard>
      {/each}
    </CardList>
  </Page>
{:else if howToWinMatch}
  <!-- How to Win section page (check/checkmate/stalemate) -->
  {@const section = howToWinMatch[1] as HowToWinSection}
  {@const sectionInfo = HOW_TO_WIN_SECTIONS.find(s => s.key === section)}
  {@const steps = getSectionSteps(section)}
  {#if sectionInfo && steps}
    <Page
      title={sectionInfo.title}
      subtitle={sectionInfo.description}
      back={{ href: withStop('/learn/how-to-win', pathStop), label: 'Back to How to Win' }}
      width="narrow"
    >
      <div class="start">
        <Button variant="primary" size="large" href={withStop(`/learn/${piece}/${steps[0].slug}`, pathStop)}>
          {hwStepStars > 0 ? 'Play Again' : 'Start'}
        </Button>
        {@render stars(hwStepStars)}
      </div>
      <CardList>
        {#each steps as step, idx}
          <LinkCard href={withStop(`/learn/${piece}/${step.slug}`, pathStop)} title="{idx + 1}. {step.title}" description={step.instruction} />
        {/each}
      </CardList>
    </Page>
  {/if}
{:else if category}
  <Page
    title={category.name}
    subtitle={category.description}
    back={{ href: '/practice', label: 'Back to practice' }}
    width="narrow"
  >
    <CardList>
      {#each category.subcategories as set}
        <PuzzleSetCard {set} />
      {/each}
    </CardList>
  </Page>
{:else if puzzleSet}
  <Page
    title="{displayName} Puzzles"
    subtitle={displayDescription || undefined}
    back={{ href: backHref, label: backLabel }}
    width="narrow"
  >
    <CardList>
      {#each puzzleSet.puzzles as puzz, idx}
        {@const unlocked = $progressState.loaded && isPuzzleUnlocked(puzz.id, puzzleIds)}
        {@const progress = getPuzzleProgress(puzz.id)}
        <LinkCard
          href={unlocked ? withStop(`/learn/${piece}/${puzz.id}`, pathStop) : undefined}
          reason="🔒 Locked"
          title="{idx + 1}. {puzz.title}"
          description={unlocked ? puzz.instruction : undefined}
        >
          {#snippet aside()}{@render stars(progress?.completed ? progress.bestStars : 0)}{/snippet}
        </LinkCard>
      {/each}
    </CardList>

    {#if piece === 'checkmate-rook-ladder'}
      <CardList title="Play It Out">
        <LinkCard
          href="/learn/endings-krrk"
          icon="/pieces/wR.svg"
          title="Rook Ladder Trainer"
          description="Practice with random positions — deliver checkmate!"
        >
          {#snippet aside()}{@render stars(krrkTrainerStars)}{/snippet}
        </LinkCard>
      </CardList>
    {/if}
  </Page>
{:else}
  <Page title="Not found" back={{ href: '/', label: 'Back to home' }} width="narrow">
    <p>There is nothing at this address.</p>
  </Page>
{/if}

<style>
  /* A trainer with a board fills the screen below the nav bar. */
  .board-page {
    min-height: calc(100dvh - 3rem);
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
  }

  @media (min-height: 32rem) and (min-width: 32rem) {
    .board-page {
      height: calc(100dvh - 3rem);
      overflow: hidden;
    }
  }

  .start {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }
</style>
