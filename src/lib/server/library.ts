/**
 * The games library's table (horsey_library in scripts/schema.sql). Only the
 * /api/library routes call these, and only for the teacher.
 */

import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';
import { splitPgnGames } from '$lib/logic/pgn';
import { summarize, type GameSummary, type LibraryGame } from '$lib/library/summary';
import { readAnalysis, markMoves, countMarks } from '$lib/engine/review';
import { randomToken } from './session';

function sql() {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL missing');
  return neon(env.DATABASE_URL);
}

/** Every game's id and summary, in pages (by id) so no answer gets too big. */
export async function listGames(after: string, limit: number): Promise<LibraryGame[]> {
  return (await sql()`
    select id, summary from horsey_library
     where id > ${after}
     order by id
     limit ${limit}
  `) as LibraryGame[];
}

export async function getGame(id: string): Promise<{ id: string; summary: GameSummary; body: string; analysis: unknown } | null> {
  const rows = (await sql()`select id, summary, body, analysis from horsey_library where id = ${id}`) as {
    id: string;
    summary: GameSummary;
    body: string;
    analysis: unknown;
  }[];
  return rows[0] ?? null;
}

export async function getBodies(ids: string[]): Promise<{ id: string; body: string }[]> {
  return (await sql()`select id, body from horsey_library where id = any(${ids}::text[])`) as { id: string; body: string }[];
}

export interface ImportResult {
  added: number;
  /** Already in the library */
  known: number;
  /** Games whose moves couldn't be read: their headers, to find them by */
  failed: string[];
}

/** Adds the games in some PGN text; a game already in the library is left as it is. */
export async function importGames(text: string): Promise<ImportResult> {
  const ids: string[] = [];
  const keys: string[] = [];
  const summaries: string[] = [];
  const bodies: string[] = [];
  const failed: string[] = [];
  for (const game of splitPgnGames(text)) {
    try {
      const { summary, identity } = summarize(game.pgn);
      const key = createHash('sha256').update(identity).digest('base64url');
      if (keys.includes(key)) continue;
      ids.push(randomToken(9));
      keys.push(key);
      summaries.push(JSON.stringify(summary));
      bodies.push(game.pgn);
    } catch {
      const h = game.headers;
      failed.push([h.Date, h.White, h.Black].filter(Boolean).join(' '));
    }
  }
  if (ids.length === 0) return { added: 0, known: 0, failed };
  const added = (await sql()`
    insert into horsey_library (id, key, summary, body)
    select * from unnest(${ids}::text[], ${keys}::text[], ${summaries}::jsonb[], ${bodies}::text[])
    on conflict (key) do nothing
    returning id
  `) as { id: string }[];
  return { added: added.length, known: ids.length - added.length, failed };
}

/**
 * Saves Stockfish's check of a game (see $lib/engine/review), replacing any
 * earlier one, and puts its ?! ? ?? counts in the summary for the list.
 * Refused unless it has one eval per position of the game.
 */
export async function saveAnalysis(id: string, sent: unknown): Promise<'saved' | 'missing' | 'invalid'> {
  const rows = (await sql()`select (summary->>'plies')::int as plies from horsey_library where id = ${id}`) as { plies: number }[];
  if (!rows[0]) return 'missing';
  const analysis = readAnalysis(sent, rows[0].plies);
  if (!analysis) return 'invalid';
  const marks = countMarks(markMoves(analysis.evals));
  await sql()`
    update horsey_library
       set analysis = ${JSON.stringify(analysis)}::jsonb,
           summary = jsonb_set(summary, '{marks}', ${JSON.stringify(marks)}::jsonb),
           version = version + 1,
           updated_at = now()
     where id = ${id}
  `;
  return 'saved';
}

export async function deleteGame(id: string): Promise<void> {
  await sql()`delete from horsey_library where id = ${id}`;
}

export async function deleteAllGames(): Promise<void> {
  await sql()`delete from horsey_library`;
}

/** How much of the database's space is used, in bytes (the free plan has 1 GB). */
export async function spaceUsed(): Promise<number> {
  const rows = (await sql()`select pg_database_size(current_database()) as bytes`) as { bytes: string | number }[];
  return Number(rows[0]?.bytes ?? 0);
}
