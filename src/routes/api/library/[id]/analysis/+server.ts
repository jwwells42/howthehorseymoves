import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { teacherFrom, ERROR_STATUS } from '$lib/server/access';
import { saveAnalysis } from '$lib/server/library';

/** A game's analysis is a few KB; anything near this is not one */
const MAX_BYTES = 200_000;

/** PUT: Stockfish's check of a game, made in the teacher's browser (see $lib/engine/review). */
export const PUT: RequestHandler = async ({ cookies, params, request }) => {
  const teacher = teacherFrom(cookies);
  if ('error' in teacher) return json(teacher, { status: ERROR_STATUS[teacher.error] });
  const text = await request.text();
  if (text.length > MAX_BYTES) return json({ error: 'too big' }, { status: 413 });
  let sent: unknown;
  try {
    sent = JSON.parse(text);
  } catch {
    return json({ error: 'invalid' }, { status: 400 });
  }
  try {
    const result = await saveAnalysis(params.id, sent);
    if (result === 'missing') return json({ error: 'not found' }, { status: 404 });
    if (result === 'invalid') return json({ error: 'invalid' }, { status: 400 });
    return json({ ok: true });
  } catch {
    return json({ error: 'unavailable' }, { status: 503 });
  }
};
