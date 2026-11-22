/**
 * Who may see what, once the session cookie says who someone is.
 *
 * The teacher is whoever's Lichess id is in TEACHER_LICHESS_IDS (a Vercel
 * setting; several ids separated by commas). The teacher alone opens the
 * games library and edits studies. Everyone else is a reader.
 */

import type { Cookies } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { SESSION_COOKIE, readSession } from './session';
import { isConfigured } from './db';

/** The teacher ids from TEACHER_LICHESS_IDS, lowercased (as Lichess ids are). */
function teacherIds(): Set<string> {
  return new Set(
    (env.TEACHER_LICHESS_IDS ?? '')
      .split(',')
      .map((id) => id.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isTeacher(userId: string | null | undefined): boolean {
  return !!userId && teacherIds().has(userId.toLowerCase());
}

/**
 * The logged-in teacher's id, or why not: 'unavailable' (no database on this
 * deployment) or 'forbidden' (logged out, or not the teacher).
 */
export function teacherFrom(cookies: Cookies): { userId: string } | { error: 'unavailable' | 'forbidden' } {
  if (!isConfigured()) return { error: 'unavailable' };
  const userId = readSession(cookies.get(SESSION_COOKIE));
  if (!userId || !isTeacher(userId)) return { error: 'forbidden' };
  return { userId };
}

export const ERROR_STATUS = { unavailable: 503, forbidden: 403 } as const;
