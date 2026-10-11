<script lang="ts">
  import CoordinateTrainer from '$lib/components/board/CoordinateTrainer.svelte';
  import BoardPage from '$lib/components/board/BoardPage.svelte';
</script>

<BoardPage back={{ href: '/board', label: 'Back to The Board' }}>
  <CoordinateTrainer title="Name the Square" />
</BoardPage>
