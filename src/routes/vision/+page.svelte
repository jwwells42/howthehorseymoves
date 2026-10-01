<script lang="ts">
  import { onMount } from 'svelte';
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';

  interface Trainer {
    key: string;
    name: string;
    description: string;
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
        { key: 'coordinates', name: 'Name the Square', description: 'Click the named square before time runs out!', icon: '/pieces/wK.svg', storageKey: 'coord-best-stars', href: '/board/coordinates' },
        { key: 'blindfold-color', name: 'Color of Square', description: 'Dark or light? Identify the color from the name.', icon: '/pieces/wP.svg', storageKey: 'blindfold-color-best-stars' },
        { key: 'blindfold-diagonals', name: 'Same Diagonal?', description: 'Are these two squares on the same diagonal?', icon: '/pieces/wB.svg', storageKey: 'blindfold-diagonal-best-stars' },
        { key: 'blindfold-rankfile', name: 'Same Rank or File?', description: 'Do these two squares share a rank or file?', icon: '/pieces/wR.svg', storageKey: 'blindfold-rankfile-best-stars' },
        { key: 'blindfold-knightsquares', name: 'Knight Squares', description: 'Name every square a knight can reach from a given square.', icon: '/pieces/wN.svg', storageKey: 'blindfold-knightsquares-best-stars' },
      ],
    },
    {
      title: 'Piece Movement',
      trainers: [
        { key: 'blindfold-counting', name: 'Move Counting', description: 'How many squares does this piece control?', icon: '/pieces/wQ.svg', storageKey: 'blindfold-counting-best-stars' },
        { key: 'blindfold-knight-routes', name: 'Knight Routes', description: 'Find a knight path between two squares — no board!', icon: '/pieces/wN.svg', storageKey: null },
        { key: 'blindfold-bishop-routes', name: 'Bishop Routes', description: 'Find a bishop path — or spot when it\'s impossible!', icon: '/pieces/wB.svg', storageKey: null },
        { key: 'blindfold-reachability', name: 'Piece Reachability', description: 'Can this piece reach that square? Yes or no!', icon: '/pieces/wN.svg', storageKey: 'blindfold-reachability-best-stars' },
        { key: 'blindfold-rookmaze', name: 'Rook Maze', description: 'Navigate a rook around obstacles — no board!', icon: '/pieces/wR.svg', storageKey: null },
        { key: 'blindfold-gauntlet', name: 'Knight Gauntlet', description: 'Navigate the knight without stepping on queen-attacked squares!', icon: '/pieces/wN.svg', storageKey: null },
      ],
    },
    {
      title: 'Memory',
      trainers: [
        { key: 'blindfold-changed', name: 'What Changed?', description: 'Memorize a position, then spot what moved.', icon: '/pieces/wR.svg', storageKey: 'blindfold-changed-best-stars' },
        { key: 'blindfold-landed', name: 'Where Did It Land?', description: 'Follow opening moves mentally, then find a piece.', icon: '/pieces/wN.svg', storageKey: 'blindfold-landed-best-stars' },
        { key: 'blindfold-flash', name: 'Flash Position', description: 'Memorize a position, then place the pieces from memory.', icon: '/pieces/wK.svg', storageKey: 'blindfold-flash-best-stars' },
        { key: 'blindfold-piececount', name: 'Piece Count', description: 'Flash a position — how many pieces of each type?', icon: '/pieces/wP.svg', storageKey: 'blindfold-piececount-best-stars' },
      ],
    },
    {
      title: 'Blindfold Play',
      trainers: [
        { key: 'blindfold-blindtactics', name: 'Blind Tactics', description: 'See a position, then find checkmate blindfolded!', icon: '/pieces/wQ.svg', storageKey: 'blindfold-blindtactics-best-stars' },
        { key: 'blindfold-puzzle', name: 'Blindfold Puzzles', description: 'Pieces are invisible — solve from a text description!', icon: '/pieces/wK.svg', storageKey: 'blindfold-puzzle-best-stars' },
        { key: 'blindfold-guarding', name: "Who's Guarding Whom?", description: 'Track piece interactions as they move — blindfolded!', icon: '/pieces/wQ.svg', storageKey: 'blindfold-guarding-best-stars' },
      ],
    },
    {
      title: 'Blindfold Checkmate',
      trainers: [
        { key: 'blindfold-mate-kqk', name: 'Mate: Q vs K', description: 'Deliver checkmate blindfolded with King + Queen.', icon: '/pieces/wQ.svg', storageKey: 'blindfold-mate-kqk-best-stars' },
        { key: 'blindfold-mate-krrk', name: 'Mate: RR vs K', description: 'Deliver checkmate blindfolded with King + 2 Rooks.', icon: '/pieces/wR.svg', storageKey: 'blindfold-mate-krrk-best-stars' },
        { key: 'blindfold-mate-krk', name: 'Mate: R vs K', description: 'Deliver checkmate blindfolded with King + Rook.', icon: '/pieces/wR.svg', storageKey: 'blindfold-mate-krk-best-stars' },
        { key: 'blindfold-mate-kbbk', name: 'Mate: BB vs K', description: 'Deliver checkmate blindfolded with King + 2 Bishops.', icon: '/pieces/wB.svg', storageKey: 'blindfold-mate-kbbk-best-stars' },
        { key: 'blindfold-mate-kbnk', name: 'Mate: BN vs K', description: 'Deliver checkmate blindfolded with King + Bishop + Knight.', icon: '/pieces/wN.svg', storageKey: 'blindfold-mate-kbnk-best-stars' },
      ],
    },
  ];

  let stars = $state<Record<string, number>>({});

  onMount(() => {
    const s: Record<string, number> = {};
    for (const group of GROUPS) {
      for (const t of group.trainers) {
        if (t.storageKey) {
          s[t.key] = parseInt(localStorage.getItem(t.storageKey) ?? '0', 10);
        }
      }
    }
    stars = s;
  });

  let totalTrainers = $derived(GROUPS.reduce((n, g) => n + g.trainers.length, 0));
  let completedTrainers = $derived(Object.values(stars).filter(s => s > 0).length);
</script>

<Page
  title="Vision"
  subtitle="{totalTrainers} blindfold and visualization trainers · {completedTrainers} completed"
  back={{ href: '/', label: 'Back to home' }}
>
  {#each GROUPS as group}
    <CardList title={group.title}>
      {#each group.trainers as trainer}
        <LinkCard
          href={trainer.href ?? `/vision/${trainer.key.replace('blindfold-', '')}`}
          icon={trainer.icon}
          title={trainer.name}
          description={trainer.description}
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
