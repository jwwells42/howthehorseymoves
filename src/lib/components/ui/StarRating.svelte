<script lang="ts">
  interface Props {
    stars: number;
    size?: 'sm' | 'md' | 'lg';
  }
  let { stars, size = 'md' }: Props = $props();
</script>

<span class="star-rating {size}">
  {#each [1, 2, 3] as i}
    <span class={i <= stars ? 'filled' : 'empty'}>&#9733;</span>
  {/each}
</span>

<style>
  .star-rating {
    display: inline-flex;
  }
  .sm { font-size: 0.875rem; }
  .md { font-size: 1.5rem; }
  .lg { font-size: 2.25rem; }
  .filled { color: #facc15; }
  .empty { color: var(--text-faint); opacity: 0.4; }
</style>
