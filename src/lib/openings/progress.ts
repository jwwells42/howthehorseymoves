import type { PieceColor } from "../logic/types";
import type { Opening, OpeningLine, OpeningMove } from "./parser";
import { noteChange } from "../state/storage";

/**
 * What a student has learned of an opening, one entry per move of theirs.
 *
 * - NEW (0): not played yet. An arrow shows it.
 * - SEEN (1): played with the arrow (or after a mistake). Next time it's
 *   played from memory.
 * - 2 and up: learned. Each number is a box that comes back for review after
 *   the days in REVIEW_DAYS. Played from memory when it's due, a move goes up
 *   a box; a mistake sends it back to SEEN.
 *
 * Saved in localStorage under `opening-{id}-moves` as
 * { [move key]: [state, seconds since 1970] }; the time is when the move was
 * last saved, which says when it's due, and lets sync tell which of two
 * devices saved a move last.
 */
export const NEW = 0;
export const SEEN = 1;
/** The first learned box: a move is known once it's here or higher */
export const KNOWN = 2;
export type MoveState = number;

/**
 * Days until a move comes back for review, by its state: seen moves straight
 * away, then 1, 3, 7, 14, 30 and 90 days. The numbers can be changed freely,
 * and one more at the end is one more box.
 */
export const REVIEW_DAYS = [0, 0, 1, 3, 7, 14, 30, 90];
const LAST = REVIEW_DAYS.length - 1;

export type MoveProgress = Record<string, [MoveState, number]>;

export function storageKey(openingId: string): string {
  return `opening-${openingId}-moves`;
}

// A pasted PGN has no id worth keeping progress under
export function savesProgress(opening: Opening): boolean {
  return opening.id !== "custom";
}

