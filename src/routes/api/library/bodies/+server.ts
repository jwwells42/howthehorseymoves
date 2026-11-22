import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { teacherFrom, ERROR_STATUS } from '$lib/server/access';
import { getBodies } from '$lib/server/library';

/** Up to this many games' PGN at once (an export asks in batches). */
const MAX_IDS = 300;

/** POST { ids }: those games' PGN, for exporting them as one file. */
export const POST: RequestHandler = async ({ cookies, request }) => {
  const teacher = teacherFrom(cookies);
  if ('error' in teacher) return json(teacher, { status: ERROR_STATUS[teacher.error] });
  let ids: string[];
  try {
    const raw = (await request.json())?.ids;
    if (!Array.isArray(raw) || raw.length > MAX_IDS || !raw.every((id) => typeof id === 'string' && id.length < 64)) {
      return json({ error: 'bad ids' }, { status: 400 });
    }
    ids = raw;
  } catch {
    return json({ error: 'bad json' }, { status: 400 });
  }
  try {
    return json({ games: await getBodies(ids) });
  } catch {
    return json({ error: 'unavailable' }, { status: 503 });
  }
};
