import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { teacherFrom, ERROR_STATUS } from '$lib/server/access';
import { listGames, importGames, deleteAllGames, spaceUsed } from '$lib/server/library';

/** Vercel refuses a request body over 4.5 MB; the page sends less than this at a time. */
const MAX_BODY_BYTES = 4_000_000;
const PAGE = 2000;

/**
 * GET ?after=<id>: a page of games (id + summary), in id order. Ask again with
 * the last id until `more` is false. The first page also says how much of the
 * database is used (`bytes`).
 */
export const GET: RequestHandler = async ({ cookies, url }) => {
  const teacher = teacherFrom(cookies);
  if ('error' in teacher) return json(teacher, { status: ERROR_STATUS[teacher.error] });
  const after = url.searchParams.get('after') ?? '';
  try {
    const games = await listGames(after, PAGE);
    const bytes = after ? undefined : await spaceUsed();
    return json({ games, more: games.length === PAGE, bytes });
  } catch {
    return json({ error: 'unavailable' }, { status: 503 });
  }
};

/** POST: PGN text (any number of games). Adds the ones not already there. */
export const POST: RequestHandler = async ({ cookies, request }) => {
  const teacher = teacherFrom(cookies);
  if ('error' in teacher) return json(teacher, { status: ERROR_STATUS[teacher.error] });
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: 'too large' }, { status: 413 });
  try {
    return json(await importGames(text));
  } catch {
    return json({ error: 'unavailable' }, { status: 503 });
  }
};

/** DELETE: every game in the library. */
export const DELETE: RequestHandler = async ({ cookies }) => {
  const teacher = teacherFrom(cookies);
  if ('error' in teacher) return json(teacher, { status: ERROR_STATUS[teacher.error] });
  try {
    await deleteAllGames();
    return json({ ok: true });
  } catch {
    return json({ error: 'unavailable' }, { status: 503 });
  }
};