export function loadProgress(openingId: string): MoveProgress {
  try {
    const raw = localStorage.getItem(storageKey(openingId));
    const value = raw ? JSON.parse(raw) : {};
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

/**
 * Saves new states for some moves and returns the whole progress. Starts
 * from what is saved rather than from the caller's copy, so a tab left open
 * doesn't undo what another tab (or sync) saved since.
 */
export function saveStates(openingId: string, states: Record<string, MoveState>): MoveProgress {
  const progress = loadProgress(openingId);
  const now = Math.floor(Date.now() / 1000);
  for (const [key, state] of Object.entries(states)) progress[key] = [state, now];
  try {
    localStorage.setItem(storageKey(openingId), JSON.stringify(progress));
  } catch {}
  noteChange();
  return progress;
}

export function stateOf(progress: MoveProgress, key: string): MoveState {
  const state = progress[key]?.[0] ?? NEW;
  return Number.isInteger(state) && state > NEW ? Math.min(state, LAST) : NEW;
}

/** The day on the calendar (local time) a moment falls on, counted from 1970. */
function dayOf(seconds: number): number {
  const offset = new Date(seconds * 1000).getTimezoneOffset() * 60;
  return Math.floor((seconds - offset) / 86400);
}

/**
 * Whether a move is due for review. Counted in calendar days, so a move
 * learned in the evening is due at any time the next day.
 */
export function isDue(progress: MoveProgress, key: string, now: number): boolean {
  const state = stateOf(progress, key);
  if (state === NEW) return false;
  const days = REVIEW_DAYS[state];
  return days === 0 || dayOf(now) >= dayOf(progress[key][1]) + days;
}

/**
 * What to save once a move is played: SEEN when an arrow was showing (a new
 * move, or after a mistake), one box up when it was due and played from
 * memory, and nothing (null) otherwise, so playing a move early doesn't
 * stretch its next review. At the last box it's saved again, so it comes
 * back after that box's days.
 */
export function afterMove(progress: MoveProgress, key: string, helped: boolean, now: number): MoveState | null {
  const state = stateOf(progress, key);
  if (helped || state === NEW) return state === SEEN ? null : SEEN;
  return isDue(progress, key, now) ? Math.min(state + 1, LAST) : null;
}

/** Every move the student plays in these lines, each once. */
export function playerMoves(lines: OpeningLine[], color: PieceColor): OpeningMove[] {
  const seen = new Map<string, OpeningMove>();
  for (const line of lines) {
    for (const move of line) {
      if (move.colorPlayed === color && !seen.has(move.key)) seen.set(move.key, move);
    }
  }
  return [...seen.values()];
}

export interface Tally {
  known: number;
  seen: number;
  due: number;
  total: number;
}

export function tally(moves: OpeningMove[], progress: MoveProgress, now: number): Tally {
  let known = 0;
  let seen = 0;
  let due = 0;
  for (const move of moves) {
    const state = stateOf(progress, move.key);
    if (state >= KNOWN) known++;
    else if (state === SEEN) seen++;
    if (isDue(progress, move.key, now)) due++;
  }
  return { known, seen, due, total: moves.length };
}

export type PassKind = "breadth" | "depth" | "review";

/**
 * The lines one pass goes through.
 *
 * Breadth: every line, each going `perVisit` new moves (moves of the
 * student's not played yet) further than before; lines that come out the
 * same are one visit. Depth: every line not known yet, to its end. Breadth
 * with nothing new left works like depth, and once every move is known
 * either one goes through all the lines again.
 *
 * Review: every line with a move due, up to its last one. With nothing due,
 * everything learned so far, so it can be gone over before a tournament.
 */
export function buildPass(
  lines: OpeningLine[],
  color: PieceColor,
  kind: PassKind,
  perVisit: number,
  progress: MoveProgress,
  now = Math.floor(Date.now() / 1000),
): OpeningLine[] {
  const mine = (m: OpeningMove) => m.colorPlayed === color;
  if (kind === "review") {
    const due = upToLast(lines, (m) => mine(m) && isDue(progress, m.key, now));
    if (due.length > 0) return due;
    const learned = upToLast(lines, (m) => mine(m) && stateOf(progress, m.key) >= KNOWN);
    return learned.length > 0 ? learned : lines;
  }
  if (kind === "breadth") {
    const visits: OpeningLine[] = [];
    const taken = new Set<string>();
    for (const line of lines) {
      let fresh = 0;
      let end = line.length;
      for (let i = 0; i < line.length; i++) {
        if (mine(line[i]) && stateOf(progress, line[i].key) === NEW && ++fresh === perVisit) {
          end = i + 1;
          break;
        }
      }
      if (fresh === 0) continue;
      const visit = line.slice(0, end);
      const id = visit.map((m) => m.key).join(" ");
      if (taken.has(id)) continue;
      taken.add(id);
      visits.push(visit);
    }
    if (visits.length > 0) return visits;
  }
  const unknown = lines.filter((line) => line.some((m) => mine(m) && stateOf(progress, m.key) < KNOWN));
  return unknown.length > 0 ? unknown : lines;
}

/**
 * Each line up to its last move that passes the test, leaving out lines
 * with none, and lines whose part is the start of another line's part (that
 * one goes over the same moves).
 */
function upToLast(lines: OpeningLine[], test: (m: OpeningMove) => boolean): OpeningLine[] {
  const parts: OpeningLine[] = [];
  for (const line of lines) {
    let end = 0;
    line.forEach((m, i) => {
      if (test(m)) end = i + 1;
    });
    if (end > 0) parts.push(line.slice(0, end));
  }
  const startsWith = (long: OpeningLine, short: OpeningLine) =>
    long.length >= short.length && short.every((m, i) => long[i].key === m.key);
  return parts.filter((part, i) =>
    !parts.some((other, j) => j !== i && startsWith(other, part) && (other.length > part.length || j < i)),
  );
}

/**
 * Brings over progress saved by the trainer before it saved each move:
 * `opening-{id}-complete` (every move practised) becomes every move known,
 * and `opening-{id}-learned-depth` (your first N moves of every line
 * learned) makes those moves seen. Only runs while there is no new-style
 * progress, so it happens once.
 */
export function migrateOldProgress(opening: Opening, lines: OpeningLine[]): void {
  if (!savesProgress(opening)) return;
  try {
    if (localStorage.getItem(storageKey(opening.id)) !== null) return;
    const complete = localStorage.getItem(`opening-${opening.id}-complete`) === "true";
    const depth = parseInt(localStorage.getItem(`opening-${opening.id}-learned-depth`) ?? "", 10) || 0;
    if (!complete && depth <= 0) return;
    const states: Record<string, MoveState> = {};
    for (const line of lines) {
      let mineSoFar = 0;
      for (const move of line) {
        if (move.colorPlayed !== opening.color) continue;
        mineSoFar++;
        if (complete) states[move.key] = KNOWN;
        else if (mineSoFar <= depth && states[move.key] === undefined) states[move.key] = SEEN;
      }
    }
    saveStates(opening.id, states);
  } catch {}
}
