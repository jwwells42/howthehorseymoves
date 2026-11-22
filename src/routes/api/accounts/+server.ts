import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { teacherFrom, ERROR_STATUS } from '$lib/server/access';
import { listUsers } from '$lib/server/db';

/** GET: every account (teacher only), for the /accounts page. */
export const GET: RequestHandler = async ({ cookies }) => {
  const teacher = teacherFrom(cookies);
  if ('error' in teacher) return json(teacher, { status: ERROR_STATUS[teacher.error] });
  try {
    return json({ accounts: await listUsers() });
  } catch {
    return json({ error: 'unavailable' }, { status: 503 });
  }
};
