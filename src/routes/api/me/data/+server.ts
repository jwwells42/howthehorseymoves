import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE, readSession } from '$lib/server/session';
import { exportUser } from '$lib/server/db';

/**
 * GET: everything the server holds about the logged-in student, as a file to
 * keep (see PRIVACY.md: students and parents may see what is held).
 */
export const GET: RequestHandler = async ({ cookies }) => {
  const userId = readSession(cookies.get(SESSION_COOKIE));
  if (!userId) return json({ error: 'logged out' }, { status: 401 });
  try {
    const data = await exportUser(userId);
    if (!data) return json({ error: 'not found' }, { status: 404 });
    return new Response(JSON.stringify({ lichessId: userId, ...data }, null, 2), {
      headers: {
        'content-type': 'application/json',
        'content-disposition': `attachment; filename="howthehorseymoves-${userId}.json"`,
        'cache-control': 'no-store',
      },
    });
  } catch {
    return json({ error: 'unavailable' }, { status: 503 });
  }
};
