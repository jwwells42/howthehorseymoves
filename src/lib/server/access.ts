/**
 * Who may see what, once the session cookie says who someone is.
 *
 * The teacher is whoever's Lichess id is in TEACHER_LICHESS_IDS (a Vercel
 * setting; several ids separated by commas). The teacher alone opens the
 * games library and edits studies. Everyone else is a reader.
 */

import { env } from '$env/dynamic/private';

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
