<script lang="ts">
  import { onMount } from 'svelte';
  import Page from '$lib/components/ui/Page.svelte';

  // Every student account the server holds (teacher only, off the nav): when
  // each was last used, how much it holds, and a way to delete one, for when
  // the school, a parent or a student asks (see PRIVACY.md).

  interface Account {
    id: string;
    username: string;
    created_at: string;
    seen_at: string;
    updated_at: string;
    bytes: number;
  }

  let status = $state<'loading' | 'locked' | 'unavailable' | 'ready'>('loading');
  let accounts = $state<Account[]>([]);
  let armed = $state<string | null>(null);
  let failed = $state<string | null>(null);

  async function load() {
    const res = await fetch('/api/accounts');
    if (res.status === 403) return (status = 'locked');
    if (!res.ok) return (status = 'unavailable');
    accounts = (await res.json()).accounts;
    status = 'ready';
  }

  async function remove(id: string) {
    armed = null;
    const res = await fetch(`/api/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (res.ok) {
      failed = null;
      accounts = accounts.filter((a) => a.id !== id);
    } else {
      failed = id;
    }
  }

  function day(iso: string): string {
    return iso ? iso.slice(0, 10) : '';
  }

  function size(bytes: number): string {
    return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`;
  }

  let largest = $derived(accounts.reduce((m, a) => Math.max(m, a.bytes), 0));

  onMount(load);
</script>

<Page title="Accounts" back={{ href: '/privacy', label: 'Back to privacy' }}>
  {#if status === 'loading'}
    <p class="muted">…</p>
  {:else if status === 'locked'}
    <p class="symbol" aria-label="Locked">🔒</p>
  {:else if status === 'unavailable'}
    <p class="symbol wrong" role="alert">✗</p>
  {:else}
    <p class="summary">
      <span class="count">{accounts.length}</span>
      {#if accounts.length}<span class="muted">Largest: {size(largest)}</span>{/if}
    </p>
    {#if accounts.length}
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Lichess</th>
              <th>Created</th>
              <th>Login</th>
              <th>Saved</th>
              <th class="num">Size</th>
              <th><span class="sr-only">Delete</span></th>
            </tr>
          </thead>
          <tbody>
            {#each accounts as account (account.id)}
              <tr>
                <td>{account.username}</td>
                <td>{day(account.created_at)}</td>
                <td>{day(account.seen_at)}</td>
                <td>{day(account.updated_at)}</td>
                <td class="num">{size(account.bytes)}</td>
                <td class="actions">
                  <span class="buttons">
                  {#if armed === account.id}
                    <button class="confirm" onclick={() => remove(account.id)} aria-label="Delete {account.username}">&#10003;</button>
                    <button onclick={() => (armed = null)} aria-label="Cancel">&#10007;</button>
                  {:else}
                    <button onclick={() => (armed = account.id)} aria-label="Delete {account.username}">🗑</button>
                    {#if failed === account.id}<span class="wrong" role="alert">&#10007;</span>{/if}
                  {/if}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</Page>

<style>
  .muted {
    color: var(--ink-muted);
  }
  .wrong {
    color: var(--wrong-text);
  }
  .symbol {
    font-size: var(--size-title);
  }
  .summary {
    display: flex;
    gap: 1rem;
    align-items: baseline;
  }
  .count {
    font-weight: var(--weight-strong);
  }
  /* Positioned, so the screen-reader-only header inside stays inside it
     instead of widening the page */
  .table-wrap {
    position: relative;
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--size-secondary);
  }
  th,
  td {
    text-align: left;
    padding: 0.375rem 0.5rem;
    border-bottom: 1px solid var(--line);
    white-space: nowrap;
  }
  th {
    font-weight: var(--weight-strong);
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .actions {
    text-align: right;
  }
  .buttons {
    display: inline-flex;
    gap: 0.25rem;
  }
  .actions button {
    background: var(--surface-raised);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 0.375rem;
    padding: 0.25rem 0.625rem;
    font-size: var(--size-secondary);
    cursor: pointer;
  }
  .actions button.confirm {
    background: var(--wrong);
    color: var(--on-answer);
    font-weight: var(--weight-strong);
  }
</style>
