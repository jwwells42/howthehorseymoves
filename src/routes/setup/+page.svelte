<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { onMount } from 'svelte';

  // Keeps ?stop= when opened from the path
  onMount(() => {
    goto(`/setup/rooks${page.url.search}`, { replaceState: true });
  });
</script>
