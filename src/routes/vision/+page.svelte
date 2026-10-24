<script lang="ts">
  import { readNumber } from '$lib/state/storage';
  import { onMount } from 'svelte';
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';

  interface Trainer {
    key: string;
    name: string;
    icon: string;
    storageKey: string | null;
    href?: string;
  }

  interface TrainerGroup {
    title: string;
    trainers: Trainer[];
  }

  const GROUPS: TrainerGroup[] = [
    {
      title: 'Square Knowledge',
      trainers: [
        { key: 'coordinates', name: 'Name the Square', icon: '/pieces/wK.svg', storageKey: 'coord-best-stars', href: '/board/coordinates' },
        { key: 'blindfold-color', name: 'Color of Square', icon: '/pieces/wP.svg', storageKey: 'blindfold-color-best-stars' },
        { key: 'blindfold-diagonals', name: 'Same Diagonal?', icon: '/pieces/wB.svg', storageKey: 'blindfold-diagonal-best-stars' },
        { key: 'blindfold-rankfile', name: 'Same Rank or File?', icon: '/pieces/wR.svg', storageKey: 'blindfold-rankfile-best-stars' },
        { key: 'blindfold-knightsquares', name: 'Knight Squares', icon: '/pieces/wN.svg', storageKey: 'blindfold-knightsquares-best-stars' },
      ],
    },
    {
      title: 'Piece Movement',
      trainers: [
        { key: 'blindfold-counting', name: 'Move Counting', icon: '/pieces/wQ.svg', storageKey: 'blindfold-counting-best-stars' },
        { key: 'blindfold-knight-routes', name: 'Knight Routes', icon: '/pieces/wN.svg', storageKey: null },
        { key: 'blindfold-bishop-routes', name: 'Bishop Routes', icon: '/pieces/wB.svg', storageKey: null },
        { key: 'blindfold-reachability', name: 'Piece Reachability', icon: '/pieces/wN.svg', storageKey: 'blindfold-reachability-best-stars' },
        { key: 'blindfold-rookmaze', name: 'Rook Maze', icon: '/pieces/wR.svg', storageKey: null },
        { key: 'blindfold-gauntlet', name: 'Knight Gauntlet', icon: '/pieces/wN.svg', storageKey: null },
      ],
    },
    {
      title: 'Memory',
      trainers: [
        { key: 'blindfold-changed', name: 'What Changed?', icon: '/pieces/wR.svg', storageKey: 'blindfold-changed-best-stars' },
        { key: 'blindfold-landed', name: 'Where Did It Land?', icon: '/pieces/wN.svg', storageKey: 'blindfold-landed-best-stars' },
        { key: 'blindfold-flash', name: 'Flash Position', icon: '/pieces/wK.svg', storageKey: 'blindfold-flash-best-stars' },
        { key: 'blindfold-piececount', name: 'Piece Count', icon: '/pieces/wP.svg', storageKey: 'blindfold-piececount-best-stars' },
      ],
    },
    {
      title: 'Blindfold Play',
      trainers: [
        { key: 'blindfold-blindtactics', name: 'Blind Tactics', icon: '/pieces/wQ.svg', storageKey: 'blindfold-blindtactics-best-stars' },
        { key: 'blindfold-puzzle', name: 'Blindfold Puzzles', icon: '/pieces/wK.svg', storageKey: 'blindfold-puzzle-best-stars' },
        { key: 'blindfold-guarding', name: "Who's Guarding Whom?", icon: '/pieces/wQ.svg', storageKey: 'blindfold-guarding-best-stars' },
      ],
    },
    {
      title: 'Blindfold Checkmate',
      trainers: [
        { key: 'blindfold-mate-kqk', name: 'Mate: Q vs K', icon: '/pieces/wQ.svg', storageKey: 'blindfold-mate-kqk-best-stars' },
        { key: 'blindfold-mate-krrk', name: 'Mate: RR vs K', icon: '/pieces/wR.svg', storageKey: 'blindfold-mate-krrk-best-stars' },
        { key: 'blindfold-mate-krk', name: 'Mate: R vs K', icon: '/pieces/wR.svg', storageKey: 'blindfold-mate-krk-best-stars' },
        { key: 'blindfold-mate-kbbk', name: 'Mate: BB vs K', icon: '/pieces/wB.svg', storageKey: 'blindfold-mate-kbbk-best-stars' },
        { key: 'blindfold-mate-kbnk', name: 'Mate: BN vs K', icon: '/pieces/wN.svg', storageKey: 'blindfold-mate-kbnk-best-stars' },
      ],
    },
  ];

  let stars = $state<Record<string, number>>({});

  onMount(() => {
    const s: Record<string, number> = {};
    for (const group of GROUPS) {
      for (const t of group.trainers) {
        if (t.storageKey) {
          s[t.key] = readNumber(t.storageKey);
        }
      }
    }
    stars = s;
  });

</script>

<Page
  title="Vision"
  back={{ href: '/', label: 'Back to home' }}
>
  {#each GROUPS as group}
    <CardList title={group.title}>
      {#each group.trainers as trainer}
        <LinkCard
          href={trainer.href ?? `/vision/${trainer.key.replace('blindfold-', '')}`}
          icon={trainer.icon}
          title={trainer.name}
        >
          {#snippet aside()}
            {#if (stars[trainer.key] ?? 0) > 0}
              <StarRating stars={stars[trainer.key]} size="sm" />
            {/if}
          {/snippet}
        </LinkCard>
      {/each}
    </CardList>
  {/each}
</Page>
