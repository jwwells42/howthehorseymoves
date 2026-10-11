<script lang="ts">
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
  import { GAMES } from '$lib/games';
</script>

<Page
  title="Model Games"
  back={{ href: '/study', label: 'Back to study' }}
>
  <CardList>
    {#each GAMES as game}
      <LinkCard
        href="/games/{game.id}"
        title="{game.white} vs {game.black}"
        description="{game.event}, {game.year}"
      >
        {#snippet aside()}{game.result}{/snippet}
      </LinkCard>
    {/each}
  </CardList>
</Page>
