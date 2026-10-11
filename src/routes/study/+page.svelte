<script lang="ts">
  import Page from '$lib/components/ui/Page.svelte';
  import CardList from '$lib/components/ui/CardList.svelte';
  import LinkCard from '$lib/components/ui/LinkCard.svelte';
</script>

<Page
  title="Study"
  back={{ href: '/', label: 'Back to home' }}
>
  <CardList>
    <LinkCard href="/endings" icon="/pieces/wK.svg" title="Endings" />
    <LinkCard href="/openings" icon="/pieces/wP.svg" title="Openings" />
    <LinkCard href="/games" icon="/pieces/bK.svg" title="Model Games" />
    <LinkCard
      href="/editor"
      icon="/pieces/wQ.svg"
      title="Puzzle Creator"
    />
  </CardList>
</Page>
