<script lang="ts">
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
</script>

<Page
  title="Study"
  subtitle="Endings, openings, model games, and puzzle creation."
  back={{ href: '/', label: 'Back to home' }}
>
  <CardList>
    <LinkCard href="/endings" icon="/pieces/wK.svg" title="Endings" description="Master essential endgame techniques." />
    <LinkCard href="/openings" icon="/pieces/wP.svg" title="Openings" description="Learn opening lines move by move." />
    <LinkCard href="/games" icon="/pieces/bK.svg" title="Model Games" description="Study famous games move by move." />
    <LinkCard
      href="/editor"
      icon="/pieces/wQ.svg"
      title="Puzzle Creator"
      description="Place pieces and generate FEN strings for new puzzles."
    />
  </CardList>
</Page>
