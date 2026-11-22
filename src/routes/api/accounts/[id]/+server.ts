import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { teacherFrom, ERROR_STATUS } from '$lib/server/access';
import { deleteUser } from '$lib/server/db';

/**
 * DELETE: everything the server holds about one student (teacher only), e.g.
 * when the school, a parent or the student asks (see PRIVACY.md).
 */
export const DELETE: RequestHandler = async ({ cookies, params }) => {
  const teacher = teacherFrom(cookies);
  if ('error' in teacher) return json(teacher, { status: ERROR_STATUS[teacher.error] });
  try {
    await deleteUser(params.id);
    return json({ ok: true });
  } catch {
    return json({ error: 'unavailable' }, { status: 503 });
  }
};
