import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE, readSession } from '$lib/server/session';
import { getUsername, isConfigured } from '$lib/server/db';
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
