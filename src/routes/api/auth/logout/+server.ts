import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SESSION_COOKIE } from '$lib/server/session';

/**
 * Logging out drops the cookie and nothing else. Progress stays in this
 * browser (it was earned here), and stays on the server for the next login.
 */
export const POST: RequestHandler = ({ cookies }) => {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return json({ ok: true });
};
