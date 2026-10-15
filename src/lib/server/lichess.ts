/**
 * Signing in with Lichess: OAuth 2.0, authorization code with PKCE. Ported
 * from polgar-trainer.
 *
 * Lichess has no app registration and no client secret: `client_id` is any
 * string. That also means Lichess checks no `redirect_uri` against a list,
 * so a token some *other* site obtained could be offered to us as a login if
 * we took tokens from the browser. We don't: the code is exchanged here, on
 * the server, against a `code_verifier` we made and kept in an httpOnly
 * cookie, so the only tokens we ever see come from a sign-in we started.
 *
 * `GET /api/account` needs a token but no scope, so no scope is asked for and
 * the Lichess consent screen asks for no permissions at all. The token is
 * used once, to learn a username, and then revoked.
 */

import { createHash } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { randomToken } from './session';

const AUTHORIZE_URL = 'https://lichess.org/oauth';
const TOKEN_URL = 'https://lichess.org/api/token';
const ACCOUNT_URL = 'https://lichess.org/api/account';

/** Holds `state`, `code_verifier` and where to go afterwards, between the two legs. */
export const OAUTH_COOKIE = 'horsey-oauth';

/** Long enough to read the consent screen, short enough not to linger. */
export const OAUTH_TTL_SECONDS = 10 * 60;

/**
 * `redirect_uri` must be the same, byte for byte, in both legs, so it comes
 * from APP_ORIGIN rather than from request headers, which a proxy or a
 * preview URL could change between the two.
 */
export function appOrigin(): string {
  const origin = env.APP_ORIGIN;
  if (!origin) throw new Error('APP_ORIGIN missing');
  return origin.replace(/\/$/, '');
}

function clientId(): string {
  return env.LICHESS_CLIENT_ID || appOrigin();
}

function redirectUri(): string {
  return `${appOrigin()}/api/auth/lichess/callback`;
}

export interface PendingAuth {
  state: string;
  verifier: string;
  /** The page to come back to, a path on this site */
  back: string;
}

export function startAuth(back: string): { pending: PendingAuth; authorizeUrl: string } {
  const state = randomToken();
  const verifier = randomToken();
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId());
  url.searchParams.set('redirect_uri', redirectUri());
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('state', state);
  // No `scope`: a username is all we want, and /api/account needs no scope to give it

  return { pending: { state, verifier, back }, authorizeUrl: url.toString() };
}

/** Only a path on this site, so the sign-in can't be used to send someone elsewhere. */
export function safeBack(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  if (value.startsWith('/api/')) return '/';
  return value;
}

export async function exchangeCode(code: string, verifier: string): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri(),
      client_id: clientId(),
    }),
  });
  if (!res.ok) throw new Error(`token exchange: ${res.status}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('no access_token');
  return json.access_token;
}

export interface LichessAccount {
  id: string;
  username: string;
}

export async function fetchAccount(token: string): Promise<LichessAccount> {
  const res = await fetch(ACCOUNT_URL, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`account: ${res.status}`);
  const json = (await res.json()) as { id?: string; username?: string };
  if (!json.id || !json.username) throw new Error('account: no id');
  return { id: json.id.toLowerCase(), username: json.username };
}

/**
 * Hands the token straight back: nothing here acts on a Lichess account, so
 * keeping it would only be a risk. A failure to revoke doesn't fail the
 * sign-in; the token expires on its own.
 */
export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch(TOKEN_URL, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  } catch {}
}
