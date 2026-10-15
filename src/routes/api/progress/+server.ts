import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE, readSession } from '$lib/server/session';
import { getProgress, mergeProgress } from '$lib/server/db';
import { coerceSnapshot } from '$lib/sync/merge';

const MAX_BODY_BYTES = 1_000_000;

/** GET: everything saved for the logged-in student. */
export const GET: RequestHandler = async ({ cookies }) => {
  const userId = readSession(cookies.get(SESSION_COOKIE));
  if (!userId) return json({ error: 'logged out' }, { status: 401 });
  try {
    return json({ entries: await getProgress(userId) });
  } catch {
    return json({ error: 'unavailable' }, { status: 503 });
  }
};

/**
 * POST { entries }: some of the student's progress entries, merged into what
 * is saved (see $lib/sync/merge: nothing is ever lost, and sending the same
 * thing twice changes nothing). Answers with the merged value of each entry
 * sent, which may hold more than was sent if another device saved first.
 */
export const POST: RequestHandler = async ({ cookies, request }) => {
  const userId = readSession(cookies.get(SESSION_COOKIE));
  if (!userId) return json({ error: 'logged out' }, { status: 401 });

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: 'too large' }, { status: 413 });
  let entries;
  try {
    entries = coerceSnapshot(JSON.parse(text)?.entries);
  } catch {
    return json({ error: 'bad json' }, { status: 400 });
  }

  try {
    const merged = await mergeProgress(userId, entries);
    const sent = Object.fromEntries(Object.keys(entries).flatMap((key) => (key in merged ? [[key, merged[key]]] : [])));
    return json({ entries: sent });
  } catch {
    return json({ error: 'unavailable' }, { status: 503 });
  }
};
