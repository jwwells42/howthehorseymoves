import type { PieceColor } from "../logic/types";
import type { Opening, OpeningLine, OpeningMove } from "./parser";
import { noteChange } from "../state/storage";

/**
 * What a student has learned of an opening, one entry per move of theirs.
 *
 * - NEW: not played yet. An arrow shows it.
 * - SEEN: played once with the arrow (or after a mistake). Next time it's
 *   played from memory.
 * - KNOWN: played from memory.
 *
 * A mistake sends a move back to SEEN. Saved in localStorage under
 * `opening-{id}-moves` as { [move key]: [state, seconds since 1970] }; the
 * time is how sync tells which of two devices saved a move last.
 */
export const NEW = 0;
export const SEEN = 1;
export const KNOWN = 2;
export type MoveState = typeof NEW | typeof SEEN | typeof KNOWN;

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
  return progress[key]?.[0] ?? NEW;
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
  total: number;
}

export function tally(moves: OpeningMove[], progress: MoveProgress): Tally {
  let known = 0;
  let seen = 0;
  for (const move of moves) {
    const state = stateOf(progress, move.key);
    if (state === KNOWN) known++;
    else if (state === SEEN) seen++;
  }
  return { known, seen, total: moves.length };
}

/**
 * The lines one pass goes through.
 *
 * Breadth: every line, each going `perVisit` new moves (moves of the
 * student's not played yet) further than before; lines that come out the
 * same are one visit. Depth: every line not known yet, to its end. Breadth
 * with nothing new left works like depth, and once every move is known
 * either one goes through all the lines again.
 */
export function buildPass(
  lines: OpeningLine[],
  color: PieceColor,
  order: "breadth" | "depth",
  perVisit: number,
  progress: MoveProgress,
): OpeningLine[] {
  const mine = (m: OpeningMove) => m.colorPlayed === color;
  if (order === "breadth") {
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
  const unknown = lines.filter((line) => line.some((m) => mine(m) && stateOf(progress, m.key) !== KNOWN));
  return unknown.length > 0 ? unknown : lines;
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
