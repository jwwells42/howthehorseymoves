<script lang="ts">
  import { page } from '$app/state';
  import { soundMuted, toggleMuted } from '$lib/state/sound';
  import { syncStatus, loginHref, logOut } from '$lib/sync/client';

  let path = $derived(page.url.pathname);
  let muted = $derived($soundMuted);
  let sync = $derived($syncStatus);

  // A failed login comes back with ?login=✗ (see api/auth/lichess/callback)
  let loginFailed = $derived(page.url.searchParams.get('login') === '✗');
  let back = $derived.by(() => {
    const params = new URLSearchParams(page.url.search);
    params.delete('login');
    const query = params.toString();
    return page.url.pathname + (query ? `?${query}` : '');
  });

  let accountMenu = $state<HTMLDetailsElement | null>(null);
  async function handleLogOut() {
    if (accountMenu) accountMenu.open = false;
    await logOut();
  }

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

<!-- A person: filled when logged in -->
{#snippet person(filled: boolean)}
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4"></circle>
    <path d="M4 21a8 8 0 0 1 16 0"></path>
  </svg>
{/snippet}

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
  <div class="nav-end">
    <!-- Only when this deployment has a database: see src/lib/sync -->
    {#if sync.available}
      {#if sync.username}
        <details class="account" bind:this={accountMenu}>
          <summary class="account-btn">
            {@render person(true)}
            <span class="account-name">{sync.username}</span>
            {#if sync.state === 'error'}<span class="bad" role="img" aria-label="Not saved">&#10007;</span>{/if}
          </summary>
          <div class="account-menu">
            <button class="menu-item" onclick={handleLogOut}>Log out</button>
          </div>
        </details>
      {:else}
        <a class="account-btn" href={loginHref(back)} data-sveltekit-reload>
          {@render person(false)}
          <span class="account-name">Lichess login</span>
          {#if loginFailed}<span class="bad" role="img" aria-label="Login failed">&#10007;</span>{/if}
        </a>
      {/if}
    {/if}
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
    background: var(--page);
    border-bottom: 1px solid var(--line);
  }
  .site-title {
    font-weight: var(--weight-strong);
    font-size: var(--size-secondary);
    white-space: nowrap;
    color: var(--ink);
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  .site-icon {
    width: 1.5rem;
    height: 1.5rem;
    display: none;
  }
  .nav-links {
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .nav-link {
    font-size: var(--size-small);
    padding: 0.375rem 0.625rem;
    border-radius: 0.375rem;
    color: var(--ink-muted);
    white-space: nowrap;
    transition: color 0.15s, background 0.15s;
  }
  .nav-link:hover {
    color: var(--ink);
    background: var(--surface-raised);
  }
  .nav-link.active {
    color: var(--ink);
    background: var(--surface-raised);
    font-weight: var(--weight-strong);
  }
  /* The account and the sound button sit at the right end */
  .nav-end {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }
  .account {
    position: relative;
    flex-shrink: 0;
  }
  .account-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex-shrink: 0;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    font-size: var(--size-small);
    color: var(--ink-muted);
    white-space: nowrap;
    cursor: pointer;
    list-style: none;
    transition: color 0.15s, background 0.15s;
  }
  .account-btn::-webkit-details-marker {
    display: none;
  }
  .account-btn:hover,
  .account[open] .account-btn {
    color: var(--ink);
    background: var(--surface-raised);
  }
  .bad {
    color: var(--wrong-text);
    font-weight: var(--weight-strong);
  }
  .account-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 0.25rem);
    padding: 0.25rem;
    border: 1px solid var(--line);
    border-radius: 0.5rem;
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .menu-item {
    padding: 0.5rem 0.75rem;
    border: none;
    border-radius: 0.375rem;
    background: none;
    color: var(--ink);
    font-size: var(--size-secondary);
    white-space: nowrap;
    cursor: pointer;
  }
  .menu-item:hover {
    background: var(--surface-raised);
  }
  .mute-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    color: var(--ink-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.15s;
  }
  .mute-btn:hover {
    color: var(--ink);
  }

  /* On a phone the title becomes the icon and everything packs closer, so
     all five links fit without scrolling */
  @media (max-width: 640px) {
    .site-text { display: none; }
    .account-name { display: none; }
    .site-icon { display: block; }
    .navbar { gap: 0.25rem; padding: 0 0.75rem; }
    .nav-links { gap: 0; }
    .nav-link { padding: 0.375rem; }
    .nav-end { gap: 0; }
    .account-btn { padding: 0.25rem; }
    .mute-btn { padding: 0.125rem; }
  }
</style>
