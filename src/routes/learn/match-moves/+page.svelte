<script lang="ts">
  import Page from '$lib/components/ui/Page.svelte';
  import MatchTheMoves from '$lib/components/pieces/MatchTheMoves.svelte';
</script>

<Page title="Match the Moves" back={{ href: '/', label: 'Back to home' }} width="wide">
  <MatchTheMoves />
</Page>
