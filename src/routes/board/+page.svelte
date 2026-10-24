<script lang="ts">
  import { readNumber } from '$lib/state/storage';
  import { onMount } from 'svelte';
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
  import StarRating from '$lib/components/ui/StarRating.svelte';

  let coordStars = $state(0);

  onMount(() => {
    coordStars = readNumber('coord-best-stars');
  });
</script>

<Page
  title="The Board"
  back={{ href: '/', label: 'Back to home' }}
>
  <CardList>
    <LinkCard
      href="/board/coordinates"
      icon="/pieces/wK.svg"
      title="Name the Square"
    >
      {#snippet aside()}
        {#if coordStars > 0}<StarRating stars={coordStars} size="sm" />{/if}
      {/snippet}
    </LinkCard>

    <LinkCard
      href="/setup"
      icon="/pieces/wQ.svg"
      title="Place the Pieces"
    >
      {#snippet aside()}7 stages{/snippet}
    </LinkCard>
  </CardList>
</Page>
