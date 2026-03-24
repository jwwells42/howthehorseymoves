<script lang="ts">
  import { page } from '$app/state';

  let path = $derived(page.url.pathname);

  const SECTIONS = [
    { label: 'Learn', href: '/' },
    { label: 'Practice', href: '/practice' },
    { label: 'Study', href: '/study' },
    { label: 'Vision', href: '/vision' },
  ] as const;

  function isActive(section: typeof SECTIONS[number]): boolean {
    switch (section.label) {
      case 'Learn':
        return path === '/'
          || path.startsWith('/learn/rook') || path.startsWith('/learn/bishop')
          || path.startsWith('/learn/queen') || path.startsWith('/learn/king')
          || path.startsWith('/learn/knight') || path.startsWith('/learn/pawn')
          || path.startsWith('/learn/danger') || path.startsWith('/learn/how-to-win')
          || path.startsWith('/board') || path.startsWith('/setup')
          || path.startsWith('/play');
      case 'Practice':
        return path === '/practice'
          || path.startsWith('/learn/checkmate') || path.startsWith('/learn/tactics')
          || path.startsWith('/learn/endings');
      case 'Study':
        return path === '/study'
          || path.startsWith('/openings') || path.startsWith('/games')
          || path.startsWith('/editor');
      case 'Vision':
        return path === '/vision'
          || path.startsWith('/learn/blindfold');
      default:
        return false;
    }
  }
</script>

<nav class="navbar" aria-label="Main navigation">
  <a href="/" class="site-title">How The Horsey Moves</a>
  <div class="nav-links">
    {#each SECTIONS as section}
      <a
        href={section.href}
        class={['nav-link', isActive(section) && 'active']}
        aria-current={isActive(section) ? 'page' : undefined}
      >
        {section.label}
      </a>
    {/each}
  </div>
</nav>

<style>
  .navbar {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 1rem;
    height: 3rem;
    padding: 0 1rem;
    background: var(--background);
    border-bottom: 1px solid var(--card-border);
  }
  .site-title {
    font-weight: bold;
    font-size: 0.875rem;
    white-space: nowrap;
    color: var(--foreground);
    flex-shrink: 0;
  }
  .nav-links {
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .nav-link {
    font-size: 0.8125rem;
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    color: var(--text-muted);
    white-space: nowrap;
    transition: color 0.15s, background 0.15s;
  }
  .nav-link:hover {
    color: var(--foreground);
    background: var(--btn-bg);
  }
  .nav-link.active {
    color: var(--foreground);
    background: var(--btn-bg);
    font-weight: bold;
  }
</style>
