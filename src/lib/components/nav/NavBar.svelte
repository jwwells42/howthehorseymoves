<script lang="ts">
  import { page } from '$app/state';
  import { soundMuted, toggleMuted } from '$lib/state/sound';

  let path = $derived(page.url.pathname);
  let muted = $derived($soundMuted);

  const SECTIONS = [
    { label: 'Learn', href: '/' },
    { label: 'Tactics', href: '/tactics' },
    { label: 'Study', href: '/study' },
    { label: 'Play', href: '/play' },
    { label: 'Vision', href: '/vision' },
  ] as const;

  function isActive(section: typeof SECTIONS[number]): boolean {
    switch (section.label) {
      case 'Tactics':
        return path === '/tactics' || path.startsWith('/learn/tactics')
          || path === '/checkmates' || path.startsWith('/learn/checkmate');
      case 'Study':
        return path === '/study' || path.startsWith('/games')
          || path.startsWith('/openings')
          || path === '/endings'
          || path.startsWith('/learn/endings')
          || path.startsWith('/learn/pawn-endings');
      case 'Play':
        return path.startsWith('/play');
      case 'Vision':
        return path.startsWith('/vision');
      case 'Learn':
        // Learn catches everything not claimed by another hub
        if (path === '/') return true;
        for (const s of SECTIONS) {
          if (s.label !== 'Learn' && isActive(s)) return false;
        }
        return path.startsWith('/learn') || path.startsWith('/board')
          || path.startsWith('/setup');
      default:
        return false;
    }
  }
</script>

<nav class="navbar" aria-label="Main navigation">
  <a href="/" class="site-title">
    <img src="/favicon.svg" alt="Home" class="site-icon" />
    <span class="site-text">How The Horsey Moves</span>
  </a>
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
  <button
    class="mute-btn"
    onclick={toggleMuted}
    aria-label={muted ? 'Unmute sounds' : 'Mute sounds'}
  >
    {#if muted}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      </svg>
    {:else}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    {/if}
  </button>
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
    display: flex;
    align-items: center;
  }
  .site-icon {
    width: 1.5rem;
    height: 1.5rem;
    display: none;
  }
  @media (max-width: 640px) {
    .site-text { display: none; }
    .site-icon { display: block; }
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
  .mute-btn {
    margin-left: auto;
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s;
  }
  .mute-btn:hover {
    color: var(--foreground);
  }
</style>
