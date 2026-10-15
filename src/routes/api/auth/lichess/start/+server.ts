import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OAUTH_COOKIE, OAUTH_TTL_SECONDS, safeBack, startAuth } from '$lib/server/lichess';

/**
 * Leg one: make `state` and `code_verifier`, keep them in an httpOnly cookie,
 * and send the student to Lichess. `?back=/some/page` is where they come
 * back to afterwards.
 */
export const GET: RequestHandler = ({ url, cookies }) => {
  const back = safeBack(url.searchParams.get('back'));
  let started: ReturnType<typeof startAuth>;
  try {
    started = startAuth(back);
  } catch {
    // Not set up on this deployment (no APP_ORIGIN)
    redirect(303, back);
  }
  cookies.set(OAUTH_COOKIE, JSON.stringify(started.pending), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    maxAge: OAUTH_TTL_SECONDS,
  });
  redirect(303, started.authorizeUrl);
};
