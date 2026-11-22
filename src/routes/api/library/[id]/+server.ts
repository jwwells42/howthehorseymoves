import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { teacherFrom, ERROR_STATUS } from '$lib/server/access';
import { getGame, deleteGame } from '$lib/server/library';

/** GET: one game, its PGN included. */
export const GET: RequestHandler = async ({ cookies, params }) => {
  const teacher = teacherFrom(cookies);
  if ('error' in teacher) return json(teacher, { status: ERROR_STATUS[teacher.error] });
  try {
    const game = await getGame(params.id);
    if (!game) return json({ error: 'not found' }, { status: 404 });
    return json(game);
  } catch {
    return json({ error: 'unavailable' }, { status: 503 });
  }
};

export const DELETE: RequestHandler = async ({ cookies, params }) => {
  const teacher = teacherFrom(cookies);
  if ('error' in teacher) return json(teacher, { status: ERROR_STATUS[teacher.error] });
  try {
    await deleteGame(params.id);
    return json({ ok: true });
  } catch {
    return json({ error: 'unavailable' }, { status: 503 });
  }
};
