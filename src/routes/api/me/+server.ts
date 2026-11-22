import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE, readSession } from '$lib/server/session';
import { getUsername, isConfigured, deleteUser } from '$lib/server/db';
import { isTeacher } from '$lib/server/access';

/**
 * Who is logged in. `available: false` when this deployment has no database
 * set up, so the nav bar shows no login at all rather than one that can't work.
 * `teacher` is true for the ids in TEACHER_LICHESS_IDS (see server/access.ts).
 */
export const GET: RequestHandler = async ({ cookies }) => {
  const available = isConfigured();
  if (!available) return json({ username: null, available, teacher: false });
  const userId = readSession(cookies.get(SESSION_COOKIE));
  if (!userId) return json({ username: null, available, teacher: false });
  try {
    return json({ username: await getUsername(userId), available, teacher: isTeacher(userId) });
  } catch {
    // Database unreachable: logged out, and the site carries on with localStorage
    return json({ username: null, available, teacher: false });
  }
};

/**
 * DELETE: the logged-in student deletes everything the server holds about
 * them, and is logged out. What is saved in this browser stays (clearing the
 * browser's data removes that). Logging in again starts a new copy.
 */
export const DELETE: RequestHandler = async ({ cookies }) => {
  const userId = readSession(cookies.get(SESSION_COOKIE));
  if (!userId) return json({ error: 'logged out' }, { status: 401 });
  try {
    await deleteUser(userId);
  } catch {
    return json({ error: 'unavailable' }, { status: 503 });
  }
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return json({ ok: true });
};
