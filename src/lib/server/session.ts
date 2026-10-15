/**
 * The session cookie.
 *
 * Once the Lichess sign-in has told us who someone is, the Lichess token has
 * done its whole job and is thrown away (see api/auth/lichess/callback). What
 * carries the student from then on is this: their Lichess user id and an
 * expiry, signed with a secret only the server knows. An HMAC rather than a
 * JWT library, because that is all it needs to be. (The same as
 * polgar-trainer's.)
 */

import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';

export const SESSION_COOKIE = 'horsey-session';

/** A school year and then some. There is nothing to refresh. */
const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

function secret(): string {
  const value = env.SESSION_SECRET;
  if (!value) throw new Error('SESSION_SECRET missing');
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/** `<userId>.<expiry>.<signature>`, the id base64url'd so a dot in it can't split it. */
export function issueSession(userId: string, now: number = Date.now()): string {
  const payload = `${Buffer.from(userId, 'utf8').toString('base64url')}.${now + SESSION_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

/** The user id in a session cookie, or null if it's missing, forged or expired. */
export function readSession(token: string | undefined, now: number = Date.now()): string | null {
  if (!token) return null;
  try {
    const cut = token.lastIndexOf('.');
    if (cut <= 0) return null;
    const payload = token.slice(0, cut);
    const given = Buffer.from(token.slice(cut + 1), 'base64url');
    const want = Buffer.from(sign(payload), 'base64url');
    // Compare before parsing, and only equal lengths: timingSafeEqual throws otherwise
    if (given.length !== want.length || !timingSafeEqual(given, want)) return null;

    const [encodedId, expiry] = payload.split('.');
    if (!encodedId || !expiry || !(Number(expiry) > now)) return null;
    return Buffer.from(encodedId, 'base64url').toString('utf8') || null;
  } catch {
    return null;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * `lax`, not `strict`: the cookie is set on the redirect back from
 * lichess.org, and a strict cookie isn't sent on that navigation.
 */
export function sessionCookieOptions(secure: boolean) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
