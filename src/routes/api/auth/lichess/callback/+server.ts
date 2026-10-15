import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { OAUTH_COOKIE, exchangeCode, fetchAccount, revokeToken, safeBack } from '$lib/server/lichess';
import { SESSION_COOKIE, issueSession, sessionCookieOptions } from '$lib/server/session';
import { upsertUser } from '$lib/server/db';

/**
 * Leg two: Lichess sends the student back here. Every way out is a redirect
 * to the page they started from; on failure with `?login=✗`, which the nav
 * bar shows. Cancelling on the Lichess screen isn't a failure.
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
  const raw = cookies.get(OAUTH_COOKIE);
  // One use only, whichever way this goes
  cookies.delete(OAUTH_COOKIE, { path: '/' });

  let pending: { state?: string; verifier?: string; back?: string } = {};
  try {
    pending = raw ? JSON.parse(raw) : {};
  } catch {}
  const back = safeBack(pending.back);
  const failed = () => {
    const to = new URL(back, url.origin);
    to.searchParams.set('login', '✗');
    return to.pathname + to.search;
  };

  const error = url.searchParams.get('error');
  if (error) redirect(303, error === 'access_denied' ? back : failed());

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  // The CSRF check: this answer must belong to the sign-in we started
  if (!code || !state || !pending.state || !pending.verifier || pending.state !== state) redirect(303, failed());

  let userId: string;
  try {
    const token = await exchangeCode(code, pending.verifier);
    const account = await fetchAccount(token);
    // The token has told us everything we wanted from it
    await revokeToken(token);
    await upsertUser(account.id, account.username);
    userId = account.id;
  } catch {
    redirect(303, failed());
  }

  cookies.set(SESSION_COOKIE, issueSession(userId), sessionCookieOptions(url.protocol === 'https:'));
  redirect(303, back);
};
