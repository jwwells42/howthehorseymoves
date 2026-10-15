/**
 * How two copies of a student's progress become one.
 *
 * Progress is a set of localStorage entries. Signed in with Lichess, the same
 * entries are kept on the server as well, and the two copies are merged both
 * ways. The merge never loses anything either copy had:
 *
 * - a best score or a star count keeps the higher number
 * - puzzle progress keeps, per puzzle, the most stars and the fewest moves
 * - opening progress keeps, per move, whichever was saved last
 *
 * Each rule gives the same answer whichever copy comes first and however
 * often it runs, so there is nothing to resolve: a retry, two tabs, or two
 * Chromebooks at once all end up with the same progress.
 *
 * Used by the browser (src/lib/sync/client.ts) and the server
 * (src/routes/api/progress), so it must not touch localStorage itself.
 */

export type Snapshot = Record<string, string>;

type Rule = 'max' | 'puzzles' | 'moves';

/** Which localStorage entries are progress, and how each merges. Others (settings, sound) stay on the device. */
export function ruleFor(key: string): Rule | null {
  if (key === 'horsey-progress') return 'puzzles';
  if (/^opening-[\w-]+-moves$/.test(key)) return 'moves';
  if (/^[\w-]+-best(-stars)?$/.test(key) || /^bot-beaten-[\w-]+$/.test(key)) return 'max';
  return null;
}

export function isSynced(key: string): boolean {
  return ruleFor(key) !== null;
}

function parseObject(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

interface PuzzleEntry {
  completed: boolean;
  bestStars: number;
  bestMoves: number;
}

function puzzleEntry(value: unknown): PuzzleEntry | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  return {
    completed: v.completed === true,
    bestStars: Number(v.bestStars) || 0,
    bestMoves: Number(v.bestMoves) || 0,
  };
}

function mergePuzzles(a: string | undefined, b: string | undefined): string {
  const left = parseObject(a);
  const right = parseObject(b);
  const out: Record<string, PuzzleEntry> = {};
  for (const id of new Set([...Object.keys(left), ...Object.keys(right)])) {
    const x = puzzleEntry(left[id]);
    const y = puzzleEntry(right[id]);
    if (!x || !y) {
      const only = x ?? y;
      if (only) out[id] = only;
      continue;
    }
    out[id] = {
      completed: x.completed || y.completed,
      bestStars: Math.max(x.bestStars, y.bestStars),
      // 0 means none recorded, so it doesn't count as fewest
      bestMoves: x.bestMoves && y.bestMoves ? Math.min(x.bestMoves, y.bestMoves) : x.bestMoves || y.bestMoves,
    };
  }
  return JSON.stringify(sortKeys(out));
}

/** An opening move's progress: [state, seconds since 1970 when it was saved]. */
type MoveEntry = [number, number];

function moveEntry(value: unknown): MoveEntry | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [state, time] = value.map(Number);
  if (![0, 1, 2].includes(state) || !Number.isFinite(time)) return null;
  return [state, time];
}

function mergeMoves(a: string | undefined, b: string | undefined): string {
  const left = parseObject(a);
  const right = parseObject(b);
  const out: Record<string, MoveEntry> = {};
  for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
    const x = moveEntry(left[key]);
    const y = moveEntry(right[key]);
    if (!x || !y) {
      const only = x ?? y;
      if (only) out[key] = only;
      continue;
    }
    // The later save wins; at the same second, the further along
    out[key] = x[1] !== y[1] ? (x[1] > y[1] ? x : y) : x[0] >= y[0] ? x : y;
  }
  return JSON.stringify(sortKeys(out));
}

function mergeMax(a: string | undefined, b: string | undefined): string {
  const x = parseInt(a ?? '', 10);
  const y = parseInt(b ?? '', 10);
  return String(Math.max(Number.isFinite(x) ? x : 0, Number.isFinite(y) ? y : 0));
}

/** Same keys in the same order, so equal progress is an equal string. */
function sortKeys<T>(obj: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.entries(obj).sort(([p], [q]) => (p < q ? -1 : p > q ? 1 : 0)));
}

/** One entry from two copies. Either side may be missing. */
export function mergeValue(key: string, a: string | undefined, b: string | undefined): string | undefined {
  if (a === undefined && b === undefined) return undefined;
  switch (ruleFor(key)) {
    case 'puzzles':
      return mergePuzzles(a, b);
    case 'moves':
      return mergeMoves(a, b);
    case 'max':
      return mergeMax(a, b);
    default:
      return undefined;
  }
}

/** Two copies of progress as one. Entries that aren't progress are dropped. */
export function mergeSnapshots(a: Snapshot, b: Snapshot): Snapshot {
  const out: Snapshot = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const value = mergeValue(key, a[key], b[key]);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/** Limits on what the server will keep, so no client can fill the database. */
export const MAX_ENTRIES = 500;
export const MAX_VALUE_LENGTH = 200_000;

/** Untrusted input (a request body, a database row) as a Snapshot: progress entries only, strings only. */
export function coerceSnapshot(value: unknown): Snapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Snapshot = {};
  let count = 0;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (count >= MAX_ENTRIES) break;
    if (typeof raw !== 'string' || raw.length > MAX_VALUE_LENGTH || !isSynced(key)) continue;
    // Normalised through the merge, so junk inside an entry is dropped too
    const clean = mergeValue(key, raw, undefined);
    if (clean === undefined) continue;
    out[key] = clean;
    count++;
  }
  return out;
}
