/**
 * Neon Postgres, over HTTP: one row per student (scripts/schema.sql), holding
 * their progress as one JSON document, the same entries the browser keeps in
 * localStorage (see $lib/sync/merge). The HTTP driver rather than a pooled
 * client because each request is a serverless function wanting one round trip.
 */

import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';
import { coerceSnapshot, mergeSnapshots, type Snapshot } from '$lib/sync/merge';

/** Sign-in is offered only when everything it needs is set. */
export function isConfigured(): boolean {
  return Boolean(env.DATABASE_URL && env.SESSION_SECRET && env.APP_ORIGIN);
}

function sql() {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL missing');
  return neon(env.DATABASE_URL);
}

export async function upsertUser(id: string, username: string): Promise<void> {
  await sql()`
    insert into horsey_users (id, username)
    values (${id}, ${username})
    on conflict (id) do update set username = excluded.username, seen_at = now()
  `;
}

export async function getUsername(id: string): Promise<string | null> {
  const rows = (await sql()`select username from horsey_users where id = ${id}`) as { username: string }[];
  return rows[0]?.username ?? null;
}

async function read(id: string): Promise<{ progress: Snapshot; version: number } | null> {
  const rows = (await sql()`select progress, version from horsey_users where id = ${id}`) as {
    progress: unknown;
    version: number;
  }[];
  if (rows.length === 0) return null;
  return { progress: coerceSnapshot(rows[0].progress), version: rows[0].version };
}

/** A missing row and a damaged one both read as no progress. */
export async function getProgress(id: string): Promise<Snapshot> {
  return (await read(id))?.progress ?? {};
}

/**
 * Merges `incoming` into what is stored and returns the result. Two requests
 * at once (two tabs) would otherwise both read the same row and the second
 * write would drop the first's progress, so a write only lands if the row is
 * still the version that was read; if not, it reads again and re-merges.
 */
export async function mergeProgress(id: string, incoming: Snapshot): Promise<Snapshot> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await read(id);
    if (!row) throw new Error('no such user');
    const merged = mergeSnapshots(row.progress, incoming);
    // Nothing new: no write
    if (JSON.stringify(merged) === JSON.stringify(row.progress)) return merged;
    const updated = (await sql()`
      update horsey_users
         set progress = ${JSON.stringify(merged)}::jsonb,
             version = version + 1,
             updated_at = now()
       where id = ${id} and version = ${row.version}
       returning id
    `) as { id: string }[];
    if (updated.length > 0) return merged;
  }
  throw new Error('busy');
}
