/**
 * Keeping a logged-in student's progress on the server as well, so it
 * follows them to any Chromebook and survives a cleared browser.
 *
 * localStorage stays the source of truth: nothing on the site waits on the
 * network, and every failure here is swallowed. Logged out, or on a
 * deployment with no database, the site works exactly as it did without
 * this. (The approach is polgar-trainer's.)
 *
 * - On load, and when the tab comes back into view: fetch what the server
 *   has, merge it in (src/lib/sync/merge.ts), and send what it's missing.
 * - After progress is saved (storage.ts's noteChange): send the entries
 *   that changed, a few seconds later so a run of puzzles is one request.
 * - When the tab is hidden or closed: send anything still waiting.
 */

import { writable, get } from 'svelte/store';
import { isSynced, mergeValue, type Snapshot } from './merge';
import { onChange } from '$lib/state/storage';

export interface SyncStatus {
  /** False when this deployment has no login set up: show none */
  available: boolean;
  /** Null when logged out */
  username: string | null;
  state: 'off' | 'idle' | 'syncing' | 'error';
}

export const syncStatus = writable<SyncStatus>({ available: false, username: null, state: 'off' });

function setStatus(patch: Partial<SyncStatus>) {
  syncStatus.update((s) => ({ ...s, ...patch }));
}

function loggedIn(): boolean {
  return get(syncStatus).username !== null;
}

/** Wait after a save before sending, so a run of saves is one request. */
const DEBOUNCE_MS = 3000;
/** Shortest gap between the checks made when the tab comes back into view. */
const REVISIT_MS = 60_000;
/** The browser's limit for a request sent as the tab closes is 64 KB. */
const KEEPALIVE_MAX = 60_000;

/** Each entry as the server is known to have it. What differs from this gets sent. */
let onServer: Snapshot = {};
let lastSynced = 0;

function readLocal(): Snapshot {
  const out: Snapshot = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !isSynced(key)) continue;
      const value = localStorage.getItem(key);
      if (value !== null) out[key] = value;
    }
  } catch {}
  return out;
}

/** Same progress, whatever the spelling (key order, spacing). */
function same(key: string, a: string | undefined, b: string | undefined): boolean {
  return mergeValue(key, a, undefined) === mergeValue(key, b, undefined);
}

/**
 * Merges entries from the server into localStorage. When anything changed,
 * tells this tab's pages the same way another tab's save would: a `storage`
 * event (the progress store and the opening trainer listen for it).
 */
function adopt(remote: Snapshot) {
  let changed = false;
  try {
    for (const [key, value] of Object.entries(remote)) {
      if (!isSynced(key)) continue;
      const local = localStorage.getItem(key) ?? undefined;
      const merged = mergeValue(key, local, value);
      if (merged === undefined || same(key, local, merged)) continue;
      localStorage.setItem(key, merged);
      changed = true;
    }
  } catch {}
  if (changed) window.dispatchEvent(new StorageEvent('storage', { key: null }));
}

/** Notes what the server now has, for the entries in `remote`. */
function remember(remote: Snapshot) {
  for (const [key, value] of Object.entries(remote)) {
    let local: string | undefined;
    try {
      local = localStorage.getItem(key) ?? undefined;
    } catch {}
    // Spelled as localStorage spells it, so an unchanged entry isn't sent again
    onServer[key] = local !== undefined && same(key, local, value) ? local : value;
  }
}

// One request at a time, in order
let queue: Promise<void> = Promise.resolve();
function enqueue(job: () => Promise<void>): Promise<void> {
  queue = queue.then(job, job).catch(() => {
    setStatus({ state: 'error' });
  });
  return queue;
}

async function send(closing = false): Promise<void> {
  if (!loggedIn()) return;
  const local = readLocal();
  const changed: Snapshot = {};
  for (const [key, value] of Object.entries(local)) {
    if (onServer[key] !== value) changed[key] = value;
  }
  if (Object.keys(changed).length === 0) return;
  const body = JSON.stringify({ entries: changed });
  setStatus({ state: 'syncing' });
  const res = await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: closing && body.length < KEEPALIVE_MAX,
  });
  if (res.status === 401) {
    setStatus({ username: null, state: 'off' });
    return;
  }
  if (!res.ok) throw new Error(String(res.status));
  const { entries } = (await res.json()) as { entries: Snapshot };
  adopt(entries);
  remember(entries);
  lastSynced = Date.now();
  setStatus({ state: 'idle' });
}

/** Both ways: take what the server has, then send what it's missing. */
async function reconcile(): Promise<void> {
  if (!loggedIn()) return;
  setStatus({ state: 'syncing' });
  const res = await fetch('/api/progress');
  if (res.status === 401) {
    setStatus({ username: null, state: 'off' });
    return;
  }
  if (!res.ok) throw new Error(String(res.status));
  const { entries } = (await res.json()) as { entries: Snapshot };
  adopt(entries);
  onServer = {};
  remember(entries);
  lastSynced = Date.now();
  await send();
  setStatus({ state: 'idle' });
}

let timer: ReturnType<typeof setTimeout> | null = null;

function schedule() {
  if (!loggedIn()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void enqueue(() => send());
  }, DEBOUNCE_MS);
}

function flush() {
  if (!loggedIn()) return;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  void enqueue(() => send(true));
}

let started = false;

/** Once per page load, from the root layout. */
export async function startSync(): Promise<void> {
  if (started) return;
  started = true;

  try {
    const res = await fetch('/api/me');
    if (!res.ok) return;
    const me = (await res.json()) as { username: string | null; available: boolean };
    setStatus({ available: me.available, username: me.username, state: me.username ? 'idle' : 'off' });
  } catch {
    return;
  }

  onChange(schedule);
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush();
    } else if (loggedIn() && Date.now() - lastSynced > REVISIT_MS) {
      // Back to this tab: pick up what another device did meanwhile
      void enqueue(reconcile);
    }
  });

  if (loggedIn()) await enqueue(reconcile);
}

/** The link that starts a Lichess login and comes back to `back`. */
export function loginHref(back: string): string {
  return `/api/auth/lichess/start?back=${encodeURIComponent(back)}`;
}

export async function logOut(): Promise<void> {
  // Send what's waiting first, so nothing done here is missing next time
  flush();
  await queue;
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {}
  onServer = {};
  setStatus({ username: null, state: 'off' });
}
