<script lang="ts">
  interface Props {
    stars: number;
    size?: 'sm' | 'md' | 'lg';
  }
  let { stars, size = 'md' }: Props = $props();
</script>

<span class={['star-rating', size]} role="img" aria-label="{stars} of 3 stars">
  {#each [1, 2, 3] as i}
    <span class={i <= stars ? 'filled' : 'empty'} aria-hidden="true">&#9733;</span>
  {/each}
</span>

<style>
  .star-rating {
    display: inline-flex;
  }
  .sm { font-size: var(--size-body); }
  .md { font-size: var(--size-large); }
  .lg { font-size: var(--size-title); }
  .filled { color: var(--star); }
  .empty { color: var(--line); }
</style>
