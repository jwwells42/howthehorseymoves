<script lang="ts">
  import { onMount } from 'svelte';
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';

  let coordStars = $state(0);

  onMount(() => {
    coordStars = parseInt(localStorage.getItem('coord-best-stars') ?? '0', 10);
  });
</script>

<Page
  title="The Board"
  subtitle="Learn the board and set up the pieces."
  back={{ href: '/', label: 'Back to home' }}
  width="narrow"
>
  <CardList>
    <LinkCard
      href="/board/coordinates"
      icon="/pieces/wK.svg"
      title="Name the Square"
      description="Click the right square before time runs out!"
    >
      {#snippet aside()}
        {#if coordStars > 0}<StarRating stars={coordStars} size="sm" />{/if}
      {/snippet}
    </LinkCard>

    <LinkCard
      href="/setup"
      icon="/pieces/wQ.svg"
      title="Place the Pieces"
      description="Put each piece on its starting square."
    >
      {#snippet aside()}7 stages{/snippet}
    </LinkCard>
  </CardList>
</Page>
